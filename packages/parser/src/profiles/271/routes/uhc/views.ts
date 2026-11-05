import type { Segment } from '../../../../reader/segment.js';
import type { CostShareEntry, MemberEligibility } from '../../eligibility/types.js';
import type { Person } from '../../types.js';
import type {
    CopayRangeEntry,
    UhcFindingCode,
    UhcView,
    VariableCopayEntry,
    VariesBy,
} from './types.js';

type Report = (code: UhcFindingCode, segment: Segment, message: string) => void;

import { readCoverageDates } from '../coverage-dates.js';

// MSG text on a variable copay (guide v9.0, §6.2 #11–12).
const LOCATION_MESSAGE = 'AMOUNT VARIES BY LOCATION';
const PRACTITIONER_MESSAGE = 'AMOUNT VARIES BY PRACTITIONER';
// EB09 on the two rows of a copay range (guide v9.0, §6.2 #12).
const RANGE_MAXIMUM = 'M2';
const RANGE_MINIMUM = '8H';

/**
 * Builds the UnitedHealthcare view of one member.
 *
 * @param member - The member as `interpret271` returned it.
 * @param person - The member as `read271` returned it.
 * @param report - Receives problems found in the member.
 * @returns The member's coverage dates, other payers and variable copays.
 */
export function readUhc(
    member: MemberEligibility,
    person: Person,
    report: Report,
): UhcView {
    const copays = readCopays(member, report);

    return {
        copayRanges: copays.copayRanges,
        coverageDates: readCoverageDates(member, person, report),
        otherPayers: member.otherParties
            .filter(entry => entry.kind === 'R')
            .map(entry => ({
                entry,
                name: entry.parties[0]?.lastName,
            })),
        variableCopays: copays.variableCopays,
    };
}

// An `M2` row closes a range when it follows the `8H` row with the same EB02, EB03 and EB12.
function isMaximumFor(minimum: CostShareEntry, row: CostShareEntry): boolean {
    if (!variesByOf(row) || row.benefit.eb.element(9) !== RANGE_MAXIMUM) {
        return false;
    }

    return row.coverageLevel === minimum.coverageLevel
        && row.benefit.eb.element(3) === minimum.benefit.eb.element(3)
        && row.network === minimum.network;
}

function readCopays(
    member: MemberEligibility,
    report: Report,
): Pick<UhcView, 'copayRanges' | 'variableCopays'> {
    const copayRanges: CopayRangeEntry[] = [];
    const variableCopays: VariableCopayEntry[] = [];
    const pairedMaximums = new Set<CostShareEntry>();

    for (const [index, entry] of member.costShares.entries()) {
        const variesBy = variesByOf(entry);

        if (!variesBy) {
            continue;
        }

        const quantityQualifier = entry.benefit.eb.element(9);

        if (quantityQualifier === RANGE_MINIMUM) {
            const next = member.costShares[index + 1];

            if (next && isMaximumFor(entry, next)) {
                copayRanges.push({
                    maximum: next,
                    minimum: entry,
                    variesBy,
                });
                pairedMaximums.add(next);
            } else {
                const message = 'EB09 "8H" has no M2 row with the same EB02, EB03 and EB12 after it';

                report('unpaired-copay-range', entry.benefit.eb, message);
            }

            continue;
        }

        if (quantityQualifier === RANGE_MAXIMUM) {
            if (!pairedMaximums.has(entry)) {
                report('unpaired-copay-range', entry.benefit.eb, 'EB09 "M2" has no 8H row before it');
            }

            continue;
        }

        variableCopays.push({
            entry,
            variesBy,
        });
    }

    return {
        copayRanges,
        variableCopays,
    };
}

function variesByOf(entry: CostShareEntry): undefined | VariesBy {
    if (entry.kind !== 'B') {
        return;
    }

    const messages = new Set(entry.messages.map(message => message.trim()));

    if (messages.has(LOCATION_MESSAGE)) {
        return 'location';
    }

    if (messages.has(PRACTITIONER_MESSAGE)) {
        return 'practitioner';
    }
}

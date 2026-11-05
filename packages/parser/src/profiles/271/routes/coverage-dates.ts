import type { Segment } from '../../../reader/segment.js';
import type { MemberEligibility } from '../eligibility/types.js';
import type { Person } from '../types.js';

import { toPlainDate } from '../eligibility/interpreter.js';

// DTP01 for plan coverage dates (UHC v9.0 §6.2 #6, and the Humana v2.0 guide).
const PLAN_COVERAGE = '346';

/** A plan coverage date (DTP01 `346`). */
export type CoverageDateEntry = {
    /** The coverage end date. Set only for DTP02 `RD8`, which means coverage has ended. */
    end: Temporal.PlainDate | undefined;
    /** The DTP segment. */
    segment: Segment;
    /** The coverage start date. */
    start: Temporal.PlainDate;
};

/**
 * Reads a member's plan coverage dates: the member's dates first, then dates on EB03 `30`
 * coverage rows. A DTP02 other than `D8` or `RD8` is reported and left out.
 *
 * @param member - The member as `interpret271` returned it.
 * @param person - The member as `read271` returned it.
 * @param report - Receives `unexpected-coverage-date-format` findings.
 * @returns The coverage dates, in order.
 */
export function readCoverageDates(
    member: MemberEligibility,
    person: Person,
    report: (code: 'unexpected-coverage-date-format', segment: Segment, message: string) => void,
): CoverageDateEntry[] {
    const planRowDates = member.coverage
        .filter(entry => entry.serviceTypes.includes('30'))
        .flatMap(entry => entry.benefit.dates);
    const segments = [...person.dates, ...planRowDates]
        .filter(segment => segment.element(1) === PLAN_COVERAGE);
    const coverageDates: CoverageDateEntry[] = [];

    for (const segment of segments) {
        const format = segment.element(2);

        if (format !== 'D8' && format !== 'RD8') {
            report(
                'unexpected-coverage-date-format',
                segment,
                `DTP02 "${format ?? ''}" is not D8 or RD8`,
            );
            continue;
        }

        // Dates that cannot be read are left out. interpret271 reports them as `invalid-date`.
        if (format === 'D8') {
            const start = toPlainDate(segment.element(3));

            if (start) {
                coverageDates.push({
                    end: undefined,
                    segment,
                    start,
                });
            }

            continue;
        }

        const texts = (segment.element(3) ?? '').split('-');
        const start = toPlainDate(texts[0]);
        const end = toPlainDate(texts[1]);

        if (!start || !end || texts.length !== 2 || Temporal.PlainDate.compare(start, end) > 0) {
            continue;
        }

        coverageDates.push({
            end,
            segment,
            start,
        });
    }

    return coverageDates;
}

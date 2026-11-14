import type { Segment } from '../../../reader/segment.js';
import type { MemberEligibility } from '../eligibility/types.js';

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
 * coverage rows. Dates that `interpret271` could not read are left out; it reports them as
 * `invalid-date`.
 *
 * @param member - The member as `interpret271` returned it.
 * @returns The coverage dates, in order.
 */
export function readCoverageDates(member: MemberEligibility): CoverageDateEntry[] {
    const planRowDates = member.coverage
        .filter(entry => entry.serviceTypes.includes('30'))
        .flatMap(entry => entry.dates);

    const dates = [...member.details.dates, ...planRowDates]
        .filter(date => date.qualifier === PLAN_COVERAGE);
    const coverageDates: CoverageDateEntry[] = [];

    for (const date of dates) {
        if (date.format === 'RD8') {
            coverageDates.push({
                end: date.end,
                segment: date.segment,
                start: date.start,
            });
            continue;
        }

        coverageDates.push({
            end: undefined,
            segment: date.segment,
            start: date.date,
        });
    }

    return coverageDates;
}

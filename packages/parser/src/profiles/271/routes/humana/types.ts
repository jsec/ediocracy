import type { Segment } from '../../../../reader/segment.js';
import type { Benefit } from '../../types.js';
import type { CoverageDateEntry } from '../coverage-dates.js';

/** A HumanaOne billing row (EB01 `5` or `7`). */
export type BillingEntry = {
    /** The row as `read271` returned it. */
    benefit: Benefit;
    /** The month of the grace period, from a `Grace Period Month N` MSG. */
    graceMonth: 1 | 2 | 3 | undefined;
    /** DTP01 `193` (start) and `194` (end). `undefined` when neither is sent. */
    gracePeriod: undefined | {
        /** DTP01 `194`. */
        end: Temporal.PlainDate | undefined;
        /** DTP01 `193`. */
        start: Temporal.PlainDate | undefined;
    };
    /** The row's MSG text, as sent. */
    messages: string[];
    /** DTP01 `343`: the date premiums are paid to. */
    premiumPaidTo: Temporal.PlainDate | undefined;
    /** The EB01 code. */
    status: '5' | '7';
};

/**
 * A problem `humanaProfile` finds in a member.
 *
 * - `invalid-grace-month`: a `Grace Period Month` MSG whose number is not 1, 2 or 3.
 * - `missing-benefit-message`: an in-network row with no MSG, when another in-network row has
 *   the same EB01, EB02, EB03 and EB06.
 * - `unexpected-coverage-date-format`: a DTP01 `346` whose DTP02 is not `D8` or `RD8`.
 * - `unexpected-inactive-code`: EB01 `6` on a medical response, or `V` on a dental one.
 */
export type HumanaFindingCode
    = | 'invalid-grace-month'
        | 'missing-benefit-message'
        | 'unexpected-coverage-date-format'
        | 'unexpected-inactive-code';

/** One member's rows from a Humana response. */
export type HumanaView = {
    /** HumanaOne billing rows (EB01 `5` or `7`), in order. */
    billing: BillingEntry[];
    /**
     * Plan coverage dates (DTP01 `346`): the member's dates first, then those on EB03 `30`
     * coverage rows.
     */
    coverageDates: CoverageDateEntry[];
    /** `medical` for 2100A NM109 `61101` or `61115`, `dental` for `65065` or `CX021`. */
    lineOfBusiness: 'dental' | 'medical' | undefined;
    /**
     * One plan per name loop, in order. A member has more than one when a 2000C has a second
     * NM1.
     */
    plans: PlanEntry[];
    /** Indexes in `eligibility.members` of the other subscribers with the same NM109, in order. */
    sameIdMembers: number[];
    /** Coverage status rows (EB01 `1`, `5`, `6`, `7` or `V`), in order. */
    status: StatusEntry[];
};

/** One plan a member is enrolled in: a name loop and the benefits after it. */
export type PlanEntry = {
    /** The benefits that follow this plan's NM1. */
    benefits: Benefit[];
    /** REF03 of the plan's `REF*6P`: the plan, group or network name. */
    description: string | undefined;
    /** REF02 of the plan's `REF*6P`. */
    groupNumber: string | undefined;
    /** The plan's NM1. */
    name: Segment;
};

/** A coverage status row (EB01 `1`, `5`, `6`, `7` or `V`). */
export type StatusEntry = {
    /** The row as `read271` returned it. */
    benefit: Benefit;
    /** The DTP01 `349` date, or the end of an `RD8` range: coverage ended on this date. */
    ended: Temporal.PlainDate | undefined;
    /** True for `1` and `5`. */
    isActive: boolean;
    /** The EB01 code. */
    status: '1' | '5' | '6' | '7' | 'V';
};

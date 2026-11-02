import type { Segment } from '../../../../reader/segment.js';
import type { CostShareEntry, OtherPartyEntry } from '../../eligibility/types.js';

/** A minimum–maximum copay range: an EB09 `8H` row and the `M2` row after it. */
export type CopayRangeEntry = {
    /** The `M2` row. Its amount is `maximum.amount` (EB07). */
    maximum: CostShareEntry;
    /** The `8H` row. Its amount is `minimum.amount` (EB07). */
    minimum: CostShareEntry;
    /** What the amount depends on, from the minimum row's MSG. */
    variesBy: VariesBy;
};

/** A plan coverage date (DTP01 `346`). */
export type CoverageDateEntry = {
    /** The coverage end date. Set only for DTP02 `RD8`, which means coverage has ended. */
    end: Temporal.PlainDate | undefined;
    /** The DTP segment. */
    segment: Segment;
    /** The coverage start date. */
    start: Temporal.PlainDate;
};

/** An other payer row (EB01 `R`). */
export type OtherPayerEntry = {
    /** The row as `interpret271` returned it. */
    entry: OtherPartyEntry;
    /** NM103 of the first related party, or `undefined` when UHC sent no 2120 NM1. */
    name: string | undefined;
};

/**
 * A problem `uhcProfile` finds in a member.
 *
 * - `unexpected-coverage-date-format`: a DTP01 `346` whose DTP02 is not `D8` or `RD8`.
 * - `unpaired-copay-range`: a variable copay with EB09 `8H` that the cost share row directly
 *   after it does not close, or a variable copay with EB09 `M2` that no variable `8H` row paired
 *   with.
 */
export type UhcFindingCode = 'unexpected-coverage-date-format' | 'unpaired-copay-range';

/** One member's rows from a UnitedHealthcare response, picked from the `interpret271` lists. */
export type UhcView = {
    /** Minimum–maximum copay ranges (EB09 `8H` then `M2`), in order. */
    copayRanges: CopayRangeEntry[];
    /**
     * Plan coverage dates (DTP01 `346`): the member's dates first, then those on EB03 `30`
     * coverage rows.
     */
    coverageDates: CoverageDateEntry[];
    /** Other payer rows (EB01 `R`), in order. */
    otherPayers: OtherPayerEntry[];
    /** Exact copays that vary by location or practitioner, in order. Range rows are left out. */
    variableCopays: VariableCopayEntry[];
};

/** A copay whose amount UHC says varies by location or practitioner. */
export type VariableCopayEntry = {
    /** The row as `interpret271` returned it. */
    entry: CostShareEntry;
    /** What the amount depends on, from the row's MSG. */
    variesBy: VariesBy;
};

/** What a variable copay's amount depends on. */
export type VariesBy = 'location' | 'practitioner';

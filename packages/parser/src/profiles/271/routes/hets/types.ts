import type { CostShareEntry, CoverageEntry, OtherPartyEntry } from '../../eligibility/types.js';

/**
 * A problem `hetsProfile` finds in a member.
 *
 * - `placeholder-address`: N301 says the address is in an MSG; N4 holds placeholder values. The
 *   address is in `MedicareView.ssaAddress` when HETS sent one.
 */
export type HetsFindingCode = 'placeholder-address';

/** A Medicare Advantage or Part D plan row. */
export type MedicarePlanEntry = {
    /** Contract number (REF `18`). */
    contract: string | undefined;
    /** The row as `interpret271` returned it. */
    entry: OtherPartyEntry;
    /** Plan number (REF `N6`). */
    plan: string | undefined;
    /** Plan name (REF03 of the REF `N6`). */
    planName: string | undefined;
};

/**
 * One member's Medicare rows from a HETS response, picked from the `interpret271` lists. Each list
 * keeps the rows in order, including rows that repeat others.
 */
export type MedicareView = {
    /** Medicare Advantage plans: other party rows with EB01 `U` and EB03 including `30`. */
    medicareAdvantage: MedicarePlanEntry[];
    /** Medicare Secondary Payer rows: EB01 `R`, EB03 including `30`, and an MSP EB04. */
    msp: MspEntry[];
    /** Part A coverage rows (EB04 `MA`). The entitlement reason is in `messages`. */
    partA: CoverageEntry[];
    /** Part A cost share rows (EB04 `MA`). */
    partACostShares: CostShareEntry[];
    /** Part B coverage rows (EB04 `MB`). The entitlement reason is in `messages`. */
    partB: CoverageEntry[];
    /** Part B cost share rows (EB04 `MB`). */
    partBCostShares: CostShareEntry[];
    /** Part D plans: other party rows with EB01 `R` and EB03 including `88`. */
    partD: MedicarePlanEntry[];
    /** QMB rows (EB04 `QM`): cost shares, then other party rows. */
    qmb: (CostShareEntry | OtherPartyEntry)[];
    /** The SSA address from the MSG when HETS sent a placeholder address; otherwise `undefined`. */
    ssaAddress: string | undefined;
};

/** A Medicare Secondary Payer row. */
export type MspEntry = {
    /** The row as `interpret271` returned it. */
    entry: OtherPartyEntry;
    /** Policy number (REF `IG`). */
    policyNumber: string | undefined;
    /**
     * REF `6P` as sent. HETS uses it for a group number, a date of loss, or a missing group
     * number, so the value is not parsed.
     */
    ref6P: string | undefined;
};

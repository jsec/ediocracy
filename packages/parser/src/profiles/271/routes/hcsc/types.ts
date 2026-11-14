/** The member's group (REF01 `6P`). */
export type GroupEntry = {
    /** REF03. */
    name: string | undefined;
    /** REF02. */
    number: string | undefined;
};

/** `hcscProfile` reports no findings of its own. */
export type HcscFindingCode = never;

/** The HCSC view of one member. */
export type HcscView = {
    /** The first REF01 `6P`, or `undefined`. */
    group: GroupEntry | undefined;
    /** The NM101 `VER` entities on the member's EB03 `30` coverage rows, in order. */
    relatedPlans: RelatedPlanEntry[];
    /** Utilization management rows (EB01 `U`), in order. */
    utilizationManagement: UtilizationManagementEntry[];
};

/** A plan named by an NM101 `VER` entity on a coverage row. */
export type RelatedPlanEntry = {
    /** NM103. */
    name: string | undefined;
    /** NM109. */
    payerId: string | undefined;
};

/** A utilization management row (EB01 `U`). */
export type UtilizationManagementEntry = {
    /** The last or organization name of the row's first 2120 party. */
    name: string | undefined;
    /** The number after the first PER `TE` qualifier. */
    phone: string | undefined;
    /** The row's EB03 service types. */
    serviceTypes: string[];
    /** The address after the first PER `UR` qualifier. */
    website: string | undefined;
};

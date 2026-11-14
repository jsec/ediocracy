/**
 * Applies a route profile, such as CMS HETS, UnitedHealthcare, Humana, Cigna or HCSC, to a 271.
 *
 * @module @ediocracy/parser/271/routes
 */
export { cignaProfile } from './cigna/profile.js';
export type {
    AttributionEntry,
    CignaFindingCode,
    CignaView,
    HraBalanceEntry,
    NetworkEntry,
    PartnerEntry,
    SharedRiskNetworkEntry,
} from './cigna/types.js';
export type { CoverageDateEntry } from './coverage-dates.js';
export { interpretRoute } from './engine.js';
export { hcscProfile } from './hcsc/profile.js';
export type {
    GroupEntry,
    HcscFindingCode,
    HcscView,
    RelatedPlanEntry,
    UtilizationManagementEntry,
} from './hcsc/types.js';
export { hetsProfile } from './hets/profile.js';
export type {
    HetsFindingCode,
    MedicarePlanEntry,
    MedicareView,
    MspEntry,
} from './hets/types.js';
export { humanaProfile } from './humana/profile.js';
export type {
    BillingEntry,
    HumanaFindingCode,
    HumanaView,
    PlanEntry,
    StatusEntry,
} from './humana/types.js';
export type {
    DetectedRoute,
    RouteEligibility,
    RouteEntry,
    RouteErrorCondition,
    RouteErrorEntry,
    RouteFindingCode,
    RouteProfile,
} from './types.js';
export { uhcProfile } from './uhc/profile.js';
export type {
    CopayRangeEntry,
    OtherPayerEntry,
    UhcFindingCode,
    UhcView,
    VariableCopayEntry,
    VariesBy,
} from './uhc/types.js';

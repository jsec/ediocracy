/**
 * Applies a route profile, such as CMS HETS or UnitedHealthcare, to a 271.
 *
 * @module @ediocracy/parser/271/routes
 */
export { interpretRoute } from './engine.js';
export { hetsProfile } from './hets/profile.js';
export type {
    HetsFindingCode,
    MedicarePlanEntry,
    MedicareView,
    MspEntry,
} from './hets/types.js';
export type {
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
    CoverageDateEntry,
    OtherPayerEntry,
    UhcFindingCode,
    UhcView,
    VariableCopayEntry,
    VariesBy,
} from './uhc/types.js';

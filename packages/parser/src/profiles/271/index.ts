/**
 * Reads 271 eligibility responses and interprets their benefits.
 *
 * @module @ediocracy/parser/271
 */
export { interpret271 } from './eligibility/interpreter.js';
export type {
    Address,
    BenefitFields,
    CostShareEntry,
    CoverageEntry,
    DateEntry,
    Eligibility,
    EligibilityFindingCode,
    LimitationEntry,
    MemberDetails,
    MemberEligibility,
    OtherPartyEntry,
    ReferenceEntry,
    RelatedParty,
    RequestErrorEntry,
} from './eligibility/types.js';
export { read271, read271s } from './reader.js';
export type {
    Benefit,
    Party,
    Person,
    RequestError,
    Response271,
    Response271FindingCode,
} from './types.js';

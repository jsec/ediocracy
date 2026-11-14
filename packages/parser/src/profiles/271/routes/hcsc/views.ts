import type { MemberEligibility } from '../../eligibility/types.js';
import type {
    GroupEntry,
    HcscView,
    RelatedPlanEntry,
    UtilizationManagementEntry,
} from './types.js';

// REF01 for the member's group.
const GROUP_NUMBER = '6P';

// EB03 for health benefit plan coverage.
const HEALTH_BENEFIT_PLAN = '30';

// NM101 of the entities on a coverage row that name related plans.
const RELATED_PLAN = 'VER';

// EB01 for a utilization management row.
const UTILIZATION_MANAGEMENT = 'U';

// PER qualifiers for a phone number and a website.
const TELEPHONE = 'TE';
const WEBSITE = 'UR';

/**
 * Builds the HCSC view of one member.
 *
 * @param member - The member's `interpret271` result.
 * @returns The member's group, related plans and utilization management rows.
 */
export function readHcsc(member: MemberEligibility): HcscView {
    return {
        group: readGroup(member),
        relatedPlans: readRelatedPlans(member),
        utilizationManagement: readUtilizationManagement(member),
    };
}

function readGroup(member: MemberEligibility): GroupEntry | undefined {
    const reference = member.details.references.find(entry => entry.qualifier === GROUP_NUMBER);

    if (!reference) {
        return;
    }

    return {
        name: reference.description,
        number: reference.value,
    };
}

function readRelatedPlans(member: MemberEligibility): RelatedPlanEntry[] {
    return member.coverage
        .filter(entry => entry.serviceTypes.includes(HEALTH_BENEFIT_PLAN))
        .flatMap(entry => entry.benefit.relatedEntities)
        .map(loop => loop.segments[0])
        .filter(segment => segment.element(1) === RELATED_PLAN)
        .map(segment => ({
            name: segment.element(3),
            payerId: segment.element(9),
        }));
}

function readUtilizationManagement(member: MemberEligibility): UtilizationManagementEntry[] {
    return member.otherParties
        .filter(entry => entry.kind === UTILIZATION_MANAGEMENT)
        .map((entry) => {
            const [party] = entry.parties;

            return {
                name: party?.lastName,
                phone: party?.contacts.find(contact => contact.qualifier === TELEPHONE)?.number,
                serviceTypes: entry.serviceTypes,
                website: party?.contacts.find(contact => contact.qualifier === WEBSITE)?.number,
            };
        });
}

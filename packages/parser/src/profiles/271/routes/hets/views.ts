import type { Segment } from '../../../../reader/segment.js';
import type { MemberEligibility, OtherPartyEntry } from '../../eligibility/types.js';
import type { Person } from '../../types.js';
import type { HetsFindingCode, MedicarePlanEntry, MedicareView } from './types.js';

import { isOneOf } from '../../eligibility/interpreter.js';

// N301 when HETS cannot format the SSA address (guide v15-1, §7.2).
const ADDRESS_PLACEHOLDER = 'Refer to MSG for Subscriber address';
// The label on the MSG that holds the SSA address. The guide prints the dash as '-' and as '–'.
const SSA_ADDRESS_MESSAGE = /^Subscriber address\s*[-–]\s*(.*)$/;
// EB04 values HETS sends on Medicare Secondary Payer rows (guide v15-1, MSP table).
const MSP_INSURANCE_TYPES = ['12', '13', '14', '15', '16', '41', '42', '43', '47', 'AP', 'WC'];

/**
 * Builds the Medicare view of one member of a HETS response.
 *
 * @param member - The member as `interpret271` returned it.
 * @param person - The member as `read271` returned it.
 * @param report - Receives problems found in the member.
 * @returns The member's Medicare rows.
 */
export function readMedicare(
    member: MemberEligibility,
    person: Person,
    report: (code: HetsFindingCode, segment: Segment, message: string) => void,
): MedicareView {
    const street = person.address.find(segment => segment.tag === 'N3');
    const hasPlaceholderAddress = street?.element(1) === ADDRESS_PLACEHOLDER;

    if (street && hasPlaceholderAddress) {
        report('placeholder-address', street, `N301 "${ADDRESS_PLACEHOLDER}" is not an address`);
    }

    // HETS adds an EB01 `D` row whose only purpose is this MSG (guide v15-1, Table 24).
    const addressText = member.otherBenefits
        .filter(benefit => benefit.status === 'D')
        .flatMap(benefit => benefit.messages)
        .map(message => SSA_ADDRESS_MESSAGE.exec(message)?.[1]?.trim())
        .find(text => text !== undefined);
    const hasSsaAddress = hasPlaceholderAddress && addressText !== '' && addressText !== 'Unknown';

    const qmbCostShares = member.costShares.filter(entry => entry.benefit.insuranceType === 'QM');
    const qmbOtherParties = member.otherParties.filter(entry => entry.benefit.insuranceType === 'QM');

    return {
        medicareAdvantage: member.otherParties
            .filter(entry => entry.kind === 'U' && entry.serviceTypes.includes('30'))
            .map(entry => readPlan(entry)),
        msp: member.otherParties
            .filter(entry => isMsp(entry))
            .map(entry => ({
                entry,
                policyNumber: referenceValue(entry, 'IG'),
                ref6P: referenceValue(entry, '6P'),
            })),
        partA: member.coverage.filter(entry => entry.benefit.insuranceType === 'MA'),
        partACostShares: member.costShares.filter(entry => entry.benefit.insuranceType === 'MA'),
        partB: member.coverage.filter(entry => entry.benefit.insuranceType === 'MB'),
        partBCostShares: member.costShares.filter(entry => entry.benefit.insuranceType === 'MB'),
        partD: member.otherParties
            .filter(entry => entry.kind === 'R' && entry.serviceTypes.includes('88'))
            .map(entry => readPlan(entry)),
        qmb: [...qmbCostShares, ...qmbOtherParties],
        ssaAddress: hasSsaAddress ? addressText : undefined,
    };
}

function isMsp(entry: OtherPartyEntry): boolean {
    if (entry.kind !== 'R' || !entry.serviceTypes.includes('30')) {
        return false;
    }

    return isOneOf(MSP_INSURANCE_TYPES, entry.benefit.insuranceType);
}

function readPlan(entry: OtherPartyEntry): MedicarePlanEntry {
    const planReference = entry.references.find(reference => reference.qualifier === 'N6');

    return {
        contract: referenceValue(entry, '18'),
        entry,
        plan: planReference?.value,
        planName: planReference?.description,
    };
}

function referenceValue(entry: OtherPartyEntry, qualifier: string): string | undefined {
    return entry.references.find(reference => reference.qualifier === qualifier)?.value;
}

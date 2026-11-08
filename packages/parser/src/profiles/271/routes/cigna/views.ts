import type { Segment } from '../../../../reader/segment.js';
import type { MemberEligibility } from '../../eligibility/types.js';
import type { Benefit, Person } from '../../types.js';
import type {
    AttributionEntry,
    CignaFindingCode,
    CignaView,
    HraBalanceEntry,
    NetworkEntry,
    PartnerEntry,
    SharedRiskNetworkEntry,
} from './types.js';

import { toPlainDate } from '../../eligibility/interpreter.js';

type Report = (code: CignaFindingCode, segment: Segment, message: string) => void;

// EB01 and EB03 codes for the plan coverage row.
const ACTIVE = '1';
const PLAN_COVERAGE = '30';
// REF01 for the plan network.
const NETWORK_REFERENCE = 'N6';
// Cigna's care management levels, and its provider participation and CareLink text.
const CARE_MANAGEMENT = /^(PHS\+?|.*Care Management)$/;
const CARE_LINK = /CareLink/i;
const IN_NETWORK = /\bis in network\b/i;
const OUT_OF_NETWORK = /\bis out of network\b/i;
// Attribution rows: the status each EB01 gives, the EB06, the DTP01 dates and the MSG.
const ATTRIBUTION_STATUSES = new Map<string | undefined, AttributionEntry['status']>([
    ['CB', 'yes'],
    ['D', 'no'],
    ['E', 'not-applicable'],
]);
const ATTRIBUTION_PERIOD = '25';
const ATTRIBUTION_START = '356';
const ATTRIBUTION_END = '357';
const ATTRIBUTION_MESSAGE = /^Attribution Status/i;
const ATTRIBUTION_WORD = /^Attribution Status\s*[-–]\s*(Yes|No|Not applicable)\s*$/i;
const MESSAGE_STATUSES = new Map<string | undefined, AttributionEntry['status']>([
    ['no', 'no'],
    ['not applicable', 'not-applicable'],
    ['yes', 'yes'],
]);
// EB01 codes for HRA, partner and shared-risk network rows, and the HRA MSG text.
const HRA = 'F';
const PARTNER = 'U';
const SHARED_RISK_NETWORK = 'N';
const HRA_KINDS = new Map<string, HraBalanceEntry['kind']>([
    ['hra balance', 'starting'],
    ['hra remaining balance', 'remaining'],
]);
// PER qualifier for the partner's phone number.
const TELEPHONE = 'TE';

/**
 * Builds the Cigna view of one member.
 *
 * @param member - The member as `interpret271` returned it.
 * @param person - The member as `read271` returned it.
 * @param report - Receives `attribution-status-mismatch` findings.
 * @returns The member's network, participation, care management level and Cigna rows.
 */
export function readCigna(
    member: MemberEligibility,
    person: Person,
    report: Report,
): CignaView {
    const activeRows = person.benefits.filter(benefit => benefit.status === ACTIVE);
    const planRows = activeRows.filter(benefit => benefit.serviceTypes.includes(PLAN_COVERAGE));
    const careManagement = activeRows
        .flatMap(benefit => benefit.messages)
        .find(message => CARE_MANAGEMENT.test(message));

    return {
        attribution: readAttribution(person, report),
        careManagement,
        hraBalances: readHraBalances(person),
        isCareLink: planRows.some(benefit => CARE_LINK.test(benefit.planDescription ?? '')),
        network: readNetwork(person),
        participation: readParticipation(planRows.flatMap(benefit => benefit.messages)),
        partners: readPartners(member),
        sharedRiskNetworks: readSharedRiskNetworks(person),
    };
}

function dateOf(benefit: Benefit, qualifier: string): Temporal.PlainDate | undefined {
    const segment = benefit.dates.find(date => date.element(1) === qualifier);

    return toPlainDate(segment?.element(3));
}

function readAttribution(person: Person, report: Report): AttributionEntry[] {
    const attribution: AttributionEntry[] = [];

    for (const benefit of person.benefits) {
        const status = ATTRIBUTION_STATUSES.get(benefit.status);
        const isAttributionRow = benefit.timePeriod === ATTRIBUTION_PERIOD
            && benefit.messages.some(message => ATTRIBUTION_MESSAGE.test(message));

        if (!status || !isAttributionRow) {
            continue;
        }

        const word = benefit.messages
            .map(message => ATTRIBUTION_WORD.exec(message)?.[1])
            .find(match => match !== undefined);
        const messageStatus = MESSAGE_STATUSES.get(word?.toLowerCase());

        if (word && messageStatus !== status) {
            report(
                'attribution-status-mismatch',
                benefit.eb,
                `EB01 "${benefit.status ?? ''}" does not match the attribution status "${word}"`,
            );
        }

        attribution.push({
            benefit,
            end: dateOf(benefit, ATTRIBUTION_END),
            start: dateOf(benefit, ATTRIBUTION_START),
            status,
        });
    }

    return attribution;
}

function readHraBalances(person: Person): HraBalanceEntry[] {
    const balances: HraBalanceEntry[] = [];

    for (const benefit of person.benefits) {
        if (benefit.status !== HRA) {
            continue;
        }

        const kind = benefit.messages
            .map(message => HRA_KINDS.get(message.trim().toLowerCase()))
            .find(match => match !== undefined);

        if (!kind) {
            continue;
        }

        balances.push({
            amount: benefit.amount,
            benefit,
            kind,
        });
    }

    return balances;
}

function readNetwork(person: Person): NetworkEntry | undefined {
    const segment = person.references.find(reference => reference.element(1) === NETWORK_REFERENCE);

    if (!segment) {
        return;
    }

    return {
        description: segment.element(3),
        name: segment.element(2),
        segment,
    };
}

function readParticipation(messages: string[]): CignaView['participation'] {
    for (const message of messages) {
        if (IN_NETWORK.test(message)) {
            return 'in-network';
        }

        if (OUT_OF_NETWORK.test(message)) {
            return 'out-of-network';
        }
    }
}

function readPartners(member: MemberEligibility): PartnerEntry[] {
    return member.otherParties
        .filter(entry => entry.kind === PARTNER)
        .map((entry) => {
            const [party] = entry.parties;

            return {
                benefit: entry.benefit,
                messages: entry.messages,
                name: party ? party.lastName : entry.planDescription,
                phone: party?.contacts.find(contact => contact.qualifier === TELEPHONE)?.number,
            };
        });
}

function readSharedRiskNetworks(person: Person): SharedRiskNetworkEntry[] {
    return person.benefits
        .filter(benefit => benefit.status === SHARED_RISK_NETWORK)
        .map(benefit => ({
            benefit,
            manager: benefit.relatedEntities[0]?.segments[0].element(3),
        }));
}

import type { Loop } from '../../../loops/types.js';
import type { Segment } from '../../../reader/segment.js';
import type { Finding } from '../../../reader/types.js';
import type { Benefit, Person, RequestError, Response271 } from '../types.js';
import type {
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
} from './types.js';

const ACTIVE_STATUSES = ['1', '2', '3', '4', '5'] as const;
// PER03, PER05 and PER07 each qualify the number in the element after them.
const CONTACT_QUALIFIER_POSITIONS = [3, 5, 7];
const COST_SHARE_KINDS = ['A', 'B', 'C', 'G'] as const satisfies CostShareEntry['kind'][];
const COVERAGE_STATUSES = [
    ...ACTIVE_STATUSES,
    '6',
    '7',
    '8',
    'I',
] as const satisfies CoverageEntry['status'][];
const D8_DATE = /^(\d{4})(\d{2})(\d{2})$/;
const NETWORKS = ['N', 'U', 'W', 'Y'] as const satisfies BenefitFields['network'][];
const OTHER_PARTY_KINDS = ['L', 'R', 'U'] as const satisfies OtherPartyEntry['kind'][];
// X12 decimal: an optional leading minus, digits, and an optional decimal point.
const X12_DECIMAL = /^-?(\d+\.?\d*|\.\d+)$/;

class EligibilityInterpreter {
    readonly #findings: Finding<EligibilityFindingCode>[];
    readonly #response: Response271;

    constructor(response: Response271) {
        this.#response = response;
        this.#findings = [...response.findings];
    }

    interpret(): Eligibility {
        const members = this.#response.subscribers.flatMap(subscriber => [
            this.#readMember(subscriber, 'subscriber'),
            ...allDependents(subscriber).map(dependent => this.#readMember(dependent, 'dependent')),
        ]);
        const sourceErrors = this.#response.sources
            .flatMap(source => source.errors)
            .map(error => readRequestError(error, 'source', undefined));
        const receiverErrors = this.#response.receivers
            .flatMap(receiver => receiver.errors)
            .map(error => readRequestError(error, 'receiver', undefined));
        const memberErrors = this.#response.subscribers.flatMap(subscriber => [
            ...readMemberErrors(subscriber, 'subscriber'),
            ...allDependents(subscriber).flatMap(
                dependent => readMemberErrors(dependent, 'dependent'),
            ),
        ]);

        return {
            findings: this.#findings,
            members,
            requestErrors: [...sourceErrors, ...receiverErrors, ...memberErrors],
        };
    }

    #parseDate(segment: Segment): DateEntry | undefined {
        const format = segment.element(2);
        const value = segment.element(3) ?? '';
        const texts = format === 'RD8' ? value.split('-') : [value];
        const isKnownFormat = format === 'D8' || (format === 'RD8' && texts.length === 2);
        const start = toPlainDate(texts[0]);
        const end = toPlainDate(texts.at(-1));
        const isOrderedRange = start && end && Temporal.PlainDate.compare(start, end) <= 0;

        if (!isKnownFormat || !isOrderedRange) {
            const message = `DTP02 "${format ?? ''}" and DTP03 "${value}" are not a valid date`;

            this.#report('invalid-date', segment, message);

            return undefined;
        }

        return {
            end,
            qualifier: segment.element(1) ?? '',
            start,
        };
    }

    // Invalid dates are reported and left out.
    #parseDates(segments: Segment[]): DateEntry[] {
        return segments.map(segment => this.#parseDate(segment)).filter(date => date !== undefined);
    }

    // An empty or absent value is undefined without a finding.
    #parseNumber(value: string | undefined, segment: Segment): number | undefined {
        if (value === undefined || value === '') {
            return undefined;
        }

        const number = Number(value);

        if (!X12_DECIMAL.test(value) || !Number.isFinite(number)) {
            this.#report('invalid-number', segment, `"${value}" is not an X12 decimal number`);

            return undefined;
        }

        return number;
    }

    #readBenefitFields(benefit: Benefit): BenefitFields {
        return {
            benefit,
            dates: this.#parseDates(benefit.dates),
            messages: benefit.messages,
            network: isOneOf(NETWORKS, benefit.inNetwork) ? benefit.inNetwork : undefined,
            references: benefit.references.map(segment => readReference(segment)),
            serviceTypes: benefit.serviceTypes,
        };
    }

    // The fields cost shares and limitations both have.
    #readCostShareFields(benefit: Benefit): Omit<CostShareEntry, 'kind'> {
        return {
            ...this.#readBenefitFields(benefit),
            additionalInfo: benefit.additionalInfo.map(segment => ({
                code: segment.element(2),
                qualifier: segment.element(1),
            })),
            amount: this.#parseNumber(benefit.amount, benefit.eb),
            coverageLevel: benefit.coverageLevel,
            percent: this.#parseNumber(benefit.percent, benefit.eb),
            timePeriod: benefit.timePeriod,
        };
    }

    #readCoverage(benefit: Benefit, status: CoverageEntry['status']): CoverageEntry {
        return {
            ...this.#readBenefitFields(benefit),
            insuranceType: benefit.insuranceType,
            isActive: isOneOf(ACTIVE_STATUSES, status),
            planDescription: benefit.planDescription,
            status,
        };
    }

    #readDateOfBirth(demographics: Segment | undefined): Temporal.PlainDate | undefined {
        if (demographics?.element(1) !== 'D8') {
            return undefined;
        }

        const text = demographics.element(2);
        const dateOfBirth = toPlainDate(text);

        if (!dateOfBirth) {
            const message = `DMG02 "${text ?? ''}" is not a valid D8 date`;

            this.#report('invalid-date', demographics, message);
        }

        return dateOfBirth;
    }

    #readDetails(person: Person): MemberDetails {
        return {
            address: readAddress(person.address),
            dateOfBirth: this.#readDateOfBirth(person.demographics),
            dates: this.#parseDates(person.dates),
            gender: person.demographics?.element(3),
            references: person.references.map(segment => readReference(segment)),
            relationship: person.relationship?.element(2),
        };
    }

    #readLimitation(benefit: Benefit): LimitationEntry {
        return {
            ...this.#readCostShareFields(benefit),
            limits: benefit.limits,
            quantity: {
                qualifier: benefit.quantity.qualifier,
                value: this.#parseNumber(benefit.quantity.value, benefit.eb),
            },
        };
    }

    #readMember(person: Person, role: MemberEligibility['role']): MemberEligibility {
        const member: MemberEligibility = {
            costShares: [],
            coverage: [],
            details: this.#readDetails(person),
            limitations: [],
            memberId: person.id,
            name: {
                first: person.name?.element(4),
                last: person.name?.element(3),
                middle: person.name?.element(5),
            },
            otherBenefits: [],
            otherParties: [],
            role,
        };

        for (const benefit of person.benefits) {
            const status = benefit.status;

            if (isOneOf(COVERAGE_STATUSES, status)) {
                member.coverage.push(this.#readCoverage(benefit, status));
            } else if (isOneOf(COST_SHARE_KINDS, status)) {
                member.costShares.push({ ...this.#readCostShareFields(benefit), kind: status });
            } else if (status === 'F') {
                member.limitations.push(this.#readLimitation(benefit));
            } else if (isOneOf(OTHER_PARTY_KINDS, status)) {
                member.otherParties.push(this.#readOtherParty(benefit, status));
            } else {
                member.otherBenefits.push(benefit);
            }
        }

        return member;
    }

    #readOtherParty(benefit: Benefit, kind: OtherPartyEntry['kind']): OtherPartyEntry {
        return {
            ...this.#readBenefitFields(benefit),
            insuranceType: benefit.insuranceType,
            kind,
            parties: benefit.relatedEntities.map(loop => readRelatedParty(loop)),
            planDescription: benefit.planDescription,
        };
    }

    #report(code: EligibilityFindingCode, segment: Segment, message: string): void {
        this.#findings.push({
            code,
            message,
            segment,
        });
    }
}

/**
 * Sorts the benefit rows of a 271 into lists a caller can filter, and reads their numbers and
 * dates. Codes are returned as they appear, without names. Values that cannot be read are
 * `undefined` and reported in `findings`; this function does not throw on payer data.
 *
 * @param response - The result of `read271`.
 * @returns Each member's rows, and every error the payer reported.
 *
 * @example
 * ```ts
 * import { interpret271, read271s, readX12 } from '@ediocracy/parser';
 *
 * for (const { response } of read271s(readX12(text))) {
 *     const eligibility = interpret271(response);
 *     const [member] = eligibility.members;
 *     const isActive = member?.coverage.some(
 *         entry => entry.isActive && entry.serviceTypes.includes('30'),
 *     );
 *     console.log(eligibility.requestErrors.length, isActive);
 * }
 * ```
 */
export function interpret271(response: Response271): Eligibility {
    return new EligibilityInterpreter(response).interpret();
}

function allDependents(person: Person): Person[] {
    return person.dependents.flatMap(dependent => [dependent, ...allDependents(dependent)]);
}

function isOneOf<Code extends string>(
    codes: readonly Code[],
    value: string | undefined,
): value is Code {
    const values: readonly (string | undefined)[] = codes;

    return values.includes(value);
}

// The N3 lines (N301, N302) and the N4 city, state and postal code (N401–N403).
function readAddress(segments: Segment[]): Address | undefined {
    const street = segments.find(segment => segment.tag === 'N3');
    const place = segments.find(segment => segment.tag === 'N4');

    if (!street && !place) {
        return undefined;
    }

    return {
        city: place?.element(1),
        lines: [street?.element(1), street?.element(2)].filter(line => line !== undefined),
        postalCode: place?.element(3),
        state: place?.element(2),
    };
}

function readMemberErrors(person: Person, level: MemberEligibility['role']): RequestErrorEntry[] {
    const ownErrors = person.errors.map(error => readRequestError(error, level, person.id));
    const benefitErrors = person.benefits
        .flatMap(benefit => benefit.errors)
        .map(error => readRequestError(error, 'benefit', person.id));

    return [...ownErrors, ...benefitErrors];
}

function readReference(segment: Segment): ReferenceEntry {
    return {
        description: segment.element(3),
        qualifier: segment.element(1) ?? '',
        value: segment.element(2),
    };
}

function readRelatedParty(loop: Loop): RelatedParty {
    const [name] = loop.segments;
    const contacts = loop.segments
        .filter(segment => segment.tag === 'PER')
        .flatMap(segment => CONTACT_QUALIFIER_POSITIONS.map(position => ({
            number: segment.element(position + 1),
            qualifier: segment.element(position),
        })))
        .filter(contact => contact.qualifier !== undefined && contact.qualifier !== '');

    return {
        address: readAddress(loop.segments),
        contacts,
        firstName: name.element(4),
        id: name.element(9),
        idQualifier: name.element(8),
        lastName: name.element(3),
        providerTaxonomy: loop.segments.find(segment => segment.tag === 'PRV')?.element(3),
        role: name.element(1),
    };
}

function readRequestError(
    error: RequestError,
    level: RequestErrorEntry['level'],
    memberId: string | undefined,
): RequestErrorEntry {
    return {
        followUp: error.followUp,
        level,
        memberId,
        rejectReason: error.code,
        segment: error.segment,
        validRequest: error.segment.element(1),
    };
}

function toPlainDate(text: string | undefined): Temporal.PlainDate | undefined {
    const match = D8_DATE.exec(text ?? '');

    if (!match || Number(match[1]) === 0) {
        return undefined;
    }

    try {
        return Temporal.PlainDate.from({
            day: Number(match[3]),
            month: Number(match[2]),
            year: Number(match[1]),
        }, { overflow: 'reject' });
    } catch (error) {
        if (error instanceof RangeError) {
            return undefined;
        }

        throw error;
    }
}

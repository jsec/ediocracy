import type { Segment } from '../../../reader/segment.js';
import type { Finding } from '../../../reader/types.js';
import type { Benefit, Response271FindingCode } from '../types.js';

/** A street address. */
export type Address = {
    /** City (N401). */
    city: string | undefined;
    /** Address lines (N301 and N302). */
    lines: string[];
    /** Postal code (N403). */
    postalCode: string | undefined;
    /** State or province code (N402). */
    state: string | undefined;
};

/** The fields every coverage, cost share, limitation and other party entry has. */
export type BenefitFields = {
    /** The benefit as `read271` returned it, for segments and elements the entry does not name. */
    benefit: Benefit;
    /** Dates that apply to the entry. Dates that could not be read are left out and reported. */
    dates: DateEntry[];
    /** Free-form message text, one entry per message. */
    messages: string[];
    /**
     * The network code (EB12), for filtering entries by the provider's network. `undefined` when
     * EB12 is absent or holds a code other than `N`, `U`, `W` or `Y`; the code is still in
     * `benefit`.
     */
    network: 'N' | 'U' | 'W' | 'Y' | undefined;
    /** Reference numbers for the entry. */
    references: ReferenceEntry[];
    /**
     * Service type codes (EB03). An entry answers questions about these service types only; an
     * entry for `30` does not stand in for other service types.
     */
    serviceTypes: string[];
};

/** A co-insurance, co-payment, deductible or out-of-pocket row. */
export type CostShareEntry = BenefitFields & {
    /** Additional information (III segments), such as the place of service. */
    additionalInfo: {
        /** The code (III02). */
        code: string | undefined;
        /** What kind of code `code` is (III01). */
        qualifier: string | undefined;
    }[];
    /** Amount (EB07). Deductible, co-payment and out-of-pocket rows put their value here. */
    amount: number | undefined;
    /** Who the row covers, such as the individual or family (EB02). */
    coverageLevel: string | undefined;
    /** The EB01 code. */
    kind: 'A' | 'B' | 'C' | 'G';
    /** Percentage as a fraction, so `.2` is `0.2` (EB08). Co-insurance rows use it. */
    percent: number | undefined;
    /** The code for the period `amount` applies to (EB06). */
    timePeriod: string | undefined;
};

/** A row that says whether coverage is active. */
export type CoverageEntry = BenefitFields & {
    /** Insurance type (EB04). */
    insuranceType: string | undefined;
    /** True for EB01 `1`–`5`; false for `6`–`8` and `I`. */
    isActive: boolean;
    /** The payer's name for the plan (EB05). */
    planDescription: string | undefined;
    /** The EB01 code. */
    status: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | 'I';
};

/**
 * A date or date range. Compare it with a date of service using `Temporal.PlainDate.compare`.
 */
export type DateEntry = {
    /** The last day. Equal to `start` for a single date. */
    end: Temporal.PlainDate;
    /** What the date is for (DTP01). */
    qualifier: string;
    /** The first day. */
    start: Temporal.PlainDate;
};

/** The result of `interpret271`: the members' benefit rows, sorted into lists. */
export type Eligibility = {
    /** Problems found while reading the response, then values that could not be read. */
    findings: Finding<EligibilityFindingCode>[];
    /** The subscriber, then each of their dependents, for every subscriber in order. */
    members: MemberEligibility[];
    /**
     * Every error the payer reported: the sources' errors, then the receivers', then for each
     * member their own errors followed by their benefits' errors. The library does not decide
     * whether the response is rejected. Stedi treats a response with any of these as a failure,
     * even when it includes benefits.
     */
    requestErrors: RequestErrorEntry[];
};

/**
 * A problem found while reading or interpreting a 271.
 *
 * - `invalid-date`: a date that is not `CCYYMMDD` or a `CCYYMMDD-CCYYMMDD` range, a day that does
 *   not exist, year 0000, or a range that ends before it starts. The date is left out.
 * - `invalid-number`: an amount, percentage or quantity that is not a decimal number such as
 *   `.2`, `5555.16` or `-95`. The value is `undefined`.
 * - the codes `read271` reports.
 */
export type EligibilityFindingCode = 'invalid-date' | 'invalid-number' | Response271FindingCode;

/** A row that limits a benefit, such as a number of visits. */
export type LimitationEntry = Omit<CostShareEntry, 'kind'> & {
    /** Limits on how often the service can be delivered (HSD segments). */
    limits: Segment[];
    /** The limit. */
    quantity: {
        /** What the quantity counts (EB09). */
        qualifier: string | undefined;
        /** The quantity (EB10). */
        value: number | undefined;
    };
};

/** Facts about a subscriber or dependent. */
export type MemberDetails = {
    /** The member's address. */
    address: Address | undefined;
    /** Date of birth, when the payer sent one as `CCYYMMDD`. */
    dateOfBirth: Temporal.PlainDate | undefined;
    /** Dates that apply to the member, such as plan dates, in order. */
    dates: DateEntry[];
    /** Gender code (DMG03). */
    gender: string | undefined;
    /** Reference numbers, such as the group number, in order. Repeated qualifiers are all kept. */
    references: ReferenceEntry[];
    /** The dependent's relationship to the subscriber (INS02). */
    relationship: string | undefined;
};

/**
 * One subscriber or dependent and their benefit rows. Every row is in exactly one list. Rows are
 * kept as sent, including rows that repeat others.
 */
export type MemberEligibility = {
    /** Co-insurance, co-payment, deductible and out-of-pocket rows. */
    costShares: CostShareEntry[];
    /** Rows that say whether coverage is active. */
    coverage: CoverageEntry[];
    /** Facts about the member. */
    details: MemberDetails;
    /** Rows that limit a benefit. */
    limitations: LimitationEntry[];
    /** Member ID (NM109). Often absent for dependents. */
    memberId: string | undefined;
    /** The member's name. */
    name: {
        /** First name (NM104). */
        first: string | undefined;
        /** Last name (NM103). */
        last: string | undefined;
        /** Middle name (NM105). */
        middle: string | undefined;
    };
    /** Rows of any other kind, as `read271` returned them. */
    otherBenefits: Benefit[];
    /** Rows that name another payer, a benefit contact, or a primary care provider. */
    otherParties: OtherPartyEntry[];
    /** Whether the member is the subscriber or one of their dependents. */
    role: 'dependent' | 'subscriber';
};

/** A row that names another payer, a benefit contact, or a primary care provider. */
export type OtherPartyEntry = BenefitFields & {
    /** Insurance type (EB04). */
    insuranceType: string | undefined;
    /** The EB01 code. */
    kind: 'L' | 'R' | 'U';
    /** The parties the row names. Empty when the payer sent only the row. */
    parties: RelatedParty[];
    /** The payer's name for the plan (EB05). */
    planDescription: string | undefined;
};

/** A reference number. */
export type ReferenceEntry = {
    /** Description (REF03). */
    description: string | undefined;
    /** What kind of number `value` is (REF01). */
    qualifier: string;
    /** The number (REF02). */
    value: string | undefined;
};

/** A party a benefit row names, such as a payer or provider. */
export type RelatedParty = {
    /** The party's address. */
    address: Address | undefined;
    /** Phone numbers, websites and other contacts, in order. */
    contacts: {
        /** The phone number, address or URL. */
        number: string | undefined;
        /** What kind of contact `number` is. */
        qualifier: string | undefined;
    }[];
    /** First name of a person (NM104). */
    firstName: string | undefined;
    /** Identifier, such as an NPI or payer ID (NM109). */
    id: string | undefined;
    /** What kind of identifier `id` is (NM108). */
    idQualifier: string | undefined;
    /** Last name of a person, or an organization's name (NM103). */
    lastName: string | undefined;
    /** Provider taxonomy code (PRV03). */
    providerTaxonomy: string | undefined;
    /** What role the party has (NM101). */
    role: string | undefined;
};

/** An error the payer reported. */
export type RequestErrorEntry = {
    /** What the payer says to do next (AAA04). */
    followUp: string | undefined;
    /** Where the error was reported: about the payer, the provider, a member, or one benefit. */
    level: 'benefit' | 'dependent' | 'receiver' | 'source' | 'subscriber';
    /** The member's ID for member and benefit errors; `undefined` otherwise or when not sent. */
    memberId: string | undefined;
    /** Why the payer rejected the request (AAA03). */
    rejectReason: string | undefined;
    /** The AAA segment itself. */
    segment: Segment;
    /** Whether the request was valid (AAA01). */
    validRequest: string | undefined;
};

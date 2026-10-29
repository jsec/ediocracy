import type { Loop, LoopFindingCode } from '../../loops/types.js';
import type { Segment } from '../../reader/segment.js';
import type { Finding } from '../../reader/types.js';

/**
 * One benefit (an EB segment) and the segments that qualify it. Codes are returned as they appear,
 * without translation.
 */
export type Benefit = {
    /** Additional information (III segments), such as the place of service or nature of injury. */
    additionalInfo: Segment[];
    /** Monetary amount (EB07). */
    amount: string | undefined;
    /** Whether the service needs authorization or certification (EB11). */
    authorizationRequired: string | undefined;
    /** Who the benefit covers, such as the individual or family (EB02). */
    coverageLevel: string | undefined;
    /** Dates that apply to the benefit (DTP segments). */
    dates: Segment[];
    /** The EB segment itself, for elements this type does not name. */
    eb: Segment;
    /** Errors the payer reported for this benefit (AAA segments). */
    errors: RequestError[];
    /** Whether the benefit applies in network (EB12). */
    inNetwork: string | undefined;
    /** Insurance type, such as an HMO or Medicare Part B (EB04). */
    insuranceType: string | undefined;
    /** Limits on how often the service can be delivered (HSD segments). */
    limits: Segment[];
    /** Free-form message text (MSG01), one entry per message. */
    messages: string[];
    /** Percentage, such as coinsurance (EB08). */
    percent: string | undefined;
    /** Plan coverage description (EB05). */
    planDescription: string | undefined;
    /** Quantity qualifier (EB09) and quantity (EB10). */
    quantity: { qualifier: string | undefined; value: string | undefined };
    /** Reference numbers for the benefit (REF segments). */
    references: Segment[];
    /**
     * Other parties the benefit refers to, such as a primary care provider or another payer. The
     * first segment of each is the NM1 that names the party, followed by its address, contact and
     * provider segments.
     */
    relatedEntities: Loop[];
    /** Service type codes (EB03), one per repetition. */
    serviceTypes: string[];
    /** Eligibility or benefit information code, such as active coverage or a co-payment (EB01). */
    status: string | undefined;
    /** Time period the amount or quantity applies to, such as per visit or per year (EB06). */
    timePeriod: string | undefined;
};

/** A payer, provider, subscriber or dependent named in the response. */
export type Party = {
    /** Errors the payer reported about this party (AAA segments). */
    errors: RequestError[];
    /** Identifier, such as a payer ID, NPI or member ID (NM109). */
    id: string | undefined;
    /** What kind of identifier `id` is (NM108). */
    idQualifier: string | undefined;
    /** The NM1 segment that names the party, or `undefined` when the response does not name it. */
    name: Segment | undefined;
};

/** A subscriber or dependent. */
export type Person = Party & {
    /** The benefits reported for this person. */
    benefits: Benefit[];
    /** The dependents listed under this person. */
    dependents: Person[];
    /** Trace numbers (TRN segments). */
    traces: Segment[];
};

/** An error the payer reported instead of, or alongside, an answer (an AAA segment). */
export type RequestError = {
    /** Why the payer rejected the request (AAA03). */
    code: string | undefined;
    /** What the payer says to do next (AAA04). */
    followUp: string | undefined;
    /** The AAA segment itself. */
    segment: Segment;
};

/** A 271 eligibility response. */
export type Response271 = {
    /** Problems found while reading the response. */
    findings: Finding<Response271FindingCode>[];
    /** The parties that asked, usually a provider. */
    receivers: Party[];
    /** Reference identification (BHT03). */
    reference: string | undefined;
    /** The parties that answered, usually a payer. */
    sources: Party[];
    /** The subscribers, each with any dependents. */
    subscribers: Person[];
};

/**
 * A problem found while reading a 271. The rest of the response is still read.
 *
 * - `unexpected-segment`: a segment the 005010X279A1 guide does not allow where it appears, such as
 *   a second name for the same person.
 * - `unknown-hl-level`: a hierarchical level code (HL03) other than 20, 21, 22 or 23.
 * - `missing-hl-parent`: a level whose parent (HL02) does not appear earlier in the response.
 * - `duplicate-hl-id`: two levels with the same ID (HL01).
 * - `unclosed-loop`: a list of related parties that starts (LS) but does not end (LE).
 * - `unexpected-version`: the version (ST03 or GS08) is not `005010X279A1`.
 */
export type Response271FindingCode = 'unexpected-version' | LoopFindingCode;

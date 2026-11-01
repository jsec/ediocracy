import type { Segment } from '../../../reader/segment.js';
import type { Delimiters, Finding } from '../../../reader/types.js';
import type { Eligibility, MemberEligibility, RequestErrorEntry } from '../eligibility/types.js';
import type { read271s } from '../reader.js';
import type { Person } from '../types.js';

/**
 * The result of `interpretRoute`: the `interpret271` result, the route's conditions for each
 * error, the route's findings, and one view per member.
 */
export type RouteEligibility<View, FindingCode extends string> = {
    /** `interpret271(entry.response)`, unchanged. */
    eligibility: Eligibility;
    /** `eligibility.requestErrors`, in the same order, each with the route's condition. */
    errors: RouteErrorEntry[];
    /** Route findings, then the findings the profile's `readMember` reported, in member order. */
    findings: Finding<FindingCode | RouteFindingCode>[];
    /** One view per member, in the order of `eligibility.members`. */
    members: View[];
};

/** One item returned by `read271s`. */
export type RouteEntry = ReturnType<typeof read271s>[number];

/** An AAA condition a route documents, matched by level and AAA03. */
export type RouteErrorCondition = {
    /** A stable key for the condition, for example `mbi-not-matched`. */
    condition: string;
    /** One line that says what went wrong. */
    description: string;
    /** Where the AAA appears. AAAs on a benefit are always reported as `unlisted-error`. */
    level: Exclude<RequestErrorEntry['level'], 'benefit'>;
    /** The AAA03 code. */
    rejectReason: string;
};

/** An error the payer reported, with the route's condition when the route lists it. */
export type RouteErrorEntry = RequestErrorEntry & {
    /** The route's key, or `undefined` when the route does not list this level and AAA03. */
    condition: string | undefined;
    /** The route's description, or `undefined` when the route does not list the error. */
    description: string | undefined;
};

/**
 * A problem with a response from a route.
 *
 * - `member-id-placeholder`: a member's NM109 holds a value the route sends instead of an ID.
 * - `unexpected-delimiters`: the ISA declares separators other than the route's.
 * - `unexpected-receiver`: a 2100B NM101 the route does not allow.
 * - `unexpected-source`: a 2100A NM101, NM108 or NM109 other than the route's.
 * - `unlisted-error`: an AAA whose level and AAA03 the route does not list.
 */
export type RouteFindingCode
    = | 'member-id-placeholder'
        | 'unexpected-delimiters'
        | 'unexpected-receiver'
        | 'unexpected-source'
        | 'unlisted-error';

/** The rules of one route, such as a payer or clearinghouse. */
export type RouteProfile<View, FindingCode extends string> = {
    /** Separators the route always sends. */
    delimiters: Delimiters;
    /** The AAA conditions the route documents. */
    errors: RouteErrorCondition[];
    /** NM109 values the route sends in place of a member ID. */
    memberIdPlaceholders: string[];
    /** The route's name, used in finding messages. */
    name: string;
    /** Builds the route's view of one member. Problems found are passed to `report`. */
    readMember: (
        member: MemberEligibility,
        person: Person,
        report: (code: FindingCode, segment: Segment, message: string) => void,
    ) => View;
    /** The 2100B NM101 values the route allows. */
    receiverEntityCodes: string[];
    /** The 2100A NM101, NM108 and NM109 the route always sends. */
    source: {
        /** NM101. */
        entityCode: string;
        /** NM109. */
        id: string;
        /** NM108. */
        idQualifier: string;
    };
};

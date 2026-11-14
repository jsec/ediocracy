import type { Segment } from '../../../reader/segment.js';
import type { Delimiters, Finding } from '../../../reader/types.js';
import type { Eligibility, MemberEligibility, RequestErrorEntry } from '../eligibility/types.js';
import type { read271s } from '../reader.js';
import type { Person } from '../types.js';
import type { CignaFindingCode, CignaView } from './cigna/types.js';
import type { HcscFindingCode, HcscView } from './hcsc/types.js';
import type { HetsFindingCode, MedicareView } from './hets/types.js';
import type { HumanaFindingCode, HumanaView } from './humana/types.js';
import type { UhcFindingCode, UhcView } from './uhc/types.js';

/**
 * The result of `interpretRoute(entry)`. `route` names the profile whose `payerIds` include the
 * response's 2100A NM109, and `result` is that profile's result. When no profile lists the payer
 * ID, `route` is `undefined` and `eligibility` is the `interpret271` result.
 */
export type DetectedRoute
    = | {
        /** `interpret271(entry.response)`. */
        eligibility: Eligibility;
        /** No profile lists the payer ID. */
        route: undefined;
    }
    | {
        /** `interpretRoute(entry, cignaProfile)`. */
        result: RouteEligibility<CignaView, CignaFindingCode>;
        /** The route whose profile lists the payer ID. */
        route: 'cigna';
    }
    | {
        /** `interpretRoute(entry, hcscProfile)`. */
        result: RouteEligibility<HcscView, HcscFindingCode>;
        /** The route whose profile lists the payer ID. */
        route: 'hcsc';
    }
    | {
        /** `interpretRoute(entry, hetsProfile)`. */
        result: RouteEligibility<MedicareView, HetsFindingCode>;
        /** The route whose profile lists the payer ID. */
        route: 'hets';
    }
    | {
        /** `interpretRoute(entry, humanaProfile)`. */
        result: RouteEligibility<HumanaView, HumanaFindingCode>;
        /** The route whose profile lists the payer ID. */
        route: 'humana';
    }
    | {
        /** `interpretRoute(entry, uhcProfile)`. */
        result: RouteEligibility<UhcView, UhcFindingCode>;
        /** The route whose profile lists the payer ID. */
        route: 'uhc';
    };

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

/** An AAA condition a route documents. */
export type RouteErrorCondition = {
    /** A stable key for the condition, for example `mbi-not-matched`. */
    condition: string;
    /** One line that says what went wrong. */
    description: string;
    /** Where the AAA appears. */
    level?: RequestErrorEntry['level'];
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
    delimiters?: Delimiters;
    /** The AAA conditions the route documents. */
    errors: RouteErrorCondition[];
    /** True when `errors` lists every AAA the route sends. */
    listsAllErrors: boolean;
    /** NM109 values the route sends in place of a member ID. */
    memberIdPlaceholders?: string[];
    /** The route's name. */
    name: string;
    /** The 2100A NM109 values whose responses `interpretRoute(entry)` applies this profile to. */
    payerIds: string[];
    /**
     * Builds the route's view of one member. Problems found are passed to `report`. `entry` is
     * the response the member came from.
     */
    readMember: (
        member: MemberEligibility,
        person: Person,
        report: (code: FindingCode, segment: Segment, message: string) => void,
        entry: RouteEntry,
    ) => View;
    /** The 2100B NM101 values the route allows. */
    receiverEntityCodes?: string[];
    /** The 2100A NM101, NM108 and NM109 the route sends. When left out, 2100A is not checked. */
    source?: {
        /** NM101. */
        entityCode: string;
        /** NM109, or the list of NM109 values the route allows. */
        id: string | string[];
        /** NM108, or the list of NM108 values the route allows. */
        idQualifier: string | string[];
    };
};

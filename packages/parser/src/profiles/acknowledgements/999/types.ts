import type { LoopFindingCode } from '../../../loops/types.js';
import type { Segment } from '../../../reader/segment.js';
import type { Finding } from '../../../reader/types.js';

/** The functional group a 999 acknowledges (AK1). */
export type AcknowledgedGroup = {
    /** Group control number: GS06 of the acknowledged group (AK102). */
    controlNumber: string | undefined;
    /** Functional identifier code: GS01 of the acknowledged group, such as `HS` (AK101). */
    functionalId: string | undefined;
    /** The AK1 segment. */
    segment: Segment;
    /** Version: GS08 of the acknowledged group, such as `005010X279A1` (AK103). */
    version: string | undefined;
};

/** An element in error (loop 2110: IK4 and its CTX segments). */
export type ElementError = {
    /** Copy of the bad element (IK404). */
    badValue: string | undefined;
    /** Element contexts (CTX segments after the IK4). */
    contexts: ErrorContext[];
    /** Element syntax error code (IK403). */
    error: string | undefined;
    /** Where the element is in its segment (IK401). */
    position: ElementPosition | undefined;
    /** Data element reference number (IK402). */
    referenceNumber: number | undefined;
    /** The IK4 segment. */
    segment: Segment;
};

/** A position in a segment (composite C030, used by IK401 and CTX05). */
export type ElementPosition = {
    /** Component position in the composite (C030-02). */
    component: number | undefined;
    /** Element position, counting the first element after the segment ID as 1 (C030-01). */
    element: number;
    /** Repetition position (C030-03). */
    repetition: number | undefined;
};

/** A CTX segment: the context of a segment or element error. */
export type ErrorContext = {
    /** Position in the segment (CTX05). */
    elementPosition: ElementPosition | undefined;
    /** Loop identifier (CTX04). */
    loopId: string | undefined;
    /** Context name, such as `SITUATIONAL TRIGGER` or `TRN02` (CTX01-1). */
    name: string | undefined;
    /** Context reference, such as a trace number (CTX01-2). */
    reference: string | undefined;
    /** Data element reference numbers (CTX06). */
    referenceNumbers: undefined | {
        /** Reference number of the component (CTX06-2). */
        component: number | undefined;
        /** Reference number of the element (CTX06-1). */
        element: number;
    };
    /** The CTX segment. */
    segment: Segment;
    /** Segment position in the transaction set, counting ST as 1 (CTX03). */
    segmentPosition: number | undefined;
    /** Segment ID (CTX02). */
    tag: string | undefined;
};

/** The acknowledgment of a functional group (AK9). */
export type GroupResult = TransactionSetResult & {
    /** Number of transaction sets accepted (AK904). */
    accepted: number | undefined;
    /** Number of transaction sets included (AK902). */
    included: number | undefined;
    /** Number of transaction sets received (AK903). */
    received: number | undefined;
};

/** A 999 implementation acknowledgment under the 005010X231A1 guide. */
export type Response999 = {
    /** Problems found while reading the acknowledgment. */
    findings: Finding<Response999FindingCode>[];
    /** The acknowledged functional group (AK1). */
    group: AcknowledgedGroup | undefined;
    /** The acknowledgment of the functional group (AK9). */
    result: GroupResult | undefined;
    /** The acknowledged transaction sets (loop 2000), in order. */
    transactionSets: TransactionSetResponse[];
};

/**
 * A problem found while reading a 999.
 *
 * - `invalid-number`: an N0 element or component that is not all digits.
 * - `missing-segment`: no AK1, no AK9, or a loop 2000 without an IK5.
 * - `unexpected-segment`: a segment the 005010X231A1 guide does not allow where it appears, or a
 *   second AK1, AK9, or IK5 in one loop 2000.
 * - `unexpected-version`: the version (ST03 or GS08) is not `005010X231A1`.
 */
export type Response999FindingCode
    = 'invalid-number'
        | 'missing-segment'
        | 'unexpected-version'
        | Extract<LoopFindingCode, 'unexpected-segment'>;

/** A segment in error (loop 2100: IK3, its CTX segments and its element errors). */
export type SegmentError = {
    /** Segment contexts (CTX segments after the IK3). */
    contexts: ErrorContext[];
    /** The elements in error (loop 2110), in order. */
    elementErrors: ElementError[];
    /** Segment syntax error code (IK304). */
    error: string | undefined;
    /** Loop identifier (IK303). */
    loopId: string | undefined;
    /** Segment position in the transaction set, counting ST as 1 (IK302). */
    position: number | undefined;
    /** The IK3 segment. */
    segment: Segment;
    /** Segment ID (IK301). */
    tag: string | undefined;
};

/** One acknowledged transaction set (loop 2000: AK2, its segment errors and IK5). */
export type TransactionSetResponse = {
    /** Transaction set control number: ST02 of the acknowledged set (AK202). */
    controlNumber: string | undefined;
    /** Implementation convention reference: ST03 of the acknowledged set (AK203). */
    convention: string | undefined;
    /** Transaction set identifier code: ST01 of the acknowledged set, such as `270` (AK201). */
    id: string | undefined;
    /** The acknowledgment of the transaction set (IK5). */
    result: TransactionSetResult | undefined;
    /** The AK2 segment. */
    segment: Segment;
    /** The segments in error (loop 2100), in order. */
    segmentErrors: SegmentError[];
};

/** The acknowledgment of a transaction set (IK5), or the shared part of a group's (AK9). */
export type TransactionSetResult = {
    /** Acknowledgment code, such as `A` or `R` (IK501 or AK901). */
    code: string | undefined;
    /** The IK5 or AK9 segment. */
    segment: Segment;
    /** Syntax error codes (IK502–IK506 or AK905–AK909), without empty elements. */
    syntaxErrors: string[];
};

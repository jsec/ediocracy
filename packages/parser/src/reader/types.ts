import type { Segment } from './segment.js';

export type Delimiters = {
    component: string;
    element: string;
    // Undefined before ISA version 00501, which has no repetition separator.
    repetition: string | undefined;
    segment: string;
};

export type Finding<Code extends string> = {
    code: Code;
    message: string;
    segment: Segment;
};

export type FunctionalGroup = {
    header: Segment;
    trailer: Segment;
    transactions: Transaction[];
};

export type Interchange = {
    delimiters: Delimiters;
    groups: FunctionalGroup[];
    header: Segment;
    segments: Segment[];
    trailer: Segment;
};

/**
 * A problem the reader found in text it could still read.
 *
 * - `st-se-segment-count-mismatch`, `gs-ge-transaction-count-mismatch`, `isa-iea-group-count-mismatch`:
 *   SE01, GE01 or IEA01 does not match the number of segments, transaction sets or groups.
 * - `st-se-control-mismatch`, `gs-ge-control-mismatch`, `isa-iea-control-mismatch`:
 *   SE02, GE02 or IEA02 does not match the control number in ST02, GS06 or ISA13.
 * - `missing-control-number`: ST02, GS06 or ISA13 is absent or blank.
 * - `trailing-element-separator`, `trailing-repetition-separator`, `trailing-component-separator`:
 *   a segment ends with that separator.
 */
export type ReaderFindingCode
    = 'gs-ge-control-mismatch'
        | 'gs-ge-transaction-count-mismatch'
        | 'isa-iea-control-mismatch'
        | 'isa-iea-group-count-mismatch'
        | 'missing-control-number'
        | 'st-se-control-mismatch'
        | 'st-se-segment-count-mismatch'
        | 'trailing-component-separator'
        | 'trailing-element-separator'
        | 'trailing-repetition-separator';

/**
 * Why `readX12` could not read the text. Each value is the `code` of an {@link X12SyntaxError}.
 *
 * - `invalid-isa`: an ISA is shorter than 106 characters, lacks an element separator at a fixed position,
 *   or has delimiters that repeat or are letters or digits.
 * - `missing-se`, `missing-ge`, `missing-iea`: a transaction set, group or interchange has no trailer
 *   before the next envelope segment or the end of the text.
 * - `misplaced-envelope-segment`: an ST outside a group, an SE or GE with no matching header,
 *   or a segment other than TA1 directly inside an interchange or group.
 * - `unterminated-segment`: text after the last segment terminator inside an interchange.
 * - `unexpected-data`: text outside an interchange, an empty segment, or no ISA at all.
 */
export type SyntaxErrorCode
    = 'invalid-isa'
        | 'misplaced-envelope-segment'
        | 'missing-ge'
        | 'missing-iea'
        | 'missing-se'
        | 'unexpected-data'
        | 'unterminated-segment';

export type Transaction = {
    header: Segment;
    segments: Segment[];
    trailer: Segment;
};

export type X12Document = { findings: Finding<ReaderFindingCode>[]; interchanges: Interchange[] };

import type { Segment } from './segment.js';

/** The separator characters an interchange declares in its ISA segment. */
export type Delimiters = {
    /** Separates the components of a composite element (ISA16). */
    component: string;
    /** Separates elements within a segment (the character after `ISA`). */
    element: string;
    /**
     * Separates repeated values of one element (ISA11). Undefined before ISA version 00501, which
     * has no repetition separator.
     */
    repetition: string | undefined;
    /** Ends each segment (the character after ISA16). */
    segment: string;
};

/** A problem found in text that could still be read. `Code` lists the possible problems. */
export type Finding<Code extends string> = {
    /** Which problem was found. */
    code: Code;
    /** A description of the problem that names the elements involved. */
    message: string;
    /** The segment where the problem was found. */
    segment: Segment;
};

/** A functional group: a GS segment, its transaction sets, and its GE segment. */
export type FunctionalGroup = {
    /** The GS segment. */
    header: Segment;
    /** The GE segment. */
    trailer: Segment;
    /** The transaction sets in the group, in the order they appear. */
    transactions: Transaction[];
};

/** An interchange: an ISA segment, its functional groups, and its IEA segment. */
export type Interchange = {
    /** The separators declared in the ISA segment. */
    delimiters: Delimiters;
    /** The functional groups in the interchange, in the order they appear. */
    groups: FunctionalGroup[];
    /** The ISA segment. */
    header: Segment;
    /** TA1 segments that appear directly inside the interchange, outside any group. */
    segments: Segment[];
    /** The IEA segment. */
    trailer: Segment;
};

/**
 * A problem the reader found in text it could still read.
 *
 * - `st-se-segment-count-mismatch`, `gs-ge-transaction-count-mismatch`,
 *   `isa-iea-group-count-mismatch`: SE01, GE01 or IEA01 does not match the number of segments,
 *   transaction sets or groups.
 * - `st-se-control-mismatch`, `gs-ge-control-mismatch`, `isa-iea-control-mismatch`: SE02, GE02 or
 *   IEA02 does not match the control number in ST02, GS06 or ISA13.
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
 * - `invalid-isa`: an ISA is shorter than 106 characters, lacks an element separator at a fixed
 *   position, or has delimiters that repeat or are letters or digits.
 * - `missing-se`, `missing-ge`, `missing-iea`: a transaction set, group or interchange has no
 *   trailer before the next envelope segment or the end of the text.
 * - `misplaced-envelope-segment`: an ST outside a group, an SE or GE with no matching header, or a
 *   segment other than TA1 directly inside an interchange or group.
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

/** A transaction set: an ST segment, its content, and its SE segment. */
export type Transaction = {
    /** The ST segment. */
    header: Segment;
    /** The segments between ST and SE, in the order they appear. */
    segments: Segment[];
    /** The SE segment. */
    trailer: Segment;
};

/** The result of {@link readX12}. */
export type X12Document = {
    /** Problems found in text that could still be read. */
    findings: Finding<ReaderFindingCode>[];
    /** The interchanges in the text, in the order they appear. */
    interchanges: Interchange[];
};

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

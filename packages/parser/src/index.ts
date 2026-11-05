/**
 * Reads X12 text into interchanges, functional groups, transactions and segments.
 *
 * @module @ediocracy/parser
 */
export type { Loop, LoopFindingCode } from './loops/types.js';
export { X12SyntaxError } from './reader/errors.js';
export { readX12 } from './reader/reader.js';
export type { Segment } from './reader/segment.js';
export type {
    Delimiters,
    Finding,
    FunctionalGroup,
    Interchange,
    ReaderFindingCode,
    SyntaxErrorCode,
    Transaction,
    X12Document,
} from './reader/types.js';

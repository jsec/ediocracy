import type { SyntaxErrorCode } from './types.js';

/**
 * Thrown by `readX12` when the text cannot be read as X12.
 *
 * @example
 * ```ts
 * import { readX12, X12SyntaxError } from '@ediocracy/parser';
 *
 * try {
 *     readX12('not x12');
 * } catch (error) {
 *     if (error instanceof X12SyntaxError) {
 *         console.log(error.code, error.offset);
 *     }
 * }
 * ```
 */
export class X12SyntaxError extends Error {
    /** Why the text could not be read. */
    readonly code: SyntaxErrorCode;
    /** The index in the text where the problem was found. */
    readonly offset: number;

    constructor(code: SyntaxErrorCode, offset: number, message: string) {
        super(`${message} (offset ${offset})`);
        this.name = 'X12SyntaxError';
        this.code = code;
        this.offset = offset;
    }
}

import type { SyntaxErrorCode } from './types.js';

export class X12SyntaxError extends Error {
    readonly code: SyntaxErrorCode;
    readonly offset: number;

    constructor(code: SyntaxErrorCode, offset: number, message: string) {
        super(`${message} (offset ${offset})`);
        this.name = 'X12SyntaxError';
        this.code = code;
        this.offset = offset;
    }
}

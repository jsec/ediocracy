import type { Delimiters, Finding, FunctionalGroup, Interchange, ReaderFindingCode, Transaction, X12Document } from './types.js';

import {
    BYTE_ORDER_MARK,
    DIGITS_ONLY,
    FIRST_VERSION_WITH_REPETITION,
    IGNORABLE_CHARACTERS,
    ISA_COMPONENT_OFFSET,
    ISA_ELEMENT_SEPARATOR_OFFSET,
    ISA_LENGTH,
    ISA_REPETITION_OFFSET,
    ISA_SEPARATOR_OFFSETS,
    ISA_TERMINATOR_OFFSET,
    ISA_VERSION_END,
    ISA_VERSION_START,
    LETTER_OR_DIGIT,
    UNEXPECTED_TEXT_PREVIEW_LENGTH,
} from './constants.js';
import { X12SyntaxError } from './errors.js';
import { Segment } from './segment.js';

// The interchange being read, with its open group and transaction set.
type OpenInterchange = {
    delimiters: Delimiters;
    group: Omit<FunctionalGroup, 'trailer'> | undefined;
    groups: FunctionalGroup[];
    header: Segment;
    segments: Segment[];
    transaction: Omit<Transaction, 'trailer'> | undefined;
};

class Reader {
    readonly #findings: Finding<ReaderFindingCode>[] = [];
    readonly #interchanges: Interchange[] = [];
    #offset = 0;
    readonly #text: string;

    constructor(text: string) {
        this.#text = text;
    }

    read(): X12Document {
        this.#skipIgnorable();

        if (this.#offset >= this.#text.length) {
            throw new X12SyntaxError('unexpected-data', 0, 'The text contains no ISA segment');
        }

        while (this.#offset < this.#text.length) {
            if (!this.#text.startsWith('ISA', this.#offset)) {
                const found = this.#text.slice(this.#offset, this.#offset + UNEXPECTED_TEXT_PREVIEW_LENGTH);

                throw new X12SyntaxError('unexpected-data', this.#offset, `Expected an ISA segment, found "${found}"`);
            }

            this.#interchanges.push(this.#readInterchange());
            this.#skipIgnorable();
        }

        return { findings: this.#findings, interchanges: this.#interchanges };
    }

    // Reports a trailer control number (SE02, GE02, IEA02) that does not match its header's.
    #checkControl(check: {
        code: ReaderFindingCode;
        header: Segment;
        isNumeric: boolean;
        position: number;
        trailer: Segment;
    }): void {
        const expected = check.header.element(check.position) ?? '';

        if (expected.trim() === '') {
            return;
        }

        const actual = check.trailer.element(2);
        const isSame = check.isNumeric ? isSameValue(actual, expected) : actual === expected;
        const headerElement = `${check.header.tag}${String(check.position).padStart(2, '0')}`;

        if (!isSame) {
            this.#report(check.code, check.trailer, `${check.trailer.tag}02 "${actual ?? ''}" does not match ${headerElement} "${expected}"`);
        }
    }

    #checkControlNumber(header: Segment, position: number): void {
        const controlNumber = header.element(position) ?? '';
        const headerElement = `${header.tag}${String(position).padStart(2, '0')}`;

        if (controlNumber.trim() === '') {
            this.#report('missing-control-number', header, `${headerElement} is missing or blank`);
        }
    }

    #checkCount(trailer: Segment, actual: number, code: ReaderFindingCode): void {
        const declared = trailer.element(1);

        if (!isSameValue(declared, String(actual))) {
            this.#report(code, trailer, `${trailer.tag}01 declares ${declared ?? 'nothing'}, but there are ${actual}`);
        }
    }

    // The innermost open envelope is the one reported missing its trailer.
    #missingTrailer(offset: number, open: OpenInterchange, arriving: string): X12SyntaxError {
        if (open.transaction) {
            return new X12SyntaxError('missing-se', offset, `The transaction set has no SE before ${arriving}`);
        }

        if (open.group) {
            return new X12SyntaxError('missing-ge', offset, `The functional group has no GE before ${arriving}`);
        }

        return new X12SyntaxError('missing-iea', offset, `The interchange has no IEA before ${arriving}`);
    }

    // Adds a segment to the open envelopes. Returns the finished interchange when the segment is its IEA.
    #placeSegment(segment: Segment, open: OpenInterchange): Interchange | undefined {
        switch (segment.tag) {
            case 'GE': {
                if (!open.group) {
                    throw misplaced(segment, 'GE has no matching GS');
                }

                if (open.transaction) {
                    throw this.#missingTrailer(segment.offset, open, segment.tag);
                }

                this.#checkCount(segment, open.group.transactions.length, 'gs-ge-transaction-count-mismatch');
                this.#checkControl({
                    code: 'gs-ge-control-mismatch',
                    header: open.group.header,
                    isNumeric: true,
                    position: 6,
                    trailer: segment,
                });

                open.groups.push({
                    header: open.group.header,
                    trailer: segment,
                    transactions: open.group.transactions,
                });
                open.group = undefined;

                return undefined;
            }
            case 'GS': {
                if (open.transaction || open.group) {
                    throw this.#missingTrailer(segment.offset, open, segment.tag);
                }

                open.group = { header: segment, transactions: [] };
                this.#checkControlNumber(segment, 6);

                return undefined;
            }
            case 'IEA': {
                if (open.transaction || open.group) {
                    throw this.#missingTrailer(segment.offset, open, segment.tag);
                }

                this.#checkCount(segment, open.groups.length, 'isa-iea-group-count-mismatch');
                this.#checkControl({
                    code: 'isa-iea-control-mismatch',
                    header: open.header,
                    isNumeric: false,
                    position: 13,
                    trailer: segment,
                });

                return {
                    delimiters: open.delimiters,
                    groups: open.groups,
                    header: open.header,
                    segments: open.segments,
                    trailer: segment,
                };
            }
            case 'SE': {
                if (!open.transaction || !open.group) {
                    throw misplaced(segment, 'SE has no matching ST');
                }

                // SE01 counts the ST and SE as well as the body.
                const segmentCount = open.transaction.segments.length + 2;

                this.#checkCount(segment, segmentCount, 'st-se-segment-count-mismatch');
                this.#checkControl({
                    code: 'st-se-control-mismatch',
                    header: open.transaction.header,
                    isNumeric: false,
                    position: 2,
                    trailer: segment,
                });

                open.group.transactions.push({
                    header: open.transaction.header,
                    segments: open.transaction.segments,
                    trailer: segment,
                });
                open.transaction = undefined;

                return undefined;
            }
            case 'ST': {
                if (!open.group) {
                    throw misplaced(segment, 'ST is not inside a GS functional group');
                }

                if (open.transaction) {
                    throw this.#missingTrailer(segment.offset, open, segment.tag);
                }

                open.transaction = { header: segment, segments: [] };
                this.#checkControlNumber(segment, 2);

                return undefined;
            }
            default: {
                if (open.transaction) {
                    open.transaction.segments.push(segment);

                    return undefined;
                }

                if (!open.group && segment.tag === 'TA1') {
                    open.segments.push(segment);

                    return undefined;
                }

                throw misplaced(segment, `"${segment.tag}" is outside a transaction set`);
            }
        }
    }

    #readDelimiters(start: number): Delimiters {
        if (this.#text.length < start + ISA_LENGTH) {
            throw new X12SyntaxError('invalid-isa', start, `The ISA segment is shorter than ${ISA_LENGTH} characters`);
        }

        const element = this.#text.charAt(start + ISA_ELEMENT_SEPARATOR_OFFSET);
        const hasSeparatorAtEveryOffset = ISA_SEPARATOR_OFFSETS.every(offset => this.#text[start + offset] === element);

        if (!hasSeparatorAtEveryOffset || LETTER_OR_DIGIT.test(element)) {
            throw new X12SyntaxError('invalid-isa', start, 'The ISA segment does not have an element separator at every fixed position');
        }

        const version = this.#text.slice(start + ISA_VERSION_START, start + ISA_VERSION_END);
        const hasRepetitionSeparator = version >= FIRST_VERSION_WITH_REPETITION;
        const delimiters = {
            component: this.#text.charAt(start + ISA_COMPONENT_OFFSET),
            element,
            repetition: hasRepetitionSeparator ? this.#text.charAt(start + ISA_REPETITION_OFFSET) : undefined,
            segment: this.#text.charAt(start + ISA_TERMINATOR_OFFSET),
        };

        const characters = [delimiters.element, delimiters.repetition, delimiters.component, delimiters.segment].filter(character => character !== undefined);
        const hasRepeatedCharacter = new Set(characters).size !== characters.length;
        const hasLetterOrDigit = characters.some(character => LETTER_OR_DIGIT.test(character));

        if (hasRepeatedCharacter || hasLetterOrDigit) {
            throw new X12SyntaxError('invalid-isa', start, 'The ISA delimiters must be different characters that are not letters or digits');
        }

        return delimiters;
    }

    #readInterchange(): Interchange {
        const start = this.#offset;
        const delimiters = this.#readDelimiters(start);
        const header = this.#readIsa(start, delimiters);
        const open: OpenInterchange = {
            delimiters,
            group: undefined,
            groups: [],
            header,
            segments: [],
            transaction: undefined,
        };

        this.#checkControlNumber(header, 13);
        this.#offset = start + ISA_LENGTH;

        while (true) {
            // CR and LF between segments are line formatting, unless the terminator is itself CR or LF.
            while ((this.#text[this.#offset] === '\r' || this.#text[this.#offset] === '\n') && this.#text[this.#offset] !== delimiters.segment) {
                this.#offset += 1;
            }

            const segmentStart = this.#offset;

            if (segmentStart >= this.#text.length) {
                throw this.#missingTrailer(segmentStart, open, 'the end of the text');
            }

            if (this.#text.startsWith('ISA', segmentStart)) {
                throw this.#missingTrailer(segmentStart, open, 'the next ISA');
            }

            const end = this.#text.indexOf(delimiters.segment, segmentStart);

            if (end === -1) {
                const hasTextAfterLastTerminator = this.#text.slice(segmentStart).trim() !== '';

                if (hasTextAfterLastTerminator) {
                    throw new X12SyntaxError('unterminated-segment', segmentStart, 'The last segment has no terminator');
                }

                throw this.#missingTrailer(this.#text.length, open, 'the end of the text');
            }

            if (end === segmentStart) {
                throw new X12SyntaxError('unexpected-data', segmentStart, 'Empty segment: a terminator directly follows another');
            }

            const segment = this.#readSegment(segmentStart, end, delimiters);
            this.#offset = end + 1;

            const interchange = this.#placeSegment(segment, open);

            if (interchange) {
                return interchange;
            }
        }
    }

    #readIsa(start: number, delimiters: Delimiters): Segment {
        const elements: string[] = [];

        for (const [index, separatorOffset] of ISA_SEPARATOR_OFFSETS.entries()) {
            const end = ISA_SEPARATOR_OFFSETS[index + 1] ?? ISA_TERMINATOR_OFFSET;
            elements.push(this.#text.slice(start + separatorOffset + 1, start + end));
        }

        return new Segment({
            delimiters,
            elements,
            offset: start,
            tag: 'ISA',
        });
    }

    #readSegment(start: number, end: number, delimiters: Delimiters): Segment {
        const segmentText = this.#text.slice(start, end);
        const [tag = '', ...elements] = segmentText.split(delimiters.element);
        const lastCharacter = segmentText.slice(-1);
        const segment = new Segment({
            delimiters,
            elements,
            offset: start,
            tag,
        });

        if (lastCharacter === delimiters.element) {
            this.#report('trailing-element-separator', segment, `${tag} ends with a separator`);
        }

        if (lastCharacter === delimiters.repetition) {
            this.#report('trailing-repetition-separator', segment, `${tag} ends with a separator`);
        }

        if (lastCharacter === delimiters.component) {
            this.#report('trailing-component-separator', segment, `${tag} ends with a separator`);
        }

        return segment;
    }

    #report(code: ReaderFindingCode, segment: Segment, message: string): void {
        this.#findings.push({
            code,
            message,
            segment,
        });
    }

    #skipIgnorable(): void {
        while (this.#offset < this.#text.length) {
            const character = this.#text.charAt(this.#offset);
            const isByteOrderMark = character === BYTE_ORDER_MARK && this.#offset === 0;
            const isIgnorable = isByteOrderMark || IGNORABLE_CHARACTERS.includes(character);

            if (!isIgnorable) {
                return;
            }

            this.#offset += 1;
        }
    }
}

export function readX12(text: string): X12Document {
    return new Reader(text).read();
}

// Counts and N0 control numbers compare as integers when both are digits only.
function isSameValue(first: string | undefined, second: string | undefined): boolean {
    const isIntegerComparison = first !== undefined && second !== undefined && DIGITS_ONLY.test(first) && DIGITS_ONLY.test(second);

    if (isIntegerComparison) {
        return Number(first) === Number(second);
    }

    return first === second;
}

function misplaced(segment: Segment, message: string): X12SyntaxError {
    return new X12SyntaxError('misplaced-envelope-segment', segment.offset, message);
}

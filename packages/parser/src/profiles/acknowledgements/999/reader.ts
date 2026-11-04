import type { Grammar, Loop } from '../../../loops/types.js';
import type { Segment } from '../../../reader/segment.js';
import type { Finding, FunctionalGroup, Interchange, Transaction, X12Document } from '../../../reader/types.js';
import type {
    ElementError,
    ElementPosition,
    ErrorContext,
    GroupResult,
    Response999,
    Response999FindingCode,
    SegmentError,
    TransactionSetResponse,
    TransactionSetResult,
} from './types.js';

import { buildLoops } from '../../../loops/loops.js';

const VERSION = '005010X231A1';
const WHOLE_NUMBER = /^\d+$/;

const acknowledgmentGrammar: Grammar = {
    header: ['AK1'],
    hierarchy: {},
    loops: [{
        id: '2000',
        loops: [{
            id: '2100',
            loops: [{
                id: '2110',
                segments: ['CTX'],
                trigger: 'IK4',
            }],
            segments: ['CTX'],
            trigger: 'IK3',
        }],
        segments: ['IK5'],
        trigger: 'AK2',
    }],
    trailer: ['AK9'],
};

class AcknowledgmentReader {
    readonly #findings: Finding<Response999FindingCode>[] = [];
    readonly #transaction: Transaction;

    constructor(transaction: Transaction) {
        this.#transaction = transaction;
    }

    read(): Response999 {
        const tree = buildLoops(this.#transaction, acknowledgmentGrammar);

        // The grammar has no HL levels, so an HL is reported as `unexpected-segment`.
        for (const finding of tree.findings) {
            this.#report('unexpected-segment', finding.segment, finding.message);
        }

        if (this.#transaction.header.element(3) !== VERSION) {
            this.#report('unexpected-version', this.#transaction.header, `ST03 is not ${VERSION}`);
        }

        const ak1 = this.#requireOne(tree.header, 'AK1', 'The 999 has no AK1');
        const transactionSets = tree.loops.map(loop => this.#readTransactionSet(loop));
        const ak9 = this.#requireOne(tree.trailer, 'AK9', 'The 999 has no AK9');

        return {
            findings: this.#findings,
            group: ak1 && {
                controlNumber: ak1.element(2),
                functionalId: ak1.element(1),
                segment: ak1,
                version: ak1.element(3),
            },
            result: ak9 && this.#readGroupResult(ak9),
            transactionSets,
        };
    }

    #parseNumber(value: string | undefined, segment: Segment): number | undefined {
        if (!value) {
            return;
        }

        const number = Number(value);

        if (WHOLE_NUMBER.test(value) && Number.isSafeInteger(number)) {
            return number;
        }

        this.#report('invalid-number', segment, `"${value}" is not a whole number`);
    }

    #readContext(ctx: Segment): ErrorContext {
        const [name, reference] = ctx.components(1);
        const segmentPosition = this.#parseNumber(ctx.element(3), ctx);
        const elementPosition = this.#readPosition(ctx.components(5), ctx);
        const [elementReference, componentReference] = ctx.components(6);
        const element = this.#parseNumber(elementReference, ctx);
        const component = this.#parseNumber(componentReference, ctx);

        return {
            elementPosition,
            loopId: ctx.element(4),
            name,
            reference,
            referenceNumbers: element === undefined ? undefined : { component, element },
            segment: ctx,
            segmentPosition,
            tag: ctx.element(2),
        };
    }

    #readElementError(loop: Loop): ElementError {
        const ik4 = loop.segments[0];
        const position = this.#readPosition(ik4.components(1), ik4);
        const referenceNumber = this.#parseNumber(ik4.element(2), ik4);

        return {
            badValue: ik4.element(4),
            contexts: loop.segments.filter(segment => segment.tag === 'CTX').map(ctx => this.#readContext(ctx)),
            error: ik4.element(3),
            position,
            referenceNumber,
            segment: ik4,
        };
    }

    #readGroupResult(ak9: Segment): GroupResult {
        const included = this.#parseNumber(ak9.element(2), ak9);
        const received = this.#parseNumber(ak9.element(3), ak9);
        const accepted = this.#parseNumber(ak9.element(4), ak9);

        return {
            ...readResult(ak9, 5),
            accepted,
            included,
            received,
        };
    }

    #readPosition(components: string[], segment: Segment): ElementPosition | undefined {
        const [elementText, componentText, repetitionText] = components;
        const element = this.#parseNumber(elementText, segment);
        const component = this.#parseNumber(componentText, segment);
        const repetition = this.#parseNumber(repetitionText, segment);

        if (element !== undefined) {
            return {
                component,
                element,
                repetition,
            };
        }
    }

    #readSegmentError(loop: Loop): SegmentError {
        const ik3 = loop.segments[0];
        const position = this.#parseNumber(ik3.element(2), ik3);

        return {
            contexts: loop.segments.filter(segment => segment.tag === 'CTX').map(ctx => this.#readContext(ctx)),
            elementErrors: loop.loops.map(child => this.#readElementError(child)),
            error: ik3.element(4),
            loopId: ik3.element(3),
            position,
            segment: ik3,
            tag: ik3.element(1),
        };
    }

    #readTransactionSet(loop: Loop): TransactionSetResponse {
        const ak2 = loop.segments[0];
        const segmentErrors = loop.loops.map(child => this.#readSegmentError(child));
        const ik5 = this.#requireOne(loop.segments, 'IK5', `Loop 2000 for ${ak2.element(2) ?? ''} has no IK5`, ak2);

        return {
            controlNumber: ak2.element(2),
            convention: ak2.element(3),
            id: ak2.element(1),
            result: ik5 && readResult(ik5, 2),
            segment: ak2,
            segmentErrors,
        };
    }

    #report(code: Response999FindingCode, segment: Segment, message: string): void {
        this.#findings.push({
            code,
            message,
            segment,
        });
    }

    #requireOne(
        segments: Segment[],
        tag: string,
        message: string,
        missingOn = this.#transaction.header,
    ): Segment | undefined {
        const [first, ...extras] = segments.filter(segment => segment.tag === tag);

        for (const extra of extras) {
            this.#report('unexpected-segment', extra, `A second ${tag}`);
        }

        if (!first) {
            this.#report('missing-segment', missingOn, message);
        }

        return first;
    }
}

/**
 * Reads one transaction set as a 999 implementation acknowledgment under the 005010X231A1 guide.
 *
 * It does not check that the transaction set is a 999.
 *
 * @param transaction - A transaction set from `readX12`, such as
 *   `document.interchanges[0].groups[0].transactions[0]`.
 * @returns The acknowledgment, with findings for anything that does not follow the guide.
 *
 * @example
 * ```ts
 * import { read999, readX12 } from '@ediocracy/parser';
 *
 * const transaction = readX12(text).interchanges[0]?.groups[0]?.transactions[0];
 * if (transaction) {
 *     const response = read999(transaction);
 *     console.log(response.result?.code, response.transactionSets.length);
 * }
 * ```
 */
export function read999(transaction: Transaction): Response999 {
    return new AcknowledgmentReader(transaction).read();
}

/**
 * Reads every 999 in a document, in the order they appear.
 *
 * @param document - The result of `readX12`.
 * @returns Each acknowledgment with the interchange and functional group it came from.
 *
 * @example
 * ```ts
 * import { read999s, readX12 } from '@ediocracy/parser';
 *
 * for (const { response } of read999s(readX12(text))) {
 *     for (const set of response.transactionSets) {
 *         console.log(set.controlNumber, set.result?.code);
 *     }
 * }
 * ```
 */
export function read999s(document: X12Document): {
    /** The functional group the acknowledgment came from. */
    group: FunctionalGroup;
    /** The interchange the acknowledgment came from. */
    interchange: Interchange;
    /** The acknowledgment. */
    response: Response999;
}[] {
    const responses = [];

    for (const interchange of document.interchanges) {
        for (const group of interchange.groups) {
            for (const transaction of group.transactions) {
                if (transaction.header.element(1) !== '999') {
                    continue;
                }

                const response = read999(transaction);

                if (group.header.element(8) !== VERSION) {
                    response.findings.push({
                        code: 'unexpected-version',
                        message: `GS08 is not ${VERSION}`,
                        segment: group.header,
                    });
                }

                responses.push({
                    group,
                    interchange,
                    response,
                });
            }
        }
    }

    return responses;
}

function readResult(segment: Segment, firstErrorPosition: number): TransactionSetResult {
    const syntaxErrors = [];

    for (let position = firstErrorPosition; position < firstErrorPosition + 5; position++) {
        const code = segment.element(position);

        if (code) {
            syntaxErrors.push(code);
        }
    }

    return {
        code: segment.element(1),
        segment,
        syntaxErrors,
    };
}

import type { Grammar, Loop, LoopSpec } from '../../loops/types.js';
import type { Segment } from '../../reader/segment.js';
import type { Finding, FunctionalGroup, Interchange, Transaction, X12Document } from '../../reader/types.js';
import type { Benefit, Party, Person, RequestError, Response271, Response271FindingCode } from './types.js';

import { buildLoops } from '../../loops/loops.js';

const VERSION = '005010X279A1';

// Loops 2000C (subscriber) and 2000D (dependent) share a structure; `letter` ends each loop ID.
function subscriberOrDependentLevel(letter: 'C' | 'D'): LoopSpec {
    return {
        id: `2000${letter}`,
        loops: [{
            id: `2100${letter}`,
            loops: [{
                id: `2110${letter}`,
                loops: [
                    {
                        id: `2115${letter}`,
                        segments: [],
                        trigger: 'III',
                    },
                    {
                        end: 'LE',
                        id: 'LS',
                        loops: [{
                            id: `2120${letter}`,
                            segments: ['N3', 'N4', 'PER', 'PRV'],
                            trigger: 'NM1',
                        }],
                        segments: [],
                        trigger: 'LS',
                    },
                ],
                segments: ['HSD', 'REF', 'DTP', 'AAA', 'MSG'],
                trigger: 'EB',
            }],
            segments: ['REF', 'N3', 'N4', 'AAA', 'PRV', 'DMG', 'INS', 'HI', 'DTP', 'MPI'],
            trigger: 'NM1',
        }],
        segments: ['TRN'],
    };
}

// Member lists follow the X279A1 loop structure.
const eligibilityResponseGrammar: Grammar = {
    header: ['BHT'],
    hierarchy: {
        20: {
            id: '2000A',
            loops: [{
                id: '2100A',
                segments: ['PER', 'AAA'],
                trigger: 'NM1',
            }],
            segments: ['AAA'],
        },
        21: {
            id: '2000B',
            loops: [{
                id: '2100B',
                segments: ['REF', 'N3', 'N4', 'AAA', 'PRV'],
                trigger: 'NM1',
            }],
            segments: [],
        },
        22: subscriberOrDependentLevel('C'),
        23: subscriberOrDependentLevel('D'),
    },
};

class EligibilityResponseReader {
    readonly #findings: Finding<Response271FindingCode>[] = [];
    readonly #receivers: Party[] = [];
    readonly #sources: Party[] = [];
    readonly #subscribers: Person[] = [];
    readonly #transaction: Transaction;

    constructor(transaction: Transaction) {
        this.#transaction = transaction;
    }

    read(): Response271 {
        const tree = buildLoops(this.#transaction, eligibilityResponseGrammar);

        this.#findings.push(...tree.findings);

        if (this.#transaction.header.element(3) !== VERSION) {
            this.#report('unexpected-version', this.#transaction.header, `ST03 is not ${VERSION}`);
        }

        this.#readSourcesReceiversAndSubscribers(tree.loops);

        return {
            findings: this.#findings,
            receivers: this.#receivers,
            reference: tree.header.find(({ tag }) => tag === 'BHT')?.element(3),
            sources: this.#sources,
            subscribers: this.#subscribers,
        };
    }

    /*
     * A second NM1 at this level (for example a provider NM1 after an EB without LS) opens another
     * name loop. Its benefits still belong to this person, and the NM1 is reported.
     */
    #readPerson(level: Loop): Person {
        const nameLoops = findNameLoops(level);

        for (const nameLoop of nameLoops.slice(1)) {
            this.#report('unexpected-segment', nameLoop.segments[0], `A second NM1 in loop ${level.id}`);
        }

        const benefits = nameLoops
            .flatMap(nameLoop => nameLoop.loops)
            .filter(loop => loop.id.startsWith('2110'))
            .map(loop => readBenefit(loop));
        const dependents = level.loops.filter(loop => loop.id === '2000D').map(loop => this.#readPerson(loop));
        const nameSegments = nameLoops[0]?.segments ?? [];

        return {
            ...readParty(level, nameLoops[0]),
            address: nameSegments.filter(({ tag }) => tag === 'N3' || tag === 'N4'),
            benefits,
            dates: nameSegments.filter(({ tag }) => tag === 'DTP'),
            demographics: nameSegments.find(({ tag }) => tag === 'DMG'),
            dependents,
            references: nameSegments.filter(({ tag }) => tag === 'REF'),
            relationship: nameSegments.find(({ tag }) => tag === 'INS'),
            traces: segmentsWithTag(level, 'TRN'),
        };
    }

    // 2000B nests under 2000A and 2000C under 2000B through HL02, so every level is visited.
    #readSourcesReceiversAndSubscribers(loops: Loop[]): void {
        for (const loop of loops) {
            if (loop.id === '2000C') {
                this.#subscribers.push(this.#readPerson(loop));
                continue;
            }

            if (loop.id === '2000A') {
                this.#sources.push(readParty(loop, findNameLoops(loop)[0]));
            } else if (loop.id === '2000B') {
                this.#receivers.push(readParty(loop, findNameLoops(loop)[0]));
            }

            this.#readSourcesReceiversAndSubscribers(loop.loops);
        }
    }

    #report(code: Response271FindingCode, segment: Segment, message: string): void {
        this.#findings.push({
            code,
            message,
            segment,
        });
    }
}

/**
 * Reads one transaction set as a 271 eligibility response under the 005010X279A1 guide.
 *
 * It does not check that the transaction set is a 271. Use {@link read271s} to read every 271 in a
 * document.
 *
 * @param transaction - A transaction set from `readX12`, such as
 *   `document.interchanges[0].groups[0].transactions[0]`.
 * @returns The response, with findings for anything that does not follow the guide.
 *
 * @example
 * ```ts
 * import { read271, readX12 } from '@ediocracy/parser';
 *
 * const transaction = readX12(text).interchanges[0]?.groups[0]?.transactions[0];
 * if (transaction) {
 *     const response = read271(transaction);
 *     console.log(response.sources.map((source) => source.name?.element(3)));
 * }
 * ```
 */
export function read271(transaction: Transaction): Response271 {
    return new EligibilityResponseReader(transaction).read();
}

/**
 * Reads every 271 in a document, in the order they appear. Other transaction sets are skipped.
 *
 * @param document - The result of `readX12`.
 * @returns Each response with the interchange and functional group it came from.
 *
 * @example
 * ```ts
 * import { read271s, readX12 } from '@ediocracy/parser';
 *
 * for (const { response } of read271s(readX12(text))) {
 *     console.log(response.subscribers.length, response.findings.length);
 * }
 * ```
 */
export function read271s(document: X12Document): {
    /** The functional group the response came from. */
    group: FunctionalGroup;
    /** The interchange the response came from. */
    interchange: Interchange;
    /** The response. */
    response: Response271;
}[] {
    const responses = [];

    for (const interchange of document.interchanges) {
        for (const group of interchange.groups) {
            for (const transaction of group.transactions) {
                if (transaction.header.element(1) !== '271') {
                    continue;
                }

                const response = read271(transaction);

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

// The 2100 loops of a level. Each one opens with the NM1 that names the party.
function findNameLoops(level: Loop): Loop[] {
    return level.loops.filter(loop => loop.id.startsWith('2100'));
}

function readBenefit(loop: Loop): Benefit {
    const [eb] = loop.segments;
    const additionalInfo = loop.loops.filter(child => child.id.startsWith('2115')).map(child => child.segments[0]);
    const relatedEntities = loop.loops.filter(child => child.id === 'LS').flatMap(child => child.loops);

    return {
        additionalInfo,
        amount: eb.element(7),
        authorizationRequired: eb.element(11),
        coverageLevel: eb.element(2),
        dates: segmentsWithTag(loop, 'DTP'),
        eb,
        errors: segmentsWithTag(loop, 'AAA').map(segment => readRequestError(segment)),
        inNetwork: eb.element(12),
        insuranceType: eb.element(4),
        limits: segmentsWithTag(loop, 'HSD'),
        messages: segmentsWithTag(loop, 'MSG').map(segment => segment.element(1) ?? ''),
        percent: eb.element(8),
        planDescription: eb.element(5),
        quantity: { qualifier: eb.element(9), value: eb.element(10) },
        references: segmentsWithTag(loop, 'REF'),
        relatedEntities,
        serviceTypes: eb.repetitions(3),
        status: eb.element(1),
        timePeriod: eb.element(6),
    };
}

function readParty(level: Loop, nameLoop: Loop | undefined): Party {
    const name = nameLoop?.segments[0];
    // Only 2000A allows AAA at the level itself; elsewhere a level AAA is an unexpected-segment.
    const levelErrors = level.id === '2000A' ? segmentsWithTag(level, 'AAA') : [];
    const nameErrors = nameLoop ? segmentsWithTag(nameLoop, 'AAA') : [];

    return {
        errors: [...levelErrors, ...nameErrors].map(segment => readRequestError(segment)),
        id: name?.element(9),
        idQualifier: name?.element(8),
        name,
    };
}

function readRequestError(segment: Segment): RequestError {
    return {
        code: segment.element(3),
        followUp: segment.element(4),
        segment,
    };
}

function segmentsWithTag(loop: Loop, tag: string): Segment[] {
    return loop.segments.filter(segment => segment.tag === tag);
}

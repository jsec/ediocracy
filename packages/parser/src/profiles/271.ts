import type { Finding, FunctionalGroup, Interchange, Segment, Transaction, X12Document } from '../reader.js';

import { buildLoops, type Grammar, type Loop, type LoopSpec } from '../loops.js';

export type Benefit = {
    additionalInfo: Segment[];
    amount: string | undefined;
    authorizationRequired: string | undefined;
    coverageLevel: string | undefined;
    dates: Segment[];
    eb: Segment;
    errors: RequestError[];
    inNetwork: string | undefined;
    insuranceType: string | undefined;
    limits: Segment[];
    messages: string[];
    percent: string | undefined;
    planDescription: string | undefined;
    quantity: { qualifier: string | undefined; value: string | undefined };
    references: Segment[];
    relatedEntities: Loop[];
    serviceTypes: string[];
    status: string;
    timePeriod: string | undefined;
};

export type Party = { errors: RequestError[]; id: string | undefined; idQualifier: string | undefined; name: Segment | undefined };

export type Person = Party & { benefits: Benefit[]; dependents: Person[]; traces: Segment[] };

export type RequestError = { code: string | undefined; followUp: string | undefined; segment: Segment };

export type Response271 = {
    findings: Finding[];
    receivers: Party[];
    reference: string | undefined;
    sources: Party[];
    subscribers: Person[];
};

const VERSION = '005010X279A1';

// Subscriber (C) and dependent (D) levels share one shape.
function personLevel(suffix: 'C' | 'D'): LoopSpec {
    return {
        id: `2000${suffix}`,
        loops: [{
            id: `2100${suffix}`,
            loops: [{
                id: `2110${suffix}`,
                loops: [
                    { id: `2115${suffix}`, segments: [], trigger: 'III' },
                    { end: 'LE', id: 'LS', loops: [{ id: `2120${suffix}`, segments: ['N3', 'N4', 'PER', 'PRV'], trigger: 'NM1' }], segments: [], trigger: 'LS' },
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

// Member lists follow the public Stedi-hosted X279A1 guide.
export const grammar271: Grammar = {
    header: ['BHT'],
    hierarchy: {
        20: { id: '2000A', loops: [{ id: '2100A', segments: ['PER', 'AAA'], trigger: 'NM1' }], segments: ['AAA'] },
        21: { id: '2000B', loops: [{ id: '2100B', segments: ['REF', 'N3', 'N4', 'AAA', 'PRV'], trigger: 'NM1' }], segments: [] },
        22: personLevel('C'),
        23: personLevel('D'),
    },
};

export function read271(transaction: Transaction): Response271 {
    const tree = buildLoops(transaction, grammar271);
    const response: Response271 = {
        findings: [...tree.findings],
        receivers: [],
        reference: tree.header.find(({ tag }) => tag === 'BHT')?.element(3),
        sources: [],
        subscribers: [],
    };

    if (transaction.header.element(3) !== VERSION) {
        response.findings.push({ code: 'unexpected-version', message: `ST03 is not ${VERSION}`, segment: transaction.header });
    }

    collectLevels(tree.loops, response);
    return response;
}

export function read271s(document: X12Document): { group: FunctionalGroup; interchange: Interchange; response: Response271 }[] {
    const results = [];
    for (const interchange of document.interchanges) {
        for (const group of interchange.groups) {
            for (const transaction of group.transactions) {
                if (transaction.header.element(1) === '271') {
                    results.push({ group, interchange, response: read271InGroup(transaction, group) });
                }
            }
        }
    }
    return results;
}

// 2000B nests under 2000A and 2000C under 2000B through HL02, so every level is visited.
function collectLevels(loops: Loop[], response: Response271): void {
    for (const loop of loops) {
        if (loop.id === '2000C') {
            response.subscribers.push(readPerson(loop, response.findings));
            continue;
        }

        if (loop.id === '2000A') {
            response.sources.push(readParty(loop));
        } else if (loop.id === '2000B') {
            response.receivers.push(readParty(loop));
        }
        collectLevels(loop.loops, response);
    }
}

function read271InGroup(transaction: Transaction, group: FunctionalGroup): Response271 {
    const response = read271(transaction);
    if (group.header.element(8) !== VERSION) {
        response.findings.push({ code: 'unexpected-version', message: `GS08 is not ${VERSION}`, segment: group.header });
    }
    return response;
}

function readBenefit(loop: Loop): Benefit {
    const [eb] = loop.segments;
    const additionalInfo: Segment[] = [];
    const relatedEntities: Loop[] = [];
    for (const child of loop.loops) {
        if (child.id.startsWith('2115')) {
            additionalInfo.push(child.segments[0]);
        } else if (child.id === 'LS') {
            relatedEntities.push(...child.loops);
        }
    }

    return {
        additionalInfo,
        amount: eb.element(7),
        authorizationRequired: eb.element(11),
        coverageLevel: eb.element(2),
        dates: tagged(loop, 'DTP'),
        eb,
        errors: tagged(loop, 'AAA').map(segment => readRequestError(segment)),
        inNetwork: eb.element(12),
        insuranceType: eb.element(4),
        limits: tagged(loop, 'HSD'),
        messages: tagged(loop, 'MSG').map(segment => segment.element(1) ?? ''),
        percent: eb.element(8),
        planDescription: eb.element(5),
        quantity: { qualifier: eb.element(9), value: eb.element(10) },
        references: tagged(loop, 'REF'),
        relatedEntities,
        serviceTypes: eb.repetitions(3),
        status: eb.element(1) ?? '',
        timePeriod: eb.element(6),
    };
}

function readParty(level: Loop): Party {
    const nameLoop = level.loops.find(({ id }) => id.startsWith('2100'));
    const name = nameLoop?.segments[0];
    const errors = nameLoop ? tagged(nameLoop, 'AAA') : [];
    // Only 2000A lists AAA at the level itself; elsewhere a level AAA is already an unexpected-segment finding.
    if (level.id === '2000A') {
        errors.unshift(...tagged(level, 'AAA'));
    }
    return {
        errors: errors.map(segment => readRequestError(segment)),
        id: name?.element(9),
        idQualifier: name?.element(8),
        name,
    };
}

/*
 * A second NM1 at this level (for example a provider NM1 after an EB without LS) opens another
 * name loop. Its benefits still belong to this person, and the NM1 is reported.
 */
function readPerson(level: Loop, findings: Finding[]): Person {
    const benefits: Benefit[] = [];
    let nameLoopCount = 0;
    for (const loop of level.loops) {
        if (!loop.id.startsWith('2100')) {
            continue;
        }

        nameLoopCount += 1;
        if (nameLoopCount > 1) {
            findings.push({ code: 'unexpected-segment', message: `A second NM1 in loop ${level.id}`, segment: loop.segments[0] });
        }
        for (const child of loop.loops) {
            if (child.id.startsWith('2110')) {
                benefits.push(readBenefit(child));
            }
        }
    }

    const dependents: Person[] = [];
    for (const loop of level.loops) {
        if (loop.id === '2000D') {
            dependents.push(readPerson(loop, findings));
        }
    }

    return { ...readParty(level), benefits, dependents, traces: tagged(level, 'TRN') };
}

function readRequestError(segment: Segment): RequestError {
    return { code: segment.element(3), followUp: segment.element(4), segment };
}

function tagged(loop: Loop, tag: string): Segment[] {
    return loop.segments.filter(segment => segment.tag === tag);
}

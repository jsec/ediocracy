import { describe, expect, it } from 'vitest';

import type { Grammar } from '../src/loops/types.js';

import { buildLoops } from '../src/loops/loops.js';
import { findingCodes, summaries, summarize, transactionOf } from './utils.js';

const hierarchical: Grammar = {
    header: ['BHT'],
    hierarchy: {
        1: {
            id: 'L1',
            loops: [{
                id: 'N',
                loops: [{
                    id: 'E',
                    loops: [{
                        end: 'LE',
                        id: 'BR',
                        loops: [{
                            id: 'R',
                            segments: [],
                            trigger: 'NM1',
                        }],
                        segments: [],
                        trigger: 'LS',
                    }],
                    segments: ['MSG'],
                    trigger: 'EB',
                }],
                segments: ['N2'],
                trigger: 'NM1',
            }],
            segments: ['X1'],
        },
        2: { id: 'L2', segments: [] },
    },
};

describe('buildLoops', () => {
    describe('header', () => {
        it('should put header segments before the first loop in the header', () => {
            const tree = buildLoops(transactionOf('BHT*1~HL*1**1~'), hierarchical);
            const headerTags = tree.header.map(segment => segment.tag);
            const loopIds = tree.loops.map(loop => loop.id);

            expect(headerTags).toEqual(['BHT']);
            expect(loopIds).toEqual(['L1']);
        });
    });

    describe('placing segments', () => {
        it('should add member segments to the open loop', () => {
            const loops = summaries('HL*1**1~X1~X1~', hierarchical);

            expect(loops).toEqual([{
                id: 'L1',
                loops: [],
                tags: ['HL', 'X1', 'X1'],
            }]);
        });

        it('should open a child loop at its trigger', () => {
            const loops = summaries('HL*1**1~NM1~N2~', hierarchical);

            expect(loops).toEqual([{
                id: 'L1',
                loops: [{
                    id: 'N',
                    loops: [],
                    tags: ['NM1', 'N2'],
                }],
                tags: ['HL'],
            }]);
        });

        it('should close inner loops when an enclosing loop accepts the segment', () => {
            const loops = summaries('HL*1**1~NM1~EB~NM1~', hierarchical);

            expect(loops).toEqual([{
                id: 'L1',
                loops: [
                    {
                        id: 'N',
                        loops: [{
                            id: 'E',
                            loops: [],
                            tags: ['EB'],
                        }],
                        tags: ['NM1'],
                    },
                    {
                        id: 'N',
                        loops: [],
                        tags: ['NM1'],
                    },
                ],
                tags: ['HL'],
            }]);
        });

        it('should keep a bracketed loop from its opening segment through its end segment', () => {
            const body = 'HL*1**1~NM1~EB~LS~NM1~LE~EB~';
            const loops = summaries(body, hierarchical);
            const codes = findingCodes(body, hierarchical);

            expect(loops).toEqual([{
                id: 'L1',
                loops: [{
                    id: 'N',
                    loops: [
                        {
                            id: 'E',
                            loops: [{
                                id: 'BR',
                                loops: [{
                                    id: 'R',
                                    loops: [],
                                    tags: ['NM1'],
                                }],
                                tags: ['LS', 'LE'],
                            }],
                            tags: ['EB'],
                        },
                        {
                            id: 'E',
                            loops: [],
                            tags: ['EB'],
                        },
                    ],
                    tags: ['NM1'],
                }],
                tags: ['HL'],
            }]);
            expect(codes).toEqual([]);
        });
    });

    describe('hierarchical levels', () => {
        it('should attach HL loops by parent ID', () => {
            const loops = summaries('HL*1**1~HL*2*1*2~HL*3**1~', hierarchical);

            expect(loops).toEqual([
                {
                    id: 'L1',
                    loops: [{
                        id: 'L2',
                        loops: [],
                        tags: ['HL'],
                    }],
                    tags: ['HL'],
                },
                {
                    id: 'L1',
                    loops: [],
                    tags: ['HL'],
                },
            ]);
        });

        it('should keep an HL with an unknown level code in the innermost open loop', () => {
            const body = 'HL*1**1~NM1~HL*2*1*9~';
            const codes = findingCodes(body, hierarchical);
            const loops = summaries(body, hierarchical);

            expect(codes).toEqual(['unknown-hl-level']);
            expect(loops).toEqual([{
                id: 'L1',
                loops: [{
                    id: 'N',
                    loops: [],
                    tags: ['NM1', 'HL'],
                }],
                tags: ['HL'],
            }]);
        });

        it('should keep an HL with a missing parent at the top level', () => {
            const body = 'HL*2*7*1~';
            const codes = findingCodes(body, hierarchical);
            const loops = summaries(body, hierarchical);

            expect(codes).toEqual(['missing-hl-parent']);
            expect(loops).toEqual([{
                id: 'L1',
                loops: [],
                tags: ['HL'],
            }]);
        });

        it('should attach children of a duplicate HL ID to the first HL with that ID', () => {
            const body = 'HL*1**1~HL*1**1~HL*2*1*2~';
            const codes = findingCodes(body, hierarchical);
            const loops = summaries(body, hierarchical);

            expect(codes).toEqual(['duplicate-hl-id']);
            expect(loops).toEqual([
                {
                    id: 'L1',
                    loops: [{
                        id: 'L2',
                        loops: [],
                        tags: ['HL'],
                    }],
                    tags: ['HL'],
                },
                {
                    id: 'L1',
                    loops: [],
                    tags: ['HL'],
                },
            ]);
        });
    });

    describe('unexpected segments', () => {
        it('should report an unexpected segment and keep it in the innermost open loop', () => {
            const tree = buildLoops(transactionOf('HL*1**1~ZZ~'), hierarchical);
            const findings = tree.findings.map(({ code, segment }) => [code, segment.tag]);
            const loops = tree.loops.map(loop => summarize(loop));

            expect(findings).toEqual([['unexpected-segment', 'ZZ']]);
            expect(loops).toEqual([{
                id: 'L1',
                loops: [],
                tags: ['HL', 'ZZ'],
            }]);
        });

        it('should report an unexpected segment before the first loop', () => {
            const codes = findingCodes('ZZ~HL*1**1~', hierarchical);

            expect(codes).toEqual(['unexpected-segment']);
        });

        it.each([
            'HL*1**1~NM1~EB~LS~NM1~',
            'HL*1**1~NM1~EB~LS~NM1~EB~',
        ])('should report a bracketed loop that closes without its end segment in %s', (body) => {
            const codes = findingCodes(body, hierarchical);

            expect(codes).toEqual(['unclosed-loop']);
        });
    });
});

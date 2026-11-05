import { describe, expect, expectTypeOf, it } from 'vitest';

import { readX12 } from '../src/index.js';
import { interpret271, read271s } from '../src/profiles/271/index.js';
import {
    interpretRoute,
    type RouteEntry,
    type RouteErrorCondition,
    type RouteProfile,
} from '../src/profiles/271/routes/index.js';
import { codesAndTags, wrap } from './utils.js';

const GOOD = 'HL*1**20*1~NM1*PR*2*P*****PI*P1~HL*2*1*21*1~NM1*1P*2*R*****XX*1~';

const testProfile: RouteProfile<string, 'odd-member'> = {
    delimiters: {
        component: ':',
        element: '*',
        repetition: '^',
        segment: '~',
    },
    errors: [
        {
            condition: 'bad-id',
            description: 'The ID is wrong.',
            level: 'subscriber',
            rejectReason: '72',
        },
    ],
    listsAllErrors: true,
    memberIdPlaceholders: ['MISSING'],
    name: 'Test route',
    readMember: (member, person, report) => {
        if (member.memberId === 'ODD' && person.name) {
            report('odd-member', person.name, 'odd');
        }

        return member.memberId ?? '-';
    },
    receiverEntityCodes: ['1P'],
    source: {
        entityCode: 'PR',
        id: 'P1',
        idQualifier: 'PI',
    },
};

const anyLevelProfile: RouteProfile<string, 'odd-member'> = {
    ...testProfile,
    errors: [
        {
            condition: 'any',
            description: 'Any.',
            rejectReason: '75',
        },
    ],
};

function entryOf(levels: string, component = ':'): RouteEntry {
    const body = `ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~${levels}`;
    const count = body.split('~').filter(segment => segment !== '').length + 1;
    const text = wrap(`${body}SE*${count}*0001~`).replace('*P*:~', () => `*P*${component}~`);
    const [entry] = read271s(readX12(text));

    if (!entry) {
        throw new Error('No 271 transaction set in the text');
    }

    return entry;
}

describe('interpretRoute', () => {
    describe('matching responses', () => {
        it('should return interpret271 output unchanged and no findings', () => {
            const entry = entryOf(`${GOOD}HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*A1~EB*1**30~`);

            const result = interpretRoute(entry, testProfile);

            expect(result.eligibility).toEqual(interpret271(entry.response));
            expect(result.findings).toEqual([]);
            expect(result.members).toEqual(['A1']);
        });
    });

    describe('profile checks', () => {
        it('should allow profiles without envelope or member ID checks', () => {
            expectTypeOf<RouteProfile<string, 'odd-member'>['delimiters']>().toBeNullable();
            expectTypeOf<RouteProfile<string, 'odd-member'>['source']>().toBeNullable();
            expectTypeOf<RouteProfile<string, 'odd-member'>['receiverEntityCodes']>()
                .toBeNullable();
            expectTypeOf<RouteProfile<string, 'odd-member'>['memberIdPlaceholders']>()
                .toBeNullable();
        });

        it('should skip each check the profile leaves out', () => {
            const levels = [
                'HL*1**20*1~NM1*PR*2*P*****PI*OTHER~',
                'HL*2*1*21*1~NM1*FA*2*R*****XX*1~',
                'HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*MISSING~',
            ].join('');
            const bareProfile: RouteProfile<string, 'odd-member'> = {
                errors: testProfile.errors,
                listsAllErrors: true,
                name: testProfile.name,
                readMember: testProfile.readMember,
            };
            const entry = entryOf(levels, '|');

            const fullResult = interpretRoute(entry, testProfile);
            const result = interpretRoute(entry, bareProfile);

            expect(codesAndTags(fullResult.findings)).toEqual([
                'unexpected-delimiters ISA',
                'unexpected-source NM1',
                'unexpected-receiver NM1',
                'member-id-placeholder NM1',
            ]);
            expect(result.findings).toEqual([]);
        });
    });

    describe('delimiters', () => {
        it('should report each separator that differs, on the ISA', () => {
            const profile = {
                ...testProfile,
                delimiters: {
                    component: '|',
                    element: '*',
                    repetition: '^',
                    segment: '~',
                },
            };

            const result = interpretRoute(entryOf(GOOD), profile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-delimiters ISA']);
            expect(result.findings[0]?.message).toContain('component');
            expect(result.findings[0]?.message).not.toContain('repetition');
        });

        it('should report a missing repetition separator before 00501', () => {
            const body = 'ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~';
            const text = wrap(`${body}${GOOD}SE*7*0001~`, 'U').replace('*00501*', '*00401*');
            const [entry] = read271s(readX12(text));

            if (!entry) {
                throw new Error('No 271 transaction set in the text');
            }

            const result = interpretRoute(entry, testProfile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-delimiters ISA']);
            expect(result.findings[0]?.message).toContain('repetition');
        });
    });

    describe('source and receiver', () => {
        it('should report a source NM1 that differs', () => {
            const levels = 'HL*1**20*1~NM1*PR*2*P*****PI*OTHER~HL*2*1*21*1~NM1*1P*2*R*****XX*1~';

            const result = interpretRoute(entryOf(levels), testProfile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-source NM1']);
            expect(result.findings[0]?.message).toContain('OTHER');
        });

        it('should skip a source without an NM1', () => {
            const levels = 'HL*1**20*1~HL*2*1*21*1~NM1*1P*2*R*****XX*1~';

            const result = interpretRoute(entryOf(levels), testProfile);

            expect(result.findings).toEqual([]);
        });

        it('should report a receiver whose NM101 is not listed', () => {
            const levels = 'HL*1**20*1~NM1*PR*2*P*****PI*P1~HL*2*1*21*1~NM1*PR*2*R*****XX*1~';

            const result = interpretRoute(entryOf(levels), testProfile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-receiver NM1']);
        });
    });

    describe('members', () => {
        it('should report a placeholder member ID and keep the ID as sent', () => {
            const levels = `${GOOD}HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*MISSING~`;

            const result = interpretRoute(entryOf(levels), testProfile);

            expect(codesAndTags(result.findings)).toEqual(['member-id-placeholder NM1']);
            expect(result.members).toEqual(['MISSING']);
            expect(result.eligibility.members[0]?.memberId).toBe('MISSING');
        });

        it('should give a view to a member without an NM1', () => {
            const result = interpretRoute(entryOf(`${GOOD}HL*3*2*22*0~EB*1**30~`), testProfile);

            expect(result.findings).toEqual([]);
            expect(result.members).toEqual(['-']);
        });

        it('should pair members with views across subscribers and dependents', () => {
            const levels = [
                GOOD,
                'HL*3*2*22*1~NM1*IL*1*DOE*JO****MI*A1~',
                'HL*4*3*23*0~NM1*03*1*DOE*KID~',
                'HL*5*2*22*0~NM1*IL*1*ROE*AL****MI*ODD~',
                'HL*6*2*22*0~NM1*IL*1*POE*ED****MI*MISSING~',
            ].join('');

            const result = interpretRoute(entryOf(levels), testProfile);

            expect(result.members).toEqual(['A1', '-', 'ODD', 'MISSING']);
            expect(codesAndTags(result.findings)).toEqual([
                'member-id-placeholder NM1',
                'odd-member NM1',
            ]);
            expect(result.findings[0]?.segment.element(3)).toBe('POE');
            expect(result.findings[1]?.segment.element(9)).toBe('ODD');
        });
    });

    describe('errors', () => {
        it('should add the condition to a listed error', () => {
            const levels = `${GOOD}HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*A1~AAA*N**72*C~`;

            const result = interpretRoute(entryOf(levels), testProfile);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toMatchObject({
                condition: 'bad-id',
                description: 'The ID is wrong.',
                level: 'subscriber',
                rejectReason: '72',
            });
            expect(result.findings).toEqual([]);
        });

        it('should report an error whose AAA03 is not listed', () => {
            const levels = `${GOOD}HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*A1~AAA*N**73*C~`;

            const result = interpretRoute(entryOf(levels), testProfile);

            expect(result.errors[0]).toMatchObject({
                condition: undefined,
                description: undefined,
            });
            expect(codesAndTags(result.findings)).toEqual(['unlisted-error AAA']);
        });

        it('should report an error with no AAA03', () => {
            const levels = `${GOOD}HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*A1~AAA*N***C~`;

            const result = interpretRoute(entryOf(levels), testProfile);

            expect(result.errors[0]).toMatchObject({ condition: undefined });
            expect(codesAndTags(result.findings)).toEqual(['unlisted-error AAA']);
        });

        it('should report a benefit-level error with an AAA03 listed at another level', () => {
            const levels = `${GOOD}HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*A1~EB*1**30~AAA*N**72*C~`;

            const result = interpretRoute(entryOf(levels), testProfile);

            expect(result.errors[0]).toMatchObject({ condition: undefined, level: 'benefit' });
            expect(codesAndTags(result.findings)).toEqual(['unlisted-error AAA']);
        });

        it('should not accept a benefit-level condition in a profile', () => {
            expectTypeOf<RouteErrorCondition['level']>()
                .toEqualTypeOf<'dependent' | 'receiver' | 'source' | 'subscriber' | undefined>();
        });

        it('should match a condition without a level at every level except benefit', () => {
            const levels = [
                'HL*1**20*1~NM1*PR*2*P*****PI*P1~AAA*N**75*C~',
                'HL*2*1*21*1~NM1*1P*2*R*****XX*1~AAA*N**75*C~',
                'HL*3*2*22*1~NM1*IL*1*DOE*JO****MI*A1~AAA*N**75*C~',
                'HL*4*3*23*0~NM1*03*1*DOE*KID~AAA*N**75*C~',
            ].join('');

            const result = interpretRoute(entryOf(levels), anyLevelProfile);

            expect(result.errors.map(error => error.level)).toEqual([
                'source',
                'receiver',
                'subscriber',
                'dependent',
            ]);
            expect(result.errors.map(error => error.condition)).toEqual(['any', 'any', 'any', 'any']);
            expect(result.findings).toEqual([]);
        });

        it('should not match a condition without a level at the benefit level', () => {
            const levels = `${GOOD}HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*A1~EB*1**30~AAA*N**75*C~`;

            const result = interpretRoute(entryOf(levels), anyLevelProfile);

            expect(result.errors[0]).toMatchObject({ condition: undefined, level: 'benefit' });
            expect(codesAndTags(result.findings)).toEqual(['unlisted-error AAA']);
        });

        it('should not report unlisted errors when listsAllErrors is false', () => {
            const levels = `${GOOD}HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*A1~AAA*N**73*C~`;

            const result = interpretRoute(entryOf(levels), {
                ...testProfile,
                listsAllErrors: false,
            });

            expect(result.errors[0]).toMatchObject({ condition: undefined });
            expect(result.findings).toEqual([]);
        });

        it('should not report a benefit-level error when listsAllErrors is false', () => {
            const levels = `${GOOD}HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*A1~EB*1**30~AAA*N**72*C~`;

            const result = interpretRoute(entryOf(levels), {
                ...testProfile,
                listsAllErrors: false,
            });

            expect(result.errors[0]).toMatchObject({ condition: undefined, level: 'benefit' });
            expect(result.findings).toEqual([]);
        });
    });
});

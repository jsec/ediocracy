import { describe, expect, it } from 'vitest';

import { hcscProfile, interpretRoute, type RouteEntry } from '../src/profiles/271/routes/index.js';
import { codesAndTags, firstEntry, readFixture, wrap } from './utils.js';

const DEPENDENT = 'NM1*03*1*DOE*SAM~';
const RECEIVER = 'NM1*1P*2*R*****XX*1~';
const SUBSCRIBER = 'NM1*IL*1*DOE*JANE****MI*XOF123456~';
const TEXAS = 'NM1*PR*2*BCBSTX*****PI*84980~';

// The spec's error table: level, AAA03 and condition.
const ERROR_ROWS = [
    ['source', '42', 'payer-unavailable'],
    ['receiver', '50', 'provider-not-eligible'],
    ['receiver', '51', 'provider-not-on-file'],
    ['subscriber', '58', 'birth-date-missing'],
    ['subscriber', '62', 'date-outside-window'],
    ['subscriber', '71', 'birth-date-not-matched'],
    ['subscriber', '72', 'member-id-missing'],
    ['subscriber', '73', 'name-missing'],
    ['subscriber', '75', 'member-not-found'],
    ['subscriber', '76', 'duplicate-member-id'],
    ['dependent', '62', 'date-outside-window'],
    ['dependent', '64', 'member-id-missing'],
    ['dependent', '65', 'name-missing'],
    ['benefit', '62', 'date-outside-window'],
] as const;

type ErrorLevel = typeof ERROR_ROWS[number][0];

function entryOf(levels: string): RouteEntry {
    const body = `ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~${levels}`;
    const count = body.split('~').filter(segment => segment !== '').length + 1;

    return firstEntry(wrap(`${body}SE*${count}*0001~`));
}

function errorEntryOf(level: ErrorLevel, code: string): RouteEntry {
    const aaa = `AAA*N**${code}*C~`;
    const levels = {
        benefit: `${TEXAS}HL*2*1*21*1~${RECEIVER}HL*3*2*22*0~${SUBSCRIBER}EB*1**30~${aaa}`,
        dependent: `${TEXAS}HL*2*1*21*1~${RECEIVER}HL*3*2*22*1~${SUBSCRIBER}`
            + `HL*4*3*23*0~${DEPENDENT}${aaa}`,
        receiver: `${TEXAS}HL*2*1*21*1~${RECEIVER}${aaa}HL*3*2*22*0~${SUBSCRIBER}`,
        source: `${TEXAS}${aaa}HL*2*1*21*1~${RECEIVER}HL*3*2*22*0~${SUBSCRIBER}`,
        subscriber: `${TEXAS}HL*2*1*21*1~${RECEIVER}HL*3*2*22*0~${SUBSCRIBER}${aaa}`,
    } satisfies Record<ErrorLevel, string>;

    return entryOf(`HL*1**20*1~${levels[level]}`);
}

function hcscEntryOf(segments: string, payerSegment = TEXAS): RouteEntry {
    return entryOf(`HL*1**20*1~${payerSegment}HL*2*1*21*1~${RECEIVER}HL*3*2*22*0~${segments}`);
}

function viewOf(segments: string) {
    return interpretRoute(hcscEntryOf(`${SUBSCRIBER}${segments}`), hcscProfile).members[0];
}

describe('hcscProfile', () => {
    describe('source', () => {
        it('should accept each HCSC payer ID', () => {
            const result = hcscProfile.payerIds.map((payerId) => {
                const entry = hcscEntryOf(SUBSCRIBER, `NM1*PR*2*BCBS*****PI*${payerId}~`);

                return interpretRoute(entry, hcscProfile).findings;
            });

            expect(hcscProfile.payerIds).toHaveLength(9);
            expect(result).toEqual(hcscProfile.payerIds.map(() => []));
        });

        it('should not check NM103', () => {
            const entry = hcscEntryOf(SUBSCRIBER, 'NM1*PR*2*ANY NAME*****PI*G84980~');

            const result = interpretRoute(entry, hcscProfile);

            expect(result.findings).toEqual([]);
        });

        it('should report a 2100A with another NM101 or NM109', () => {
            const payerSegments = [
                'NM1*XX*2*BCBSTX*****PI*84980~',
                'NM1*PR*2*BCBSTX*****PI*99999~',
            ];

            const result = payerSegments.map((payerSegment) => {
                const entry = hcscEntryOf(SUBSCRIBER, payerSegment);

                return codesAndTags(interpretRoute(entry, hcscProfile).findings);
            });

            expect(result).toEqual([['unexpected-source NM1'], ['unexpected-source NM1']]);
        });

        it('should name the NM108 that differs', () => {
            const entry = hcscEntryOf(SUBSCRIBER, 'NM1*PR*2*BCBSTX*****FI*84980~');

            const result = interpretRoute(entry, hcscProfile);

            expect(result.findings).toMatchObject([
                {
                    code: 'unexpected-source',
                    message: '2100A NM108 "FI" is not "PI" (HCSC v1.1)',
                },
            ]);
        });
    });

    describe('errors', () => {
        it('should give each listed AAA its condition', () => {
            const results = ERROR_ROWS.map(([level, code]) => {
                return interpretRoute(errorEntryOf(level, code), hcscProfile);
            });
            const errors = results.map((result) => {
                const [error] = result.errors;

                return [error?.level, error?.rejectReason, error?.condition];
            });

            expect(errors).toEqual(ERROR_ROWS.map(row => [...row]));
            expect(results.flatMap(result => result.findings)).toEqual([]);
        });

        it('should match a benefit-level 62 under a dependent', () => {
            const levels = `HL*1**20*1~${TEXAS}HL*2*1*21*1~${RECEIVER}HL*3*2*22*1~${SUBSCRIBER}`
                + `HL*4*3*23*0~${DEPENDENT}EB*1**30~AAA*N**62*C~`;

            const result = interpretRoute(entryOf(levels), hcscProfile);

            expect(result.errors).toMatchObject([
                {
                    condition: 'date-outside-window',
                    level: 'benefit',
                },
            ]);
            expect(result.findings).toEqual([]);
        });

        it('should report a dependent-level 58 and 71 as unlisted', () => {
            const result = ['58', '71'].map((code) => {
                const routeResult = interpretRoute(errorEntryOf('dependent', code), hcscProfile);

                return [routeResult.errors[0]?.condition, codesAndTags(routeResult.findings)];
            });

            expect(result).toEqual([
                [undefined, ['unlisted-error AAA']],
                [undefined, ['unlisted-error AAA']],
            ]);
        });

        it('should report an unlisted code', () => {
            const result = interpretRoute(errorEntryOf('subscriber', '15'), hcscProfile);

            expect(result.errors).toMatchObject([{ condition: undefined }]);
            expect(codesAndTags(result.findings)).toEqual(['unlisted-error AAA']);
        });
    });

    describe('group', () => {
        it('should read the first REF 6P', () => {
            const result = viewOf('REF*6P*G100*ACME CO~REF*6P*G200*OTHER CO~');

            expect(result?.group).toEqual({ name: 'ACME CO', number: 'G100' });
        });

        it('should read a REF 6P without REF03', () => {
            const result = viewOf('REF*6P*123~');

            expect(result?.group).toEqual({ name: undefined, number: '123' });
        });

        it('should have no group without a REF 6P', () => {
            const result = viewOf('REF*18*P1~');

            expect(result?.group).toBeUndefined();
        });
    });

    describe('relatedPlans', () => {
        const PLANS = 'LS*2120~NM1*VER*2*PLAN A*****PI*A1~NM1*VER*2*PLAN B*****PI*B2~LE*2120~';

        it('should read the VER entities on a coverage row with EB03 30', () => {
            const result = viewOf(`EB*1**30~${PLANS}`);

            expect(result?.relatedPlans).toEqual([
                { name: 'PLAN A', payerId: 'A1' },
                { name: 'PLAN B', payerId: 'B2' },
            ]);
        });

        it('should read a coverage row whose EB03 repeats', () => {
            const result = viewOf(`EB*1**30^1~${PLANS}`);

            expect(result?.relatedPlans).toHaveLength(2);
        });

        it('should skip coverage rows without EB03 30', () => {
            const result = viewOf(`EB*1**1~${PLANS}`);

            expect(result?.relatedPlans).toEqual([]);
        });

        it('should skip entities with another NM101', () => {
            const result = viewOf('EB*1**30~LS*2120~NM1*P3*1*SMITH*ANN****XX*1~LE*2120~');

            expect(result?.relatedPlans).toEqual([]);
        });
    });

    describe('utilizationManagement', () => {
        const UTILIZATION_MANAGEMENT_ROW = 'EB*U**12~LS*2120~NM1*X3*2*UM CO~'
            + 'PER*IC**TE*5550001111*UR*https://um.example~LE*2120~';

        it('should read the name, phone, website and service types of an EB01 U row', () => {
            const result = viewOf(UTILIZATION_MANAGEMENT_ROW);

            expect(result?.utilizationManagement).toEqual([
                {
                    name: 'UM CO',
                    phone: '5550001111',
                    serviceTypes: ['12'],
                    website: 'https://um.example',
                },
            ]);
        });

        it('should keep repeated rows in order', () => {
            const secondRow = 'EB*U**30~LS*2120~NM1*X3*2*UM TWO~LE*2120~';

            const result = viewOf(`${UTILIZATION_MANAGEMENT_ROW}${secondRow}`);
            const names = result?.utilizationManagement.map(entry => entry.name);

            expect(names).toEqual(['UM CO', 'UM TWO']);
        });

        it('should read an EB01 U row without a 2120 loop', () => {
            const result = viewOf('EB*U**12~');

            expect(result?.utilizationManagement).toEqual([
                {
                    name: undefined,
                    phone: undefined,
                    serviceTypes: ['12'],
                    website: undefined,
                },
            ]);
        });

        it('should skip other rows', () => {
            const result = viewOf('EB*1**30~');

            expect(result?.utilizationManagement).toEqual([]);
        });
    });

    describe('sandbox sample', () => {
        it('should detect the Texas sample as hcsc and read the dependent', () => {
            const entry = firstEntry(readFixture('271/sandbox-hcsc-texas-dependent.x12'));

            const result = interpretRoute(entry);

            expect(result.route).toBe('hcsc');
            expect(result).toMatchObject({
                result: {
                    findings: [],
                    members: [
                        {},
                        {
                            group: { name: 'GA PARTNERS', number: '999888' },
                            relatedPlans: [
                                { name: 'BLUE CROSS AND BLUE SHIELD OF TEXAS', payerId: 'G84980' },
                                {
                                    name: 'Blue Cross and Blue Shield of Illinois',
                                    payerId: 'G00621',
                                },
                            ],
                            utilizationManagement: [
                                {
                                    name: 'Health Management LLC',
                                    phone: '5555551234',
                                    website: undefined,
                                },
                                {
                                    name: 'Health Management LLC',
                                    phone: '5555551234',
                                    // eslint-disable-next-line unicorn/prefer-https -- as sent
                                    website: 'http://www.healthmanagementllc.com/',
                                },
                            ],
                        },
                    ],
                },
            });
        });
    });
});

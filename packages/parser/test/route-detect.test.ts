import { describe, expect, expectTypeOf, it } from 'vitest';

import { type Eligibility, interpret271 } from '../src/profiles/271/index.js';
import {
    cignaProfile,
    hcscProfile,
    hetsProfile,
    humanaProfile,
    type HumanaView,
    interpretRoute,
    type RouteEntry,
    uhcProfile,
} from '../src/profiles/271/routes/index.js';
import { firstEntry, readFixture, wrap } from './utils.js';

function entryOf(levels: string): RouteEntry {
    const body = `ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~${levels}`;
    const count = body.split('~').filter(segment => segment !== '').length + 1;

    return firstEntry(wrap(`${body}SE*${count}*0001~`));
}

const MEMBER_LEVELS = 'HL*3*2*22*0~NM1*IL*1*DOE*JOHN****MI*123~EB*1**30~';

function payerEntryOf(payerSegments: string): RouteEntry {
    const levels = [
        `HL*1**20*1~${payerSegments}`,
        'HL*2*1*21*1~NM1*1P*2*R*****XX*1~',
        MEMBER_LEVELS,
    ].join('');

    return entryOf(levels);
}

function twoPayerEntryOf(first: string, second: string): RouteEntry {
    const levels = [
        `HL*1**20*1~${first}`,
        `HL*2**20*1~${second}`,
        'HL*4*2*21*1~NM1*1P*2*R*****XX*1~',
        'HL*3*4*22*0~NM1*IL*1*DOE*JOHN****MI*123~EB*1**30~',
    ].join('');

    return entryOf(levels);
}

describe('payerIds', () => {
    it('should list the payer IDs each profile covers', () => {
        const result = [
            hetsProfile.payerIds,
            humanaProfile.payerIds,
            uhcProfile.payerIds,
            cignaProfile.payerIds,
            hcscProfile.payerIds,
        ];

        expect(result).toEqual([
            ['CMS'],
            ['61101', '61115', '65065', 'CX021'],
            ['87726', '52133', '00773', '94265'],
            [
                '06-1059331',
                '061059331',
                '59-1031071',
                '591031071',
                '41-1648670',
                '411648670',
                '59-2308055',
                '592308055',
                '06-0303370',
                '060303370',
                '59-1056496',
                '591056496',
                '62308',
            ],
            [
                '84980',
                'G84980',
                'HCSV2',
                '00621',
                'G00621',
                'MCIL2',
                '00840',
                '00751',
                'HMAPD',
            ],
        ]);
    });

    it('should not list a payer ID in two profiles', () => {
        const ids = [
            ...hetsProfile.payerIds,
            ...humanaProfile.payerIds,
            ...uhcProfile.payerIds,
            ...cignaProfile.payerIds,
            ...hcscProfile.payerIds,
        ];

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('should not check the 2100A when uhcProfile is applied directly', () => {
        const entry = payerEntryOf('NM1*PR*2*UHC*****PI*00192~');

        const result = interpretRoute(entry, uhcProfile);

        expect(result.findings).toEqual([]);
    });
});

describe('interpretRoute(entry)', () => {
    it('should select cigna for each Cigna payer ID', () => {
        const result = cignaProfile.payerIds.map((payerId) => {
            const entry = payerEntryOf(`NM1*PR*2*CIGNA*****FI*${payerId}~`);

            return interpretRoute(entry).route;
        });

        expect(result).toEqual(cignaProfile.payerIds.map(() => 'cigna'));
    });

    it('should select hcsc for each HCSC payer ID', () => {
        const result = hcscProfile.payerIds.map((payerId) => {
            const entry = payerEntryOf(`NM1*PR*2*BCBS*****PI*${payerId}~`);

            return interpretRoute(entry).route;
        });

        expect(result).toEqual(hcscProfile.payerIds.map(() => 'hcsc'));
    });

    it('should select the route for each payer ID', () => {
        const payerIds = ['CMS', '87726', '52133', '00773', '94265', '61101', '61115', '65065', 'CX021'];

        const result = payerIds.map((payerId) => {
            const entry = payerEntryOf(`NM1*PR*2*P*****PI*${payerId}~`);

            return interpretRoute(entry).route;
        });

        expect(result).toEqual(['hets', 'uhc', 'uhc', 'uhc', 'uhc', 'humana', 'humana', 'humana', 'humana']);
    });

    it('should return the profile result on a match', () => {
        const entry = payerEntryOf('NM1*PR*2*CMS*****PI*CMS~');

        const result = interpretRoute(entry);

        expect(result).toEqual({
            result: interpretRoute(entry, hetsProfile),
            route: 'hets',
        });
    });

    it('should return the interpret271 result when no profile lists the payer ID', () => {
        const entries = [
            payerEntryOf('NM1*PR*2*UHC*****PI*00192~'),
            payerEntryOf('NM1*PR*2*UHC OF CALIFORNIA~'),
            payerEntryOf(''),
        ];

        for (const entry of entries) {
            const result = interpretRoute(entry);

            expect(result).toEqual({
                eligibility: interpret271(entry.response),
                route: undefined,
            });
        }
    });

    it('should use the first named 2100A', () => {
        const result = [
            interpretRoute(twoPayerEntryOf('NM1*PR*2*P~', 'NM1*PR*2*P*****PI*CMS~')).route,
            interpretRoute(twoPayerEntryOf('NM1*PR*2*P*****PI*CMS~', 'NM1*PR*2*P*****PI*61101~')).route,
            interpretRoute(twoPayerEntryOf('', 'NM1*PR*2*P*****PI*CMS~')).route,
        ];

        expect(result).toEqual([undefined, 'hets', 'hets']);
    });

    it('should not match a padded payer ID', () => {
        const entry = payerEntryOf('NM1*PR*2*P*****PI*87726 ~');

        const result = interpretRoute(entry);

        expect(result.route).toBeUndefined();
    });

    it('should detect the example fixtures', () => {
        const fixtures = ['271/hets/cms-hets2024-4-example.x12', '271/sandbox-medicare-advantage.x12'];

        const result = fixtures.map(name => interpretRoute(firstEntry(readFixture(name))).route);

        expect(result).toEqual(['hets', 'uhc']);
    });

    it('should narrow the result type on route', () => {
        const detected = interpretRoute(payerEntryOf('NM1*PR*2*P*****PI*61101~'));

        if (detected.route === 'humana') {
            expectTypeOf(detected.result.members).toEqualTypeOf<HumanaView[]>();
        } else if (detected.route === undefined) {
            expectTypeOf(detected.eligibility).toEqualTypeOf<Eligibility>();
        }
    });
});

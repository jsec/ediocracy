import { describe, expect, it } from 'vitest';

import { interpretRoute, type RouteEntry, uhcProfile } from '../src/profiles/271/routes/index.js';
import { codesAndTags, firstEntry, readFixture, wrap } from './utils.js';

const MINIMUM_ROW = 'EB*B*IND*BY***27*5**8H*5**Y~MSG*AMOUNT VARIES BY PRACTITIONER~';
const UHC_LEVELS = [
    'HL*1**20*1~NM1*PR*2*UNITEDHEALTHCARE*****PI*87726~',
    'HL*2*1*21*1~NM1*1P*2*R*****XX*1~',
    'HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*A1~',
].join('');

function uhcEntryOf(segments: string): RouteEntry {
    const body = `ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~${UHC_LEVELS}${segments}`;
    const count = body.split('~').filter(segment => segment !== '').length + 1;

    return firstEntry(wrap(`${body}SE*${count}*0001~`));
}

describe('uhcProfile', () => {
    describe('real responses', () => {
        it('should read sandbox-medicare-advantage', () => {
            const entry = firstEntry(readFixture('271/sandbox-medicare-advantage.x12'));

            const result = interpretRoute(entry, uhcProfile);
            const [view] = result.members;

            expect(result.findings).toEqual([]);
            expect(view?.coverageDates).toHaveLength(1);
            expect(view?.coverageDates[0]?.start.toString()).toBe('2026-01-01');
            expect(view?.coverageDates[0]?.end).toBeUndefined();
            expect(view?.coverageDates[0]?.segment.tag).toBe('DTP');
            expect(view?.otherPayers).toHaveLength(1);
            expect(view?.otherPayers[0]?.name).toBeUndefined();
            expect(view?.otherPayers[0]?.entry.kind).toBe('R');
        });

        it('should return one view for the subscriber and one for the dependent in dependent-sample', () => {
            const entry = firstEntry(readFixture('271/dependent-sample.x12'));

            const result = interpretRoute(entry, uhcProfile);

            expect(result.findings).toEqual([]);
            expect(result.members).toEqual([
                {
                    copayRanges: [],
                    coverageDates: [],
                    otherPayers: [],
                    variableCopays: [],
                },
                {
                    copayRanges: [],
                    coverageDates: [],
                    otherPayers: [],
                    variableCopays: [],
                },
            ]);
        });
    });

    describe('coverage dates', () => {
        it('should set end only for RD8', () => {
            const result = interpretRoute(uhcEntryOf('DTP*346*RD8*20240101-20241231~'), uhcProfile);
            const [view] = result.members;

            expect(view?.coverageDates[0]?.start.toString()).toBe('2024-01-01');
            expect(view?.coverageDates[0]?.end?.toString()).toBe('2024-12-31');
        });

        it('should list member dates before dates on EB03 30 coverage rows', () => {
            const segments = 'DTP*346*D8*20260101~EB*1**30~DTP*346*D8*20260201~';

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);
            const starts = result.members[0]?.coverageDates.map(date => date.start.toString());

            expect(starts).toEqual(['2026-01-01', '2026-02-01']);
        });

        it('should report a 346 that is not D8 or RD8 and leave it out', () => {
            const result = interpretRoute(uhcEntryOf('DTP*346*D6*202601~'), uhcProfile);

            expect(result.members[0]?.coverageDates).toEqual([]);
            expect(codesAndTags(result.findings)).toEqual(['unexpected-coverage-date-format DTP']);
        });

        it('should leave out an RD8 it cannot read, with no UHC finding', () => {
            const result = interpretRoute(uhcEntryOf('DTP*346*RD8*20240101-2024~'), uhcProfile);
            const eligibilityCodes = result.eligibility.findings.map(finding => finding.code);

            expect(result.members[0]?.coverageDates).toEqual([]);
            expect(result.findings).toEqual([]);
            expect(eligibilityCodes).toContain('invalid-date');
        });

        it('should leave out an RD8 whose end is before its start, with no UHC finding', () => {
            const result = interpretRoute(uhcEntryOf('DTP*346*RD8*20241231-20240101~'), uhcProfile);
            const eligibilityCodes = result.eligibility.findings.map(finding => finding.code);

            expect(result.members[0]?.coverageDates).toEqual([]);
            expect(result.findings).toEqual([]);
            expect(eligibilityCodes).toContain('invalid-date');
        });

        it('should not read a 346 on a cost share row', () => {
            const segments = 'EB*C*IND*30***23*500~DTP*346*D8*20260101~';

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);

            expect(result.members[0]?.coverageDates).toEqual([]);
        });
    });

    describe('other payers', () => {
        it('should name the payer from the 2120 NM1', () => {
            const segments = 'EB*R**30~LS*2120~NM1*PR*2*ABC PAYER~LE*2120~';

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);

            expect(result.members[0]?.otherPayers[0]?.name).toBe('ABC PAYER');
        });
    });

    describe('variable copays', () => {
        it('should read an exact variable copay', () => {
            const segments = 'EB*B*IND*50***27*125*****Y~MSG*AMOUNT VARIES BY LOCATION~';

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);
            const [view] = result.members;

            expect(view?.variableCopays).toHaveLength(1);
            expect(view?.variableCopays[0]).toMatchObject({
                entry: { amount: 125 },
                variesBy: 'location',
            });
            expect(view?.copayRanges).toEqual([]);
        });

        it('should pair an 8H row with the next M2 row', () => {
            const segments = [
                MINIMUM_ROW,
                'EB*B*IND*BY***27*90**M2*90**Y~MSG*AMOUNT VARIES BY PRACTITIONER~',
            ].join('');

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);
            const [view] = result.members;

            expect(view?.copayRanges).toHaveLength(1);
            expect(view?.copayRanges[0]).toMatchObject({
                maximum: { amount: 90 },
                minimum: { amount: 5 },
                variesBy: 'practitioner',
            });
            expect(view?.variableCopays).toEqual([]);
            expect(result.findings).toEqual([]);
        });

        it('should report both rows when EB03 differs', () => {
            const segments = [
                MINIMUM_ROW,
                'EB*B*IND*98***27*90**M2*90**Y~MSG*AMOUNT VARIES BY PRACTITIONER~',
            ].join('');

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);

            expect(result.members[0]?.copayRanges).toEqual([]);
            expect(codesAndTags(result.findings)).toEqual([
                'unpaired-copay-range EB',
                'unpaired-copay-range EB',
            ]);
        });

        it('should report an M2 row with no 8H row', () => {
            const segments = 'EB*B*IND*BY***27*90**M2*90**Y~MSG*AMOUNT VARIES BY PRACTITIONER~';

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);

            expect(result.members[0]?.copayRanges).toEqual([]);
            expect(codesAndTags(result.findings)).toEqual(['unpaired-copay-range EB']);
        });

        it('should pair the second of two 8H rows', () => {
            const segments = [
                MINIMUM_ROW,
                'EB*B*IND*BY***27*10**8H*10**Y~MSG*AMOUNT VARIES BY PRACTITIONER~',
                'EB*B*IND*BY***27*90**M2*90**Y~MSG*AMOUNT VARIES BY PRACTITIONER~',
            ].join('');

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);
            const [view] = result.members;

            expect(view?.copayRanges).toHaveLength(1);
            expect(view?.copayRanges[0]).toMatchObject({
                maximum: { amount: 90 },
                minimum: { amount: 10 },
            });
            expect(codesAndTags(result.findings)).toEqual(['unpaired-copay-range EB']);
            expect(result.findings[0]?.segment.element(7)).toBe('5');
        });

        it('should ignore a copay without a varies MSG', () => {
            const result = interpretRoute(uhcEntryOf('EB*B*IND*BY***27*5**8H*5**Y~'), uhcProfile);
            const [view] = result.members;

            expect(view?.copayRanges).toEqual([]);
            expect(view?.variableCopays).toEqual([]);
            expect(result.findings).toEqual([]);
        });

        it('should trim spaces around the MSG text', () => {
            const segments = 'EB*B*IND*50***27*125*****Y~MSG* AMOUNT VARIES BY LOCATION~';

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);

            expect(result.members[0]?.variableCopays).toHaveLength(1);
        });

        it('should not match the MSG text in another case', () => {
            const segments = 'EB*B*IND*50***27*125*****Y~MSG*Amount varies by location~';

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);

            expect(result.members[0]?.variableCopays).toEqual([]);
        });
    });

    describe('errors', () => {
        it('should give the UHC conditions for 62, 63 and 75', () => {
            const segments = 'AAA*N**62*C~AAA*N**63*C~AAA*N**75*C~';

            const result = interpretRoute(uhcEntryOf(segments), uhcProfile);

            expect(result.errors.map(error => error.condition)).toEqual([
                'date-outside-window',
                'date-outside-window',
                'search-data-missing',
            ]);
            expect(result.findings).toEqual([]);
        });

        it('should not report an unlisted AAA', () => {
            const result = interpretRoute(uhcEntryOf('AAA*N**72*C~'), uhcProfile);

            expect(result.errors[0]).toMatchObject({ condition: undefined });
            expect(result.findings).toEqual([]);
        });
    });
});

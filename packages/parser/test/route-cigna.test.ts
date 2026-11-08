import { describe, expect, it } from 'vitest';

import { cignaProfile, interpretRoute, type RouteEntry } from '../src/profiles/271/routes/index.js';
import { codesAndTags, firstEntry, readFixture, wrap } from './utils.js';

const SAMPLES = [
    '271/sandbox-cigna-behavioral.x12',
    '271/sandbox-cigna-client-specific-network.x12',
    '271/sandbox-cigna-dental.x12',
    '271/sandbox-cigna-open-access-plus.x12',
];
const CHLIC = 'NM1*PR*2*CHLIC*****FI*591056496~';
const RECEIVER = 'HL*2*1*21*1~NM1*1P*2*R*****XX*1~';
const SUBSCRIBER = 'NM1*IL*1*DOE*JANE****MI*U1234567~';
const TAX_IDS = [
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
];

function cignaEntryOf(segments: string, payerSegment = CHLIC): RouteEntry {
    return entryOf(`HL*1**20*1~${payerSegment}${RECEIVER}HL*3*2*22*0~${segments}`);
}

function entryOf(levels: string): RouteEntry {
    const body = `ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~${levels}`;
    const count = body.split('~').filter(segment => segment !== '').length + 1;

    return firstEntry(wrap(`${body}SE*${count}*0001~`));
}

function viewOf(segments: string) {
    return interpretRoute(cignaEntryOf(`${SUBSCRIBER}${segments}`), cignaProfile).members[0];
}

describe('cignaProfile', () => {
    describe('source and errors', () => {
        it('should accept each Cigna payer ID', () => {
            const payerSegments = [
                ...TAX_IDS.map(id => `NM1*PR*2*CIGNA*****FI*${id}~`),
                'NM1*PR*2*CIGNA*****PI*62308~',
            ];

            const result = payerSegments.map((payerSegment) => {
                const entry = cignaEntryOf(SUBSCRIBER, payerSegment);

                return interpretRoute(entry, cignaProfile).findings;
            });

            expect(result).toEqual(payerSegments.map(() => []));
        });

        it('should accept FI with 62308', () => {
            const entry = cignaEntryOf(SUBSCRIBER, 'NM1*PR*2*CIGNA*****FI*62308~');

            const result = interpretRoute(entry, cignaProfile);

            expect(result.findings).toEqual([]);
        });

        it('should report another payer', () => {
            const entry = cignaEntryOf(SUBSCRIBER, 'NM1*PR*2*OTHER*****PI*12345~');

            const result = interpretRoute(entry, cignaProfile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-source NM1']);
        });

        it('should give each listed AAA its condition', () => {
            const cases = [
                ['subscriber', '75', 'member-not-found'],
                ['dependent', '67', 'member-not-found'],
                ['subscriber', '76', 'multiple-members-found'],
                ['dependent', '68', 'multiple-members-found'],
                ['subscriber', '72', 'member-id-not-matched'],
                ['dependent', '64', 'member-id-not-matched'],
                ['subscriber', '73', 'name-not-matched'],
                ['dependent', '65', 'name-not-matched'],
                ['subscriber', '58', 'birth-date-not-matched'],
                ['dependent', '58', 'birth-date-not-matched'],
            ];

            const result = cases.map(([level, code]) => {
                const members = level === 'subscriber'
                    ? `HL*3*2*22*0~${SUBSCRIBER}AAA*Y**${code}*C~`
                    : `HL*3*2*22*1~${SUBSCRIBER}HL*4*3*23*0~NM1*03*1*DOE*SAM~AAA*Y**${code}*C~`;
                const entry = entryOf(`HL*1**20*1~${CHLIC}${RECEIVER}${members}`);

                const errors = interpretRoute(entry, cignaProfile).errors;

                return errors.map(error => [error.level, error.condition]);
            });

            expect(result).toEqual(cases.map(([level, , condition]) => [[level, condition]]));
        });

        it('should not report an unlisted AAA', () => {
            const entry = cignaEntryOf(`${SUBSCRIBER}AAA*Y**42*C~`);

            const result = interpretRoute(entry, cignaProfile);

            expect(result.errors).toMatchObject([{ condition: undefined }]);
            expect(result.findings).toEqual([]);
        });
    });

    describe('network and participation', () => {
        it('should read the REF N6 network', () => {
            const withNetwork = viewOf('REF*N6*NET1*LOCAL NETWORK~EB*1**30~');
            const withoutNetwork = viewOf('EB*1**30~');

            expect(withNetwork?.network).toMatchObject({
                description: 'LOCAL NETWORK',
                name: 'NET1',
            });
            expect(withoutNetwork?.network).toBeUndefined();
        });

        it('should read in-network and out-of-network messages', () => {
            const messages = [
                'Provider is in network based on NPI',
                'Provider is out of network based on NPI',
                'PROVIDER IS IN NETWORK',
            ];

            const result = messages
                .map(message => viewOf(`EB*1**30**PLAN~MSG*${message}~`)?.participation);

            expect(result).toEqual(['in-network', 'out-of-network', 'in-network']);
        });

        it('should ignore participation messages on other rows', () => {
            const result = viewOf('EB*1**1~MSG*Provider is in network based on NPI~');

            expect(result?.participation).toBeUndefined();
        });
    });

    describe('care management and CareLink', () => {
        it('should read the care management message', () => {
            const rows = [
                'EB*1**30**PLAN~MSG*Preferred Care Management~',
                'EB*1**1~MSG*PHS+~',
                'EB*1**1~MSG*PHS PLUS~',
                'EB*B**30~MSG*Complete Care Management~',
            ];

            const result = rows.map(row => viewOf(row)?.careManagement);

            expect(result).toEqual(['Preferred Care Management', 'PHS+', undefined, undefined]);
        });

        it('should read CareLink in EB05', () => {
            const rows = ['EB*1**30**CareLink~', 'EB*1**30**PLAN~', 'EB*1**1**CareLink~'];

            const result = rows.map(row => viewOf(row)?.isCareLink);

            expect(result).toEqual([true, false, false]);
        });
    });

    describe('shared-risk networks', () => {
        it('should read the EB01 N row and its manager', () => {
            const result = viewOf('EB*N~LS*2120~NM1*Y2*2*SUPER CLINIC~LE*2120~');

            expect(result?.sharedRiskNetworks).toMatchObject([{ manager: 'SUPER CLINIC' }]);
        });

        it('should leave the manager undefined without a 2120', () => {
            const result = viewOf('EB*N~');

            expect(result?.sharedRiskNetworks).toMatchObject([{ manager: undefined }]);
        });
    });

    describe('attribution', () => {
        it('should read each attribution status', () => {
            const entry = cignaEntryOf(`${SUBSCRIBER}EB*CB**30***25~DTP*356*D8*20260101~`
                + 'DTP*357*D8*20260131~MSG*Attribution Status - Yes~EB*D**30***25~'
                + 'MSG*Attribution Status - No~EB*E**30***25~'
                + 'MSG*Attribution Status - Not applicable~');

            const result = interpretRoute(entry, cignaProfile);
            const attribution = result.members[0]?.attribution ?? [];

            expect(attribution.map(row => row.status)).toEqual(['yes', 'no', 'not-applicable']);
            expect(attribution[0]?.start?.toString()).toBe('2026-01-01');
            expect(attribution[0]?.end?.toString()).toBe('2026-01-31');
            expect(result.findings).toEqual([]);
        });

        it('should accept an en dash or a hyphen', () => {
            const entry = cignaEntryOf(`${SUBSCRIBER}EB*CB**30***25~MSG*Attribution Status – Yes~`
                + 'EB*CB**30***25~MSG*Attribution Status - Yes~');

            const result = interpretRoute(entry, cignaProfile);

            expect(result.members[0]?.attribution.map(row => row.status)).toEqual(['yes', 'yes']);
            expect(result.findings).toEqual([]);
        });

        it('should not treat other EB06 25 rows as attribution', () => {
            const rows = [
                'EB*CB**30***25~',
                'EB*CB**30~MSG*Attribution Status - Yes~',
                'EB*C**30***25~MSG*Attribution Status - Yes~',
                'EB*CB**A6********Y*W~',
            ];

            const result = rows.map(row => viewOf(row)?.attribution);

            expect(result).toEqual([[], [], [], []]);
        });

        it('should report a message that disagrees with EB01', () => {
            const entry = cignaEntryOf(`${SUBSCRIBER}EB*D**30***25~MSG*Attribution Status - Yes~`);

            const result = interpretRoute(entry, cignaProfile);

            expect(result.members[0]?.attribution).toMatchObject([{ status: 'no' }]);
            expect(codesAndTags(result.findings)).toEqual(['attribution-status-mismatch EB']);
        });
    });

    describe('HRA balances', () => {
        it('should read the starting and remaining balances', () => {
            const result = viewOf('EB*F*IND*30***29*3300~MSG*HRA Balance~'
                + 'EB*F*IND*30***23*5000~MSG*HRA remaining Balance~');

            expect(result?.hraBalances).toMatchObject([
                { amount: '3300', kind: 'starting' },
                { amount: '5000', kind: 'remaining' },
            ]);
        });

        it('should ignore HRA messages on other rows', () => {
            const result = viewOf('EB*C*IND*30***23*5000~MSG*HRA Balance~');

            expect(result?.hraBalances).toEqual([]);
        });
    });

    describe('partners', () => {
        it('should read the partner from the 2120 loop', () => {
            const result = viewOf('EB*U**30~LS*2120~NM1*PR*2*PARTNER CO~'
                + 'PER*IC*PARTNER CO*TE*8005550100~LE*2120~');

            expect(result?.partners).toMatchObject([{ name: 'PARTNER CO', phone: '8005550100' }]);
        });

        it('should read TE in any PER position', () => {
            const result = viewOf('EB*U**30~LS*2120~NM1*PR*2*PARTNER CO~'
                + 'PER*IC*X*FX*8005550199*TE*8005550100~LE*2120~');

            expect(result?.partners).toMatchObject([{ phone: '8005550100' }]);
        });

        it('should use EB05 without a 2120', () => {
            const result = viewOf('EB*U**30**ALLIANCE PLAN~');

            expect(result?.partners).toMatchObject([{ name: 'ALLIANCE PLAN', phone: undefined }]);
        });

        it('should leave name and phone undefined', () => {
            const result = viewOf('EB*U**30~');

            expect(result?.partners).toMatchObject([{ name: undefined, phone: undefined }]);
        });

        it('should not read EB01 I rows', () => {
            const result = viewOf('EB*I**27^38~');

            expect(result?.partners).toEqual([]);
        });
    });

    describe('sandbox responses', () => {
        it('should detect each sample as cigna with no route findings', () => {
            const entries = SAMPLES.map(name => firstEntry(readFixture(name)));

            const routes = entries.map(entry => interpretRoute(entry).route);
            const findings = entries.map(entry => interpretRoute(entry, cignaProfile).findings);

            expect(routes).toEqual(['cigna', 'cigna', 'cigna', 'cigna']);
            expect(findings).toEqual([[], [], [], []]);
        });

        it('should read the dental network', () => {
            const entry = firstEntry(readFixture('271/sandbox-cigna-dental.x12'));

            const result = interpretRoute(entry, cignaProfile);

            expect(result.members[0]?.network).toMatchObject({
                description: 'TOTAL DENTAL',
                name: 'DENTL',
            });
        });

        it('should read the care management level', () => {
            const names = [
                '271/sandbox-cigna-open-access-plus.x12',
                '271/sandbox-cigna-behavioral.x12',
            ];

            const result = names.map((name) => {
                const entry = firstEntry(readFixture(name));

                return interpretRoute(entry, cignaProfile).members[0]?.careManagement;
            });

            expect(result).toEqual(['Complete Care Management', 'Preferred Care Management']);
        });

        it('should not treat the precertification row as attribution', () => {
            const entry = firstEntry(readFixture('271/sandbox-cigna-behavioral.x12'));

            const result = interpretRoute(entry, cignaProfile);

            expect(result.members[0]?.attribution).toEqual([]);
        });
    });
});

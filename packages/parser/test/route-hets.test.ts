import { describe, expect, it } from 'vitest';

import { hetsProfile, interpretRoute, read271s, readX12, type RouteEntry } from '../src/index.js';
import { readFixture, wrap } from './utils.js';

const HETS_RECEIVER = 'HL*2*1*21*1~NM1*1P*2*R*****XX*1234567893~';
const HETS_SOURCE = 'HL*1**20*1~NM1*PR*2*CMS*****PI*CMS~';
const SUBSCRIBER = 'HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*1AA2CC3DD45~';

function firstEntry(text: string): RouteEntry {
    const [entry] = read271s(readX12(text));

    if (!entry) {
        throw new Error('No 271 transaction set in the text');
    }

    return entry;
}

function hetsEntryOf(levels: string): RouteEntry {
    const body = `ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~${levels}`;
    const count = body.split('~').filter(segment => segment !== '').length + 1;
    const text = wrap(`${body}SE*${count}*0001~`).replace('*P*:~', '*P*|~');

    return firstEntry(text);
}

describe('hetsProfile', () => {
    describe('Medicare views', () => {
        it('should read the CMS example with no route findings', () => {
            const entry = firstEntry(readFixture('271/hets/cms-hets2024-4-example.x12'));

            const result = interpretRoute(entry, hetsProfile);
            const [view] = result.members;

            expect(result.findings).toEqual([]);
            expect(view?.partA).toHaveLength(1);
            expect(view?.partA[0]?.messages).toEqual([
                '<Medicare Entitlement/Enrollment Reason Code> - '
                + '<Medicare Entitlement/Enrollment Code Text Value>',
            ]);
            expect(view?.partB).toHaveLength(2);
            expect(view?.partACostShares).toHaveLength(26);
            expect(view?.partBCostShares).toHaveLength(16);
            expect(view?.qmb).toHaveLength(16);
            expect(view?.partD).toMatchObject([
                {
                    contract: 'S1234',
                    plan: '001',
                    planName: 'PLANNAME',
                },
            ]);
            expect(view?.medicareAdvantage).toMatchObject([
                {
                    contract: 'H1234',
                    plan: '001',
                    planName: 'PLANNAME',
                },
            ]);
            expect(view?.msp).toMatchObject([
                { policyNumber: 'GROUPCOVERAGEPLANPOLICYNUMBER', ref6P: 'DOL 01072020' },
            ]);
            expect(view?.ssaAddress).toBeUndefined();
        });

        it('should read the sandbox response and report its component separator', () => {
            const entry = firstEntry(readFixture('271/sandbox-cms-mbi-lookup.x12'));

            const result = interpretRoute(entry, hetsProfile);
            const [view] = result.members;

            expect(result.findings.map(finding => finding.code)).toEqual(['unexpected-delimiters']);
            expect(view?.partA[0]?.messages).toEqual(['0-Beneficiary insured due to age OASI']);
            expect(view?.partB).toHaveLength(1);
            expect(view?.partACostShares).toEqual([]);
            expect(view?.qmb).toHaveLength(4);
            expect(view?.partD).toMatchObject([
                {
                    contract: 'A0505',
                    plan: '555',
                    planName: undefined,
                },
            ]);
            expect(view?.medicareAdvantage).toHaveLength(1);
            expect(view?.msp).toEqual([]);
        });

        it('should put QM rows in qmb and not in msp', () => {
            const levels = `${HETS_SOURCE}${HETS_RECEIVER}${SUBSCRIBER}EB*R***QM*AZ QMB Plan~`;

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);
            const [view] = result.members;

            expect(view?.qmb).toHaveLength(1);
            expect(view?.msp).toEqual([]);
        });

        it('should leave an R row for 30 with an EB04 outside the MSP list out of msp', () => {
            const levels = `${HETS_SOURCE}${HETS_RECEIVER}${SUBSCRIBER}EB*R**30*HN~`;

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);

            expect(result.members[0]?.msp).toEqual([]);
        });
    });

    describe('placeholder address', () => {
        const PLACEHOLDER = [
            HETS_SOURCE,
            HETS_RECEIVER,
            SUBSCRIBER,
            'N3*Refer to MSG for Subscriber address~N4*Baltimore*MD*21244~',
        ].join('');

        it('should return the SSA address from the MSG and report the placeholder', () => {
            const levels = `${PLACEHOLDER}EB*D~MSG*Subscriber address - 12 OAK ST APT 4 SPRINGFIELD IL 62701~`;

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);

            expect(result.members[0]?.ssaAddress).toBe('12 OAK ST APT 4 SPRINGFIELD IL 62701');
            expect(result.findings.map(finding => `${finding.code} ${finding.segment.tag}`)).toEqual([
                'placeholder-address N3',
            ]);
            expect(result.eligibility.members[0]?.details.address?.city).toBe('Baltimore');
        });

        it('should accept an en dash with no spaces', () => {
            const levels = `${PLACEHOLDER}EB*D~MSG*Subscriber address–12 OAK ST~`;

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);

            expect(result.members[0]?.ssaAddress).toBe('12 OAK ST');
        });

        it('should leave the address undefined for Unknown', () => {
            const levels = `${PLACEHOLDER}EB*D~MSG*Subscriber address - Unknown~`;

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);

            expect(result.members[0]?.ssaAddress).toBeUndefined();
            expect(result.findings.map(finding => finding.code)).toEqual(['placeholder-address']);
        });

        it('should trim the address and treat a blank or padded Unknown as no address', () => {
            const padded = `${PLACEHOLDER}EB*D~MSG*Subscriber address - 12 OAK ST ~`;
            const paddedUnknown = `${PLACEHOLDER}EB*D~MSG*Subscriber address - Unknown ~`;
            const blank = `${PLACEHOLDER}EB*D~MSG*Subscriber address - ~`;

            const paddedResult = interpretRoute(hetsEntryOf(padded), hetsProfile);
            const paddedUnknownResult = interpretRoute(hetsEntryOf(paddedUnknown), hetsProfile);
            const blankResult = interpretRoute(hetsEntryOf(blank), hetsProfile);

            expect(paddedResult.members[0]?.ssaAddress).toBe('12 OAK ST');
            expect(paddedUnknownResult.members[0]?.ssaAddress).toBeUndefined();
            expect(blankResult.members[0]?.ssaAddress).toBeUndefined();
        });

        it('should leave the address undefined without an EB*D message', () => {
            const levels = `${PLACEHOLDER}EB*1**30*MA~MSG*Subscriber address - 12 OAK ST~`;

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);

            expect(result.members[0]?.ssaAddress).toBeUndefined();
            expect(result.findings.map(finding => finding.code)).toEqual(['placeholder-address']);
        });

        it('should not report an ordinary address', () => {
            const levels = [
                HETS_SOURCE,
                HETS_RECEIVER,
                SUBSCRIBER,
                'N3*12 OAK ST~N4*SPRINGFIELD*IL*62701~',
                'EB*D~MSG*Subscriber address - 12 OAK ST~',
            ].join('');

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);

            expect(result.members[0]?.ssaAddress).toBeUndefined();
            expect(result.findings).toEqual([]);
        });
    });

    describe('route checks', () => {
        it('should give the HETS condition for each listed AAA', () => {
            const levels = [
                'HL*1**20*1~NM1*PR*2*CMS*****PI*CMS~AAA*Y**42*R~',
                'HL*2*1*21*1~NM1*FA*2*R*****XX*1234567893~AAA*N**41*C~',
                'HL*3*2*22*0~NM1*IL*1*DOE*JO****MI*MISSING~AAA*N**72*C~',
            ].join('');

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);

            expect(result.errors.map(error => error.condition)).toEqual([
                'hets-unavailable',
                'no-hets-enrollment',
                'mbi-not-matched',
            ]);
            expect(result.findings.map(finding => finding.code)).toEqual(['member-id-placeholder']);
        });

        it('should describe a name mismatch the way the guide lists it', () => {
            const levels = `${HETS_SOURCE}${HETS_RECEIVER}${SUBSCRIBER}AAA*N**73*C~`;

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);

            expect(result.errors[0]).toMatchObject({
                condition: 'name-mismatch',
                description: 'The last name was missing, or the last or first name was too long '
                    + 'or did not match the beneficiary on file.',
            });
        });

        it('should report a source other than CMS and a receiver other than 1P, 80 or FA', () => {
            const levels = [
                'HL*1**20*1~NM1*PR*2*UHC*****PI*87726~',
                'HL*2*1*21*1~NM1*PR*2*R*****XX*1234567893~',
                SUBSCRIBER,
            ].join('');

            const result = interpretRoute(hetsEntryOf(levels), hetsProfile);

            expect(result.findings.map(finding => finding.code)).toEqual([
                'unexpected-source',
                'unexpected-receiver',
            ]);
        });
    });
});

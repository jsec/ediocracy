import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
    ElementPosition,
    GroupResult,
    Response999,
    TransactionSetResponse,
    TransactionSetResult,
} from '../src/index.js';

import { read999, read999s, readX12 } from '../src/index.js';
import { codesAndTags, firstTransaction, readFixture } from './utils.js';

const VERSION = '005010X231A1';

function read999Body(body: string): Response999 {
    return read999(firstTransaction(wrap999(body)));
}

function wrap999(body: string, versions: { gs08?: string; st03?: string } = {}): string {
    const isa = 'ISA*00*          *00*          *ZZ*CMS            *ZZ*SUBMITTERID    *261102*1200*^*00501*000000001*0*P*:~';
    const count = body.split('~').filter(segment => segment !== '').length + 2;
    const gs = `GS*FA*CMS*SUBMITTERID*20261102*1200*1*X*${versions.gs08 ?? VERSION}~`;
    const st = `ST*999*0001*${versions.st03 ?? VERSION}~`;

    return `${isa}${gs}${st}${body}SE*${count}*0001~GE*1*1~IEA*1*000000001~`;
}

describe('read999', () => {
    describe('fixtures', () => {
        it('should read a 999 that accepts one 270 and rejects two', () => {
            const response = read999(firstTransaction(readFixture('999/hets-270-partial.x12')));
            const [accepted, middleName, gender] = response.transactionSets;

            expect(response.findings).toEqual([]);
            expect(response.group).toMatchObject({
                controlNumber: '501',
                functionalId: 'HS',
                version: '005010X279A1',
            });
            expect(accepted).toMatchObject({
                controlNumber: '0001',
                convention: '005010X279A1',
                id: '270',
                result: { code: 'A', syntaxErrors: [] },
                segmentErrors: [],
            });
            expect(middleName?.segmentErrors).toMatchObject([{
                contexts: [{
                    name: 'TRN02',
                    reference: 'TRACKNUM2',
                }],
                elementErrors: [{
                    badValue: 'M',
                    error: 'I10',
                    position: {
                        component: undefined,
                        element: 5,
                        repetition: undefined,
                    },
                    referenceNumber: 1037,
                }],
                error: '8',
                loopId: '2100C',
                position: 9,
                tag: 'NM1',
            }]);
            expect(middleName?.result).toMatchObject({ code: 'R', syntaxErrors: ['5'] });
            expect(gender?.segmentErrors[0]?.elementErrors[0]).toMatchObject({
                badValue: 'F',
                position: { element: 3 },
                referenceNumber: 1068,
            });
            expect(response.result).toMatchObject({
                accepted: 1,
                code: 'P',
                included: 3,
                received: 3,
                syntaxErrors: [],
            });
        });

        it('should read a 999 that rejects a 270 with a segment error and no element error', () => {
            const response = read999(firstTransaction(readFixture('999/hets-270-rejected.x12')));
            const [rejected] = response.transactionSets;

            expect(response.findings).toEqual([]);
            expect(rejected?.segmentErrors).toMatchObject([{
                contexts: [{ name: 'TRN02', reference: 'TRACKNUM1' }],
                elementErrors: [],
                error: 'I4',
                loopId: '2000D',
                position: 11,
                tag: 'HL',
            }]);
            expect(rejected?.result?.code).toBe('R');
            expect(response.result).toMatchObject({
                accepted: 0,
                code: 'R',
                included: 1,
                received: 1,
            });
        });
    });

    describe('positions and contexts', () => {
        it('should read a composite IK401 with component and repetition positions', () => {
            const body = 'AK1*HS*1~AK2*270*0001~IK3*EQ*12**8~IK4*2:1:3*1270*7*ZZ~IK5*R*5~AK9*R*1*1*0~';
            const response = read999Body(body);
            const [segmentError] = response.transactionSets[0]?.segmentErrors ?? [];
            const position = segmentError?.elementErrors[0]?.position;

            expect(position).toEqual({
                component: 1,
                element: 2,
                repetition: 3,
            });
        });

        it('should read every element of a CTX', () => {
            const body = 'AK1*HS*1~AK2*270*0001~IK3*NM1*9*2100C*I6~'
                + 'CTX*SITUATIONAL TRIGGER*DMG*10*2100C*3:1*1068:2~IK5*R*5~AK9*R*1*1*0~';
            const [segmentError] = read999Body(body).transactionSets[0]?.segmentErrors ?? [];
            const [context] = segmentError?.contexts ?? [];

            expect(context).toMatchObject({
                elementPosition: {
                    component: 1,
                    element: 3,
                    repetition: undefined,
                },
                loopId: '2100C',
                name: 'SITUATIONAL TRIGGER',
                reference: undefined,
                referenceNumbers: { component: 2, element: 1068 },
                segmentPosition: 10,
                tag: 'DMG',
            });
        });

        it('should put a CTX after an IK4 with the element error', () => {
            const body = 'AK1*HS*1~AK2*270*0001~IK3*NM1*9*2100C*8~CTX*TRN02:T1~IK4*5*1037*I10~'
                + 'CTX*SITUATIONAL TRIGGER~IK5*R*5~AK9*R*1*1*0~';
            const [segmentError] = read999Body(body).transactionSets[0]?.segmentErrors ?? [];
            const segmentContexts = segmentError?.contexts.map(context => context.name);
            const [elementError] = segmentError?.elementErrors ?? [];
            const elementContexts = elementError?.contexts.map(context => context.name);

            expect(segmentContexts).toEqual(['TRN02']);
            expect(elementContexts).toEqual(['SITUATIONAL TRIGGER']);
        });

        it('should read AK905 to AK909 without empty elements', () => {
            const response = read999Body('AK1*HS*1~AK9*R*1*1*0*2**5~');

            expect(response.result?.syntaxErrors).toEqual(['2', '5']);
        });
    });

    describe('findings', () => {
        it('should report numbers that are not all digits and leave them undefined', () => {
            const body = 'AK1*HS*1~AK2*270*0001~IK3*NM1*X9*2100C*8~CTX*TRN02:T1*NM1*9x~IK4*2:x*1037*7~'
                + 'CTX*SITUATIONAL TRIGGER*NM1*9**y~IK5*R*5~AK9*R*one*1*0~';
            const response = read999Body(body);
            const [segmentError] = response.transactionSets[0]?.segmentErrors ?? [];

            expect(codesAndTags(response.findings)).toEqual([
                'invalid-number IK3',
                'invalid-number CTX',
                'invalid-number IK4',
                'invalid-number CTX',
                'invalid-number AK9',
            ]);
            expect(segmentError?.position).toBeUndefined();
            expect(segmentError?.elementErrors[0]?.position).toEqual({
                component: undefined,
                element: 2,
                repetition: undefined,
            });
            expect(response.result?.included).toBeUndefined();
        });

        it('should leave a position undefined when its element number is missing', () => {
            const body = 'AK1*HS*1~AK2*270*0001~IK3*NM1*9**8~IK4**1037*7~IK5*R*5~AK9*R*1*1*0~';
            const response = read999Body(body);
            const [segmentError] = response.transactionSets[0]?.segmentErrors ?? [];

            expect(response.findings).toEqual([]);
            expect(segmentError?.elementErrors[0]?.position).toBeUndefined();
        });

        it('should report a missing AK1, IK5 and AK9', () => {
            const response = read999Body('AK2*270*0001~');

            expect(codesAndTags(response.findings)).toEqual([
                'missing-segment ST',
                'missing-segment AK2',
                'missing-segment ST',
            ]);
            expect(response.group).toBeUndefined();
            expect(response.transactionSets[0]?.result).toBeUndefined();
            expect(response.result).toBeUndefined();
        });

        it('should report a second AK1, IK5 and AK9 and keep the first', () => {
            const body = 'AK1*HS*1~AK1*HS*2~AK2*270*0001~IK5*A~IK5*R~AK9*A*1*1*1~AK9*R*1*1*0~';
            const response = read999Body(body);

            expect(codesAndTags(response.findings)).toEqual([
                'unexpected-segment AK1',
                'unexpected-segment IK5',
                'unexpected-segment AK9',
            ]);
            expect(response.group?.controlNumber).toBe('1');
            expect(response.transactionSets[0]?.result?.code).toBe('A');
            expect(response.result?.code).toBe('A');
        });

        it('should report AK9 numbers that are not all digits in element order', () => {
            const response = read999Body('AK1*HS*1~AK9*A*x*y*z~');

            expect(response.findings.map(finding => finding.message)).toEqual([
                '"x" is not a whole number',
                '"y" is not a whole number',
                '"z" is not a whole number',
            ]);
        });

        it('should report a whole number too large to read exactly', () => {
            const response = read999Body('AK1*HS*1~AK9*A*9007199254740993*1*1~');

            expect(codesAndTags(response.findings)).toEqual(['invalid-number AK9']);
            expect(response.result?.included).toBeUndefined();
        });

        it('should report an HL segment as unexpected', () => {
            const response = read999Body('AK1*HS*1~HL*1**20*1~AK9*A*0*0*0~');

            expect(codesAndTags(response.findings)).toEqual(['unexpected-segment HL']);
        });

        it('should report a segment outside its loop', () => {
            const response = read999Body('AK1*HS*1~IK4*1*1*1~AK9*A*0*0*0~');

            expect(codesAndTags(response.findings)).toEqual(['unexpected-segment IK4']);
        });

        it('should report an ST03 that is not 005010X231A1', () => {
            const text = wrap999('AK1*HS*1~AK9*A*0*0*0~', { st03: '005010X231' });
            const response = read999(firstTransaction(text));

            expect(codesAndTags(response.findings)).toEqual(['unexpected-version ST']);
        });
    });

    describe('types', () => {
        it('should make results and positions nullable as a whole', () => {
            expectTypeOf<Response999['result']>().toBeNullable();
            expectTypeOf<TransactionSetResponse['result']>().toBeNullable();
            expectTypeOf<ElementPosition['element']>().toEqualTypeOf<number>();
            expectTypeOf<GroupResult>().toExtend<TransactionSetResult>();
        });
    });
});

describe('read999s', () => {
    it('should read each 999 with its group and skip other transaction sets', () => {
        const isa = 'ISA*00*          *00*          *ZZ*CMS            *ZZ*SUBMITTERID    *261102*1200*^*00501*000000001*0*P*:~';
        const text = `${isa}GS*FA*CMS*SUBMITTERID*20261102*1200*1*X*${VERSION}~`
            + 'ST*997*0001~AK1*HS*1~AK9*A*0*0*0~SE*4*0001~'
            + `ST*999*0002*${VERSION}~AK1*HS*2~AK9*A*0*0*0~SE*4*0002~`
            + 'GE*2*1~IEA*1*000000001~';
        const entries = read999s(readX12(text));

        expect(entries.map(entry => entry.response.group?.controlNumber)).toEqual(['2']);
        expect(entries[0]?.group.header.element(6)).toBe('1');
        expect(entries[0]?.interchange.header.element(13)).toBe('000000001');
    });

    it('should report a GS08 that is not 005010X231A1', () => {
        const [entry] = read999s(readX12(wrap999('AK1*HS*1~AK9*A*0*0*0~', { gs08: '005010X231' })));

        expect(codesAndTags(entry?.response.findings ?? [])).toEqual(['unexpected-version GS']);
    });
});

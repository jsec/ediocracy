import { describe, expect, it } from 'vitest';

import { humanaProfile, interpretRoute, type RouteEntry } from '../src/profiles/271/routes/index.js';
import { codesAndTags, firstEntry, wrap } from './utils.js';

const DUAL_MEDICARE = 'NM1*IL*1*DOE*JOHN*M***MI*H00000000~REF*6P*R8975001*HUMANA HEALTH PLAN, INC.~'
    + 'EB*1*EMP*30*HN~';
const DUAL_MEDICAID = 'NM1*IL*1*DOE*JOHN*M***MI*H00000000~REF*6P*R8962001*HUMANA HEALTH PLAN, INC.~'
    + 'EB*1*EMP*30*MC~';
const RECEIVER = 'HL*2*1*21*1~NM1*1P*2*R*****XX*1~';
const SUBSCRIBER = 'NM1*IL*1*DOE*JOHN*T**JR*MI*123456789~';

function entryOf(levels: string): RouteEntry {
    const body = `ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~${levels}`;
    const count = body.split('~').filter(segment => segment !== '').length + 1;

    return firstEntry(wrap(`${body}SE*${count}*0001~`));
}

function humanaEntryOf(segments: string, payerId = '61101', receiverCode = '1P'): RouteEntry {
    const levels = [
        `HL*1**20*1~NM1*PR*2*HUMANA*****PI*${payerId}~`,
        `HL*2*1*21*1~NM1*${receiverCode}*2*R*****XX*1~`,
        `HL*3*2*22*0~${segments}`,
    ].join('');

    return entryOf(levels);
}

describe('humanaProfile', () => {
    describe('source and receiver', () => {
        it('should accept each Humana payer ID', () => {
            const results = ['61101', '61115', '65065', 'CX021'].map((payerId) => {
                const entry = humanaEntryOf(SUBSCRIBER, payerId);

                return interpretRoute(entry, humanaProfile).findings;
            });

            expect(results).toEqual([[], [], [], []]);
        });

        it('should report a payer ID Humana does not list', () => {
            const result = interpretRoute(humanaEntryOf(SUBSCRIBER, '12345'), humanaProfile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-source NM1']);
        });

        it('should report a receiver entity code Humana does not accept', () => {
            const result = interpretRoute(humanaEntryOf(SUBSCRIBER, '61101', 'PR'), humanaProfile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-receiver NM1']);
        });
    });

    describe('errors', () => {
        it('should add the condition to a duplicate member ID error', () => {
            const result = interpretRoute(humanaEntryOf(`${SUBSCRIBER}AAA*N**76*C~`), humanaProfile);

            expect(result.errors).toMatchObject([{ condition: 'duplicate-member-id', level: 'subscriber' }]);
        });

        it('should add the condition to an access restriction error on the source', () => {
            const levels = `HL*1**20*1~NM1*PR*2*HUMANA*****PI*61101~AAA*N**41*C~${RECEIVER}`;

            const result = interpretRoute(entryOf(levels), humanaProfile);

            expect(result.errors).toMatchObject([{ condition: 'not-approved-by-cms', level: 'source' }]);
        });

        it('should not report an error Humana does not list', () => {
            const result = interpretRoute(humanaEntryOf(`${SUBSCRIBER}AAA*N**72*C~`), humanaProfile);

            expect(result.errors).toMatchObject([{ condition: undefined }]);
            expect(result.findings).toEqual([]);
        });
    });

    describe('lineOfBusiness', () => {
        it('should read the line of business from the payer ID', () => {
            const results = ['61101', '61115', '65065', 'CX021', '12345'].map((payerId) => {
                const entry = humanaEntryOf(SUBSCRIBER, payerId);

                return interpretRoute(entry, humanaProfile).members[0]?.lineOfBusiness;
            });

            expect(results).toEqual(['medical', 'medical', 'dental', 'dental', undefined]);
        });
    });

    describe('plans', () => {
        it('should read the plan description and group number', () => {
            const segments = `${SUBSCRIBER}REF*6P*R7901001*HUMANA EMPLOYERS HEALTH PLAN OF GA,INC~`;

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);
            const plans = result.members[0]?.plans;

            expect(plans).toHaveLength(1);
            expect(plans?.[0]?.name.tag).toBe('NM1');
            expect(plans?.[0]).toMatchObject({
                description: 'HUMANA EMPLOYERS HEALTH PLAN OF GA,INC',
                groupNumber: 'R7901001',
            });
        });

        it('should split a second NM1 into a second plan', () => {
            const entry = humanaEntryOf(`${DUAL_MEDICARE}${DUAL_MEDICAID}`);

            const result = interpretRoute(entry, humanaProfile);
            const plans = result.members[0]?.plans ?? [];
            const insuranceTypes = plans
                .map(plan => plan.benefits.map(benefit => benefit.insuranceType));

            expect(plans.map(plan => plan.groupNumber)).toEqual(['R8975001', 'R8962001']);
            expect(plans.map(plan => plan.description)).toEqual([
                'HUMANA HEALTH PLAN, INC.',
                'HUMANA HEALTH PLAN, INC.',
            ]);
            expect(insuranceTypes).toEqual([['HN'], ['MC']]);
        });

        it('should keep benefits after a provider NM1 in the plan before it', () => {
            const segments = `${DUAL_MEDICARE}NM1*P3*1*DOC*A****XX*1~EB*B*IND*98***27*20~`;

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);
            const plans = result.members[0]?.plans ?? [];
            const statuses = plans.map(plan => plan.benefits.map(benefit => benefit.status));

            expect(statuses).toEqual([['1', 'B']]);
        });

        it('should leave a plan without REF*6P undescribed', () => {
            const segments = `${DUAL_MEDICARE}NM1*IL*1*DOE*JOHN*M***MI*H00000000~EB*1*EMP*30*MC~`;

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);
            const plans = result.members[0]?.plans;

            expect(plans).toHaveLength(2);
            expect(plans?.[1]).toMatchObject({ description: undefined, groupNumber: undefined });
        });
    });

    describe('sameIdMembers', () => {
        it('should point two subscribers with the same NM109 at each other', () => {
            const levels = [
                'HL*1**20*1~NM1*PR*2*HUMANA*****PI*61101~',
                RECEIVER,
                `HL*3*2*22*0~${DUAL_MEDICARE}`,
                `HL*4*2*22*0~${DUAL_MEDICAID}`,
            ].join('');

            const result = interpretRoute(entryOf(levels), humanaProfile);

            expect(result.members.map(member => member.sameIdMembers)).toEqual([[1], [0]]);
            expect(result.members.map(member => member.plans.length)).toEqual([1, 1]);
        });

        it('should not compare dependents', () => {
            const levels = [
                'HL*1**20*1~NM1*PR*2*HUMANA*****PI*61101~',
                RECEIVER,
                'HL*3*2*22*1~NM1*IL*1*DOE*JOHN****MI*123~',
                'HL*4*3*23*0~NM1*03*1*DOE*JANE****MI*123~',
            ].join('');

            const result = interpretRoute(entryOf(levels), humanaProfile);

            expect(result.members.map(member => member.sameIdMembers)).toEqual([[], []]);
        });
    });

    describe('coverage dates', () => {
        it('should read a D8 coverage start date', () => {
            const result = interpretRoute(humanaEntryOf(`${SUBSCRIBER}DTP*346*D8*20070501~`), humanaProfile);
            const coverageDates = result.members[0]?.coverageDates;

            expect(coverageDates).toHaveLength(1);
            expect(coverageDates?.[0]?.start.toString()).toBe('2007-05-01');
            expect(coverageDates?.[0]?.end).toBeUndefined();
        });

        it('should report a coverage date that is not D8 or RD8', () => {
            const result = interpretRoute(humanaEntryOf(`${SUBSCRIBER}DTP*346*D6*20070501~`), humanaProfile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-coverage-date-format DTP']);
        });
    });

    describe('status', () => {
        it('should read an inactive dental row with its end date', () => {
            const entry = humanaEntryOf(`${SUBSCRIBER}EB*6**35~DTP*349*D8*20150630~`, '65065');

            const result = interpretRoute(entry, humanaProfile);
            const status = result.members[0]?.status;

            expect(status).toMatchObject([{ isActive: false, status: '6' }]);
            expect(status?.[0]?.ended?.toString()).toBe('2015-06-30');
            expect(result.findings).toEqual([]);
        });

        it('should read the end of an RD8 coverage ended range', () => {
            const entry = humanaEntryOf(`${SUBSCRIBER}EB*6**35~DTP*349*RD8*20150101-20150630~`, '65065');

            const result = interpretRoute(entry, humanaProfile);

            expect(result.members[0]?.status[0]?.ended?.toString()).toBe('2015-06-30');
        });

        it('should report EB01 6 on a medical response', () => {
            const entry = humanaEntryOf(`${SUBSCRIBER}EB*6**35~DTP*349*D8*20150630~`, '61101');

            const result = interpretRoute(entry, humanaProfile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-inactive-code EB']);
        });

        it('should read EB01 V as inactive on a medical response', () => {
            const result = interpretRoute(humanaEntryOf(`${SUBSCRIBER}EB*V**30~`, '61101'), humanaProfile);

            expect(result.members[0]?.status).toMatchObject([{ isActive: false, status: 'V' }]);
            expect(result.findings).toEqual([]);
        });

        it('should report EB01 V on a dental response', () => {
            const result = interpretRoute(humanaEntryOf(`${SUBSCRIBER}EB*V**30~`, '65065'), humanaProfile);

            expect(codesAndTags(result.findings)).toEqual(['unexpected-inactive-code EB']);
        });

        it('should not check the code when the payer ID is not Humana\'s', () => {
            const result = interpretRoute(humanaEntryOf(`${SUBSCRIBER}EB*V**30~`, '12345'), humanaProfile);

            expect(result.members[0]?.status).toMatchObject([{ isActive: false, status: 'V' }]);
            expect(codesAndTags(result.findings)).toEqual(['unexpected-source NM1']);
        });

        it('should list status rows in segment order', () => {
            const result = interpretRoute(humanaEntryOf(`${SUBSCRIBER}EB*1**30~EB*V**35~`), humanaProfile);
            const codes = result.members[0]?.status.map(row => row.status);

            expect(codes).toEqual(['1', 'V']);
        });
    });

    describe('billing', () => {
        it('should read a grace period row', () => {
            const segments = `${SUBSCRIBER}EB*5**30~DTP*193*D8*20260101~DTP*194*D8*20260131~`
                + 'MSG*Health Insurance Exchange Grace Period Month 1~';

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);
            const billing = result.members[0]?.billing;

            expect(billing).toMatchObject([
                {
                    graceMonth: 1,
                    messages: ['Health Insurance Exchange Grace Period Month 1'],
                    status: '5',
                },
            ]);
            expect(billing?.[0]?.gracePeriod?.start?.toString()).toBe('2026-01-01');
            expect(billing?.[0]?.gracePeriod?.end?.toString()).toBe('2026-01-31');
            expect(result.findings).toEqual([]);
        });

        it('should leave the grace period end undefined without DTP 194', () => {
            const segments = `${SUBSCRIBER}EB*5**30~DTP*193*D8*20260101~`;

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);
            const gracePeriod = result.members[0]?.billing[0]?.gracePeriod;

            expect(gracePeriod?.start?.toString()).toBe('2026-01-01');
            expect(gracePeriod?.end).toBeUndefined();
        });

        it('should report a grace month other than 1, 2 or 3', () => {
            const segments = `${SUBSCRIBER}EB*5**30~MSG*Health Insurance Grace Period Month 4~`;

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);

            expect(result.members[0]?.billing[0]?.graceMonth).toBeUndefined();
            expect(codesAndTags(result.findings)).toEqual(['invalid-grace-month EB']);
        });

        it('should read the premium paid-to date', () => {
            const segments = `${SUBSCRIBER}EB*7**30~DTP*343*D8*20260228~`;

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);
            const billing = result.members[0]?.billing;

            expect(billing).toMatchObject([{ gracePeriod: undefined, status: '7' }]);
            expect(billing?.[0]?.premiumPaidTo?.toString()).toBe('2026-02-28');
        });
    });

    describe('missing-benefit-message', () => {
        it('should not report a base and a remaining deductible', () => {
            const segments = `${SUBSCRIBER}EB*C*IND*33****500*****Y~EB*C*IND*33***29*183*****Y~`;

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);

            expect(result.findings).toEqual([]);
        });

        it('should report an in-network row without a MSG when another has the same codes', () => {
            const segments = `${SUBSCRIBER}EB*A*IND*81***27**.20****Y~MSG*Pharmacy~`
                + 'EB*A*IND*81***27**.30****Y~';

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);

            expect(codesAndTags(result.findings)).toEqual(['missing-benefit-message EB']);
            expect(result.findings[0]?.segment.element(8)).toBe('.30');
        });

        it('should not report rows that each have a MSG', () => {
            const segments = `${SUBSCRIBER}EB*A*IND*81***27**.20****Y~MSG*Pharmacy~`
                + 'EB*A*IND*81***27**.30****Y~MSG*PlanMaximum~';

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);

            expect(result.findings).toEqual([]);
        });

        it('should not report out-of-network rows', () => {
            const segments = `${SUBSCRIBER}EB*A*IND*81***27**.20****N~EB*A*IND*81***27**.30****N~`;

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);

            expect(result.findings).toEqual([]);
        });

        it('should not compare rows in different plans', () => {
            const segments = `${DUAL_MEDICARE}EB*C*IND*30***23*500*****Y~`
                + `${DUAL_MEDICAID}EB*C*IND*30***23*0*****Y~`;

            const result = interpretRoute(humanaEntryOf(segments), humanaProfile);

            expect(result.findings).toEqual([]);
        });

        it('should not report a single in-network row', () => {
            const result = interpretRoute(humanaEntryOf(`${SUBSCRIBER}EB*A*IND*81***27**.20****Y~`), humanaProfile);

            expect(result.findings).toEqual([]);
        });
    });
});

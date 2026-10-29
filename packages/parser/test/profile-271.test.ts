import { describe, expect, it } from 'vitest';

import { read271, read271s, readX12 } from '../src/index.js';
import { firstTransaction, only271, readFixture, wrap } from './utils.js';

describe('read271', () => {
    describe('generic fixtures', () => {
        it('should read one subscriber and one benefit from GX12-022', () => {
            const response = only271(readFixture('x12/GX12-022-271-structural-witness.x12'));
            const [subscriber] = response.subscribers;
            const benefits = subscriber?.benefits.map(benefit => ({
                messages: benefit.messages,
                serviceTypes: benefit.serviceTypes,
                status: benefit.status,
            }));

            expect(response.findings).toEqual([]);
            expect(response.subscribers).toHaveLength(1);
            expect(subscriber).toMatchObject({ id: 'MEMBER23', idQualifier: 'MI' });
            expect(subscriber?.traces).toHaveLength(1);
            expect(benefits).toEqual([{ messages: ['SYNTHETIC BENEFIT TEXT'], serviceTypes: ['30'], status: '1' }]);
        });

        it('should report the segments before the first NM1 when GX12-023 has no subscriber NM1', () => {
            const response = only271(readFixture('x12/GX12-023-271-repeated-benefit-and-entities.x12'));
            const [subscriber] = response.subscribers;
            const findings = response.findings.map(({ code, segment }) => `${code} ${segment.tag}`);
            const statuses = subscriber?.benefits.map(({ status }) => status);
            const entityLoopIds = subscriber?.benefits[0]?.relatedEntities.map(({ id }) => id);

            expect(findings).toEqual([
                'unexpected-segment EB',
                'unexpected-segment MSG',
                'unexpected-segment LS',
                'unexpected-segment LE',
            ]);
            // The NM1 inside LS is the first NM1 at this level, so it is read as the subscriber.
            expect(subscriber?.id).toBe('1111111111');
            expect(statuses).toEqual(['C']);
            expect(entityLoopIds).toEqual(['2120C']);
        });

        it('should report the AAA and MSG when GX12-024 has no receiver NM1', () => {
            const response = only271(readFixture('x12/GX12-024-271-aaa-local-context.x12'));
            const findings = response.findings.map(({ code, segment }) => `${code} ${segment.tag}`);
            const receiverErrors = response.receivers.map(({ errors }) => errors);

            expect(findings).toEqual(['unexpected-segment AAA', 'unexpected-segment MSG']);
            expect(receiverErrors).toEqual([[]]);
            expect(response.subscribers).toEqual([]);
        });

        it('should report an EB under the receiver in GX12-025', () => {
            const response = only271(readFixture('x12/GX12-025-271-unknown-response-values.x12'));
            const findings = response.findings.map(({ code, segment }) => `${code} ${segment.tag}`);

            expect(findings).toEqual(['unexpected-segment EB', 'unexpected-segment MSG']);
            expect(response.subscribers).toEqual([]);
        });
    });

    describe('implementation version', () => {
        it('should report an unexpected ST03 and still read the transaction', () => {
            const text = readFixture('x12/GX12-022-271-structural-witness.x12').replace('ST*271*0023*005010X279A1~', 'ST*271*0023*005010X279~');
            const response = only271(text);
            const codes = response.findings.map(({ code }) => code);

            expect(codes).toEqual(['unexpected-version']);
            expect(response.subscribers).toHaveLength(1);
        });
    });

    describe('producer and X12 examples', () => {
        it('should read three benefits from the pVerify sample despite its count mismatch', () => {
            const document = readX12(readFixture('271/pverify-sample.x12'));
            const [result] = read271s(document);
            const [subscriber] = result?.response.subscribers ?? [];
            const documentCodes = document.findings.map(({ code }) => code);
            const statuses = subscriber?.benefits.map(({ status }) => status);

            expect(documentCodes).toEqual(['st-se-segment-count-mismatch']);
            expect(result?.response.findings).toEqual([]);
            expect(subscriber?.id).toBe('123SFADFAF');
            expect(statuses).toEqual(['1', 'C', 'C']);
            expect(subscriber?.benefits[1]).toMatchObject({ amount: '500', timePeriod: '27' });
        });

        // https://x12.org/examples/005010x279/example-1b-response-generic-request-clinic-patients-subscriber-eligibility, retrieved 2026-10-28.
        it('should read a subscriber response with five benefits from X12 example 1b', () => {
            const response = only271(wrap(readFixture('271/x12-example-1b.x12'), '>'));
            const [subscriber] = response.subscribers;
            const benefits = subscriber?.benefits ?? [];
            const sourceIds = response.sources.map(({ id }) => id);
            const receiverIds = response.receivers.map(({ id }) => id);
            const statuses = benefits.map(({ status }) => status);
            const entityLoopIds = benefits[4]?.relatedEntities.map(({ id }) => id);

            expect(response.findings).toEqual([]);
            expect(sourceIds).toEqual(['842610001']);
            expect(receiverIds).toEqual(['2000035']);
            expect(subscriber?.traces).toHaveLength(1);
            expect(statuses).toEqual(['1', 'L', '1', 'B', 'B']);
            expect(benefits[2]?.serviceTypes).toEqual(['1', '33', '35', '47', '86', '88', '98', 'AL', 'MH', 'UC']);
            expect(benefits[3]).toMatchObject({
                amount: '10',
                inNetwork: 'Y',
                insuranceType: 'HM',
                timePeriod: '27',
            });
            expect(entityLoopIds).toEqual(['2120C']);
        });

        // https://x12.org/examples/005010x279/example-1c-error-response-payer-clinic-not-eligible-inquiries-payer, retrieved 2026-10-28.
        it('should read a receiver rejection with no subscribers from X12 example 1c', () => {
            const response = only271(wrap(readFixture('271/x12-example-1c.x12')));
            const [receiver] = response.receivers;

            expect(response.findings).toEqual([]);
            expect(response.receivers).toHaveLength(1);
            expect(receiver?.errors).toHaveLength(1);
            expect(receiver?.errors[0]).toMatchObject({ code: '50', followUp: 'N' });
            expect(response.subscribers).toEqual([]);
        });

        // https://x12.org/examples/005010x279/example-2b-response-generic-request-physician-patients-dependent-eligibility, retrieved 2026-10-28.
        it('should read a dependent response from X12 example 2b', () => {
            const response = only271(wrap(readFixture('271/x12-example-2b.x12'), '>'));
            const [subscriber] = response.subscribers;
            const [dependent] = subscriber?.dependents ?? [];
            const entityLoopIds = dependent?.benefits[4]?.relatedEntities.map(({ id }) => id);

            expect(response.findings).toEqual([]);
            expect(subscriber?.benefits).toEqual([]);
            expect(subscriber?.dependents).toHaveLength(1);
            expect(dependent?.name?.element(3)).toBe('SMITH');
            expect(dependent?.traces).toHaveLength(1);
            expect(dependent?.benefits).toHaveLength(5);
            expect(entityLoopIds).toEqual(['2120D']);
        });
    });

    describe('unexpected structure', () => {
        it('should keep the later benefits and report the NM1 when an NM1 follows a benefit without LS', () => {
            const body = 'ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~HL*1**20*1~NM1*PR*2*P~HL*2*1*21*1~NM1*1P*2*R~'
                + 'HL*3*2*22*0~NM1*IL*1*A~EB*1~EB*B**30~NM1*P3*1*DOC~EB*C**30~EB*A**30~SE*14*0001~';
            const response = read271(firstTransaction(wrap(body)));
            const [subscriber] = response.subscribers;
            const statuses = subscriber?.benefits.map(({ status }) => status);
            const findings = response.findings.map(({ code, segment }) => `${code} ${segment.tag} ${segment.element(3) ?? ''}`);

            expect(subscriber?.name?.element(3)).toBe('A');
            expect(statuses).toEqual(['1', 'B', 'C', 'A']);
            expect(findings).toEqual(['unexpected-segment NM1 DOC']);
        });

        it('should read an AAA directly in the information source level as a source error', () => {
            const body = 'ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~HL*1**20*0~AAA*Y**42*R~SE*5*0001~';
            const response = read271(firstTransaction(wrap(body)));
            const [source] = response.sources;

            expect(response.findings).toEqual([]);
            expect(source?.errors).toHaveLength(1);
            expect(source?.errors[0]).toMatchObject({ code: '42', followUp: 'R' });
        });

        it('should close the first subscriber and its benefit at a second subscriber HL', () => {
            const body = 'ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~HL*1**20*1~NM1*PR*2*P~HL*2*1*21*1~NM1*1P*2*R~'
                + 'HL*3*2*22*0~NM1*IL*1*A~EB*1~HL*4*2*22*0~NM1*IL*1*B~EB*1~EB*1~SE*14*0001~';
            const response = read271(firstTransaction(wrap(body)));
            const subscribers = response.subscribers.map(subscriber => [
                subscriber.name?.element(3),
                subscriber.benefits.length,
            ]);

            expect(response.findings).toEqual([]);
            expect(subscribers).toEqual([['A', 1], ['B', 2]]);
        });
    });
});

describe('read271s', () => {
    it('should read only the 271 transaction set in GX12-026', () => {
        const results = read271s(readX12(readFixture('x12/GX12-026-270-271-mixed-transaction-sets.x12')));
        const groupControlNumbers = results.map(({ group }) => group.header.element(6));

        expect(groupControlNumbers).toEqual(['27']);
        expect(results).toHaveLength(1);
    });
});

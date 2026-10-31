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
        it('should read three benefits from the count mismatch sample despite its count mismatch', () => {
            const document = readX12(readFixture('271/count-mismatch-sample.x12'));
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

        it('should read the dependent benefits from the dependent sample', () => {
            const document = readX12(readFixture('271/dependent-sample.x12'));
            const [result] = read271s(document);
            const [subscriber] = result?.response.subscribers ?? [];
            const [dependent] = subscriber?.dependents ?? [];
            const benefits = dependent?.benefits ?? [];
            const coinsurance = benefits.filter(({ status }) => status === 'A');

            expect(document.interchanges[0]?.delimiters.component).toBe('`');
            expect(document.findings).toEqual([]);
            expect(result?.response.findings).toEqual([]);
            expect(result?.response.sources[0]).toMatchObject({ id: '87726', idQualifier: 'PI' });
            expect(subscriber).toMatchObject({ id: 'UHC202649', idQualifier: 'MI' });
            expect(subscriber?.benefits).toEqual([]);
            expect(dependent?.name?.element(4)).toBe('Jane');
            expect(benefits).toHaveLength(41);
            expect(benefits[0]).toMatchObject({
                insuranceType: 'C1',
                planDescription: 'CHOICE PLUS',
                serviceTypes: ['30'],
                status: '1',
            });
            expect(benefits[0]?.relatedEntities[0]?.segments[0].element(3)).toBe('UNITEDHEALTHCARE');
            expect(coinsurance.map(({ percent }) => percent)).toEqual(['.4', '.2', '.2', '.2', '0']);
        });

        it('should read a Medicare Advantage subscriber from the sandbox sample', () => {
            const document = readX12(readFixture('271/sandbox-medicare-advantage.x12'));
            const [result] = read271s(document);
            const [subscriber] = result?.response.subscribers ?? [];
            const benefits = subscriber?.benefits ?? [];
            const primaryCare = benefits.find(({ status }) => status === 'L');
            const nonCovered = benefits.find(({ status }) => status === 'I');
            const copays = benefits.filter(({ status }) => status === 'B').map(({ amount }) => amount);

            expect(document.findings).toEqual([]);
            expect(result?.response.findings).toEqual([]);
            expect(subscriber).toMatchObject({ id: '3456789012', idQualifier: 'MI' });
            expect(subscriber?.traces[0]?.element(2)).toBe('TESTTRACE0000000000000003');
            expect(subscriber?.dependents).toEqual([]);
            expect(benefits).toHaveLength(49);
            expect(benefits[1]?.references[0]?.element(2)).toBe('H0001-000-000');
            expect(primaryCare?.relatedEntities[0]?.segments.map(({ tag }) => tag)).toEqual([
                'NM1',
                'N3',
                'N4',
                'PER',
                'PRV',
            ]);
            expect(nonCovered?.serviceTypes).toEqual(['BB', 'CF', 'CE', 'RT', 'CH', 'CG', 'CJ', 'CI']);
            expect(copays).toEqual(['5', '10', '500', '10', '10', '500', '500', '10', '0']);
        });

        it.each([
            {
                benefitCount: 19,
                file: 'sandbox-aetna.x12',
                memberId: 'AETNA12345',
                sourceId: '953402799',
            },
            {
                benefitCount: 58,
                file: 'sandbox-anthem.x12',
                memberId: '12345678A',
                sourceId: '303',
            },
            {
                benefitCount: 10,
                file: 'sandbox-cms-mbi-lookup.x12',
                memberId: '1AA2CC3DD45',
                sourceId: 'CMS',
            },
            {
                benefitCount: 80,
                file: 'sandbox-humana.x12',
                memberId: 'HUMANA123',
                sourceId: '61101',
            },
            {
                benefitCount: 98,
                file: 'sandbox-kaiser.x12',
                memberId: 'KAISER123456',
                sourceId: '100187',
            },
        ])('should read every benefit in $file with no findings', (expected) => {
            const document = readX12(readFixture(`271/${expected.file}`));
            const [result] = read271s(document);
            const [subscriber] = result?.response.subscribers ?? [];

            expect(document.findings).toEqual([]);
            expect(result?.response.findings).toEqual([]);
            expect(result?.response.sources[0]?.id).toBe(expected.sourceId);
            expect(subscriber?.id).toBe(expected.memberId);
            expect(subscriber?.benefits).toHaveLength(expected.benefitCount);
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

    describe('member details', () => {
        it('should read the subscriber and dependent details from the dependent sample', () => {
            const response = only271(readFixture('271/dependent-sample.x12'));
            const [subscriber] = response.subscribers;
            const [dependent] = subscriber?.dependents ?? [];
            const subscriberReferences = subscriber?.references.map(
                segment => `${segment.element(1)} ${segment.element(2)}`,
            );
            const subscriberDates = subscriber?.dates.map(segment => segment.element(3));

            expect(subscriberReferences).toEqual(['6P 186084', '18 UVdQAC5j6f']);
            expect(subscriberDates).toEqual(['20240101-20241231']);
            expect(subscriber?.demographics?.element(2)).toBe('19760214');
            expect(subscriber?.address.map(({ tag }) => tag)).toEqual(['N3', 'N4']);
            expect(subscriber?.relationship).toBeUndefined();
            expect(dependent?.relationship?.element(2)).toBe('01');
            expect(dependent?.demographics?.element(3)).toBe('F');
        });

        it('should keep both REF*6P segments from the Aetna sample', () => {
            const response = only271(readFixture('271/sandbox-aetna.x12'));
            const [subscriber] = response.subscribers;
            const qualifiers = subscriber?.references.map(segment => segment.element(1));

            expect(qualifiers).toEqual(['6P', '18', '6P', '18']);
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

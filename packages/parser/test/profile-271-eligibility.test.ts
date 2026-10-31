import { describe, expect, it } from 'vitest';

import { interpret271, type Response271 } from '../src/index.js';
import { only271, readFixture, wrap } from './utils.js';

const SOURCE_AND_RECEIVER = 'HL*1**20*1~NM1*PR*2*P~HL*2*1*21*1~NM1*1P*2*R~';

function respond(levels: string): Response271 {
    const body = `ST*271*0001*005010X279A1~BHT*0022*11*1*20260101*1200~${levels}`;
    const count = body.split('~').filter(segment => segment !== '').length + 1;

    return only271(wrap(`${body}SE*${count}*0001~`));
}

describe('interpret271', () => {
    describe('members', () => {
        it('should list the subscriber, then the dependent, with their details', () => {
            const eligibility = interpret271(only271(readFixture('271/dependent-sample.x12')));
            const [subscriber, dependent] = eligibility.members;

            const roles = eligibility.members.map(({ role }) => role);

            expect(roles).toEqual(['subscriber', 'dependent']);
            expect(subscriber).toMatchObject({
                memberId: 'UHC202649',
                name: { first: 'John', last: 'Doe', middle: 'A' },
            });
            expect(subscriber?.details.references).toEqual([
                { description: undefined, qualifier: '6P', value: '186084' },
                { description: undefined, qualifier: '18', value: 'UVdQAC5j6f' },
            ]);
            expect(subscriber?.details.dateOfBirth?.toString()).toBe('1976-02-14');
            expect(subscriber?.details.gender).toBe('M');
            expect(subscriber?.details.address).toEqual({
                city: 'Fosterburgh',
                lines: ['123 Sunnyvale Lane'],
                postalCode: '91016',
                state: 'TX',
            });
            expect(dependent).toMatchObject({
                memberId: undefined,
                name: { first: 'Jane', last: 'Doe', middle: 'Alex' },
            });
            expect(dependent?.details.relationship).toBe('01');
            expect(eligibility.findings).toEqual([]);
        });
    });

    describe('coverage', () => {
        it('should read the dependent sample plan row as active coverage', () => {
            const eligibility = interpret271(only271(readFixture('271/dependent-sample.x12')));
            const [first] = eligibility.members[1]?.coverage ?? [];

            expect(first).toMatchObject({
                insuranceType: 'C1',
                isActive: true,
                network: 'W',
                planDescription: 'CHOICE PLUS',
                serviceTypes: ['30'],
                status: '1',
            });
        });

        it('should read the eight Kaiser EB*6 rows as inactive with a 292 range', () => {
            const eligibility = interpret271(only271(readFixture('271/sandbox-kaiser.x12')));
            const coverage = eligibility.members[0]?.coverage ?? [];
            const inactive = coverage.filter(({ status }) => status === '6');

            expect(inactive).toHaveLength(8);
            expect(inactive.every(({ isActive }) => !isActive)).toBe(true);
            const qualifiers = inactive.map(({ dates }) => dates[0]?.qualifier);

            expect(qualifiers).toEqual(Array.from({ length: 8 }, () => '292'));
            expect(inactive[0]?.dates[0]?.start.toString()).toBe('2008-01-01');
        });

        it.each(['EB~', 'EB***30~'])(
            'should put %s, which has no EB01 code, in otherBenefits',
            (eb) => {
                const response = respond(
                    `${SOURCE_AND_RECEIVER}HL*3*2*22*0~NM1*IL*1*A*****MI*M1~${eb}`,
                );
                const [member] = interpret271(response).members;

                expect(member?.coverage).toEqual([]);
                expect(member?.costShares).toEqual([]);
                expect(member?.limitations).toEqual([]);
                expect(member?.otherBenefits).toHaveLength(1);
            },
        );
    });

    describe('nested dependents', () => {
        it('should list a dependent of a dependent and report its benefit error', () => {
            const response = respond(`${SOURCE_AND_RECEIVER}HL*3*2*22*1~NM1*IL*1*S~`
                + 'HL*4*3*23*1~NM1*03*1*D1~EB*1**30~HL*5*4*23*0~NM1*03*1*D2~EB*1**30~AAA*Y**72*C~');
            const eligibility = interpret271(response);

            expect(eligibility.members.map(({ name }) => name.last)).toEqual(['S', 'D1', 'D2']);
            expect(eligibility.members[2]?.coverage).toHaveLength(1);
            const reasons = eligibility.requestErrors.map(({ rejectReason }) => rejectReason);

            expect(reasons).toEqual(['72']);
        });
    });

    describe('cost shares', () => {
        it('should keep all four A6 in-network co-insurance rows from the dependent sample', () => {
            const eligibility = interpret271(only271(readFixture('271/dependent-sample.x12')));
            const jane = eligibility.members[1];
            const coinsurance = jane?.costShares
                .filter(entry => entry.kind === 'A'
                    && entry.network === 'Y'
                    && entry.serviceTypes.includes('A6'))
                .map(({ percent }) => percent);

            expect(coinsurance).toEqual([0.2, 0.2, 0.2, 0]);
        });

        it('should give network undefined for an EB12 outside Y, N, W and U', () => {
            const response = respond(`${SOURCE_AND_RECEIVER}HL*3*2*22*0~NM1*IL*1*A*****MI*M1~`
                + 'EB*B*IND*30***27*10*****X~');
            const [entry] = interpret271(response).members[0]?.costShares ?? [];

            expect(entry?.network).toBeUndefined();
            expect(entry?.benefit.eb.element(12)).toBe('X');
        });
    });

    describe('other parties', () => {
        it('should name the Humana primary care provider', () => {
            const eligibility = interpret271(only271(readFixture('271/sandbox-humana.x12')));
            const otherParties = eligibility.members[0]?.otherParties ?? [];
            const primaryCare = otherParties.find(({ kind }) => kind === 'L');

            expect(primaryCare?.parties).toEqual([{
                address: {
                    city: 'Tulsa',
                    lines: ['202 Main St'],
                    postalCode: '74008',
                    state: 'OK',
                },
                contacts: [{ number: '9999999999', qualifier: 'TE' }],
                firstName: 'Dough',
                id: undefined,
                idQualifier: undefined,
                lastName: 'John',
                providerTaxonomy: undefined,
                role: 'P3',
            }]);
        });

        it('should read both CMS other payer rows', () => {
            const response = only271(readFixture('271/sandbox-cms-mbi-lookup.x12'));
            const eligibility = interpret271(response);
            const otherParties = eligibility.members[0]?.otherParties ?? [];
            const [first, second] = otherParties.filter(({ kind }) => kind === 'R');

            expect(first?.parties).toEqual([]);
            expect(first?.dates[0]?.qualifier).toBe('290');
            expect(second?.references).toEqual([
                { description: undefined, qualifier: '18', value: 'A0505' },
                { description: undefined, qualifier: 'N6', value: '555' },
            ]);
            expect(second?.parties[0]).toMatchObject({
                contacts: [
                    { number: '8006446644', qualifier: 'TE' },
                    { number: 'UHC.com/Medicare', qualifier: 'UR' },
                ],
                lastName: 'UHC OF CALIFORNIA',
                role: 'PR',
            });
        });
    });

    describe('request errors', () => {
        it('should report the receiver rejection in X12 example 1c', () => {
            const response = only271(wrap(readFixture('271/x12-example-1c.x12')));
            const eligibility = interpret271(response);

            expect(eligibility.requestErrors).toHaveLength(1);
            expect(eligibility.requestErrors[0]).toMatchObject({
                followUp: 'N',
                level: 'receiver',
                memberId: undefined,
                rejectReason: '50',
                validRequest: 'Y',
            });
        });

        it('should report a benefit error under a dependent with no member ID', () => {
            const response = respond(`${SOURCE_AND_RECEIVER}HL*3*2*22*1~NM1*IL*1*DOE*JOHN****MI*M1~`
                + 'HL*4*3*23*0~NM1*03*1*DOE*JANE~EB*1**30~AAA*Y**72*C~');
            const eligibility = interpret271(response);

            expect(eligibility.requestErrors).toMatchObject([{
                level: 'benefit',
                memberId: undefined,
                rejectReason: '72',
            }]);
        });

        it('should report source errors from the level before those from the name', () => {
            const response = respond('HL*1**20*1~AAA*Y**42*R~NM1*PR*2*P~AAA*Y**79*C~'
                + 'HL*2*1*21*1~NM1*1P*2*R~HL*3*2*22*0~NM1*IL*1*A*****MI*M1~');
            const eligibility = interpret271(response);

            const reasons = eligibility.requestErrors.map(({ rejectReason }) => rejectReason);

            expect(reasons).toEqual(['42', '79']);
            expect(eligibility.requestErrors.every(({ level }) => level === 'source')).toBe(true);
        });

        it('should report no request errors for the dependent sample', () => {
            const eligibility = interpret271(only271(readFixture('271/dependent-sample.x12')));

            expect(eligibility.requestErrors).toEqual([]);
        });
    });

    describe('values', () => {
        it.each([
            ['.2', 0.2],
            ['0.2', 0.2],
            ['-95', -95],
            ['5555.16', 5555.16],
            ['', undefined],
        ])('should parse the EB08 value %j as %j', (value, expected) => {
            const response = respond(`${SOURCE_AND_RECEIVER}HL*3*2*22*0~NM1*IL*1*A*****MI*M1~`
                + `EB*A*IND*30***27**${value}****Y~`);
            const eligibility = interpret271(response);

            expect(eligibility.members[0]?.costShares[0]?.percent).toBe(expected);
            expect(eligibility.findings).toEqual([]);
        });

        it.each(['abc', '1,000', '+5', '1E3'])(
            'should report invalid-number for EB07 %j',
            (value) => {
                const response = respond(`${SOURCE_AND_RECEIVER}HL*3*2*22*0~NM1*IL*1*A*****MI*M1~`
                    + `EB*B*IND*30***27*${value}*****Y~`);
                const eligibility = interpret271(response);

                expect(eligibility.members[0]?.costShares[0]?.amount).toBeUndefined();
                expect(eligibility.findings.map(({ code }) => code)).toEqual(['invalid-number']);
            },
        );
    });

    describe('large values', () => {
        it('should report invalid-number for an EB07 too large to be a finite number', () => {
            const value = '9'.repeat(400);
            const response = respond(`${SOURCE_AND_RECEIVER}HL*3*2*22*0~NM1*IL*1*A~`
                + `EB*B*IND*30***27*${value}*****Y~`);
            const eligibility = interpret271(response);

            expect(eligibility.members[0]?.costShares[0]?.amount).toBeUndefined();
            expect(eligibility.findings.map(({ code }) => code)).toEqual(['invalid-number']);
        });
    });

    describe('dates', () => {
        it('should parse an RD8 range', () => {
            const eligibility = interpret271(only271(readFixture('271/dependent-sample.x12')));
            const [planDates] = eligibility.members[0]?.details.dates ?? [];

            expect(planDates?.qualifier).toBe('291');
            expect(planDates?.start.toString()).toBe('2024-01-01');
            expect(planDates?.end.toString()).toBe('2024-12-31');
        });

        it('should keep the Aetna subscriber dates in order', () => {
            const eligibility = interpret271(only271(readFixture('271/sandbox-aetna.x12')));
            const dates = eligibility.members[0]?.details.dates.map(
                date => `${date.qualifier} ${date.start.toString()}`,
            );

            expect(dates).toEqual(['346 2024-04-01', '472 2024-09-17']);
        });

        it.each([
            'D8*20240230',
            'D8*00000101',
            'RD8*20240101',
            'RD8*20240101-',
            'RD8*20241231-20240101',
            'D6*240101',
        ])(
            'should report invalid-date for DTP*346*%s and leave it out of dates',
            (dateElements) => {
                const response = respond(`${SOURCE_AND_RECEIVER}HL*3*2*22*0~NM1*IL*1*A*****MI*M1~`
                    + `DTP*346*${dateElements}~`);
                const eligibility = interpret271(response);

                expect(eligibility.members[0]?.details.dates).toEqual([]);
                expect(eligibility.findings.map(({ code }) => code)).toEqual(['invalid-date']);
            },
        );

        it('should name both elements in the finding when DTP02 is absent', () => {
            const response = respond(
                `${SOURCE_AND_RECEIVER}HL*3*2*22*0~NM1*IL*1*A*****MI*M1~DTP*346~`,
            );
            const eligibility = interpret271(response);

            expect(eligibility.findings.map(({ message }) => message)).toEqual([
                'DTP02 "" and DTP03 "" are not a valid date',
            ]);
        });
    });

    describe('fixtures', () => {
        it.each([
            {
                file: 'count-mismatch-sample.x12',
                text: readFixture('271/count-mismatch-sample.x12'),
            },
            { file: 'dependent-sample.x12', text: readFixture('271/dependent-sample.x12') },
            { file: 'sandbox-aetna.x12', text: readFixture('271/sandbox-aetna.x12') },
            { file: 'sandbox-anthem.x12', text: readFixture('271/sandbox-anthem.x12') },
            {
                file: 'sandbox-cms-mbi-lookup.x12',
                text: readFixture('271/sandbox-cms-mbi-lookup.x12'),
            },
            { file: 'sandbox-humana.x12', text: readFixture('271/sandbox-humana.x12') },
            { file: 'sandbox-kaiser.x12', text: readFixture('271/sandbox-kaiser.x12') },
            {
                file: 'sandbox-medicare-advantage.x12',
                text: readFixture('271/sandbox-medicare-advantage.x12'),
            },
            { file: 'x12-example-1b.x12', text: wrap(readFixture('271/x12-example-1b.x12'), '>') },
            { file: 'x12-example-1c.x12', text: wrap(readFixture('271/x12-example-1c.x12')) },
            { file: 'x12-example-2b.x12', text: wrap(readFixture('271/x12-example-2b.x12'), '>') },
        ])('should place every benefit of $file in exactly one list', ({ text }) => {
            const response = only271(text);
            const eligibility = interpret271(response);
            const people = response.subscribers.flatMap(subscriber => [
                subscriber,
                ...subscriber.dependents.flatMap(dependent => [dependent, ...dependent.dependents]),
            ]);
            const placed = eligibility.members.map(member => member.coverage.length
                + member.costShares.length
                + member.limitations.length
                + member.otherParties.length
                + member.otherBenefits.length);

            expect(eligibility.findings).toEqual(response.findings);
            expect(placed).toEqual(people.map(person => person.benefits.length));
        });
    });
});

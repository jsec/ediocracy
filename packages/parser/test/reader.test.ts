import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { type ReaderFindingCode, readX12, type SyntaxErrorCode } from '../src/index.js';
import { envelopeLines, fixtureDirectory, readFixture, singleEnvelope, thrown } from './utils.js';

const x12FixtureDirectory = path.resolve(fixtureDirectory, 'x12');

const accepted: Record<string, { envelopes: string[]; findings: ReaderFindingCode[] }> = {
    '004-se01-segment-count-mismatch.edi': { envelopes: singleEnvelope(4, '271'), findings: ['st-se-segment-count-mismatch'] },
    '006-ge01-transaction-count-mismatch.edi': { envelopes: singleEnvelope(6, '271'), findings: ['gs-ge-transaction-count-mismatch'] },
    '008-iea01-group-count-mismatch.edi': { envelopes: singleEnvelope(8, '271'), findings: ['isa-iea-group-count-mismatch'] },
    '011-multiple-functional-groups.edi': {
        envelopes: [
            'ISA 000000011 IEA 000000011',
            'GS 11 GE 11',
            'ST 271 0011 SE 0011',
            'GS 12 GE 12',
            'ST 271 0012 SE 0012',
        ],
        findings: [],
    },
    '012-multiple-transaction-sets.edi': {
        envelopes: [
            'ISA 000000012 IEA 000000012',
            'GS 12 GE 12',
            'ST 271 0012 SE 0012',
            'ST 271 0013 SE 0013',
        ],
        findings: [],
    },
    '013-trailing-element-separator.edi': { envelopes: singleEnvelope(13, '271'), findings: ['trailing-element-separator'] },
    '014-trailing-repetition-separator.edi': { envelopes: singleEnvelope(14, '271'), findings: ['trailing-repetition-separator'] },
    '015-trailing-component-separator.edi': { envelopes: singleEnvelope(15, '271'), findings: ['trailing-component-separator'] },
    '021-malformed-then-valid-interchange.edi': { envelopes: [...singleEnvelope(21, '271'), ...singleEnvelope(22, '271')], findings: ['st-se-segment-count-mismatch'] },
    'GX12-001-basic-valid.x12': { envelopes: singleEnvelope(1), findings: [] },
    'GX12-002-alternate-delimiters.x12': { envelopes: singleEnvelope(2), findings: [] },
    'GX12-003-empty-and-trailing-elements.x12': { envelopes: singleEnvelope(3), findings: ['trailing-element-separator'] },
    'GX12-004-repetition-and-composite-shape.x12': { envelopes: singleEnvelope(4), findings: [] },
    'GX12-005-multiple-interchanges.x12': { envelopes: [...singleEnvelope(5), ...singleEnvelope(6)], findings: [] },
    'GX12-006-unknown-segment-code-free-text.x12': { envelopes: singleEnvelope(7), findings: [] },
    'GX12-007-file-boundary-whitespace.x12': { envelopes: singleEnvelope(8), findings: [] },
    'GX12-008-isa-iea-control-mismatch.x12': {
        envelopes: [
            'ISA 000000009 IEA 999999999',
            'GS 9 GE 9',
            'ST 000 0009 SE 0009',
        ],
        findings: ['isa-iea-control-mismatch'],
    },
    'GX12-009-gs-ge-control-mismatch.x12': {
        envelopes: [
            'ISA 000000010 IEA 000000010',
            'GS 10 GE 99',
            'ST 000 0010 SE 0010',
        ],
        findings: ['gs-ge-control-mismatch'],
    },
    'GX12-010-st-se-control-mismatch.x12': {
        envelopes: [
            'ISA 000000011 IEA 000000011',
            'GS 11 GE 11',
            'ST 000 0011 SE 9999',
        ],
        findings: ['st-se-control-mismatch'],
    },
    'GX12-018-ta1-artifact.x12': { envelopes: ['ISA 000000018 IEA 000000018'], findings: [] },
    'GX12-019-999-artifact.x12': { envelopes: singleEnvelope(19, '999'), findings: [] },
    'GX12-020-ta1-and-999-separate-interchanges.x12': {
        envelopes: [
            'ISA 000000020 IEA 000000020',
            ...singleEnvelope(21, '999'),
        ],
        findings: [],
    },
    'GX12-021-270-structural-witness.x12': { envelopes: singleEnvelope(22, '270'), findings: [] },
    'GX12-022-271-structural-witness.x12': { envelopes: singleEnvelope(23, '271'), findings: [] },
    'GX12-023-271-repeated-benefit-and-entities.x12': { envelopes: singleEnvelope(24, '271'), findings: [] },
    'GX12-024-271-aaa-local-context.x12': { envelopes: singleEnvelope(25, '271'), findings: [] },
    'GX12-025-271-unknown-response-values.x12': { envelopes: singleEnvelope(26, '271'), findings: [] },
    'GX12-026-270-271-mixed-transaction-sets.x12': {
        envelopes: [
            'ISA 000000027 IEA 000000027',
            'GS 27 GE 27',
            'ST 270 0027 SE 0027',
            'ST 271 0028 SE 0028',
        ],
        findings: [],
    },
    'GX12-027-crlf-between-segments.x12': { envelopes: singleEnvelope(27), findings: [] },
    'GX12-029-unsupported-isa-version.x12': { envelopes: singleEnvelope(29), findings: [] },
    'GX12-034-cr-terminator.x12': { envelopes: singleEnvelope(34), findings: [] },
    'GX12-036-separator-inside-isa-value.x12': { envelopes: singleEnvelope(36), findings: [] },
    'GX12-038-bom-and-ctrl-z.x12': { envelopes: singleEnvelope(38), findings: [] },
    'GX12-039-empty-st02.x12': {
        envelopes: [
            'ISA 000000039 IEA 000000039',
            'GS 39 GE 39',
            'ST 000 - SE 0039',
        ],
        findings: ['missing-control-number'],
    },
};

const rejected: Record<string, { code: SyntaxErrorCode; offset: number }> = {
    'GX12-011-missing-se.x12': { code: 'missing-se', offset: 185 },
    'GX12-012-missing-ge.x12': { code: 'missing-ge', offset: 182 },
    'GX12-013-missing-iea.x12': { code: 'missing-iea', offset: 191 },
    'GX12-014-extra-segment-terminator.x12': { code: 'unexpected-data', offset: 206 },
    'GX12-015-short-isa-recovery.x12': { code: 'invalid-isa', offset: 0 },
    'GX12-016-segment-outside-envelope.x12': { code: 'unexpected-data', offset: 0 },
    'GX12-017-unrecognized-envelope-segment.x12': { code: 'misplaced-envelope-segment', offset: 160 },
    'GX12-028-early-terminated-isa-then-valid.x12': { code: 'invalid-isa', offset: 0 },
    'GX12-030-trailing-data.x12': { code: 'unexpected-data', offset: 207 },
    'GX12-031-unterminated-iea.x12': { code: 'unterminated-segment', offset: 190 },
    'GX12-032-extra-terminator-inside-interchange.x12': { code: 'unexpected-data', offset: 182 },
    'GX12-033-st-without-group.x12': { code: 'misplaced-envelope-segment', offset: 106 },
    'GX12-035-missing-iea-then-different-delimiters.x12': { code: 'missing-iea', offset: 190 },
    'GX12-037-isa-text-inside-trailing-data.x12': { code: 'unexpected-data', offset: 207 },
    'GX12-040-missing-iea-then-version-00401.x12': { code: 'missing-iea', offset: 190 },
};

describe('readX12', () => {
    describe('fixtures', () => {
        it.each(Object.entries(accepted))('should read %s', (name, expected) => {
            const document = readX12(readFixture(`x12/${name}`));
            const findingCodes = document.findings.map(finding => finding.code);

            expect(envelopeLines(document)).toEqual(expected.envelopes);
            expect(findingCodes).toEqual(expected.findings);
        });

        it.each(Object.entries(rejected))('should reject %s', (name, expected) => {
            const error = thrown(readFixture(`x12/${name}`));

            expect(error).toMatchObject(expected);
        });

        it('should have an expected outcome for every fixture file', () => {
            const fixtureNames = new Set(readdirSync(x12FixtureDirectory));
            const expectedNames = new Set([...Object.keys(accepted), ...Object.keys(rejected)]);

            expect(fixtureNames).toEqual(expectedNames);
        });
    });

    describe('envelope contents', () => {
        it('should leave the ST and SE out of the transaction segments', () => {
            const document = readX12(readFixture('x12/GX12-003-empty-and-trailing-elements.x12'));
            const transaction = document.interchanges[0]?.groups[0]?.transactions[0];
            const tags = transaction?.segments.map(segment => segment.tag);

            expect(tags).toEqual(['N1', 'REF']);
        });

        it('should keep a TA1 directly in its interchange', () => {
            const document = readX12(readFixture('x12/GX12-018-ta1-artifact.x12'));
            const tags = document.interchanges[0]?.segments.map(segment => segment.tag);

            expect(tags).toEqual(['TA1']);
        });

        it('should split the ISA at fixed offsets', () => {
            const document = readX12(readFixture('x12/GX12-036-separator-inside-isa-value.x12'));
            const isa = document.interchanges[0]?.header;

            expect(isa?.element(6)).toBe('SEND*R         ');
            expect(isa?.element(13)).toBe('000000036');
        });
    });

    describe('delimiters', () => {
        it('should have no repetition separator before ISA version 00501', () => {
            const document = readX12(readFixture('x12/GX12-029-unsupported-isa-version.x12'));

            expect(document.interchanges[0]?.delimiters.repetition).toBeUndefined();
        });

        it('should read CR as the terminator', () => {
            const document = readX12(readFixture('x12/GX12-034-cr-terminator.x12'));

            expect(document.interchanges[0]?.delimiters.segment).toBe('\r');
        });
    });

    describe('findings', () => {
        it.each([
            ['GX12-008-isa-iea-control-mismatch.x12', 'IEA'],
            ['GX12-009-gs-ge-control-mismatch.x12', 'GE'],
            ['GX12-010-st-se-control-mismatch.x12', 'SE'],
            ['GX12-039-empty-st02.x12', 'ST'],
            ['GX12-003-empty-and-trailing-elements.x12', 'REF'],
        ])('should link the finding in %s to the %s segment', (name, tag) => {
            const document = readX12(readFixture(`x12/${name}`));
            const tags = document.findings.map(finding => finding.segment.tag);

            expect(tags).toEqual([tag]);
        });
    });

    describe('errors', () => {
        it('should reject a JSON error body as unexpected data', () => {
            const error = thrown('{"Message": "No EDI271 Found"}');

            expect(error).toMatchObject({ code: 'unexpected-data', offset: 0 });
            expect(error.message).toContain('{"Message"');
        });

        it('should name the segment that arrived when a trailer is missing', () => {
            const missingSe = thrown(readFixture('x12/GX12-011-missing-se.x12'));
            const missingIea = thrown(readFixture('x12/GX12-013-missing-iea.x12'));

            expect(missingSe.message).toContain('before GE');
            expect(missingIea.message).toContain('before the end of the text');
        });

        it('should quote a tag that starts with a space', () => {
            const text = readFixture('x12/GX12-001-basic-valid.x12').replace('~GS*', '~ GS*');
            const error = thrown(text);

            expect(error.message).toContain('" GS"');
        });

        it.each(['', ' \n'])('should reject the empty or whitespace-only text %j', (text) => {
            const error = thrown(text);

            expect(error).toMatchObject({ code: 'unexpected-data', offset: 0 });
        });
    });

    describe('performance', () => {
        it('should read a 20 000-segment transaction in under 500 ms', () => {
            const isa = 'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260914*1200*^*00501*000000001*0*P*:~';
            const body = 'REF*ZZ*X~'.repeat(20_000);
            const text = `${isa}GS*HS*S*R*20260914*1200*1*X*005010X279A1~ST*271*0001~${body}SE*20002*0001~GE*1*1~IEA*1*000000001~`;

            const start = performance.now();
            const document = readX12(text);
            const elapsed = performance.now() - start;

            expect(elapsed).toBeLessThan(500);
            expect(document.findings).toEqual([]);
        });
    });
});

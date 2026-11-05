import { describe, expect, it } from 'vitest';

import { readX12 } from '../src/index.js';
import { readTa1s } from '../src/profiles/acknowledgements/index.js';
import { readFixture } from './utils.js';

describe('readTa1s', () => {
    it('should read a TA1 as sent', () => {
        const [entry] = readTa1s(readX12(readFixture('ta1/hets-test-indicator.x12')));

        expect(entry?.ta1).toMatchObject({
            code: 'R',
            controlNumber: '000000503',
            date: '261102',
            noteCode: '020',
            time: '1159',
        });
        expect(entry?.interchange.header.element(13)).toBe('000001003');
    });

    it('should read every TA1 in every interchange, in order', () => {
        const document = readX12(readFixture('x12/GX12-020-ta1-and-999-separate-interchanges.x12'));
        const entries = readTa1s(document);

        expect(entries.map(entry => [entry.ta1.controlNumber, entry.ta1.code])).toEqual([['000000020', 'A']]);
    });

    it('should return nothing for a document without a TA1', () => {
        const document = readX12(readFixture('999/hets-270-partial.x12'));

        expect(readTa1s(document)).toEqual([]);
    });
});

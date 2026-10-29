import { describe, expect, it } from 'vitest';

import type { Delimiters } from '../src/reader/types.js';

import { Segment } from '../src/reader/segment.js';

const delimiters: Delimiters = {
    component: ':',
    element: '*',
    repetition: '^',
    segment: '~',
};

describe('Segment', () => {
    describe('element', () => {
        it('should read 1-based positions and keep absent and empty apart', () => {
            const segment = new Segment({
                delimiters,
                elements: ['1', '', '30^33'],
                offset: 0,
                tag: 'EB',
            });

            expect(segment.element(1)).toBe('1');
            expect(segment.element(2)).toBe('');
            expect(segment.element(4)).toBeUndefined();
            expect(segment.element(0)).toBeUndefined();
        });
    });

    describe('repetitions', () => {
        it('should split on the repetition separator', () => {
            const segment = new Segment({
                delimiters,
                elements: ['1', '', '30^33'],
                offset: 0,
                tag: 'EB',
            });

            expect(segment.repetitions(3)).toEqual(['30', '33']);
            expect(segment.repetitions(2)).toEqual(['']);
            expect(segment.repetitions(99)).toEqual([]);
        });

        it('should return the whole element when there is no repetition separator', () => {
            const segment = new Segment({
                delimiters: { ...delimiters, repetition: undefined },
                elements: ['A^B'],
                offset: 0,
                tag: 'ZZ',
            });

            expect(segment.repetitions(1)).toEqual(['A^B']);
        });
    });
});

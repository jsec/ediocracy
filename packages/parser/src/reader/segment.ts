import type { Delimiters } from './types.js';

export class Segment {
    readonly offset: number;
    readonly tag: string;
    readonly #delimiters: Delimiters;
    readonly #elements: readonly string[];

    constructor(options: {
        delimiters: Delimiters;
        elements: readonly string[];
        offset: number;
        tag: string;
    }) {
        this.tag = options.tag;
        this.#elements = options.elements;
        this.offset = options.offset;
        this.#delimiters = options.delimiters;
    }

    element(position: number): string | undefined {
        return this.#elements[position - 1];
    }

    repetitions(position: number): string[] {
        const value = this.element(position);

        if (value === undefined) {
            return [];
        }

        if (this.#delimiters.repetition === undefined) {
            return [value];
        }

        return value.split(this.#delimiters.repetition);
    }
}

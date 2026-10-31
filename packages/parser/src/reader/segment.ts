import type { Delimiters } from './types.js';

/** One segment, such as `EB*1**30`, with its elements split by the interchange's separators. */
export class Segment {
    /** The index in the text where the segment starts. */
    readonly offset: number;
    /** The segment ID, such as `EB`. */
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

    /**
     * Returns one element as written, including any component or repetition separators.
     *
     * @param position - The element position, starting at 1: `element(1)` of `EB*1**30` is `1`.
     * @returns The element, `''` when it is present but empty, or undefined when the segment
     *   has fewer elements.
     */
    element(position: number): string | undefined {
        return this.#elements[position - 1];
    }

    /**
     * Splits one element on the repetition separator.
     *
     * @param position - The element position, starting at 1.
     * @returns The repeated values, one value when the interchange has no repetition separator, or
     *   an empty array when the segment has fewer elements.
     */
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

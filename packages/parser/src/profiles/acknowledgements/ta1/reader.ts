import type { Segment } from '../../../reader/segment.js';
import type { Interchange, X12Document } from '../../../reader/types.js';

/** A TA1 interchange acknowledgment. Every value is as sent. */
export type Ta1 = {
    /** Interchange acknowledgment code, such as `A` or `R` (TA104). */
    code: string | undefined;
    /** Interchange control number: ISA13 of the acknowledged interchange (TA101). */
    controlNumber: string | undefined;
    /** Interchange date, `YYMMDD` (TA102). */
    date: string | undefined;
    /** Interchange note code, such as `000` or `020` (TA105). */
    noteCode: string | undefined;
    /** The TA1 segment. */
    segment: Segment;
    /** Interchange time, `HHMM` (TA103). */
    time: string | undefined;
};

/**
 * Reads every TA1 in a document, in the order they appear.
 *
 * @param document - The result of `readX12`.
 * @returns Each TA1 with the interchange it came from.
 *
 * @example
 * ```ts
 * import { readTa1s, readX12 } from '@ediocracy/parser';
 *
 * for (const { ta1 } of readTa1s(readX12(text))) {
 *     console.log(ta1.controlNumber, ta1.code, ta1.noteCode);
 * }
 * ```
 */
export function readTa1s(document: X12Document): {
    /** The interchange the TA1 came from. */
    interchange: Interchange;
    /** The TA1. */
    ta1: Ta1;
}[] {
    const entries = [];

    for (const interchange of document.interchanges) {
        for (const segment of interchange.segments) {
            entries.push({
                interchange,
                ta1: {
                    code: segment.element(4),
                    controlNumber: segment.element(1),
                    date: segment.element(2),
                    noteCode: segment.element(5),
                    segment,
                    time: segment.element(3),
                },
            });
        }
    }

    return entries;
}

import type { Segment } from '../reader/segment.js';
import type { Finding } from '../reader/types.js';

export type Grammar = {
    // Tags allowed before the first loop, e.g. ['BHT'].
    header: string[];
    // HL03 level code → loop. Sets without HL (999, TA1) would need top-level loops added here.
    hierarchy: Record<string, LoopSpec>;
};

/** A loop from the implementation guide, such as 2120C, and the segments and loops inside it. */
export type Loop = {
    /** The loop ID from the implementation guide, such as `2120C`. */
    id: string;
    /** The loops nested inside this one, in the order they appear. */
    loops: Loop[];
    /**
     * The loop's own segments, in the order they appear. The first is the segment that opened the
     * loop: its HL, its first segment (such as NM1), or the LS that starts a list.
     */
    segments: [Segment, ...Segment[]];
};

/** A problem found while grouping segments into loops; see {@link Response271FindingCode}. */
export type LoopFindingCode = 'duplicate-hl-id' | 'missing-hl-parent' | 'unclosed-loop' | 'unexpected-segment' | 'unknown-hl-level';

export type LoopSpec = {
    // Closing tag of a bracketed loop, e.g. 'LE'.
    end?: string;
    id: string;
    loops?: LoopSpec[];
    // Tags that belong directly to this loop.
    segments: string[];
    // Tag that opens the loop. HL loops have none; the HL opens them.
    trigger?: string;
};

export type LoopTree = {
    findings: Finding<LoopFindingCode>[];
    header: Segment[];
    loops: Loop[];
};

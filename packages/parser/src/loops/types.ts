import type { Segment } from '../reader/segment.js';
import type { Finding } from '../reader/types.js';

export type Grammar = {
    // Tags allowed before the first loop, e.g. ['BHT'].
    header: string[];
    // HL03 level code → loop. Transaction sets without HL (999, TA1) need top-level loops added here.
    hierarchy: Record<string, LoopSpec>;
};

// segments[0] is the segment that opened the loop: its trigger, its HL, or its bracket opener.
export type Loop = {
    id: string;
    loops: Loop[];
    segments: [Segment, ...Segment[]];
};

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

import type { Segment } from '../reader/segment.js';
import type { Transaction } from '../reader/types.js';
import type { Grammar, Loop, LoopFindingCode, LoopSpec, LoopTree } from './types.js';

type OpenLoop = { loop: Loop; spec: LoopSpec };

class LoopBuilder {
    readonly #grammar: Grammar;
    readonly #loopsByHlId = new Map<string, Loop>();
    readonly #stack: OpenLoop[] = [];
    readonly #tree: LoopTree = {
        findings: [],
        header: [],
        loops: [],
    };

    constructor(grammar: Grammar) {
        this.#grammar = grammar;
    }

    build(transaction: Transaction): LoopTree {
        for (const segment of transaction.segments) {
            if (segment.tag === 'HL') {
                this.#openHierarchicalLevel(segment);
                continue;
            }

            if (this.#tree.loops.length === 0 && this.#grammar.header.includes(segment.tag)) {
                this.#tree.header.push(segment);
                continue;
            }

            if (this.#wasPlacedInOpenLoop(segment)) {
                continue;
            }

            this.#report('unexpected-segment', segment, `${segment.tag} is not expected here`);
            this.#keepUnexpectedSegment(segment);
        }

        this.#closeLoopsFrom(0);

        return this.#tree;
    }

    // Closes the open loop at `depth` in the stack and every loop inside it. Index 0 is the outermost loop.
    #closeLoopsFrom(depth: number): void {
        const closedLoops = this.#stack.splice(depth);

        for (const open of closedLoops.toReversed()) {
            const isMissingEnd = open.spec.end !== undefined && open.loop.segments.at(-1)?.tag !== open.spec.end;

            if (isMissingEnd) {
                this.#report('unclosed-loop', open.loop.segments[0], `Loop ${open.spec.id} has no ${open.spec.end}`);
            }
        }
    }

    // Keeps a reported segment the grammar does not accept: in the innermost open loop, or in the header when none is open.
    #keepUnexpectedSegment(segment: Segment): void {
        const innermost = this.#stack.at(-1);

        if (innermost) {
            innermost.loop.segments.push(segment);
        } else {
            this.#tree.header.push(segment);
        }
    }

    // Opens the loop for the HL segment's level (HL03) inside the loop of its parent HL (HL02).
    #openHierarchicalLevel(segment: Segment): void {
        const id = segment.element(1) ?? '';
        // An empty or absent HL02 both mean a top-level HL.
        const parentId = segment.element(2) ?? '';
        const level = segment.element(3) ?? '';
        const spec = this.#grammar.hierarchy[level];

        if (!spec) {
            this.#report('unknown-hl-level', segment, `HL03 "${level}" is not a level in this grammar`);
            this.#keepUnexpectedSegment(segment);

            return;
        }

        this.#closeLoopsFrom(0);

        const parentLoop = parentId === '' ? undefined : this.#loopsByHlId.get(parentId);
        const isMissingParent = parentId !== '' && parentLoop === undefined;

        if (isMissingParent) {
            this.#report('missing-hl-parent', segment, `HL02 "${parentId}" matches no earlier HL01`);
        }

        const loop = this.#openLoop(spec, segment, parentLoop?.loops ?? this.#tree.loops);

        if (this.#loopsByHlId.has(id)) {
            this.#report('duplicate-hl-id', segment, `HL01 "${id}" is used more than once`);
        } else {
            this.#loopsByHlId.set(id, loop);
        }
    }

    #openLoop(spec: LoopSpec, segment: Segment, parent: Loop[]): Loop {
        const loop: Loop = {
            id: spec.id,
            loops: [],
            segments: [segment],
        };

        parent.push(loop);
        this.#stack.push({ loop, spec });

        return loop;
    }

    #report(code: LoopFindingCode, segment: Segment, message: string): void {
        this.#tree.findings.push({
            code,
            message,
            segment,
        });
    }

    // Finds the innermost open loop that accepts the segment and places it there.
    #wasPlacedInOpenLoop(segment: Segment): boolean {
        for (const [depth, open] of this.#stack.entries().toArray().toReversed()) {
            if (open.spec.end === segment.tag) {
                open.loop.segments.push(segment);
                this.#closeLoopsFrom(depth);

                return true;
            }

            if (open.spec.segments.includes(segment.tag)) {
                this.#closeLoopsFrom(depth + 1);
                open.loop.segments.push(segment);

                return true;
            }

            const child = open.spec.loops?.find(({ trigger }) => trigger === segment.tag);

            if (child) {
                this.#closeLoopsFrom(depth + 1);
                this.#openLoop(child, segment, open.loop.loops);

                return true;
            }
        }

        return false;
    }
}

export function buildLoops(transaction: Transaction, grammar: Grammar): LoopTree {
    return new LoopBuilder(grammar).build(transaction);
}

import type { Segment } from '../../../reader/segment.js';
import type { Finding } from '../../../reader/types.js';
import type { RequestErrorEntry } from '../eligibility/types.js';
import type { Person } from '../types.js';
import type {
    RouteEligibility,
    RouteEntry,
    RouteErrorCondition,
    RouteErrorEntry,
    RouteFindingCode,
    RouteProfile,
} from './types.js';

import { allDependents, interpret271, isOneOf } from '../eligibility/interpreter.js';

const SEPARATOR_NAMES = ['component', 'element', 'repetition', 'segment'] as const;

class RouteInterpreter<View, FindingCode extends string> {
    readonly #entry: RouteEntry;
    readonly #findings: Finding<RouteFindingCode>[] = [];
    readonly #profile: RouteProfile<View, FindingCode>;
    readonly #viewFindings: Finding<FindingCode>[] = [];

    constructor(entry: RouteEntry, profile: RouteProfile<View, FindingCode>) {
        this.#entry = entry;
        this.#profile = profile;
    }

    interpret(): RouteEligibility<View, FindingCode> {
        const eligibility = interpret271(this.#entry.response);

        this.#checkDelimiters();
        this.#checkSources();
        this.#checkReceivers();

        const persons = this.#entry.response.subscribers.flatMap(subscriber => [
            subscriber,
            ...allDependents(subscriber),
        ]);
        const members = eligibility.members.map((member, index) => {
            const person = persons[index];

            if (!person) {
                throw new Error('interpret271 returned more members than the response has');
            }

            this.#checkMemberId(person);

            const report = (code: FindingCode, segment: Segment, message: string): void => {
                this.#viewFindings.push({
                    code,
                    message,
                    segment,
                });
            };

            return this.#profile.readMember(member, person, report, this.#entry);
        });
        const errors = eligibility.requestErrors.map(error => this.#readError(error));

        return {
            eligibility,
            errors,
            findings: [...this.#findings, ...this.#viewFindings],
            members,
        };
    }

    #checkDelimiters(): void {
        const expected = this.#profile.delimiters;

        if (!expected) {
            return;
        }

        const actual = this.#entry.interchange.delimiters;
        const differences = SEPARATOR_NAMES
            .filter(name => actual[name] !== expected[name])
            .map(name => `${name} separator "${actual[name] ?? 'none'}" is not "${expected[name] ?? 'none'}"`);

        if (differences.length === 0) {
            return;
        }

        this.#report('unexpected-delimiters', this.#entry.interchange.header, `ISA ${differences.join(', ')}`);
    }

    #checkMemberId(person: Person): void {
        const placeholders = this.#profile.memberIdPlaceholders;

        if (!placeholders || !person.name || !isOneOf(placeholders, person.id)) {
            return;
        }

        this.#report('member-id-placeholder', person.name, `NM109 "${person.id}" is not a member ID`);
    }

    #checkReceivers(): void {
        const allowed = this.#profile.receiverEntityCodes;

        if (!allowed) {
            return;
        }

        for (const receiver of this.#entry.response.receivers) {
            const entityCode = receiver.name?.element(1);

            if (!receiver.name || isOneOf(allowed, entityCode)) {
                continue;
            }

            const message = `2100B NM101 "${entityCode ?? ''}" is not one of ${allowed.join(', ')}`;

            this.#report('unexpected-receiver', receiver.name, message);
        }
    }

    #checkSources(): void {
        const expected = this.#profile.source;

        if (!expected) {
            return;
        }

        const expectedElements = [
            { position: 1, value: expected.entityCode },
            { position: 8, value: expected.idQualifier },
        ];
        const allowedIds = typeof expected.id === 'string' ? [expected.id] : expected.id;
        const allowedIdText = typeof expected.id === 'string'
            ? `"${expected.id}"`
            : `one of ${expected.id.join(', ')}`;

        for (const source of this.#entry.response.sources) {
            const name = source.name;

            if (!name) {
                continue;
            }

            const differences = expectedElements
                .filter(element => name.element(element.position) !== element.value)
                .map(element => `NM10${element.position} "${name.element(element.position) ?? ''}" is not "${element.value}"`);
            const id = name.element(9);

            if (!isOneOf(allowedIds, id)) {
                differences.push(`NM109 "${id ?? ''}" is not ${allowedIdText}`);
            }

            if (differences.length === 0) {
                continue;
            }

            this.#report('unexpected-source', name, `2100A ${differences.join(', ')}`);
        }
    }

    #readError(error: RequestErrorEntry): RouteErrorEntry {
        const listed = this.#profile.errors.find(condition => isMatch(condition, error));

        if (!listed && this.#profile.listsAllErrors) {
            const message = `AAA03 "${error.rejectReason ?? ''}" at the ${error.level} level is not listed`;

            this.#report('unlisted-error', error.segment, message);
        }

        return {
            ...error,
            condition: listed?.condition,
            description: listed?.description,
        };
    }

    #report(code: RouteFindingCode, segment: Segment, message: string): void {
        this.#findings.push({
            code,
            message: `${message} (${this.#profile.name})`,
            segment,
        });
    }
}

/**
 * Applies a route's rules to one 271: checks the separators, the information source and the
 * receivers, adds the route's condition to each error, and builds the route's view of each member.
 *
 * @param entry - One item returned by `read271s`.
 * @param profile - The route's rules, such as `hetsProfile`.
 * @returns The `interpret271` result, the errors with their conditions, the findings, and one
 * view per member.
 *
 * @example
 * ```ts
 * import { hetsProfile, interpretRoute, read271s, readX12 } from '@ediocracy/parser';
 *
 * for (const entry of read271s(readX12(text))) {
 *     const result = interpretRoute(entry, hetsProfile);
 *     console.log(result.findings.length, result.members[0]?.partA.length);
 * }
 * ```
 */
export function interpretRoute<View, FindingCode extends string>(
    entry: RouteEntry,
    profile: RouteProfile<View, FindingCode>,
): RouteEligibility<View, FindingCode> {
    return new RouteInterpreter(entry, profile).interpret();
}

function isMatch(condition: RouteErrorCondition, error: RequestErrorEntry): boolean {
    if (condition.rejectReason !== error.rejectReason) {
        return false;
    }

    if (condition.level) {
        return condition.level === error.level;
    }

    return error.level !== 'benefit';
}

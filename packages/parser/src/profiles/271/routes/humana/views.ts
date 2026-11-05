import type { Segment } from '../../../../reader/segment.js';
import type { MemberEligibility } from '../../eligibility/types.js';
import type { Benefit, Person } from '../../types.js';
import type { RouteEntry } from '../types.js';
import type {
    BillingEntry,
    HumanaFindingCode,
    HumanaView,
    PlanEntry,
    StatusEntry,
} from './types.js';

import { allDependents, isOneOf, toPlainDate } from '../../eligibility/interpreter.js';
import { readCoverageDates } from '../coverage-dates.js';

type Report = (code: HumanaFindingCode, segment: Segment, message: string) => void;

// EB01 codes for active coverage and for every status row.
const ACTIVE_CODES = ['1', '5'];
const STATUS_CODES = ['1', '5', '6', '7', 'V'] as const;
// The inactive code each line of business does not use.
const WRONG_INACTIVE_CODES = {
    dental: 'V',
    medical: '6',
} satisfies Record<NonNullable<HumanaView['lineOfBusiness']>, string>;
// DTP01 qualifiers on status and billing rows.
const COVERAGE_ENDED = '349';
const GRACE_PERIOD_END = '194';
const GRACE_PERIOD_START = '193';
const PREMIUM_PAID_TO = '343';
// The grace period month in a HumanaOne MSG.
const GRACE_MONTH = /Grace Period Month (\d+)/i;
const GRACE_MONTHS = [1, 2, 3] as const;
// EB positions that must match for two rows to need a MSG.
const GROUPED_POSITIONS = [1, 2, 3, 6];
const MISSING_MESSAGE = 'An in-network row with the same EB01, EB02, EB03 and EB06 as another '
    + 'has no MSG';
// NM101 values for a subscriber or dependent name.
const MEMBER_ENTITY_CODES = ['03', 'IL'];
// 2100A NM109 values by line of business.
const DENTAL_PAYER_IDS = ['65065', 'CX021'];
const MEDICAL_PAYER_IDS = ['61101', '61115'];
// REF01 for the plan, group or network name.
const PLAN_REFERENCE = '6P';

/**
 * Builds the Humana view of one member.
 *
 * @param member - The member as `interpret271` returned it.
 * @param person - The member as `read271` returned it.
 * @param report - Receives problems found in the member.
 * @param entry - The response the member came from.
 * @returns The member's line of business, plans, coverage dates, status and billing rows.
 */
export function readHumana(
    member: MemberEligibility,
    person: Person,
    report: Report,
    entry: RouteEntry,
): HumanaView {
    const lineOfBusiness = readLineOfBusiness(entry);
    const plans = readPlans(person);
    const status = readStatus(person, lineOfBusiness, report);

    checkBenefitMessages(member, plans, report);

    return {
        billing: readBilling(status, report),
        coverageDates: readCoverageDates(member, person, report),
        lineOfBusiness,
        plans,
        sameIdMembers: readSameIdMembers(person, entry),
        status,
    };
}

// In-network rows of one plan with the same EB01, EB02, EB03 and EB06 each need a MSG.
function checkBenefitMessages(member: MemberEligibility, plans: PlanEntry[], report: Report): void {
    const inNetworkRows = [...member.costShares, ...member.limitations]
        .filter(row => row.network === 'Y');
    const rowsByCodes = Map.groupBy(inNetworkRows, (row) => {
        const planIndex = plans.findIndex(plan => plan.benefits.includes(row.benefit));
        const codes = GROUPED_POSITIONS.map(position => row.benefit.eb.element(position) ?? '');

        return [planIndex, ...codes].join('*');
    });

    for (const rows of rowsByCodes.values()) {
        if (rows.length < 2) {
            continue;
        }

        for (const row of rows) {
            if (row.messages.length > 0) {
                continue;
            }

            report('missing-benefit-message', row.benefit.eb, MISSING_MESSAGE);
        }
    }
}

function dateOf(benefit: Benefit, qualifier: string): Temporal.PlainDate | undefined {
    const segment = benefit.dates.find(date => date.element(1) === qualifier);

    return toPlainDate(segment?.element(3));
}

function readBilling(status: StatusEntry[], report: Report): BillingEntry[] {
    const billing: BillingEntry[] = [];

    for (const row of status) {
        if (row.status !== '5' && row.status !== '7') {
            continue;
        }

        const start = dateOf(row.benefit, GRACE_PERIOD_START);
        const end = dateOf(row.benefit, GRACE_PERIOD_END);
        const gracePeriod = start || end ? { end, start } : undefined;

        billing.push({
            benefit: row.benefit,
            graceMonth: readGraceMonth(row.benefit, report),
            gracePeriod,
            messages: row.benefit.messages,
            premiumPaidTo: dateOf(row.benefit, PREMIUM_PAID_TO),
            status: row.status,
        });
    }

    return billing;
}

function readGraceMonth(benefit: Benefit, report: Report): BillingEntry['graceMonth'] {
    const match = benefit.messages
        .map(message => GRACE_MONTH.exec(message))
        .find(graceMatch => graceMatch !== null);

    if (!match) {
        return;
    }

    const month = GRACE_MONTHS.find(value => value === Number(match[1]));

    if (month) {
        return month;
    }

    report('invalid-grace-month', benefit.eb, `Grace period month "${match[1] ?? ''}" is not 1, 2 or 3`);
}

function readLineOfBusiness(entry: RouteEntry): HumanaView['lineOfBusiness'] {
    const payerId = entry.response.sources.find(source => source.name)?.id;

    if (isOneOf(MEDICAL_PAYER_IDS, payerId)) {
        return 'medical';
    }

    if (isOneOf(DENTAL_PAYER_IDS, payerId)) {
        return 'dental';
    }
}

/*
 * A benefit belongs to the last plan whose NM1 comes before its EB.
 * Only subscriber and dependent NM1s start a plan.
 */
function readPlans(person: Person): PlanEntry[] {
    if (!person.name) {
        return [];
    }

    const memberNames = person.otherNames
        .filter(otherName => isOneOf(MEMBER_ENTITY_CODES, otherName.name.element(1)));
    const planNames = [{ name: person.name, references: person.references }, ...memberNames];

    return planNames.map((planName, index) => {
        const nextOffset = planNames[index + 1]?.name.offset ?? Infinity;
        const benefits = person.benefits.filter((benefit) => {
            const offset = benefit.eb.offset;

            return offset > planName.name.offset && offset < nextOffset;
        });
        const reference = planName.references
            .find(segment => segment.element(1) === PLAN_REFERENCE);

        return {
            benefits,
            description: reference?.element(3),
            groupNumber: reference?.element(2),
            name: planName.name,
        };
    });
}

// Only subscribers are compared: a dependent often carries the subscriber's member ID.
function readSameIdMembers(person: Person, entry: RouteEntry): number[] {
    const subscribers = entry.response.subscribers;

    if (!person.id || !subscribers.includes(person)) {
        return [];
    }

    const members = subscribers.flatMap(subscriber => [subscriber, ...allDependents(subscriber)]);
    const indexes: number[] = [];

    for (const [index, other] of members.entries()) {
        const isOtherSubscriber = other !== person && subscribers.includes(other);

        if (!isOtherSubscriber || other.id !== person.id) {
            continue;
        }

        indexes.push(index);
    }

    return indexes;
}

function readStatus(
    person: Person,
    lineOfBusiness: HumanaView['lineOfBusiness'],
    report: Report,
): StatusEntry[] {
    const status: StatusEntry[] = [];

    for (const benefit of person.benefits) {
        const code = benefit.status;

        if (!isOneOf(STATUS_CODES, code)) {
            continue;
        }

        if (lineOfBusiness && code === WRONG_INACTIVE_CODES[lineOfBusiness]) {
            const message = `EB01 "${code}" is not the inactive code for a ${lineOfBusiness} response`;

            report('unexpected-inactive-code', benefit.eb, message);
        }

        const endedDate = benefit.dates.find(date => date.element(1) === COVERAGE_ENDED);
        const endedText = endedDate?.element(2) === 'RD8'
            ? endedDate.element(3)?.split('-', 2)[1]
            : endedDate?.element(3);

        status.push({
            benefit,
            ended: toPlainDate(endedText),
            isActive: isOneOf(ACTIVE_CODES, code),
            status: code,
        });
    }

    return status;
}

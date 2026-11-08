import type { RouteErrorCondition, RouteProfile } from '../types.js';
import type { CignaFindingCode, CignaView } from './types.js';

import { readCigna } from './views.js';

/*
 * 2100A NM109 values: the four tax IDs in the guide's 10.2 table and the two in its 11.3
 * examples, each with and without the hyphen, and the clearinghouse payer ID.
 */
const PAYER_IDS = [
    '06-1059331',
    '061059331',
    '59-1031071',
    '591031071',
    '41-1648670',
    '411648670',
    '59-2308055',
    '592308055',
    '06-0303370',
    '060303370',
    '59-1056496',
    '591056496',
    '62308',
];

const BIRTH_DATE_NOT_MATCHED = 'The date of birth is missing or doesn\'t match.';
const MEMBER_ID_NOT_MATCHED = 'The member ID is missing or doesn\'t match.';
const MEMBER_NOT_FOUND = 'No member matches the request.';
const MULTIPLE_MEMBERS_FOUND = 'More than one member matches the request, and Cigna can\'t choose '
    + 'one.';
const NAME_NOT_MATCHED = 'The member\'s name is missing or doesn\'t match.';

// The guide's 7.2.1 codes, as subscriber and dependent pairs.
const ERROR_CODES = [
    {
        condition: 'member-not-found',
        dependent: '67',
        description: MEMBER_NOT_FOUND,
        subscriber: '75',
    },
    {
        condition: 'multiple-members-found',
        dependent: '68',
        description: MULTIPLE_MEMBERS_FOUND,
        subscriber: '76',
    },
    {
        condition: 'member-id-not-matched',
        dependent: '64',
        description: MEMBER_ID_NOT_MATCHED,
        subscriber: '72',
    },
    {
        condition: 'name-not-matched',
        dependent: '65',
        description: NAME_NOT_MATCHED,
        subscriber: '73',
    },
    {
        condition: 'birth-date-not-matched',
        dependent: '58',
        description: BIRTH_DATE_NOT_MATCHED,
        subscriber: '58',
    },
];

const errors: RouteErrorCondition[] = ERROR_CODES.flatMap(code => [
    {
        condition: code.condition,
        description: code.description,
        level: 'subscriber',
        rejectReason: code.subscriber,
    },
    {
        condition: code.condition,
        description: code.description,
        level: 'dependent',
        rejectReason: code.dependent,
    },
]);

/**
 * The Cigna route, from the Cigna Healthcare 270/271 Companion Guide v3.0 (August 2026). The
 * guide's FAQ says it applies to all Cigna Healthcare customers.
 *
 * - NM101 `PR` and the NM109 tax IDs come from the guide's 10.2 table and 11.3 examples.
 * - The table has no NM108 row. `FI` comes from the 11.3 examples, and `PI` with `62308` from
 *   the Stedi sandbox.
 * - The guide says the response uses the separators the request sent, and it has no 2100B
 *   row, so neither is checked.
 * - The guide lists only the AAA codes for a member who can't be identified (7.2.1).
 */
export const cignaProfile: RouteProfile<CignaView, CignaFindingCode> = {
    errors,
    listsAllErrors: false,
    name: 'Cigna v3.0',
    payerIds: PAYER_IDS,
    readMember: readCigna,
    source: {
        entityCode: 'PR',
        id: PAYER_IDS,
        idQualifier: ['FI', 'PI'],
    },
};

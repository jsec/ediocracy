import type { RouteProfile } from '../types.js';
import type { HcscFindingCode, HcscView } from './types.js';

import { readHcsc } from './views.js';

// 2100A NM109 values: each guide's 4.2 payer IDs, and two clearinghouse payer IDs.
const PAYER_IDS = [
    '84980',
    'G84980',
    'HCSV2',
    '00621',
    'G00621',
    'MCIL2',
    '00840',
    '00751',
    'HMAPD',
];

const DATE_OUTSIDE_WINDOW = 'The date of service is outside the period the plan answers for.';
const MEMBER_ID_MISSING = 'The member ID is missing or not valid.';
const NAME_MISSING = 'The member\'s name is missing or not valid.';

/**
 * The HCSC route, from the 270/271 companion guides v1.1 (February 2026) of Blue Cross and Blue
 * Shield of Texas, Illinois, Oklahoma and Montana. The four guides have the same 271 rules, and
 * differ in payer IDs and 270 request rules.
 *
 * - NM101 `PR`, NM108 `PI` and the payer IDs come from each guide's 4.2 table. `G84980` and
 *   `G00621` are a clearinghouse's payer IDs, from one of its test responses.
 * - NM103 isn't checked: 4.2 gives `BCBSTX`, but that test response sends the plan's full name.
 * - The envelope and separators aren't checked, because a clearinghouse replaces them.
 * - The errors are the 5.2 table, which lists every code the plans send.
 * - The view comes from the same test response, for Texas; the guides don't describe it.
 */
export const hcscProfile: RouteProfile<HcscView, HcscFindingCode> = {
    errors: [
        {
            condition: 'payer-unavailable',
            description: 'The plan couldn\'t respond. Send the request again later.',
            level: 'source',
            rejectReason: '42',
        },
        {
            condition: 'provider-not-eligible',
            description: 'The provider can\'t check eligibility with the plan.',
            level: 'receiver',
            rejectReason: '50',
        },
        {
            condition: 'provider-not-on-file',
            description: 'The plan has no record of the provider.',
            level: 'receiver',
            rejectReason: '51',
        },
        {
            condition: 'birth-date-missing',
            description: 'The date of birth is missing or not valid.',
            level: 'subscriber',
            rejectReason: '58',
        },
        {
            condition: 'date-outside-window',
            description: DATE_OUTSIDE_WINDOW,
            level: 'subscriber',
            rejectReason: '62',
        },
        {
            condition: 'birth-date-not-matched',
            description: 'The date of birth doesn\'t match the plan\'s record for the member.',
            level: 'subscriber',
            rejectReason: '71',
        },
        {
            condition: 'member-id-missing',
            description: MEMBER_ID_MISSING,
            level: 'subscriber',
            rejectReason: '72',
        },
        {
            condition: 'name-missing',
            description: NAME_MISSING,
            level: 'subscriber',
            rejectReason: '73',
        },
        {
            condition: 'member-not-found',
            description: 'No member matches the request.',
            level: 'subscriber',
            rejectReason: '75',
        },
        {
            condition: 'duplicate-member-id',
            description: 'More than one member has the member ID.',
            level: 'subscriber',
            rejectReason: '76',
        },
        {
            condition: 'date-outside-window',
            description: DATE_OUTSIDE_WINDOW,
            level: 'dependent',
            rejectReason: '62',
        },
        {
            condition: 'member-id-missing',
            description: MEMBER_ID_MISSING,
            level: 'dependent',
            rejectReason: '64',
        },
        {
            condition: 'name-missing',
            description: NAME_MISSING,
            level: 'dependent',
            rejectReason: '65',
        },
        {
            condition: 'date-outside-window',
            description: DATE_OUTSIDE_WINDOW,
            level: 'benefit',
            rejectReason: '62',
        },
    ],
    listsAllErrors: true,
    name: 'HCSC v1.1',
    payerIds: PAYER_IDS,
    readMember: readHcsc,
    source: {
        entityCode: 'PR',
        id: PAYER_IDS,
        idQualifier: 'PI',
    },
};

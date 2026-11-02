import type { RouteProfile } from '../types.js';
import type { HetsFindingCode, MedicareView } from './types.js';

import { readMedicare } from './views.js';

/**
 * The CMS HETS (Medicare) route, from the CMS HETS 270/271 Companion Guide v15-1 (May 2026).
 *
 * - Separators: §7.1, Table 8.
 * - Information source `PR`/`PI`/`CMS`: the guide's 271 examples.
 * - Receiver entity codes and the `MISSING` member ID: Table 14, AAA03 `43` and `72`.
 * - Error conditions: Table 14.
 * - Placeholder address: §7.2 and Table 24.
 *
 * Use it with `interpretRoute` for responses to 270s sent to HETS.
 */
export const hetsProfile: RouteProfile<MedicareView, HetsFindingCode> = {
    delimiters: {
        component: '|',
        element: '*',
        repetition: '^',
        segment: '~',
    },
    errors: [
        {
            condition: 'multiple-beneficiaries',
            description: 'The 270 named more than one beneficiary.',
            level: 'source',
            rejectReason: '04',
        },
        {
            condition: 'hets-unavailable',
            description: 'HETS could not respond. Resubmit later.',
            level: 'source',
            rejectReason: '42',
        },
        {
            condition: 'source-not-cms',
            description: 'The 270\'s 2100A NM103 or NM109 was not CMS.',
            level: 'source',
            rejectReason: '79',
        },
        {
            condition: 'source-id-missing',
            description: 'The 270\'s 2100A NM103 or NM109 was missing.',
            level: 'source',
            rejectReason: 'T4',
        },
        {
            condition: 'no-hets-enrollment',
            description: 'The NPI is a valid Medicare NPI but has no active HETS EDI enrollment '
                + 'with the submitter ID.',
            level: 'receiver',
            rejectReason: '41',
        },
        {
            condition: 'invalid-receiver',
            description: 'The 2100B NM101 was not 1P, FA or 80, or the NPI has an invalid '
                + 'Medicare provider status.',
            level: 'receiver',
            rejectReason: '43',
        },
        {
            condition: 'provider-not-eligible',
            description: 'The provider is valid but cannot check Medicare eligibility in HETS.',
            level: 'receiver',
            rejectReason: '50',
        },
        {
            condition: 'npi-not-on-file',
            description: 'HETS has no record of the NPI.',
            level: 'receiver',
            rejectReason: '51',
        },
        {
            condition: 'identity-data-missing',
            description: 'The 270 sent neither a date of birth (DMG02) nor a first name (NM104).',
            level: 'subscriber',
            rejectReason: '58',
        },
        {
            condition: 'date-outside-window',
            description: 'The requested date was more than four years past or four months ahead.',
            level: 'subscriber',
            rejectReason: '62',
        },
        {
            condition: 'dob-mismatch',
            description: 'The date of birth does not match the beneficiary on file.',
            level: 'subscriber',
            rejectReason: '71',
        },
        {
            condition: 'mbi-not-matched',
            description: 'The MBI was missing, the wrong length, or matched no beneficiary.',
            level: 'subscriber',
            rejectReason: '72',
        },
        {
            condition: 'name-mismatch',
            description: 'The last name was missing, or the last or first name was too long '
                + 'or did not match the beneficiary on file.',
            level: 'subscriber',
            rejectReason: '73',
        },
    ],
    listsAllErrors: true,
    memberIdPlaceholders: ['MISSING'],
    name: 'CMS HETS v15-1',
    readMember: readMedicare,
    receiverEntityCodes: ['1P', '80', 'FA'],
    source: {
        entityCode: 'PR',
        id: 'CMS',
        idQualifier: 'PI',
    },
};

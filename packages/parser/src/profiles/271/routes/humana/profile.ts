import type { RouteProfile } from '../types.js';
import type { HumanaFindingCode, HumanaView } from './types.js';

import { readHumana } from './views.js';

/**
 * The Humana route, from the Humana 270/271 Standard Companion Guide v2.0 (June 2018). Humana's
 * HIPAA companion guide page links this version, but it has not been confirmed as current.
 *
 * - Payer IDs and receiver entity codes come from the guide's 270 table. The guide says the
 *   271 is for the payer ID sent in the 270.
 * - The guide does not list every AAA.
 * - Envelope rules are Availity's, so separators are not checked.
 */
export const humanaProfile: RouteProfile<HumanaView, HumanaFindingCode> = {
    errors: [
        {
            condition: 'duplicate-member-id',
            description: 'More than one member has this ID. Send the patient\'s first and last name.',
            level: 'subscriber',
            rejectReason: '76',
        },
        {
            condition: 'not-approved-by-cms',
            description: 'The patient applied for coverage, but CMS has not approved it and Humana '
                + 'has no coverage for them.',
            level: 'source',
            rejectReason: '41',
        },
    ],
    listsAllErrors: false,
    name: 'Humana v2.0',
    readMember: readHumana,
    receiverEntityCodes: ['1P', '2B', '36', '80', 'FA', 'GP', 'P5'],
    source: {
        entityCode: 'PR',
        id: ['61101', '61115', '65065', 'CX021'],
        idQualifier: 'PI',
    },
};

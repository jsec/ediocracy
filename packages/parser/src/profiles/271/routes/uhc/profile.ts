import type { RouteProfile } from '../types.js';
import type { UhcFindingCode, UhcView } from './types.js';

import { readUhc } from './views.js';

const DATE_OUTSIDE_WINDOW = 'The requested dates were more than 18 months back or past the end '
    + 'of the current month.';

/**
 * The UnitedHealthcare route, from the UnitedHealthcare 270/271 Standard Companion Guide v9.0
 * (February 2025).
 *
 * - Error conditions: §6.1 #3 (`62`, `63`) and §6.1 #7 (`75`).
 * - Coverage dates: §6.2 #6. Other payers: §6.2 #9. Variable copays: §6.2 #11–12.
 * - Payer IDs for `interpretRoute(entry)`: FAQ Q3, the payer IDs the guide applies to.
 */
export const uhcProfile: RouteProfile<UhcView, UhcFindingCode> = {
    errors: [
        {
            condition: 'date-outside-window',
            description: DATE_OUTSIDE_WINDOW,
            rejectReason: '62',
        },
        {
            condition: 'date-outside-window',
            description: DATE_OUTSIDE_WINDOW,
            rejectReason: '63',
        },
        {
            condition: 'search-data-missing',
            description: 'The 270 did not send enough of member ID, last name, first name and date '
                + 'of birth to search.',
            rejectReason: '75',
        },
    ],
    listsAllErrors: false,
    name: 'UnitedHealthcare v9.0',
    payerIds: ['87726', '52133', '00773', '94265'],
    readMember: readUhc,
};

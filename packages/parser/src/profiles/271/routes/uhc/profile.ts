import type { RouteProfile } from '../types.js';
import type { UhcFindingCode, UhcView } from './types.js';

import { readUhc } from './views.js';

const DATE_OUTSIDE_WINDOW = 'The requested dates were more than 18 months back or past the end '
    + 'of the current month.';

/**
 * The UnitedHealthcare route, from the UnitedHealthcare 270/271 Standard Companion Guide v9.0
 * (February 2025).
 *
 * - Error conditions: §6.1 #3 (`62`, `63`) and §6.1 #7 (`75`). The guide gives no level and no
 *   complete list, so `listsAllErrors` is false.
 * - Coverage dates: §6.2 #6. Other payers: §6.2 #9. Variable copays: §6.2 #11–12.
 * - The guide states no 271 separators, 2100A, 2100B entity codes or member ID placeholder, so
 *   none are checked.
 *
 * Use it with `interpretRoute` for UnitedHealthcare responses, from any clearinghouse.
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
    readMember: readUhc,
};

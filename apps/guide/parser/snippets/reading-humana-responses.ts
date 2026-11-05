// #region example
import { readFile } from 'node:fs/promises';

import { readX12 } from '@ediocracy/parser';
import { read271s } from '@ediocracy/parser/271';
import { humanaProfile, interpretRoute } from '@ediocracy/parser/271/routes';

const text = await readFile('response.x12', 'utf8');

for (const entry of read271s(readX12(text))) {
    const result = interpretRoute(entry, humanaProfile);

    for (const finding of result.findings) {
        console.log('Finding:', finding.code, finding.message);
    }

    for (const error of result.errors) {
        console.log('Error:', error.condition ?? error.rejectReason, error.description);
    }

    for (const view of result.members) {
        console.log('Line of business:', view.lineOfBusiness);
        console.log('Plans:', view.plans.map(plan => plan.description));

        for (const row of view.status) {
            console.log('Status:', row.status, 'active:', row.isActive, 'ended:', row.ended?.toString());
        }

        for (const row of view.billing) {
            console.log('Billing:', row.status, 'grace month:', row.graceMonth);
        }
    }
}
// #endregion example

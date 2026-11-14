// #region example
import { readFile } from 'node:fs/promises';

import { readX12 } from '@ediocracy/parser';
import { read271s } from '@ediocracy/parser/271';
import { hcscProfile, interpretRoute } from '@ediocracy/parser/271/routes';

const text = await readFile('response.x12', 'utf8');

for (const entry of read271s(readX12(text))) {
    const result = interpretRoute(entry, hcscProfile);

    for (const finding of result.findings) {
        console.log('Finding:', finding.code, finding.message);
    }

    for (const error of result.errors) {
        console.log('Error:', error.condition ?? error.rejectReason, error.description);
    }

    for (const view of result.members) {
        console.log('Group:', view.group?.number, view.group?.name);
        console.log('Related plans:', view.relatedPlans.map(plan => plan.payerId));
        console.log('Utilization management:', view.utilizationManagement.map(row => row.phone));
    }
}
// #endregion example

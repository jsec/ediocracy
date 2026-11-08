// #region example
import { readFile } from 'node:fs/promises';

import { readX12 } from '@ediocracy/parser';
import { read271s } from '@ediocracy/parser/271';
import { cignaProfile, interpretRoute } from '@ediocracy/parser/271/routes';

const text = await readFile('response.x12', 'utf8');

for (const entry of read271s(readX12(text))) {
    const result = interpretRoute(entry, cignaProfile);

    for (const finding of result.findings) {
        console.log('Finding:', finding.code, finding.message);
    }

    for (const error of result.errors) {
        console.log('Error:', error.condition ?? error.rejectReason, error.description);
    }

    for (const view of result.members) {
        console.log('Network:', view.network?.name, view.network?.description);
        console.log('Participation:', view.participation);
        console.log('Care management:', view.careManagement);
        console.log('Attribution:', view.attribution.map(row => row.status));
        console.log('HRA:', view.hraBalances.map(row => `${row.kind} ${row.amount ?? ''}`));
    }
}
// #endregion example

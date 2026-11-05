// #region example
import { readFile } from 'node:fs/promises';

import { readX12 } from '@ediocracy/parser';
import { read271s } from '@ediocracy/parser/271';
import { hetsProfile, interpretRoute } from '@ediocracy/parser/271/routes';

const text = await readFile('response.x12', 'utf8');

for (const entry of read271s(readX12(text))) {
    const result = interpretRoute(entry, hetsProfile);

    for (const finding of result.findings) {
        console.log('Finding:', finding.code, finding.message);
    }

    for (const error of result.errors) {
        console.log('Error:', error.condition ?? error.rejectReason, error.description);
    }

    for (const view of result.members) {
        const advantageContracts = view.medicareAdvantage.map(plan => plan.contract);
        const partDContracts = view.partD.map(plan => plan.contract);

        console.log('Part A rows:', view.partA.length, 'Part B rows:', view.partB.length);
        console.log('Medicare Advantage:', advantageContracts, 'Part D:', partDContracts);

        if (view.ssaAddress) {
            console.log('SSA address:', view.ssaAddress);
        }
    }
}
// #endregion example

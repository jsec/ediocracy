// #region example
import { readFile } from 'node:fs/promises';

import { interpretRoute, read271s, readX12, uhcProfile } from '@ediocracy/parser';

const text = await readFile('response.x12', 'utf8');

for (const entry of read271s(readX12(text))) {
    const result = interpretRoute(entry, uhcProfile);

    for (const finding of result.findings) {
        console.log('Finding:', finding.code, finding.message);
    }

    for (const error of result.errors) {
        console.log('Error:', error.condition ?? error.rejectReason, error.description);
    }

    for (const view of result.members) {
        for (const date of view.coverageDates) {
            console.log('Coverage starts:', date.start.toString(), 'ended:', date.end !== undefined);
        }

        console.log('Other payers:', view.otherPayers.map(payer => payer.name));

        for (const copay of view.variableCopays) {
            console.log('Copay:', copay.entry.amount, 'varies by', copay.variesBy);
        }

        for (const range of view.copayRanges) {
            console.log('Copay range:', range.minimum.amount, 'to', range.maximum.amount);
        }
    }
}
// #endregion example

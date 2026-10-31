// #region example
import { readFile } from 'node:fs/promises';

import { readX12 } from '@ediocracy/parser';

const document = readX12(await readFile('response.x12', 'utf8'));

for (const interchange of document.interchanges) {
    console.log('Interchange', interchange.header.element(13));
    for (const group of interchange.groups) {
        console.log('  Group', group.header.element(6), group.header.element(8));
        for (const transaction of group.transactions) {
            const tags = transaction.segments.map((segment) => segment.tag);
            console.log('    Transaction', transaction.header.element(1), tags.join(' '));
        }
    }
}
// #endregion example

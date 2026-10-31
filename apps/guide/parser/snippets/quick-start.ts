// #region example
import { readFile } from 'node:fs/promises';

import { read271s, readX12 } from '@ediocracy/parser';

const text = await readFile('response.x12', 'utf8');

for (const { response } of read271s(readX12(text))) {
    for (const subscriber of response.subscribers) {
        const lastName = subscriber.name?.element(3);
        const firstName = subscriber.name?.element(4);
        console.log(`${firstName} ${lastName}: ${subscriber.benefits.length} benefits`);
    }
}
// #endregion example

// #region example
import { readFile } from 'node:fs/promises';

import { read271, readX12 } from '@ediocracy/parser';

const text = await readFile('response.x12', 'utf8');
const document = readX12(text);
const transaction = document.interchanges[0]?.groups[0]?.transactions[0];

if (transaction) {
    const response = read271(transaction);

    for (const source of response.sources) {
        console.log('Payer:', source.name?.element(3), source.id);
    }
    for (const receiver of response.receivers) {
        console.log('Provider:', receiver.name?.element(3), receiver.id);
    }
    for (const subscriber of response.subscribers) {
        for (const benefit of subscriber.benefits) {
            console.log(benefit.status, benefit.serviceTypes, benefit.planDescription);
        }
    }
}
// #endregion example

// #region example
import { readFile } from 'node:fs/promises';

import { readX12 } from '@ediocracy/parser';
import { read999s, readTa1s } from '@ediocracy/parser/acknowledgements';

const text = await readFile('response.x12', 'utf8');
const document = readX12(text);

for (const { ta1 } of readTa1s(document)) {
    console.log('TA1 for interchange', ta1.controlNumber, ta1.code, ta1.noteCode);
}

for (const { response } of read999s(document)) {
    for (const finding of response.findings) {
        console.log('Finding:', finding.code, finding.message);
    }

    console.log('999 for group', response.group?.controlNumber, response.result?.code);

    for (const set of response.transactionSets) {
        console.log('Transaction set', set.controlNumber, set.result?.code);

        for (const segmentError of set.segmentErrors) {
            const trace = segmentError.contexts.find(context => context.name === 'TRN02');

            console.log('Segment', segmentError.tag, segmentError.position, segmentError.error, trace?.reference);

            for (const elementError of segmentError.elementErrors) {
                console.log('Element', elementError.position?.element, elementError.error, elementError.badValue);
            }
        }
    }
}
// #endregion example

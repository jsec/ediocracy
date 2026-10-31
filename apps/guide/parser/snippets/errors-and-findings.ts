// #region example
import { readFile } from 'node:fs/promises';

import { read271s, readX12, X12SyntaxError } from '@ediocracy/parser';

try {
    readX12('not x12');
} catch (error) {
    if (!(error instanceof X12SyntaxError)) {
        throw error;
    }
    console.log('Cannot read:', error.code, 'at offset', error.offset);
}

const document = readX12(await readFile('response.x12', 'utf8'));
for (const finding of document.findings) {
    console.log('Envelope:', finding.code, finding.message);
}
for (const { response } of read271s(document)) {
    for (const finding of response.findings) {
        console.log('271:', finding.code, finding.message);
    }
}
// #endregion example

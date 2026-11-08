// #region example
import { readFile } from 'node:fs/promises';

import { readX12 } from '@ediocracy/parser';
import { read271s } from '@ediocracy/parser/271';
import { interpretRoute } from '@ediocracy/parser/271/routes';

const text = await readFile('response.x12', 'utf8');

for (const entry of read271s(readX12(text))) {
    const detected = interpretRoute(entry);

    switch (detected.route) {
        case 'hets': {
            console.log('HETS Part A rows:', detected.result.members[0]?.partA.length);
            break;
        }
        case 'cigna': {
            console.log('Cigna:', detected.result.members.map(view => view.participation));
            break;
        }
        case 'humana': {
            console.log('Humana:', detected.result.members.map(view => view.lineOfBusiness));
            break;
        }
        case 'uhc': {
            console.log('UHC other payers:', detected.result.members.map(view => view.otherPayers.length));
            break;
        }
        case undefined: {
            console.log('No route. Members:', detected.eligibility.members.length);
            break;
        }
    }
}
// #endregion example

import { readFileSync } from 'node:fs';

import { readX12 } from '@ediocracy/parser';

import { EXAMPLE_FILENAMES } from '../src/lib/examples.mjs';

const examplesDirectory = new URL('../public/examples/', import.meta.url);

for (const filename of EXAMPLE_FILENAMES) {
  const text = readFileSync(new URL(filename, examplesDirectory), 'utf8');
  const document = readX12(text);

  for (const finding of document.findings) {
    console.error(`${filename}: ${finding.code}: ${finding.message}`);
  }

  if (document.findings.length > 0) {
    process.exitCode = 1;
  } else {
    console.log(`${filename}: valid`);
  }
}

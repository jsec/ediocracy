import { readFileSync } from 'node:fs';

import { readX12 } from '@ediocracy/parser';

import { EXAMPLE_FILENAMES } from '../src/lib/examples.mjs';

const examplesDirectory = new URL('../public/examples/', import.meta.url);

for (const filename of EXAMPLE_FILENAMES) {
  const { findings } = readX12(readFileSync(new URL(filename, examplesDirectory), 'utf8'));
  for (const finding of findings) {
    console.error(`${filename}: ${finding.code}: ${finding.message}`);
  }

  if (findings.length > 0) {
    process.exitCode = 1;
  } else {
    console.log(`${filename}: valid`);
  }
}

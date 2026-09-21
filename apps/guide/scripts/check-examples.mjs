import { readFileSync } from 'node:fs';

import { validateExample } from './lib/validate-example.mjs';

const filenames = [
  'single-eb.edi',
  'medicare-secondary-payer.edi',
  'medicare-primary-commercial-secondary.edi',
  'medicare-advantage.edi',
  'multiple-interchanges.edi',
];
const examplesDirectory = new URL('../public/examples/', import.meta.url);
let hasErrors = false;

for (const filename of filenames) {
  const source = readFileSync(new URL(filename, examplesDirectory), 'utf8');
  const result = validateExample(source);

  if (result.errors.length > 0) {
    hasErrors = true;
    for (const validationError of result.errors) {
      console.error(`${filename}: ${validationError.code}: ${validationError.message}`);
    }
    continue;
  }

  console.log(`${filename}: valid`);
}

if (hasErrors) {
  process.exitCode = 1;
}

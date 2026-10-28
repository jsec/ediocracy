import { readFileSync } from 'node:fs';

import { EXAMPLE_FILENAMES } from '../src/lib/examples.mjs';
import { validateExample } from './lib/validate-example.mjs';

const examplesDirectory = new URL('../public/examples/', import.meta.url);

for (const filename of EXAMPLE_FILENAMES) {
  const { errors } = validateExample(readFileSync(new URL(filename, examplesDirectory), 'utf8'));
  for (const validationError of errors) {
    console.error(`${filename}: ${validationError.code}: ${validationError.message}`);
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  } else {
    console.log(`${filename}: valid`);
  }
}

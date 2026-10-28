import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXAMPLE_FILENAMES = /** @type {const} */ ([
  'single-eb.edi',
  'medicare-secondary-payer.edi',
  'medicare-primary-commercial-secondary.edi',
  'medicare-advantage.edi',
  'multiple-interchanges.edi',
]);

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
// The first path works from src/lib. During `astro build` this module is bundled
// into dist/.prerender/chunks, where the copied public files are at dist/examples.
const EXAMPLE_DIRECTORIES = [
  resolve(MODULE_DIRECTORY, '../../public/examples'),
  resolve(MODULE_DIRECTORY, '../../examples'),
];

/**
 * @param {typeof EXAMPLE_FILENAMES[number]} file
 * @returns {Promise<string>}
 */
export async function loadExample(file) {
  if (!EXAMPLE_FILENAMES.includes(file)) {
    throw new Error(`Unsupported example file: ${String(file)}`);
  }

  for (const directory of EXAMPLE_DIRECTORIES) {
    const path = resolve(directory, file);
    if (existsSync(path)) {
      return readFile(path, 'utf8');
    }
  }

  throw new Error(`Example file is unavailable: ${file}`);
}

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
const EXAMPLES_DIRECTORY = resolve(MODULE_DIRECTORY, '../../public/examples');

/**
 * @param {typeof EXAMPLE_FILENAMES[number]} file
 * @returns {Promise<string>}
 */
export async function loadExample(file) {
  return readFile(resolve(EXAMPLES_DIRECTORY, file), 'utf8');
}

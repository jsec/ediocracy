import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {readonly ['single-eb.edi', 'medicare-secondary-payer.edi', 'medicare-primary-commercial-secondary.edi', 'medicare-advantage.edi', 'multiple-interchanges.edi']} */
export const EXAMPLE_FILENAMES = [
  'single-eb.edi',
  'medicare-secondary-payer.edi',
  'medicare-primary-commercial-secondary.edi',
  'medicare-advantage.edi',
  'multiple-interchanges.edi',
];

const EXAMPLE_DIRECTORIES = [
  resolve(dirname(fileURLToPath(import.meta.url)), '../../public/examples'),
  resolve(dirname(fileURLToPath(import.meta.url)), '../../examples'),
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
    try {
      return await readFile(resolve(directory, file), 'utf8');
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw new Error(`Example file is unavailable: ${file}`);
}

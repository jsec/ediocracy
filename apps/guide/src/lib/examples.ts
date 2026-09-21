import { EXAMPLE_FILENAMES, loadExample } from './examples.mjs';

export { EXAMPLE_FILENAMES, loadExample };

export type ExampleFilename = (typeof EXAMPLE_FILENAMES)[number];

import { EXAMPLE_FILENAMES, loadExample } from '../../src/lib/examples.mjs';
import { buildWalkthrough } from '../../src/lib/walkthrough.mjs';

type Walkthrough = ReturnType<typeof buildWalkthrough>;

export declare const data: Record<string, Walkthrough>;

export default {
  async load() {
    const walkthroughs: Record<string, Walkthrough> = {};

    for (const file of EXAMPLE_FILENAMES) {
      const source = await loadExample(file);

      walkthroughs[file] = buildWalkthrough(source);
    }

    return walkthroughs;
  },
};

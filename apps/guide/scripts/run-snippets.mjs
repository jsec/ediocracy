// @ts-check

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const SNIPPETS_ROOT = resolve(PROJECT_ROOT, 'parser/snippets');

// Each snippet reads response.x12 from its working directory, as the parser pages show.
const workingDirectory = mkdtempSync(join(tmpdir(), 'parser-snippets-'));
copyFileSync(resolve(PROJECT_ROOT, 'public/examples/single-eb.edi'), join(workingDirectory, 'response.x12'));

for (const name of readdirSync(SNIPPETS_ROOT)) {
  if (!name.endsWith('.ts')) {
    continue;
  }

  const result = spawnSync(process.execPath, [join(SNIPPETS_ROOT, name)], { cwd: workingDirectory, encoding: 'utf8' });
  if (result.status === 0) {
    console.log(`${name}: ok`);
  } else {
    console.error(`${name}: exit ${result.status}\n${result.stderr}`);
    process.exitCode = 1;
  }
}

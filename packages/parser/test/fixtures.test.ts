import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

interface FixtureRecord {
  payload_path: string;
}

interface FixtureManifest {
  schema: string;
  suite: string;
  fixtures: FixtureRecord[];
}

const fixtureDirectory = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/generic-x12');

describe('generic X12 fixtures', () => {
  test('the manifest resolves every payload path', async () => {
    const manifest = JSON.parse(
      await readFile(resolve(fixtureDirectory, 'fixtures.json'), 'utf8'),
    ) as FixtureManifest;

    expect(manifest.schema).toBe('ediocracy.generic-x12.fixture/v1');
    expect(manifest.suite).toBe('generic-x12');
    expect(manifest.fixtures).toHaveLength(42);

    await Promise.all(
      manifest.fixtures.map(({ payload_path: payloadPath }) =>
        access(resolve(fixtureDirectory, payloadPath)),
      ),
    );
  });
});

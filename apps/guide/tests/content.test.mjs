import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { BANNED_PHRASES, checkDocument, checkDownloadLinks, checkSidebarSlugs } from '../scripts/check-content.mjs';
import { EXAMPLE_FILENAMES, loadExample } from '../src/lib/examples.mjs';
import { buildWalkthrough } from '../src/lib/walkthrough.mjs';

const pages = [
  ['guide/index.md', /271|eligibility/i],
  ['guide/introduction/what-is-a-271.md', /271|response/i],
  ['guide/introduction/eligibility-workflow.md', /workflow|request|response/i],
  ['guide/introduction/how-to-use-this-guide.md', /guide|reading|evidence/i],
  ['guide/structure/x12-syntax.md', /segment|element|syntax/i],
  ['guide/structure/envelopes.md', /envelope|interchange|group/i],
  ['guide/structure/transaction-context.md', /transaction|context|BHT/i],
  ['guide/structure/party-hierarchy.md', /hierarchy|party|HL/i],
  ['guide/structure/eligibility-benefits.md', /benefit|EB|eligibility/i],
];

const profilePages = [
  {
    path: 'guide/standards/public-x12-sources.md',
    scope: /licensed\s+005010X279A1\s+implementation guide contains the complete grammar/i,
    links: /https:\/\/x12\.org\/examples\/005010x279[\s\S]*https:\/\/x12\.org\/resources\/requests-for-interpretation\//i,
  },
];

const examplePages = [
  ['guide/examples/single-eb.md', 'single-eb.edi'],
  ['guide/examples/medicare-secondary-payer.md', 'medicare-secondary-payer.edi'],
  ['guide/examples/medicare-primary-commercial-secondary.md', 'medicare-primary-commercial-secondary.edi'],
  ['guide/examples/medicare-advantage.md', 'medicare-advantage.edi'],
  ['guide/examples/multiple-interchanges.md', 'multiple-interchanges.edi'],
];

function withoutCodeAndUrls(source) {
  return source
    .replace(/```[\s\S]*?```/g, '')
    .replace(/https?:\/\/\S+/g, '');
}

function pageParts(source) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(frontmatter, 'page must have YAML frontmatter');
  const title = frontmatter[1].match(/^title:\s*(.+)$/m)?.[1].trim();
  const body = source.slice(frontmatter[0].length);
  const firstParagraph = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/^\s*[-*+]\s+/gm, '').trim())
    .find((paragraph) => paragraph && !paragraph.startsWith('<!--'));

  return { title, body, firstParagraph };
}

function headingLevels(body) {
  return [...body.matchAll(/^(#{1,6})\s+\S/mg)].map((match) => match[1].length);
}

for (const [relativePath, firstParagraphPattern] of pages) {
  test(`${relativePath} has explainable structure`, () => {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
    const { title, body, firstParagraph } = pageParts(source);

    assert.ok(title, 'frontmatter title must be nonempty');
    assert.doesNotMatch(body, /^#\s+/m, 'the theme supplies the page H1');
    assert.ok(firstParagraph, 'page must begin with a nonempty paragraph');
    assert.match(firstParagraph, firstParagraphPattern, 'first paragraph must define the page topic or outcome');
    assert.doesNotMatch(withoutCodeAndUrls(source), BANNED_PHRASES, 'page contains a banned phrase');

    const levels = headingLevels(body);
    for (let index = 1; index < levels.length; index += 1) {
      assert.ok(levels[index] <= levels[index - 1] + 1, 'heading levels must not skip a level');
    }
  });
}

for (const { path, scope, links } of profilePages) {
  test(`${path} states its source scope and primary sources`, () => {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

    assert.match(source, scope);
    assert.match(source, links, 'profile must link its primary source');
  });
}

test('example pages use the walkthrough renderer and concise sections', () => {
  const expectedSections = ['Scenario', 'Complete response', 'Sources'];
  const removedSections = [
    'Interchange and controls',
    'Transaction walkthrough',
    'Benefit interpretation',
    'Segment and field notes',
    'Source notes',
  ];

  for (const [relativePath, filename] of examplePages) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

    assert.doesNotMatch(source, /^import /m);
    assert.match(source, new RegExp(`<X12Example file="${filename.replace('.', '\\.')}" />`));
    const sectionPositions = expectedSections.map((section) => source.indexOf(`## ${section}`));
    assert.ok(sectionPositions.every((position) => position >= 0), `${relativePath} is missing a required section`);
    assert.deepEqual(
      [...sectionPositions].sort((left, right) => left - right),
      sectionPositions,
      `${relativePath} sections are out of order`,
    );
    for (const section of removedSections) {
      assert.doesNotMatch(source, new RegExp(`## ${section}`), `${relativePath} retains removed section ${section}`);
    }
  }
});

test('example scope disclosure is consolidated in the example index', () => {
  const index = readFileSync(new URL('../guide/reference/examples.md', import.meta.url), 'utf8');
  assert.match(index, /written for this guide/i);
  for (const [relativePath] of examplePages) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /This is a synthetic example/i);
    assert.doesNotMatch(source, /production capture/i);
  }
});

test('reader pages avoid repeated editorial jargon', () => {
  const docsRoot = new URL('../guide/', import.meta.url);
  const sources = [];
  for (const entry of readdirSync(docsRoot, { recursive: true, withFileTypes: true })) {
    if (!entry.isDirectory() && /\.mdx?$/.test(entry.name)) {
      sources.push(withoutCodeAndUrls(readFileSync(`${entry.parentPath}/${entry.name}`, 'utf8')));
    }
  }

  const prose = sources.join('\n');
  assert.doesNotMatch(
    prose,
    /\b(?:canonical|artifact|lexical|corpus|boundaries?)\b|production capture|\b[\w-]+-bearing\b/i,
  );
  assert.ok((prose.match(/\bsynthetic\b/gi) ?? []).length <= 1, 'synthetic is repeated across reader pages');
  assert.ok((prose.match(/\benvelopes?\b/gi) ?? []).length <= 3, 'envelope terminology is overused');
});

test('coordination example pages do not document unsupported SBR segments', () => {
  for (const relativePath of [
    'guide/examples/medicare-secondary-payer.md',
    'guide/examples/medicare-primary-commercial-secondary.md',
  ]) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

    assert.doesNotMatch(source, /\bSBR\b/, relativePath);
  }
});

test('coordination example pages disclose that labels do not establish payer order', () => {
  for (const relativePath of [
    'guide/examples/medicare-secondary-payer.md',
    'guide/examples/medicare-primary-commercial-secondary.md',
  ]) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

    assert.match(source, /scenario labels do not establish payer order/i);
    assert.match(source, /actual response, payer or\s+plan records, and applicable route rules/i);
  }
});

test('walkthrough tables have accessible captions and column scopes', () => {
  const component = readFileSync(new URL('../.vitepress/theme/X12Example.vue', import.meta.url), 'utf8');

  assert.doesNotMatch(component, /<h5>\{\{ segment\.ordinal \}\}\./);
  assert.match(component, /<h5 :id="`segment-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`">\{\{ segment\.name \}\}<\/h5>/);
  assert.match(component, /<table class="x12-field-table" :aria-labelledby="`segment-table-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`">/);
  assert.match(component, /<caption :id="`segment-table-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`">/);
  assert.equal((component.match(/<th scope="col">/g) ?? []).length, 4);
  assert.match(component, /<strong>Raw segment:<\/strong> <code>/);
});

test('walkthrough field tables reserve readable widths for each column', () => {
  const component = readFileSync(new URL('../.vitepress/theme/X12Example.vue', import.meta.url), 'utf8');
  const stylesheet = readFileSync(new URL('../.vitepress/theme/custom.css', import.meta.url), 'utf8');

  assert.match(component, /<div class="x12-field-table-wrap">/);
  assert.match(component, /<table class="x12-field-table"/);
  assert.match(component, /<col class="x12-position-column" \/>/);
  assert.match(component, /<col class="x12-value-column" \/>/);
  assert.match(component, /<col class="x12-name-column" \/>/);
  assert.match(stylesheet, /\.x12-field-table-wrap\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(stylesheet, /\.x12-field-table\s*\{[^}]*min-inline-size:\s*48rem[^}]*table-layout:\s*fixed/s);
  assert.match(stylesheet, /\.x12-position-column\s*\{[^}]*inline-size:\s*7rem/s);
  assert.match(stylesheet, /\.x12-value-column\s*\{[^}]*inline-size:\s*10rem/s);
  assert.match(stylesheet, /\.x12-name-column\s*\{[^}]*inline-size:\s*15rem/s);
});

test('walkthrough segments have unique headings and per-interchange jump navigation', () => {
  const component = readFileSync(new URL('../.vitepress/theme/X12Example.vue', import.meta.url), 'utf8');

  assert.match(component, /<nav :aria-label="`Interchange \$\{interchange\.ordinal\} segment navigation`">/);
  assert.match(component, /:href="`#segment-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`"/);
  assert.match(component, /\{\{ segment\.ordinal \}\}\. \{\{ segment\.name \}\}/);
  assert.match(component, /<h5 :id="`segment-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`">\{\{ segment\.name \}\}<\/h5>/);
});

test('examples data loader returns the walkthrough for every example file', async () => {
  const { default: loader } = await import('../.vitepress/theme/examples.data.ts');
  const data = await loader.load();

  assert.deepEqual(Object.keys(data), [...EXAMPLE_FILENAMES]);
  for (const filename of EXAMPLE_FILENAMES) {
    assert.deepEqual(data[filename], buildWalkthrough(await loadExample(filename)), filename);
  }
});

test('loadExample returns exact bytes for every allowlisted file', async () => {
  for (const filename of EXAMPLE_FILENAMES) {
    const expected = readFileSync(new URL(`../public/examples/${filename}`, import.meta.url), 'utf8');

    assert.equal(await loadExample(filename), expected, filename);
  }
});

test('loadExample rejects a filename outside the closed allowlist at runtime', async () => {
  await assert.rejects(
    loadExample('../package.json'),
    /Unsupported example file/,
  );
});

test('loadExample resolves files independently of the working directory', () => {
  const moduleUrl = new URL('../src/lib/examples.mjs', import.meta.url).href;
  const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
  const expected = readFileSync(new URL('../public/examples/single-eb.edi', import.meta.url), 'utf8');
  const source = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { loadExample } from ${JSON.stringify(moduleUrl)}; process.stdout.write(await loadExample('single-eb.edi'));`,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  assert.equal(source, expected);
});

test('Medicare Secondary Payer uses the official capitalization', () => {
  const source = readFileSync(new URL('../guide/examples/medicare-secondary-payer.md', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /Medicare secondary(?:-| )payer/);
});

const validDocument = `---
title: Valid page
---

Introductory paragraph.

## Section

Content with a [local page](/reference/segments).
`;
const validRoutes = ['', 'reference/segments'];

test('content validator accepts a valid document and resolved sidebar', () => {
  assert.deepEqual(checkDocument(validDocument, 'guide/valid.md'), []);
  assert.deepEqual(checkSidebarSlugs(['', 'reference/segments'], validRoutes), []);
});

test('content validator reports a missing frontmatter title', () => {
  const findings = checkDocument(
    validDocument.replace('title: Valid page', 'description: Missing title'),
    'guide/valid.md',
  );

  assert.deepEqual(findings.map(({ code }) => code), ['missing-title']);
});

test('content validator reports an explicit duplicate H1', () => {
  const findings = checkDocument(
    validDocument.replace('Introductory paragraph.', '# Duplicate title\n\nIntroductory paragraph.'),
    'guide/valid.md',
  );

  assert.deepEqual(findings.map(({ code }) => code), ['duplicate-h1']);
});

test('content validator reports skipped heading levels', () => {
  const findings = checkDocument(
    validDocument.replace('## Section', '#### Skipped section'),
    'guide/valid.md',
  );

  assert.deepEqual(findings.map(({ code }) => code), ['skipped-heading']);
});

test('content validator ignores banned phrases inside fenced code', () => {
  const source = `${validDocument}\n\`\`\`text\nPlease note: this is fixture text.\n\`\`\`\n`;

  assert.deepEqual(checkDocument(source, 'guide/valid.md'), []);
});

test('content validator reports banned phrases outside fenced code', () => {
  const findings = checkDocument(
    validDocument.replace('Introductory paragraph.', 'Please note this prose.'),
    'guide/valid.md',
  );

  assert.deepEqual(findings.map(({ code }) => code), ['banned-phrase']);
});

test('content validator reports easy as a banned phrase', () => {
  const findings = checkDocument(
    validDocument.replace('Introductory paragraph.', 'This is easy prose.'),
    'guide/valid.md',
  );

  assert.deepEqual(findings.map(({ code }) => code), ['banned-phrase']);
});

test('content validator reports a missing sidebar target', () => {
  const findings = checkSidebarSlugs(['reference/missing'], validRoutes);

  assert.deepEqual(findings.map(({ code }) => code), ['missing-sidebar-target']);
});

test('terminology defines every cross-page domain and X12 term', () => {
  const source = readFileSync(new URL('../guide/reference/terminology.md', import.meta.url), 'utf8');
  const requiredTerms = [
    'HSD',
    '2120',
    'LS',
    'LE',
    'ISA',
    'IEA',
    'GS',
    'GE',
    'ST',
    'SE',
    'BHT',
    'API',
    'JSON',
    'RFI',
  ];
  const missingTerms = requiredTerms.filter((term) => !new RegExp('\\|\\s*`?' + term + '`?\\s*\\|').test(source));

  assert.deepEqual(missingTerms, []);
});

test('the theme loads the Catppuccin palette after the default theme so its colors apply', () => {
  const theme = readFileSync(new URL('../.vitepress/theme/index.ts', import.meta.url), 'utf8');
  const defaultTheme = theme.indexOf("from 'vitepress/theme'");
  const palette = theme.indexOf("'@catppuccin/vitepress/theme/mocha/mauve.css'");

  assert.ok(defaultTheme >= 0 && palette >= 0, 'theme must import both the default theme and the palette');
  assert.ok(palette > defaultTheme, 'the palette must be imported after the default theme');
});

test('content validator reports a download link to a file missing from public', () => {
  const source = 'Download [the example](/examples/single-eb.edi) or [another](/examples/missing.edi).\n';
  const findings = checkDownloadLinks(source, 'guide/valid.md', ['examples/single-eb.edi']);

  assert.deepEqual(findings.map(({ code, line }) => [code, line]), [['missing-download', 1]]);
});

test('search indexes each page under its frontmatter title', async () => {
  const { renderForSearch } = await import('../.vitepress/search-render.mjs');
  const md = {
    /** @param {string} src @param {{ frontmatter?: { title?: string } }} env */
    render(src, env) {
      if (env) {
        env.frontmatter = { title: 'Party hierarchy' };
      }
      return `<rendered>${src}</rendered>`;
    },
  };

  assert.equal(
    renderForSearch('Body text.', {}, md),
    '<rendered># Party hierarchy</rendered><rendered>Body text.</rendered>',
  );
  assert.equal(
    renderForSearch('Body text.', {}, { render: (src) => `<rendered>${src}</rendered>` }),
    '<rendered>Body text.</rendered>',
  );
});

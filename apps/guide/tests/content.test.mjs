import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkDocument, checkSidebarSlugs } from '../scripts/check-content.mjs';

const pages = [
  ['src/content/docs/index.mdx', /271|eligibility/i],
  ['src/content/docs/introduction/what-is-a-271.md', /271|response/i],
  ['src/content/docs/introduction/eligibility-workflow.md', /workflow|request|response/i],
  ['src/content/docs/introduction/how-to-use-this-guide.md', /guide|reading|evidence/i],
  ['src/content/docs/structure/x12-syntax.md', /segment|element|syntax/i],
  ['src/content/docs/structure/envelopes.md', /envelope|interchange|group/i],
  ['src/content/docs/structure/transaction-context.md', /transaction|context|BHT/i],
  ['src/content/docs/structure/party-hierarchy.md', /hierarchy|party|HL/i],
  ['src/content/docs/structure/eligibility-benefits.md', /benefit|EB|eligibility/i],
];

const profilePages = [
  {
    path: 'src/content/docs/standards/public-x12-sources.md',
    scope: /licensed\s+005010X279A1\s+implementation guide contains the complete grammar/i,
    links: /https:\/\/x12\.org\/examples\/005010x279[\s\S]*https:\/\/x12\.org\/resources\/requests-for-interpretation\//i,
  },
  {
    path: 'src/content/docs/standards/stedi.md',
    scope: /behavior describes Stedi's service/i,
    links: /https:\/\/www\.stedi\.com\/docs\/healthcare\/[\s\S]*https:\/\/www\.stedi\.com\/edi\/x12-005010\//i,
  },
  {
    path: 'src/content/docs/standards/unitedhealthcare.md',
    scope: /products\s+and routes named in that document/i,
    links: /https:\/\/www\.uhcprovider\.com\/[\s\S]*https:\/\/www\.uhcprovider\.com\/en\/resource-library\/edi\/edi-transactions/i,
  },
];

const examplePages = [
  ['src/content/docs/examples/single-eb.mdx', 'single-eb.edi'],
  ['src/content/docs/examples/medicare-secondary-payer.mdx', 'medicare-secondary-payer.edi'],
  ['src/content/docs/examples/medicare-primary-commercial-secondary.mdx', 'medicare-primary-commercial-secondary.edi'],
  ['src/content/docs/examples/medicare-advantage.mdx', 'medicare-advantage.edi'],
  ['src/content/docs/examples/multiple-interchanges.mdx', 'multiple-interchanges.edi'],
];

const bannedPhrase = /\b(?:simply|obviously|please note|let's|click here|easy)\b/i;

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
  return [...body.matchAll(/^(#{1,6})\s+\S/mg)].map(([heading]) => heading.match(/^#+/)[0].length);
}

for (const [relativePath, firstParagraphPattern] of pages) {
  test(`${relativePath} has explainable structure`, () => {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
    const { title, body, firstParagraph } = pageParts(source);

    assert.ok(title, 'frontmatter title must be nonempty');
    assert.doesNotMatch(body, /^#\s+/m, 'Starlight supplies the page H1');
    assert.ok(firstParagraph, 'page must begin with a nonempty paragraph');
    assert.match(firstParagraph, firstParagraphPattern, 'first paragraph must define the page topic or outcome');
    assert.doesNotMatch(withoutCodeAndUrls(source), bannedPhrase, 'page contains a banned phrase');

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
    assert.match(source, links, 'profile must link at least two sources from its family');
  });
}

async function loadExamplesModule() {
  return import('../src/lib/examples.mjs');
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

    assert.match(source, /import\s+X12Example\s+from\s+['"][^'"]*X12Example\.astro['"]/);
    assert.match(source, new RegExp(`file=["']${filename.replace('.', '\\.')}`));
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
  const index = readFileSync(new URL('../src/content/docs/reference/examples.md', import.meta.url), 'utf8');
  assert.match(index, /written for this guide/i);
  for (const [relativePath] of examplePages) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /This is a synthetic example/i);
    assert.doesNotMatch(source, /production capture/i);
  }
});

test('reader pages avoid repeated editorial jargon', () => {
  const docsRoot = new URL('../src/content/docs/', import.meta.url);
  const pending = [docsRoot];
  const sources = [];

  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const url = new URL(entry.name, directory);
      if (entry.isDirectory()) {
        pending.push(new URL(`${entry.name}/`, directory));
      } else if (/\.mdx?$/.test(entry.name)) {
        sources.push(withoutCodeAndUrls(readFileSync(url, 'utf8')));
      }
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
    'src/content/docs/examples/medicare-secondary-payer.mdx',
    'src/content/docs/examples/medicare-primary-commercial-secondary.mdx',
  ]) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

    assert.doesNotMatch(source, /\bSBR\b/, relativePath);
  }
});

test('coordination example pages disclose that labels do not establish payer order', () => {
  for (const relativePath of [
    'src/content/docs/examples/medicare-secondary-payer.mdx',
    'src/content/docs/examples/medicare-primary-commercial-secondary.mdx',
  ]) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

    assert.match(source, /scenario labels do not establish payer order/i);
    assert.match(source, /actual response, payer or\s+plan records, and applicable route rules/i);
  }
});

test('walkthrough tables have accessible captions and column scopes', () => {
  const component = readFileSync(new URL('../src/components/X12Example.astro', import.meta.url), 'utf8');

  assert.doesNotMatch(component, /<h5>\{segment\.ordinal\}\./);
  assert.match(component, /<h5 id=\{`segment-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`\}>\{segment\.name\}<\/h5>/);
  assert.match(component, /<table class="x12-field-table" aria-labelledby=\{`segment-table-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`\}>/);
  assert.match(component, /<caption id=\{`segment-table-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`\}>/);
  assert.equal((component.match(/<th scope="col">/g) ?? []).length, 4);
  assert.match(component, /<strong>Raw segment:<\/strong>\s*\{\x27 \x27\}\s*<code>/);
});

test('walkthrough field tables reserve readable widths for each column', () => {
  const component = readFileSync(new URL('../src/components/X12Example.astro', import.meta.url), 'utf8');
  const stylesheet = readFileSync(new URL('../src/styles/custom.css', import.meta.url), 'utf8');

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
  const component = readFileSync(new URL('../src/components/X12Example.astro', import.meta.url), 'utf8');

  assert.match(component, /<nav aria-label=\{`Interchange \$\{interchange\.ordinal\} segment navigation`\}>/);
  assert.match(component, /href=\{`#segment-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`\}/);
  assert.match(component, /\{segment\.ordinal\}\. \{segment\.name\}/);
  assert.match(component, /<h5 id=\{`segment-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`\}>\{segment\.name\}<\/h5>/);
});

test('loadExample returns exact bytes for every allowlisted file', async () => {
  const { EXAMPLE_FILENAMES, loadExample } = await loadExamplesModule();

  for (const filename of EXAMPLE_FILENAMES) {
    const expected = readFileSync(new URL(`../public/examples/${filename}`, import.meta.url), 'utf8');

    assert.equal(await loadExample(filename), expected, filename);
  }
});

test('loadExample rejects a filename outside the closed allowlist at runtime', async () => {
  const { loadExample } = await loadExamplesModule();

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
  const source = readFileSync(new URL('../src/content/docs/examples/medicare-secondary-payer.mdx', import.meta.url), 'utf8');

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
const validPublicFiles = [];

test('content validator accepts a valid document and resolved sidebar', () => {
  assert.deepEqual(checkDocument(validDocument, 'src/content/docs/valid.md', validRoutes, validPublicFiles), []);
  assert.deepEqual(checkSidebarSlugs(['', 'reference/segments'], validRoutes), []);
});

test('content validator reports a broken local link', () => {
  const findings = checkDocument(
    validDocument.replace('/reference/segments', '/missing'),
    'src/content/docs/valid.md',
    validRoutes,
    validPublicFiles,
  );

  assert.deepEqual(findings.map(({ code }) => code), ['broken-link']);
});

test('content validator resolves links from a nested index source directory', () => {
  const source = validDocument.replace('/reference/segments', './details');

  assert.deepEqual(
    checkDocument(source, 'src/content/docs/guides/index.md', ['guides', 'guides/details'], validPublicFiles),
    [],
  );
});

test('content validator reports a missing frontmatter title', () => {
  const findings = checkDocument(
    validDocument.replace('title: Valid page', 'description: Missing title'),
    'src/content/docs/valid.md',
    validRoutes,
    validPublicFiles,
  );

  assert.deepEqual(findings.map(({ code }) => code), ['missing-title']);
});

test('content validator reports an explicit duplicate H1', () => {
  const findings = checkDocument(
    validDocument.replace('Introductory paragraph.', '# Duplicate title\n\nIntroductory paragraph.'),
    'src/content/docs/valid.md',
    validRoutes,
    validPublicFiles,
  );

  assert.deepEqual(findings.map(({ code }) => code), ['duplicate-h1']);
});

test('content validator reports skipped heading levels', () => {
  const findings = checkDocument(
    validDocument.replace('## Section', '#### Skipped section'),
    'src/content/docs/valid.md',
    validRoutes,
    validPublicFiles,
  );

  assert.deepEqual(findings.map(({ code }) => code), ['skipped-heading']);
});

test('content validator ignores banned phrases inside fenced code', () => {
  const source = `${validDocument}\n\`\`\`text\nPlease note: this is fixture text.\n\`\`\`\n`;

  assert.deepEqual(checkDocument(source, 'src/content/docs/valid.md', validRoutes, validPublicFiles), []);
});

test('content validator reports banned phrases outside fenced code', () => {
  const findings = checkDocument(
    validDocument.replace('Introductory paragraph.', 'Please note this prose.'),
    'src/content/docs/valid.md',
    validRoutes,
    validPublicFiles,
  );

  assert.deepEqual(findings.map(({ code }) => code), ['banned-phrase']);
});

test('content validator reports easy as a banned phrase', () => {
  const findings = checkDocument(
    validDocument.replace('Introductory paragraph.', 'This is easy prose.'),
    'src/content/docs/valid.md', validRoutes, validPublicFiles,
  );

  assert.deepEqual(findings.map(({ code }) => code), ['banned-phrase']);
});

test('content validator reports a missing sidebar target', () => {
  const findings = checkSidebarSlugs(['reference/missing'], validRoutes);

  assert.deepEqual(findings.map(({ code }) => code), ['missing-sidebar-target']);
});

test('terminology defines every cross-page domain and X12 term', () => {
  const source = readFileSync(new URL('../src/content/docs/reference/terminology.md', import.meta.url), 'utf8');
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
    'SOAP',
    'RFI',
  ];
  const missingTerms = requiredTerms.filter((term) => !new RegExp('\\|\\s*`?' + term + '`?\\s*\\|').test(source));

  assert.deepEqual(missingTerms, []);
});

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import examplesData from '../.vitepress/theme/examples.data.ts';
import { renderForSearch } from '../.vitepress/search-render.mjs';
import { BANNED_PHRASES, checkDocument, checkDownloadLinks, checkSidebarSlugs } from '../scripts/check-content.mjs';
import { EXAMPLE_FILENAMES, loadExample } from '../src/lib/examples.mjs';
import { buildWalkthrough } from '../src/lib/walkthrough.mjs';

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const TITLE_LINE = /^title:\s*(.+)$/m;
const PARAGRAPH_BREAK = /\n\s*\n/;
const LIST_MARKER = /^\s*[-*+]\s+/gm;
const HEADING = /^(#{1,6})\s+\S/mg;
const CODE_BLOCK = /```[\s\S]*?```/g;
const WEB_ADDRESS = /https?:\/\/\S+/g;
const MARKDOWN_FILE = /\.mdx?$/;

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

const examplePages = [
  ['guide/examples/single-eb.md', 'single-eb.edi'],
  ['guide/examples/medicare-secondary-payer.md', 'medicare-secondary-payer.edi'],
  ['guide/examples/medicare-primary-commercial-secondary.md', 'medicare-primary-commercial-secondary.edi'],
  ['guide/examples/medicare-advantage.md', 'medicare-advantage.edi'],
  ['guide/examples/multiple-interchanges.md', 'multiple-interchanges.edi'],
];

const coordinationPages = [
  'guide/examples/medicare-secondary-payer.md',
  'guide/examples/medicare-primary-commercial-secondary.md',
];

const validDocument = `---
title: Valid page
---

Introductory paragraph.

## Section

Content with a [local page](/reference/segments).
`;
const validRoutes = ['', 'reference/segments'];

function readGuideFile(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function withoutCodeAndUrls(source) {
  return source
    .replace(CODE_BLOCK, '')
    .replace(WEB_ADDRESS, '');
}

// Splits a page into its frontmatter title, its body, and the first paragraph of the body.
function pageParts(source) {
  const frontmatter = source.match(FRONTMATTER);

  if (!frontmatter) {
    throw new Error('The page has no YAML frontmatter');
  }

  const body = source.slice(frontmatter[0].length);
  const firstParagraph = body
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.replace(LIST_MARKER, '').trim())
    .find((paragraph) => paragraph && !paragraph.startsWith('<!--'));

  return {
    title: frontmatter[1].match(TITLE_LINE)?.[1].trim(),
    body,
    firstParagraph,
  };
}

describe('guide pages', () => {
  it.each(pages)('should give %s a frontmatter title and no Markdown H1', (relativePath) => {
    const parts = pageParts(readGuideFile(relativePath));

    expect(parts.title).toBeTruthy();
    expect(parts.body).not.toMatch(/^#\s+/m);
  });

  it.each(pages)('should open %s with a paragraph that matches %s', (relativePath, topic) => {
    const parts = pageParts(readGuideFile(relativePath));

    expect(parts.firstParagraph).toMatch(topic);
  });

  it.each(pages)('should keep %s free of banned phrases', (relativePath) => {
    const prose = withoutCodeAndUrls(readGuideFile(relativePath));

    expect(prose).not.toMatch(BANNED_PHRASES);
  });

  it.each(pages)('should not skip heading levels in %s', (relativePath) => {
    const parts = pageParts(readGuideFile(relativePath));
    const levels = [...parts.body.matchAll(HEADING)].map((match) => match[1].length);
    const skippedLevels = levels.filter((level, index) => index > 0 && level > levels[index - 1] + 1);

    expect(skippedLevels).toEqual([]);
  });

  it('should state the source scope and link the primary sources in public-x12-sources.md', () => {
    const source = readGuideFile('guide/standards/public-x12-sources.md');

    expect(source).toMatch(/licensed\s+005010X279A1\s+implementation guide contains the complete grammar/i);
    expect(source).toMatch(/https:\/\/x12\.org\/examples\/005010x279[\s\S]*https:\/\/x12\.org\/resources\/requests-for-interpretation\//i);
  });

  it('should avoid editorial jargon and repeated terms across reader pages', () => {
    const docsRoot = new URL('../guide/', import.meta.url);
    const sources = readdirSync(docsRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => !entry.isDirectory() && MARKDOWN_FILE.test(entry.name))
      .map((entry) => withoutCodeAndUrls(readFileSync(`${entry.parentPath}/${entry.name}`, 'utf8')));
    const prose = sources.join('\n');
    const syntheticCount = (prose.match(/\bsynthetic\b/gi) ?? []).length;
    const envelopeCount = (prose.match(/\benvelopes?\b/gi) ?? []).length;

    expect(prose).not.toMatch(/\b(?:canonical|artifact|lexical|corpus|boundaries?)\b|production capture|\b[\w-]+-bearing\b/i);
    expect(syntheticCount).toBeLessThanOrEqual(1);
    expect(envelopeCount).toBeLessThanOrEqual(3);
  });

  it('should use the official capitalization of Medicare Secondary Payer', () => {
    const source = readGuideFile('guide/examples/medicare-secondary-payer.md');

    expect(source).not.toMatch(/Medicare secondary(?:-| )payer/);
  });

  it('should define every cross-page domain and X12 term in the terminology table', () => {
    const source = readGuideFile('guide/reference/terminology.md');
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

    expect(missingTerms).toEqual([]);
  });
});

describe('example pages', () => {
  it.each(examplePages)('should render %s with X12Example for %s and no imports', (relativePath, filename) => {
    const source = readGuideFile(relativePath);

    expect(source).not.toMatch(/^import /m);
    expect(source).toContain(`<X12Example file="${filename}" />`);
  });

  it.each(examplePages)('should give %s the Scenario, Complete response, and Sources sections in order', (relativePath) => {
    const source = readGuideFile(relativePath);
    const sectionPositions = ['Scenario', 'Complete response', 'Sources'].map((section) => source.indexOf(`## ${section}`));
    const sortedPositions = sectionPositions.toSorted((left, right) => left - right);

    expect(sectionPositions.every((position) => position >= 0)).toBe(true);
    expect(sectionPositions).toEqual(sortedPositions);
  });

  it.each(examplePages)('should not keep removed sections in %s', (relativePath) => {
    const source = readGuideFile(relativePath);
    const removedSections = [
      'Interchange and controls',
      'Transaction walkthrough',
      'Benefit interpretation',
      'Segment and field notes',
      'Source notes',
    ];
    const keptSections = removedSections.filter((section) => source.includes(`## ${section}`));

    expect(keptSections).toEqual([]);
  });

  it('should state the example scope in the example index', () => {
    const index = readGuideFile('guide/reference/examples.md');

    expect(index).toMatch(/written for this guide/i);
  });

  it.each(examplePages)('should not repeat the example scope disclosure in %s', (relativePath) => {
    const source = readGuideFile(relativePath);

    expect(source).not.toMatch(/This is a synthetic example/i);
    expect(source).not.toMatch(/production capture/i);
  });

  it.each(coordinationPages)('should not document unsupported SBR segments in %s', (relativePath) => {
    const source = readGuideFile(relativePath);

    expect(source).not.toMatch(/\bSBR\b/);
  });

  it.each(coordinationPages)('should say that scenario labels do not establish payer order in %s', (relativePath) => {
    const source = readGuideFile(relativePath);

    expect(source).toMatch(/scenario labels do not establish payer order/i);
    expect(source).toMatch(/actual response, payer or\s+plan records, and applicable route rules/i);
  });
});

describe('X12Example component', () => {
  const component = readGuideFile('.vitepress/theme/X12Example.vue');

  it('should give each field table a caption and column scopes', () => {
    const columnHeaderCount = (component.match(/<th scope="col">/g) ?? []).length;

    expect(component).not.toMatch(/<h5>\{\{ segment\.ordinal \}\}\./);
    expect(component).toMatch(/<table class="x12-field-table" :aria-labelledby="`segment-table-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`">/);
    expect(component).toMatch(/<caption :id="`segment-table-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`">/);
    expect(component).toMatch(/<strong>Raw segment:<\/strong> <code>/);
    expect(columnHeaderCount).toBe(4);
  });

  it('should reserve readable widths for each field table column', () => {
    const stylesheet = readGuideFile('.vitepress/theme/custom.css');

    expect(component).toMatch(/<div class="x12-field-table-wrap">/);
    expect(component).toMatch(/<table class="x12-field-table"/);
    expect(component).toMatch(/<col class="x12-position-column" \/>/);
    expect(component).toMatch(/<col class="x12-value-column" \/>/);
    expect(component).toMatch(/<col class="x12-name-column" \/>/);
    expect(stylesheet).toMatch(/\.x12-field-table-wrap\s*\{[^}]*overflow-x:\s*auto/s);
    expect(stylesheet).toMatch(/\.x12-field-table\s*\{[^}]*min-inline-size:\s*48rem[^}]*table-layout:\s*fixed/s);
    expect(stylesheet).toMatch(/\.x12-position-column\s*\{[^}]*inline-size:\s*7rem/s);
    expect(stylesheet).toMatch(/\.x12-value-column\s*\{[^}]*inline-size:\s*10rem/s);
    expect(stylesheet).toMatch(/\.x12-name-column\s*\{[^}]*inline-size:\s*15rem/s);
  });

  it('should give each segment a unique heading and per-interchange navigation', () => {
    expect(component).toMatch(/<nav :aria-label="`Interchange \$\{interchange\.ordinal\} segment navigation`">/);
    expect(component).toMatch(/:href="`#segment-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`"/);
    expect(component).toMatch(/\{\{ segment\.ordinal \}\}\. \{\{ segment\.name \}\}/);
    expect(component).toMatch(/<h5 :id="`segment-\$\{file\}-\$\{interchange\.ordinal\}-\$\{segment\.ordinal\}`">\{\{ segment\.name \}\}<\/h5>/);
  });
});

describe('theme', () => {
  it('should import the Catppuccin palette after the default theme so its colors apply', () => {
    const theme = readGuideFile('.vitepress/theme/index.ts');
    const defaultThemePosition = theme.indexOf("from 'vitepress/theme'");
    const palettePosition = theme.indexOf("'@catppuccin/vitepress/theme/mocha/mauve.css'");

    expect(defaultThemePosition).toBeGreaterThanOrEqual(0);
    expect(palettePosition).toBeGreaterThan(defaultThemePosition);
  });
});

describe('loadExample', () => {
  it.each(EXAMPLE_FILENAMES)('should return the exact bytes of %s', async (filename) => {
    const source = await loadExample(filename);
    const expected = readGuideFile(`public/examples/${filename}`);

    expect(source).toBe(expected);
  });

  it('should resolve files independently of the working directory', () => {
    const moduleUrl = new URL('../src/lib/examples.mjs', import.meta.url).href;
    const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
    const expected = readGuideFile('public/examples/single-eb.edi');
    const script = `import { loadExample } from ${JSON.stringify(moduleUrl)}; process.stdout.write(await loadExample('single-eb.edi'));`;
    const source = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    });

    expect(source).toBe(expected);
  });
});

describe('examples data loader', () => {
  it('should return the walkthrough for every example file', async () => {
    const data = await examplesData.load();
    const expected = {};

    for (const filename of EXAMPLE_FILENAMES) {
      const source = await loadExample(filename);

      expected[filename] = buildWalkthrough(source);
    }

    expect(Object.keys(data)).toEqual([...EXAMPLE_FILENAMES]);
    expect(data).toEqual(expected);
  });
});

describe('checkDocument', () => {
  it('should accept a valid document', () => {
    const findings = checkDocument(validDocument, 'guide/valid.md');

    expect(findings).toEqual([]);
  });

  it('should report a missing frontmatter title', () => {
    const source = validDocument.replace('title: Valid page', 'description: Missing title');
    const findings = checkDocument(source, 'guide/valid.md');

    expect(findings).toMatchObject([{ code: 'missing-title' }]);
  });

  it('should report a Markdown H1', () => {
    const source = validDocument.replace('Introductory paragraph.', '# Duplicate title\n\nIntroductory paragraph.');
    const findings = checkDocument(source, 'guide/valid.md');

    expect(findings).toMatchObject([{ code: 'duplicate-h1' }]);
  });

  it('should report skipped heading levels', () => {
    const source = validDocument.replace('## Section', '#### Skipped section');
    const findings = checkDocument(source, 'guide/valid.md');

    expect(findings).toMatchObject([{ code: 'skipped-heading' }]);
  });

  it('should ignore banned phrases inside fenced code', () => {
    const source = `${validDocument}\n\`\`\`text\nPlease note: this is fixture text.\n\`\`\`\n`;
    const findings = checkDocument(source, 'guide/valid.md');

    expect(findings).toEqual([]);
  });

  it.each([
    'Please note this prose.',
    'This is easy prose.',
  ])('should report the banned phrase in "%s"', (paragraph) => {
    const source = validDocument.replace('Introductory paragraph.', paragraph);
    const findings = checkDocument(source, 'guide/valid.md');

    expect(findings).toMatchObject([{ code: 'banned-phrase' }]);
  });
});

describe('checkSidebarSlugs', () => {
  it('should accept slugs that match content routes', () => {
    const findings = checkSidebarSlugs(['', 'reference/segments'], validRoutes);

    expect(findings).toEqual([]);
  });

  it('should report a slug with no content route', () => {
    const findings = checkSidebarSlugs(['reference/missing'], validRoutes);

    expect(findings).toMatchObject([{ code: 'missing-sidebar-target' }]);
  });
});

describe('checkDownloadLinks', () => {
  it('should report a download link to a file missing from public', () => {
    const source = 'Download [the example](/examples/single-eb.edi) or [another](/examples/missing.edi).\n';
    const findings = checkDownloadLinks(source, 'guide/valid.md', ['examples/single-eb.edi']);

    expect(findings).toMatchObject([{ code: 'missing-download', line: 1 }]);
  });
});

describe('renderForSearch', () => {
  const render = (src) => `<rendered>${src}</rendered>`;

  it('should add the frontmatter title as an H1 before the page body', () => {
    const md = {
      render(src, env) {
        if (env) {
          env.frontmatter = { title: 'Party hierarchy' };
        }

        return render(src);
      },
    };
    const html = renderForSearch('Body text.', {}, md);

    expect(html).toBe('<rendered># Party hierarchy</rendered><rendered>Body text.</rendered>');
  });

  it('should render only the body when the page has no title', () => {
    const html = renderForSearch('Body text.', {}, { render });

    expect(html).toBe('<rendered>Body text.</rendered>');
  });
});

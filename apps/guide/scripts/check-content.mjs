// @ts-check

import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import { guideSidebar } from '../.vitepress/sidebar-guide.mjs';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const CONTENT_ROOT = resolve(PROJECT_ROOT, 'guide');
const CONTENT_PREFIX = 'guide/';
const PARSER_ROOT = resolve(PROJECT_ROOT, 'parser');
const PUBLIC_ROOT = resolve(PROJECT_ROOT, 'public');
export const BANNED_PHRASES = /\b(?:simply|obviously|please note|let's|click here|easy)\b/i;
const MARKDOWN_EXTENSION = /\.mdx?$/;
const INDEX_PAGE = /(^|\/)index$/;
const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const TITLE_LINES = /^title:\s*(.*)$/gm;
const TITLE_KEY = /^title:\s*/;
const SURROUNDING_QUOTES = /^['"]|['"]$/g;
const CODE_FENCE = /^\s*```/;
const H1 = /^#\s+\S/;
const HEADING = /^(#{1,6})\s+\S/;
const EDI_DOWNLOAD_LINK = /\]\(\/([^)\s]+\.edi)\)/g;
const GUIDE_ROUTE_PREFIX = /^\/guide\//;
const TRAILING_SLASH = /\/$/;

/** @typedef {{ path: string, line: number, code: string, message: string }} Finding */

/** @param {string} source @param {string} relativePath @returns {Finding[]} */
export function checkDocument(source, relativePath) {
  /** @type {Finding[]} */
  const findings = [];
  const frontmatter = source.match(FRONTMATTER);
  const titleLines = frontmatter?.[1].match(TITLE_LINES) ?? [];
  const title = titleLines[0]?.replace(TITLE_KEY, '').trim().replace(SURROUNDING_QUOTES, '');

  if (titleLines.length !== 1 || !title) {
    findings.push({
      path: relativePath,
      line: 1,
      code: 'missing-title',
      message: 'Page must have one nonempty frontmatter title.',
    });
  }

  const lines = source.split('\n');
  let isInFence = false;
  let previousHeadingLevel = 1;

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    if (CODE_FENCE.test(line)) {
      isInFence = !isInFence;
      continue;
    }

    if (isInFence) {
      continue;
    }

    if (H1.test(line)) {
      findings.push({
        path: relativePath,
        line: lineNumber,
        code: 'duplicate-h1',
        message: 'Do not add a Markdown H1; the theme renders the page title.',
      });
    }

    const heading = line.match(HEADING);

    if (heading) {
      const level = heading[1].length;

      if (level > previousHeadingLevel + 1) {
        findings.push({
          path: relativePath,
          line: lineNumber,
          code: 'skipped-heading',
          message: `Heading level ${level} skips a level.`,
        });
      }

      previousHeadingLevel = level;
    }

    if (BANNED_PHRASES.test(line)) {
      findings.push({
        path: relativePath,
        line: lineNumber,
        code: 'banned-phrase',
        message: 'Editorial phrase is not allowed.',
      });
    }
  }

  return findings;
}

// VitePress treats .edi links as assets (VITE_EXTRA_EXTENSIONS in .vitepress/config.ts) and does not
// check that they exist, so this check does.
/** @param {string} source @param {string} relativePath @param {string[]} publicFiles @returns {Finding[]} */
export function checkDownloadLinks(source, relativePath, publicFiles) {
  /** @type {Finding[]} */
  const findings = [];

  for (const match of source.matchAll(EDI_DOWNLOAD_LINK)) {
    if (publicFiles.includes(match[1])) {
      continue;
    }

    const line = source.slice(0, match.index).split('\n').length;

    findings.push({
      path: relativePath,
      line,
      code: 'missing-download',
      message: `Download link target is not in public/: /${match[1]}`,
    });
  }

  return findings;
}

/** @param {string[]} slugs @param {string[]} contentRoutes @returns {Finding[]} */
export function checkSidebarSlugs(slugs, contentRoutes) {
  const knownRoutes = new Set(contentRoutes);
  /** @type {Finding[]} */
  const findings = [];

  for (const slug of slugs) {
    if (knownRoutes.has(slug)) {
      continue;
    }

    findings.push({
      path: '.vitepress/sidebar-guide.mjs',
      line: 1,
      code: 'missing-sidebar-target',
      message: `Sidebar target does not resolve: ${slug}`,
    });
  }

  return findings;
}

/** @returns {Finding[]} */
export function runContentChecks() {
  const contentPaths = [];

  for (const entry of readdirSync(CONTENT_ROOT, { recursive: true, withFileTypes: true })) {
    if (!entry.isDirectory() && ['.md', '.mdx'].includes(extname(entry.name))) {
      contentPaths.push(relative(PROJECT_ROOT, join(entry.parentPath, entry.name)));
    }
  }

  const contentRoutes = contentPaths.map((contentPath) => contentPath
    .slice(CONTENT_PREFIX.length)
    .replace(MARKDOWN_EXTENSION, '')
    .replace(INDEX_PAGE, ''));

  /** @type {Finding[]} */
  const findings = [];

  for (const contentPath of contentPaths) {
    const source = readFileSync(resolve(PROJECT_ROOT, contentPath), 'utf8');

    findings.push(...checkDocument(source, contentPath));
  }

  const publicFiles = readdirSync(PUBLIC_ROOT, { recursive: true, encoding: 'utf8' });
  const pagePaths = [...contentPaths];

  for (const entry of readdirSync(PARSER_ROOT, { recursive: true, withFileTypes: true })) {
    const path = relative(PROJECT_ROOT, join(entry.parentPath, entry.name));

    if (!entry.isDirectory() && extname(entry.name) === '.md' && !path.startsWith('parser/api/')) {
      pagePaths.push(path);
    }
  }

  for (const pagePath of pagePaths) {
    const source = readFileSync(resolve(PROJECT_ROOT, pagePath), 'utf8');

    findings.push(...checkDownloadLinks(source, pagePath, publicFiles));
  }

  const sidebarSlugs = [];

  for (const group of guideSidebar) {
    for (const item of group.items ?? []) {
      sidebarSlugs.push((item.link ?? '').replace(GUIDE_ROUTE_PREFIX, '').replace(TRAILING_SLASH, ''));
    }
  }

  findings.push(...checkSidebarSlugs(sidebarSlugs, contentRoutes));

  findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.code.localeCompare(right.code));

  for (const finding of findings) {
    console.error(`${finding.path}:${finding.line}: ${finding.code}: ${finding.message}`);
  }

  return findings;
}

if (import.meta.main) {
  process.exitCode = runContentChecks().length > 0 ? 1 : 0;
}

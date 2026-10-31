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

/** @typedef {{ path: string, line: number, code: string, message: string }} Finding */

/** @param {string} path @param {number} line @param {string} code @param {string} message @returns {Finding} */
function finding(path, line, code, message) {
  return { path, line, code, message };
}

/** @param {string} relativePath @returns {string} */
function routeForContentPath(relativePath) {
  return relativePath
    .slice(CONTENT_PREFIX.length)
    .replace(/\.mdx?$/, '')
    .replace(/(^|\/)index$/, '');
}

/** @param {string} source @param {string} relativePath @returns {Finding[]} */
export function checkDocument(source, relativePath) {
  /** @type {Finding[]} */
  const findings = [];
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const titleMatches = frontmatter?.[1].match(/^title:\s*(.*)$/gm) ?? [];
  const title = titleMatches[0]?.replace(/^title:\s*/, '').trim().replace(/^['"]|['"]$/g, '');
  if (titleMatches.length !== 1 || !title) {
    findings.push(finding(relativePath, 1, 'missing-title', 'Page must have one nonempty frontmatter title.'));
  }

  const lines = source.split('\n');
  let fenced = false;
  let previousHeadingLevel = 1;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const number = index + 1;
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) {
      continue;
    }

    if (/^#\s+\S/.test(line)) {
      findings.push(finding(relativePath, number, 'duplicate-h1', 'Do not add a Markdown H1; the theme renders the page title.'));
    }

    const heading = line.match(/^(#{1,6})\s+\S/);
    if (heading) {
      const level = heading[1].length;
      if (level > previousHeadingLevel + 1) {
        findings.push(finding(relativePath, number, 'skipped-heading', `Heading level ${level} skips a level.`));
      }
      previousHeadingLevel = level;
    }

    if (BANNED_PHRASES.test(line)) {
      findings.push(finding(relativePath, number, 'banned-phrase', 'Editorial phrase is not allowed.'));
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
  for (const match of source.matchAll(/\]\(\/([^)\s]+\.edi)\)/g)) {
    if (!publicFiles.includes(match[1])) {
      const line = source.slice(0, match.index).split('\n').length;
      findings.push(finding(relativePath, line, 'missing-download', `Download link target is not in public/: /${match[1]}`));
    }
  }
  return findings;
}

/** @param {string[]} slugs @param {string[]} contentRoutes @returns {Finding[]} */
export function checkSidebarSlugs(slugs, contentRoutes) {
  const knownRoutes = new Set(contentRoutes);
  /** @type {Finding[]} */
  const findings = [];
  for (const slug of slugs) {
    if (!knownRoutes.has(slug)) {
      findings.push(finding('.vitepress/sidebar-guide.mjs', 1, 'missing-sidebar-target', `Sidebar target does not resolve: ${slug}`));
    }
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
  const contentRoutes = contentPaths.map(routeForContentPath);

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
    findings.push(...checkDownloadLinks(readFileSync(resolve(PROJECT_ROOT, pagePath), 'utf8'), pagePath, publicFiles));
  }

  const sidebarSlugs = [];
  for (const group of guideSidebar) {
    for (const item of group.items ?? []) {
      sidebarSlugs.push((item.link ?? '').replace(/^\/guide\//, '').replace(/\/$/, ''));
    }
  }
  findings.push(...checkSidebarSlugs(sidebarSlugs, contentRoutes));

  findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.code.localeCompare(right.code));
  for (const { path, line, code, message } of findings) {
    console.error(`${path}:${line}: ${code}: ${message}`);
  }
  return findings;
}

if (import.meta.main) {
  process.exitCode = runContentChecks().length > 0 ? 1 : 0;
}

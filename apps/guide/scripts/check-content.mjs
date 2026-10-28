// @ts-check

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const CONTENT_ROOT = resolve(PROJECT_ROOT, 'src/content/docs');
const PUBLIC_ROOT = resolve(PROJECT_ROOT, 'public');
const CONTENT_PREFIX = 'src/content/docs/';
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

/** @param {string} relativePath @param {string} target @returns {string} */
function localTargetPath(relativePath, target) {
  if (target.startsWith('/')) {
    return target.slice(1).replace(/\/$/, '');
  }

  const sourceDirectory = dirname(relativePath.slice(CONTENT_PREFIX.length));
  return join(sourceDirectory, target).replace(/\\/g, '/').replace(/\/$/, '');
}

/** @param {string} source @param {string} relativePath @param {string[]} contentRoutes @param {string[]} publicFiles @returns {Finding[]} */
function localLinkFindings(source, relativePath, contentRoutes, publicFiles) {
  /** @type {Finding[]} */
  const findings = [];
  const knownRoutes = new Set(contentRoutes);
  const knownPublicFiles = new Set(publicFiles);
  const markdownLink = /\[[^\]]+\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;
  const htmlLink = /\b(?:href|src)=['"]([^'"]+)['"]/g;

  for (const match of [...source.matchAll(markdownLink), ...source.matchAll(htmlLink)]) {
    const target = match[1];
    const trimmed = target.trim().replace(/^<|>$/g, '');
    if (/^(?:https?:|mailto:|tel:|#)/i.test(trimmed)) {
      continue;
    }

    const line = source.slice(0, match.index).split('\n').length;
    let decodedTarget;
    try {
      decodedTarget = decodeURIComponent(trimmed.split(/[?#]/)[0]);
    } catch {
      findings.push(finding(relativePath, line, 'broken-link', `Invalid local link target: ${target}`));
      continue;
    }

    const targetPath = localTargetPath(relativePath, decodedTarget);
    if (!knownRoutes.has(targetPath) && !knownPublicFiles.has(targetPath)) {
      findings.push(finding(relativePath, line, 'broken-link', `Local link target does not exist: ${target}`));
    }
  }

  return findings;
}

/** @param {string} source @param {string} relativePath @param {string[]} contentRoutes @param {string[]} publicFiles @returns {Finding[]} */
export function checkDocument(source, relativePath, contentRoutes, publicFiles) {
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
      findings.push(finding(relativePath, number, 'duplicate-h1', 'Do not add a Markdown H1; Starlight renders the page title.'));
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

  findings.push(...localLinkFindings(source, relativePath, contentRoutes, publicFiles));
  return findings;
}

/** @param {string[]} slugs @param {string[]} contentRoutes @returns {Finding[]} */
export function checkSidebarSlugs(slugs, contentRoutes) {
  const knownRoutes = new Set(contentRoutes);
  /** @type {Finding[]} */
  const findings = [];
  for (const slug of slugs) {
    if (!knownRoutes.has(slug)) {
      findings.push(finding('astro.config.mjs', 1, 'missing-sidebar-target', `Sidebar target does not resolve: ${slug}`));
    }
  }
  return findings;
}

/** @param {string} source @returns {string[]} */
function sidebarSlugs(source) {
  const slugs = [];
  const itemsPattern = /items:\s*\[([\s\S]*?)\]/g;
  for (const match of source.matchAll(itemsPattern)) {
    for (const slug of match[1].matchAll(/['"]([^'"]*)['"]/g)) {
      slugs.push(slug[1]);
    }
  }
  return slugs;
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

  const publicFiles = [];
  for (const path of readdirSync(PUBLIC_ROOT, { recursive: true, encoding: 'utf8' })) {
    if (statSync(join(PUBLIC_ROOT, path)).isFile()) {
      publicFiles.push(path);
    }
  }

  /** @type {Finding[]} */
  const findings = [];
  for (const contentPath of contentPaths) {
    const source = readFileSync(resolve(PROJECT_ROOT, contentPath), 'utf8');
    findings.push(...checkDocument(source, contentPath, contentRoutes, publicFiles));
  }

  const sidebarSource = readFileSync(resolve(PROJECT_ROOT, 'astro.config.mjs'), 'utf8');
  findings.push(...checkSidebarSlugs(sidebarSlugs(sidebarSource), contentRoutes));

  findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.code.localeCompare(right.code));
  for (const { path, line, code, message } of findings) {
    console.error(`${path}:${line}: ${code}: ${message}`);
  }
  return findings;
}

const invokedScript = process.argv[1] && resolve(process.argv[1]);
if (invokedScript === fileURLToPath(import.meta.url)) {
  process.exitCode = runContentChecks().length > 0 ? 1 : 0;
}

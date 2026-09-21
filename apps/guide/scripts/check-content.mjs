import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const CONTENT_ROOT = resolve(PROJECT_ROOT, 'src/content/docs');
const PUBLIC_ROOT = resolve(PROJECT_ROOT, 'public');
const CONTENT_PREFIX = 'src/content/docs/';
const BANNED_PHRASES = /\b(?:simply|obviously|please note|let's|click here|easy)\b/i;

function finding(path, line, code, message) {
  return { path, line, code, message };
}

function posixPath(path) {
  return path.split('/').join('/');
}

function collectFiles(directory, predicate) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath, predicate));
    } else if (predicate(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function routeForContentPath(relativePath) {
  let route = posixPath(relativePath).slice(CONTENT_PREFIX.length);
  route = route.slice(0, -extname(route).length);
  if (route === 'index') {
    return '';
  }
  if (route.endsWith('/index')) {
    return route.slice(0, -'/index'.length);
  }
  return route;
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function decodeLocalTarget(target) {
  const trimmed = target.trim().replace(/^<|>$/g, '');
  if (/^(?:https?:|mailto:|tel:)/i.test(trimmed) || trimmed.startsWith('#')) {
    return null;
  }

  const hashIndex = trimmed.search(/[?#]/);
  const path = hashIndex < 0 ? trimmed : trimmed.slice(0, hashIndex);
  try {
    return decodeURIComponent(path);
  } catch {
    return { invalid: true };
  }
}

function localTargetPath(relativePath, target) {
  if (target.startsWith('/')) {
    return posixPath(target.slice(1).replace(/\/$/, ''));
  }

  const sourcePath = posixPath(relativePath).slice(CONTENT_PREFIX.length);
  const sourceDirectory = dirname(sourcePath) === '.' ? '' : dirname(sourcePath);
  return posixPath(join(sourceDirectory, target).replace(/\\/g, '/').replace(/\/$/, ''));
}

function localLinkFindings(source, relativePath, contentRoutes, publicFiles) {
  const findings = [];
  const knownRoutes = new Set(contentRoutes);
  const knownPublicFiles = new Set(publicFiles);
  const links = [];
  const markdownLink = /\[[^\]]+\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;
  const htmlLink = /\b(?:href|src)=['"]([^'"]+)['"]/g;

  for (const match of source.matchAll(markdownLink)) {
    links.push({ target: match[1], offset: match.index });
  }
  for (const match of source.matchAll(htmlLink)) {
    links.push({ target: match[1], offset: match.index });
  }

  for (const { target, offset } of links) {
    const decodedTarget = decodeLocalTarget(target);
    if (decodedTarget === null) {
      continue;
    }
    const line = lineNumber(source, offset);
    if (decodedTarget.invalid) {
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

function editorialLines(source) {
  const lines = source.split('\n');
  const result = [];
  let fenced = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) {
      result.push({ line, number: index + 1 });
    }
  }

  return result;
}

export function checkDocument(source, relativePath, contentRoutes, publicFiles) {
  const findings = [];
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const titleMatches = frontmatter?.[1].match(/^title:\s*(.*)$/gm) ?? [];
  const title = titleMatches[0]?.replace(/^title:\s*/, '').trim().replace(/^['"]|['"]$/g, '');
  if (titleMatches.length !== 1 || !title) {
    findings.push(finding(relativePath, 1, 'missing-title', 'Page must have one nonempty frontmatter title.'));
  }

  let previousHeadingLevel = 1;
  for (const { line, number } of editorialLines(source)) {
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

export function checkSidebarSlugs(slugs, contentRoutes) {
  const knownRoutes = new Set(contentRoutes);
  return slugs
    .filter((slug) => !knownRoutes.has(slug))
    .map((slug) => finding('astro.config.mjs', 1, 'missing-sidebar-target', `Sidebar target does not resolve: ${slug}`));
}

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

function relativeProjectPath(path) {
  return posixPath(relative(PROJECT_ROOT, path));
}

export function runContentChecks() {
  const contentFiles = collectFiles(CONTENT_ROOT, (path) => ['.md', '.mdx'].includes(extname(path)));
  const contentPaths = contentFiles.map(relativeProjectPath);
  const contentRoutes = contentPaths.map(routeForContentPath);
  const publicFiles = collectFiles(PUBLIC_ROOT, (path) => statSync(path).isFile())
    .map(relativeProjectPath)
    .map((path) => path.slice('public/'.length));
  const findings = [];

  for (const contentFile of contentFiles) {
    const relativePath = relativeProjectPath(contentFile);
    findings.push(...checkDocument(readFileSync(contentFile, 'utf8'), relativePath, contentRoutes, publicFiles));
  }

  const sidebarSource = readFileSync(resolve(PROJECT_ROOT, 'astro.config.mjs'), 'utf8');
  findings.push(...checkSidebarSlugs(sidebarSlugs(sidebarSource), contentRoutes));

  findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.code.localeCompare(right.code));
  for (const result of findings) {
    console.error(`${result.path}:${result.line}: ${result.code}: ${result.message}`);
  }
  return findings;
}

const invokedScript = process.argv[1] && resolve(process.argv[1]);
if (invokedScript === fileURLToPath(import.meta.url)) {
  process.exitCode = runContentChecks().length > 0 ? 1 : 0;
}

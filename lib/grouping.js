import { readdir, readFile } from 'node:fs/promises';
import { baseName, isWithin, joinPath, normalizePath } from './paths.js';

/** Files that make an immediate child directory look like a project root. */
export const PROJECT_MARKERS = new Set([
  '.git',
  'package.json',
  'pnpm-workspace.yaml',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Makefile',
  'CMakeLists.txt',
]);

/** Directories that are never projects themselves. */
export const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'target',
  'coverage',
  'vendor',
  '.git',
  '.idea',
  '.vscode',
  '__pycache__',
  '.venv',
  'venv',
]);

const GENERIC_NAMES = new Set(['app', 'src', 'web', 'docs', 'test', 'tests', 'lib', 'packages']);

function unique(values) {
  return [...new Set(values.filter(value => typeof value === 'string' && value.trim() !== ''))];
}

async function readPackageName(directory) {
  try {
    const text = await readFile(joinPath(directory, 'package.json'), 'utf8');
    const value = JSON.parse(text);
    return typeof value?.name === 'string' ? value.name.trim() : '';
  } catch {
    return '';
  }
}

function projectAliases(packageName, directoryName) {
  const aliases = [];
  if (packageName) {
    aliases.push(packageName);
    const slash = packageName.lastIndexOf('/');
    if (slash !== -1) aliases.push(packageName.slice(slash + 1));
  }
  aliases.push(directoryName);
  return unique(aliases);
}

/**
 * Scan configured roots for immediate child projects.
 * The root itself is included when it carries a project marker.
 */
export async function scanProjectRoots(roots, io = { readdir, readFile }) {
  const projects = new Map();
  const seen = new Set();

  async function add(directory, root, marker) {
    const normalized = normalizePath(directory);
    if (!normalized || seen.has(normalized.toLowerCase())) return;
    seen.add(normalized.toLowerCase());
    const packageName = await readPackageName(normalized);
    const directoryName = baseName(normalized);
    projects.set(normalized, {
      id: normalized,
      name: packageName && !packageName.startsWith('@') ? packageName : directoryName,
      path: normalized,
      root: normalizePath(root),
      marker: marker ?? null,
      aliases: projectAliases(packageName, directoryName),
    });
  }

  for (const root of roots) {
    const normalizedRoot = normalizePath(root);
    if (!normalizedRoot) continue;
    let entries;
    try {
      entries = await io.readdir(normalizedRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    const rootNames = entries.map(entry => entry.name);
    const rootMarker = rootNames.find(name => PROJECT_MARKERS.has(name));
    if (rootMarker !== undefined) await add(normalizedRoot, normalizedRoot, rootMarker);

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || IGNORED_DIRECTORIES.has(entry.name)) continue;
      const directory = joinPath(normalizedRoot, entry.name);
      let childNames = [];
      try {
        childNames = await io.readdir(directory);
      } catch {
        // An unreadable child is still listed by name only when the root scan succeeded.
      }
      const marker = childNames.find(name => PROJECT_MARKERS.has(name)) ?? null;
      await add(directory, normalizedRoot, marker);
    }
  }

  return [...projects.values()].sort((left, right) => left.path.localeCompare(right.path));
}

/** Match one project by cwd, then by title and first user message; return null when ambiguous. */
export function matchProjectForSession(session, projects, assignments = {}) {
  const sessionId = String(session?.id ?? '');
  if (Object.hasOwn(assignments, sessionId)) {
    const assigned = assignments[sessionId];
    if (assigned === null) return null;
    const manual = projects.find(project => project.id === assigned);
    if (manual !== undefined) return manual;
  }

  const cwd = typeof session?.cwd === 'string' ? session.cwd : '';
  if (cwd) {
    const byCwd = projects
      .filter(project => isWithin(cwd, project.path))
      .sort((left, right) => right.path.length - left.path.length);
    if (byCwd.length > 0) return byCwd[0];
  }

  const title = String(session?.title ?? '');
  const firstMessage = String(session?.firstMessage ?? '');
  if (!title && !firstMessage) return null;

  const scored = projects.map(project => ({
    project,
    score: scoreProject(project, { title, firstMessage, cwd }),
  })).filter(entry => entry.score > 0);
  if (scored.length === 0) return null;
  scored.sort((left, right) => right.score - left.score);
  const best = scored[0];
  if (scored.length > 1 && scored[1].score === best.score) return null;
  return best.score >= 3 ? best.project : null;
}

function containsToken(text, token) {
  const needle = token.toLowerCase().trim();
  if (!needle) return false;
  const haystack = text.toLowerCase();
  if (/^[\x00-\x7F]+$/.test(needle)) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9_-])${escaped}([^a-z0-9_-]|$)`, 'i').test(haystack);
  }
  return haystack.includes(needle);
}

/** Score a project against a session; cwd is handled before this function runs. */
export function scoreProject(project, { title, firstMessage, cwd }) {
  let score = 0;
  const tokens = unique([project.name, baseName(project.path), ...(project.aliases ?? [])])
    .filter(token => token.length >= 2);
  for (const token of tokens) {
    if (containsToken(title, token)) score += GENERIC_NAMES.has(token.toLowerCase()) ? 1 : 3;
    if (containsToken(firstMessage, token)) score += GENERIC_NAMES.has(token.toLowerCase()) ? 1 : 3;
  }
  if (cwd && baseName(cwd).toLowerCase() === baseName(project.path).toLowerCase()) score += 1;
  return score;
}

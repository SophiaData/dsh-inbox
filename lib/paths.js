import path from 'node:path';
import os from 'node:os';

const WIN_ABS = /^[A-Za-z]:[\\/]/;
const UNC = /^\\\\[^\\]+\\[^\\]+/;

/** Convert every separator to `/` so stored paths compare the same everywhere. */
export function toPosix(value) {
  return String(value).replace(/\\/g, '/');
}

/** Expand `~`, resolve `..`, drop a trailing slash, and keep separators POSIX-shaped. */
export function normalizePath(value) {
  if (typeof value !== 'string' || value.trim() === '') return '';
  let text = value.trim();
  if (text === '~' || text.startsWith('~/') || text.startsWith('~\\')) {
    text = path.join(os.homedir(), text.slice(1));
  }
  if (WIN_ABS.test(text) || UNC.test(text)) {
    text = path.win32.resolve(text);
  } else {
    text = path.resolve(text);
  }
  text = toPosix(text);
  if (text.length > 1 && !/^[A-Za-z]:\/$/.test(text)) text = text.replace(/\/+$/, '');
  return text;
}

/** Comparison key: Windows paths are case-insensitive. */
export function pathKey(value) {
  const normalized = normalizePath(value);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

/** True when `child` is `parent` itself or lives under it. */
export function isWithin(child, parent) {
  const childKey = pathKey(child);
  const parentKey = pathKey(parent);
  if (!childKey || !parentKey) return false;
  return childKey === parentKey || childKey.startsWith(`${parentKey}/`);
}

/** Last path segment, without resolving the value against the current directory. */
export function baseName(value) {
  const text = toPosix(String(value ?? '')).replace(/\/+$/, '');
  const index = text.lastIndexOf('/');
  return index === -1 ? text : text.slice(index + 1);
}

/** Join and normalize a project path. */
export function joinPath(...parts) {
  return normalizePath(path.join(...parts));
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { baseName, isWithin, joinPath, normalizePath } from '../lib/paths.js';
import { matchProjectForSession, scanProjectRoots } from '../lib/grouping.js';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-inbox-group-'));
  await mkdir(join(root, 'alpha', '.git'), { recursive: true });
  await mkdir(join(root, 'beta'), { recursive: true });
  await writeFile(join(root, 'beta', 'package.json'), JSON.stringify({ name: '@acme/beta' }));
  await mkdir(join(root, 'gamma'), { recursive: true });
  await mkdir(join(root, '.hidden'), { recursive: true });
  await mkdir(join(root, 'node_modules'), { recursive: true });
  return root;
}

test('path helpers compare Windows-style paths without a host drive', () => {
  assert.equal(normalizePath('E:\\dev\\day\\a'), 'E:/dev/day/a');
  assert.equal(baseName('E:\\dev\\day\\a'), 'a');
  assert.equal(isWithin('E:/dev/day/a/src', 'E:/dev/day/a'), true);
  assert.equal(isWithin('E:/dev/day/ab', 'E:/dev/day/a'), false);
  assert.equal(joinPath('/tmp', 'a', '..', 'b'), normalizePath('/tmp/b'));
});

test('project roots scan immediate children and read package names', async () => {
  const root = await fixture();
  try {
    const projects = await scanProjectRoots([root]);
    const names = projects.map(project => project.name).sort();
    assert.deepEqual(names, ['alpha', 'beta', 'gamma']);
    const beta = projects.find(project => project.name === 'beta');
    assert.ok(beta);
    assert.ok(beta.aliases.includes('@acme/beta'));
    assert.ok(!projects.some(project => project.name === '.hidden' || project.name === 'node_modules'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const projects = [
  { id: '/work/alpha', name: 'alpha', path: '/work/alpha', aliases: ['alpha'] },
  { id: '/work/beta', name: 'beta', path: '/work/beta', aliases: ['@acme/beta', 'beta'] },
];

test('cwd wins over text, and nested cwd picks the longest project', () => {
  const nested = [...projects, { id: '/work/alpha/pkg', name: 'pkg', path: '/work/alpha/pkg', aliases: ['pkg'] }];
  assert.equal(matchProjectForSession({ id: 's1', cwd: '/work/alpha/src', title: 'beta' }, nested).id, '/work/alpha');
  assert.equal(matchProjectForSession({ id: 's2', cwd: '/work/alpha/pkg/src', title: '' }, nested).id, '/work/alpha/pkg');
});

test('title and first message match a project name, ties stay unassigned', () => {
  assert.equal(matchProjectForSession({ id: 's1', title: 'Fix beta login', firstMessage: '' }, projects).id, '/work/beta');
  assert.equal(matchProjectForSession({ id: 's2', title: '', firstMessage: 'please review alpha' }, projects).id, '/work/alpha');
  assert.equal(matchProjectForSession({ id: 's3', title: 'alpha vs beta', firstMessage: '' }, projects), null);
  assert.equal(matchProjectForSession({ id: 's4', title: 'unrelated work' }, projects), null);
});

test('manual assignment wins, including an explicit unassigned choice', () => {
  assert.equal(matchProjectForSession({ id: 's1', cwd: '/work/alpha' }, projects, { s1: '/work/beta' }).id, '/work/beta');
  assert.equal(matchProjectForSession({ id: 's1', cwd: '/work/alpha' }, projects, { s1: null }), null);
});

test('generic project names do not produce a confident match', () => {
  const generic = [{ id: '/work/app', name: 'app', path: '/work/app', aliases: ['app'] }];
  assert.equal(matchProjectForSession({ id: 's1', title: 'app performance' }, generic), null);
});

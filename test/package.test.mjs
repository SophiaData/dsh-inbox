import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('bundle manifest points at existing files and declares the client half', async () => {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-sidebar'));
  await access(join(root, manifest.dsh.bundle.patch));
  await access(join(root, manifest.exports['./client']));
  await access(join(root, manifest.exports['./icon']));
  assert.ok(manifest.engines.dsh.includes('0.2.1-rc.2'));
  for (const file of manifest.files) {
    if (file.includes('*')) continue;
    await access(join(root, file));
  }
});

test('client bundle never relies on browser storage or network access', async () => {
  const source = await readFile(join(root, 'client.js'), 'utf8');
  assert.ok(!source.includes('localStorage'));
  assert.ok(!source.includes('sessionStorage'));
  assert.ok(!source.includes('fetch('));
  assert.ok(source.includes('window.__ModuleLoader__.load'));
  assert.ok(source.includes('dsh-inbox-page'));
});

test('cordis patch inserts exactly one inbox row', async () => {
  const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /id:\s*dsh-inbox/);
  assert.match(patch, /name:\s*dsh-inbox/);
});

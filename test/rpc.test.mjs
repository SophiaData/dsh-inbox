import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { apply } from '../index.js';

const pluginVersion = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;

function driveEffect(fn) {
  const result = fn();
  if (result && typeof result.next === 'function') {
    let step = result.next();
    while (!step.done) step = result.next();
  }
  return () => {};
}

test('host apply registers the inbox RPC surface and answers an owner snapshot', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-inbox-rpc-'));
  const routes = [];
  const cleanups = [];
  const ctx = {
    get: (name) => (name === 'profileContext' ? { dir } : undefined),
    on: () => () => {},
    logger: { warn() {}, info() {} },
    effect: (fn) => {
      const cleanup = driveEffect(fn);
      cleanups.push(cleanup);
      return cleanup;
    },
    inject: (services, callback) => {
      if (services.includes('connection')) {
        const webCtx = {
          effect: driveEffect,
          connection: {
            admit: () => ({ peer: { principal: { kind: 'owner' }, interactions: 'answer' } }),
            fetch: {
              register: (route) => {
                routes.push(route);
                return () => {};
              },
            },
          },
        };
        callback(webCtx);
      }
    },
  };
  try {
    apply(ctx, {});
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(routes.length, 11);
    const snapshotRoute = routes.find(route => route.path === '/api/dsh-inbox.inbox.snapshot');
    assert.ok(snapshotRoute);
    const response = await snapshotRoute.fetch(new Request('http://local/api/dsh-inbox.inbox.snapshot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: 'rpc-1',
        method: 'dsh-inbox.inbox.snapshot',
        payload: {},
      }),
    }));
    const body = await response.json();
    assert.equal(body.type, 'server-response');
    assert.equal(body.rpcId, 'rpc-1');
    assert.equal(body.result.ok, true);
    assert.ok(Array.isArray(body.result.value.items));
    assert.equal(body.result.value.runtime.pluginVersion, pluginVersion);
  } finally {
    for (const cleanup of cleanups) cleanup();
    await new Promise(resolve => setTimeout(resolve, 20));
    await rm(dir, { recursive: true, force: true });
  }
});

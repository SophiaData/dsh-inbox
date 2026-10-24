import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: Symbol('Fragment'),
  useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
  useEffect: () => {},
  useMemo: (factory) => factory(),
};
reactStub.default = reactStub;

async function loadClient() {
  const code = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  let loaded = null;
  const styleTags = [];
  const intervals = new Set();
  const document = {
    visibilityState: 'visible',
    createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
    head: { appendChild: (tag) => styleTags.push(tag) },
    addEventListener() {},
    removeEventListener() {},
  };
  const window = {
    setInterval: (fn, ms) => { const handle = { fn, ms, unref() {} }; intervals.add(handle); return handle; },
    clearInterval: (handle) => intervals.delete(handle),
    setTimeout: () => ({ unref() {} }),
    __ModuleLoader__: {
      load: ({ id, factory }) => {
        const module = { exports: {} };
        const exports = module.exports;
        const require = (name) => {
          if (name === 'react') return reactStub;
          throw new Error(`unexpected require: ${name}`);
        };
        const result = factory(require);
        loaded = { id, exports: result };
      },
    },
  };
  const sandbox = { window, document, console, setTimeout: () => ({ unref() {} }), clearTimeout() {}, URL, Date, Math, JSON, String, Number, Object, Array, Set, Map, RegExp };
  vm.runInNewContext(code, sandbox, { filename: 'client.js' });
  return { loaded, styleTags, intervals, window, document };
}

test('client bundle loads as a module-loader plugin', async () => {
  const { loaded } = await loadClient();
  assert.equal(loaded.id, 'dsh-inbox-plugin');
  assert.deepEqual([...loaded.exports.inject], ['slots', 'connection']);
  assert.equal(typeof loaded.exports.apply, 'function');
});

test('client registers a sidebar entry and matching main panel', async () => {
  const { loaded, styleTags } = await loadClient();
  const registrations = [];
  const ctx = {
    connection: { rpc: { call: async () => ({ ok: true, value: { items: [], projects: [], stats: { open: { total: 0, unread: 0 } }, runtime: {}, meta: {} } }) } },
    get: () => undefined,
    inject: () => {},
    effect: (fn) => {
      const cleanup = fn();
      return typeof cleanup === 'function' ? cleanup : () => {};
    },
    slots: {
      inject: (key, callback) => callback(),
      register: (options, component) => {
        registrations.push({ options, component });
        return () => {};
      },
    },
  };
  loaded.exports.apply(ctx);
  assert.ok(registrations.some(entry => entry.options.name === 'main' && entry.options.key === 'dsh-inbox'));
  assert.ok(registrations.some(entry => entry.options.name === 'sidebar.panellist' && entry.options.id === 'dsh-inbox'));
  assert.equal(styleTags.length, 1);
  assert.match(styleTags[0].textContent, /dsh-inbox-page/);
});

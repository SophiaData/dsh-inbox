import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

const NOW = Date.UTC(2026, 9, 24, 12, 0, 0);

function item(overrides) {
  return {
    sessionId: 's1',
    sessionTitle: '订单履约工作台',
    cwd: 'E:/dev-day',
    projectId: 'p1',
    createdAt: NOW - 120000,
    updatedAt: NOW - 60000,
    readAt: null,
    state: 'open',
    settledAt: null,
    settledBy: null,
    settleReason: null,
    ...overrides,
  };
}

function snapshotFor({ unread = 1 } = {}) {
  const items = [
    item({
      id: 'i1',
      kind: 'interruption',
      updatedAt: NOW - 60000,
      readAt: unread > 0 ? null : NOW,
      interruption: { kind: 'error', turn: 3, error: { message: 'model down', code: 'SERVER' }, time: NOW - 60000 },
    }),
    item({
      id: 'i2',
      kind: 'delivery',
      updatedAt: NOW - 30000,
      readAt: NOW,
      delivery: { files: [{ path: 'E:/dev-day/report.md', description: 'report' }] },
    }),
  ];
  return {
    version: 1,
    projectRoots: ['E:/dev-day'],
    projects: [{ id: 'p1', name: 'dev-day', path: 'E:/dev-day', marker: '.git' }],
    assignments: {},
    sessions: {},
    threads: [{
      sessionId: 's1',
      title: '订单履约工作台',
      cwd: 'E:/dev-day',
      projectId: 'p1',
      counts: { open: 2, unread, question: 0, delivery: 1, interruption: 1, archived: 0, settled: 0 },
      latestAt: NOW - 30000,
      itemIds: ['i2', 'i1'],
    }],
    items,
    stats: { open: { total: 2, unread, question: 0, delivery: 1, interruption: 1 }, done: 0, ignored: 0, archived: 0 },
    meta: { lastScanAt: NOW, lastError: null },
    runtime: {
      pluginVersion: 'test',
      runtimeVersion: '0.2.1-rc.2',
      capabilities: { sessions: true, questions: true, prompt: true, reveal: true, profileDir: true },
      scanning: false,
      now: NOW,
    },
  };
}

async function renderPanel(options = {}) {
  const snapshot = snapshotFor(options);
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const { window } = dom;
  window.confirm = () => true;
  // ReactDOM reads window/document from the global scope when scheduling updates.
  globalThis.window = window;
  globalThis.document = window.document;

  const calls = { act: [], request: [], opened: [] };
  let loaded = null;
  window.__ModuleLoader__ = {
    load: ({ id, factory }) => {
      loaded = { id, exports: factory((name) => {
        if (name === 'react') return React;
        throw new Error(`unexpected require: ${name}`);
      }) };
    },
  };

  const sandbox = {
    window,
    document: window.document,
    console,
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    URL,
    Date,
    Math,
    JSON,
    String,
    Number,
    Object,
    Array,
    Set,
    Map,
    RegExp,
    performance: window.performance,
  };
  const code = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  vm.runInNewContext(code, sandbox, { filename: 'client.js' });

  const registrations = [];
  const ctx = {
    connection: { rpc: { call: async () => ({}) } },
    get() { return undefined; },
    inject() {},
    effect(fn) { const result = fn(); return typeof result === 'function' ? result : () => {}; },
    slots: {
      inject(_key, callback) { callback(); },
      register(entry, component) { registrations.push({ entry, component }); return () => {}; },
    },
  };
  loaded.exports.apply(ctx);
  const main = registrations.find((registration) => registration.entry.name === 'main');
  assert.ok(main !== undefined, 'main panel must be registered');

  const t = (key) => key;
  const root = createRoot(window.document.getElementById('root'));
  root.render(React.createElement(main.component, {
    useInbox: (selector) => selector(snapshot),
    t,
    act: async (method, payload) => { calls.act.push({ method, payload }); return snapshot; },
    request: async (method, payload) => { calls.request.push({ method, payload }); return {}; },
    openSession: (sessionId) => { calls.opened.push(sessionId); return true; },
  }));
  await new Promise((resolve) => setTimeout(resolve, 40));

  const click = (element) => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return { window, document: window.document, calls, click, snapshot, root };
}

/** Render, assert, then always tear the DOM down so the test process can exit. */
async function withPanel(options, run) {
  const panel = await renderPanel(options);
  try {
    await run(panel);
  } finally {
    panel.root.unmount();
    panel.window.close();
  }
}

test('panel renders one card per session with counts and an open-session control', async () => {
  await withPanel({}, async ({ document }) => {
    const cards = document.querySelectorAll('.dsh-inbox-sheet');
    assert.equal(cards.length, 1);
    assert.equal(document.querySelectorAll('.dsh-inbox-sheet-open').length, 1, 'each card must keep an open-session button');
    assert.ok(document.querySelector('.dsh-inbox-unread-dot') !== null, 'unread sessions show a dot');
    assert.match(document.querySelector('.dsh-inbox-sheet-title').textContent, /订单履约工作台/);
  });
});

test('expanding a card lists its entries and an entry opens its actions', async () => {
  await withPanel({}, async ({ document, click }) => {
    assert.equal(document.querySelectorAll('.dsh-inbox-entry').length, 0);
    click(document.querySelector('.dsh-inbox-sheet-toggle'));
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(document.querySelectorAll('.dsh-inbox-entry').length, 2, 'both entries render inside the card');
    click(document.querySelector('.dsh-inbox-entry-head'));
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.ok(document.querySelector('.dsh-inbox-entry-body') !== null, 'opening an entry reveals its actions');
  });
});

test('the open-session button hands the session id to the host', async () => {
  await withPanel({}, async ({ document, click, calls }) => {
    click(document.querySelector('.dsh-inbox-sheet-open'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(calls.opened, ['s1']);
  });
});

test('mark-all-read is disabled when nothing is unread', async () => {
  await withPanel({ unread: 0 }, async ({ document }) => {
    const button = [...document.querySelectorAll('.dsh-inbox-btn')]
      .find((candidate) => candidate.textContent.includes('action.markAllRead'));
    assert.ok(button !== undefined);
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute('title'), 'action.nothingUnread');
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createInboxStore } from '../lib/store.js';

async function tempStore(clock = () => 1000) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-inbox-store-'));
  const file = join(dir, 'state.json');
  const store = createInboxStore({ file, clock, logger: { warn() {} } });
  await store.load();
  return { dir, file, store };
}

function questionItem(id = 'question:s1:c1', overrides = {}) {
  return {
    id,
    kind: 'question',
    sessionId: 's1',
    sessionTitle: 'Session one',
    cwd: '/work/alpha',
    projectId: '/work/alpha',
    createdAt: 100,
    updatedAt: 100,
    question: { callId: 'c1', state: 'open', questions: [{ id: 'q1', question: 'Pick' }] },
    ...overrides,
  };
}

test('reading never settles; settling is explicit and permanent', async () => {
  const { dir, store } = await tempStore();
  try {
    store.upsertItem(questionItem());
    assert.equal(store.get('question:s1:c1').state, 'open');
    store.markRead('question:s1:c1');
    assert.equal(store.get('question:s1:c1').readAt, 1000);
    assert.equal(store.get('question:s1:c1').state, 'open');
    store.settle('question:s1:c1', { state: 'done', by: 'user', reason: 'answered' });
    assert.equal(store.get('question:s1:c1').state, 'done');
    store.upsertItem(questionItem());
    assert.equal(store.get('question:s1:c1').state, 'done', 'a settled item must not reopen');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('state survives an atomic save/load round trip', async () => {
  const { dir, file, store } = await tempStore();
  try {
    store.setRoots(['/work']);
    store.upsertItem(questionItem());
    store.markRead('question:s1:c1');
    store.save();
    await store.flush();
    const text = await readFile(file, 'utf8');
    assert.match(text, /question:s1:c1/);

    const reopened = createInboxStore({ file, clock: () => 2000, logger: { warn() {} } });
    await reopened.load();
    assert.deepEqual(reopened.state.projectRoots, ['/work']);
    assert.equal(reopened.get('question:s1:c1').readAt, 1000);
    assert.equal(reopened.get('question:s1:c1').state, 'open');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('assignment updates the session and every item of that session', async () => {
  const { dir, store } = await tempStore();
  try {
    store.setSession('s1', { projectId: '/work/alpha', title: 'Session one' });
    store.upsertItem(questionItem());
    store.assign('s1', '/work/beta');
    assert.equal(store.state.sessions.s1.projectId, '/work/beta');
    assert.equal(store.get('question:s1:c1').projectId, '/work/beta');
    store.assign('s1', null);
    assert.equal(store.get('question:s1:c1').projectId, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('stats and item ordering put open questions first and unread first', async () => {
  const { dir, store } = await tempStore();
  try {
    store.upsertItem(questionItem('question:s1:open', { question: { callId: 'open', state: 'open', questions: [] } }));
    store.upsertItem({
      id: 'delivery:s1:1',
      kind: 'delivery',
      sessionId: 's1',
      createdAt: 300,
      updatedAt: 300,
      delivery: { turn: 1, files: [{ path: 'a.md' }] },
    });
    store.upsertItem({
      id: 'interruption:s1:1',
      kind: 'interruption',
      sessionId: 's1',
      createdAt: 200,
      updatedAt: 200,
      interruption: { kind: 'error', turn: 1 },
    });
    store.upsertItem(questionItem('question:s1:continued', { question: { callId: 'continued', state: 'continued', questions: [] } }));

    const snapshot = store.snapshot();
    assert.deepEqual(snapshot.items.map(item => item.id), [
      'question:s1:open',
      'interruption:s1:1',
      'question:s1:continued',
      'delivery:s1:1',
    ]);
    assert.equal(snapshot.stats.open.total, 4);
    assert.equal(snapshot.stats.open.unread, 4);

    store.markRead('interruption:s1:1');
    const after = store.snapshot();
    assert.equal(after.items.find(item => item.id === 'interruption:s1:1').readAt, 1000);
    assert.equal(after.stats.open.unread, 3);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('pruning keeps open items and recent settled items', async () => {
  let now = 10_000_000;
  const { dir, store } = await tempStore(() => now);
  try {
    store.upsertItem(questionItem('question:old', { createdAt: 1, updatedAt: 1 }));
    store.settle('question:old', { state: 'done', by: 'user' });
    store.upsertItem(questionItem('question:open', { createdAt: 1, updatedAt: 1 }));
    now = 10_000_000 + 31 * 86_400_000;
    store.prune({ retentionDays: 30, maxItems: 1000 });
    assert.equal(store.get('question:old'), null);
    assert.notEqual(store.get('question:open'), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('archiveBefore moves stale open items to archived without settling newer ones', async () => {
  const { dir, store } = await tempStore();
  try {
    store.upsertItem(questionItem('question:stale', { createdAt: 100, updatedAt: 100 }));
    store.upsertItem(questionItem('question:fresh', { createdAt: 950, updatedAt: 950 }));
    const changed = store.archiveBefore(500, 'backfill');
    assert.equal(changed, 1);
    assert.equal(store.get('question:stale').state, 'archived');
    assert.equal(store.get('question:stale').settledBy, 'backfill');
    assert.equal(store.get('question:fresh').state, 'open');
    const stats = store.stats();
    assert.equal(stats.open.total, 1);
    assert.equal(stats.archived, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('snapshot groups items into one thread per session', async () => {
  const { dir, store } = await tempStore();
  try {
    store.upsertItem(questionItem('question:s1:c1', { sessionId: 's1', updatedAt: 100 }));
    store.upsertItem(questionItem('question:s1:c2', { sessionId: 's1', updatedAt: 200 }));
    store.upsertItem(questionItem('question:s2:c1', { sessionId: 's2', updatedAt: 300, createdAt: 50 }));
    store.archiveBefore(60);
    const snapshot = store.snapshot();
    assert.equal(snapshot.threads.length, 2);
    const first = snapshot.threads.find(thread => thread.sessionId === 's1');
    assert.equal(first.counts.open, 2);
    assert.equal(first.counts.question, 2);
    assert.equal(first.itemIds.length, 2);
    assert.equal(first.itemIds[0], 'question:s1:c2');
    const second = snapshot.threads.find(thread => thread.sessionId === 's2');
    assert.equal(second.counts.open, 0);
    assert.equal(second.counts.archived, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

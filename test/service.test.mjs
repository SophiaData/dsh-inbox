import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { InboxService } from '../lib/service.js';
import { normalizePath } from '../lib/paths.js';

function summary(overrides = {}) {
  return {
    sessionId: 's1',
    updatedAt: 1000,
    running: false,
    blank: false,
    agentAvailable: false,
    cwd: '/work/alpha',
    projections: { kind: 'sequenced', values: { title: 'Alpha session' } },
    ...overrides,
  };
}

function eventsFor({ openTurn = false } = {}) {
  const events = [
    { type: 'user/message', seq: 0, time: 1000, data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'fix alpha' }] } },
    { type: 'turn/start', seq: 1, time: 1001, data: { turn: 1 } },
    { type: 'deliverables/presented', seq: 2, time: 1002, data: { turn: 1, callId: 'present-1', files: [{ path: 'docs/report.md', description: 'Report' }] } },
  ];
  if (!openTurn) {
    events.push({ type: 'turn/end', seq: 3, time: 1003, data: { turn: 1, reason: { kind: 'error', error: { message: 'model down', code: 'LLM_DOWN' } } } });
  }
  return events;
}

function questionProjection() {
  return {
    kind: 'sequenced',
    asOfSeq: 3,
    values: {
      userQuestions: {
        active: [{
          callId: 'call-1',
          state: 'continued',
          questions: [{
            id: 'q1',
            question: 'Ship it?',
            options: [{ label: 'Yes' }, { label: 'No' }],
          }],
        }],
        settled: [],
      },
    },
  };
}

async function makeService({ events = eventsFor(), projection = questionProjection(), running = false } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-inbox-service-'));
  const root = join(dir, 'projects');
  const projectPath = join(root, 'alpha');
  await mkdir(join(projectPath, '.git'), { recursive: true });
  await mkdir(join(projectPath, 'docs'), { recursive: true });
  await writeFile(join(projectPath, 'docs', 'report.md'), '# Report\n\nhello\n');

  const calls = { prompts: [], answers: [], revealed: [], signals: [] };
  const controller = {
    list: async (_request, signal) => { calls.signals.push(signal); return [summary({ running, cwd: projectPath })]; },
    inspect: async (_sessionId, signal) => { calls.signals.push(signal); return ({ events }); },
    projections: async (_request, signal) => { calls.signals.push(signal); return projection; },
    resolveAgent: async (sessionId) => ({ agent: { id: sessionId } }),
    prompt: async (request, signal) => { calls.signals.push(signal); calls.prompts.push(request); return { accepted: true }; },
    openWorkspacePath: async (request, signal) => { calls.signals.push(signal); calls.revealed.push(request); return { opened: true }; },
  };
  const questions = {
    answer: (agent, callId, answer) => {
      calls.answers.push({ agent, callId, answer });
      return true;
    },
  };
  const ctx = {
    get(name) {
      if (name === 'sessionController') return controller;
      if (name === 'userQuestions') return questions;
      if (name === 'profileContext') return { dir };
      return undefined;
    },
    on() { return () => {}; },
    logger: { warn() {}, info() {} },
  };
  const service = new InboxService(ctx, {}, { stateFile: join(dir, 'state.json'), clock: () => 2000 });
  await service.store.load();
  service.store.setRoots([root]);
  await service.refreshProjects();
  return { service, calls, dir, root };
}

test('scan backfills delivery, question, and interruption items', async () => {
  const { service, calls, dir } = await makeService();
  try {
    await service.scanNow({ full: true });
    const snapshot = service.snapshot();
    const kinds = snapshot.items.filter(item => item.state === 'open').map(item => item.kind).sort();
    assert.deepEqual(kinds, ['delivery', 'interruption', 'question']);
    const question = snapshot.items.find(item => item.kind === 'question');
    assert.equal(question.question.state, 'continued');
    assert.equal(question.projectId, normalizePath(join(dir, 'projects', 'alpha')));
    const delivery = snapshot.items.find(item => item.kind === 'delivery');
    assert.equal(delivery.delivery.files[0].path, 'docs/report.md');
    const interruption = snapshot.items.find(item => item.kind === 'interruption');
    assert.equal(interruption.interruption.kind, 'error');
    assert.ok(calls.signals.length > 0);
    assert.ok(calls.signals.every(signal => signal instanceof AbortSignal), 'every controller call must carry an AbortSignal');
  } finally {
    await service.dispose();
    await rm(dir, { recursive: true, force: true });
  }
});

test('an open turn is backfilled only when the session is not running', async () => {
  const cold = await makeService({ events: eventsFor({ openTurn: true }), running: false });
  try {
    await cold.service.scanNow({ full: true });
    assert.ok(cold.service.snapshot().items.some(item => item.interruption?.kind === 'open-turn'));
  } finally {
    await cold.service.dispose();
    await rm(cold.dir, { recursive: true, force: true });
  }

  const live = await makeService({ events: eventsFor({ openTurn: true }), running: true });
  try {
    await live.service.scanNow({ full: true });
    assert.ok(!live.service.snapshot().items.some(item => item.interruption?.kind === 'open-turn'));
  } finally {
    await live.service.dispose();
    await rm(live.dir, { recursive: true, force: true });
  }
});

test('answering settles the item and forwards the exact batch', async () => {
  const { service, calls, dir } = await makeService();
  try {
    await service.scanNow({ full: true });
    const item = service.snapshot().items.find(entry => entry.kind === 'question');
    await service.answer('s1', 'call-1', [{ id: 'q1', selected: ['Yes'] }]);
    assert.equal(calls.answers.length, 1);
    assert.deepEqual(calls.answers[0].answer, { answers: [{ id: 'q1', selected: ['Yes'] }] });
    assert.equal(service.store.get(item.id).state, 'done');
    assert.equal(service.store.get(item.id).settleReason, 'answered');
  } finally {
    await service.dispose();
    await rm(dir, { recursive: true, force: true });
  }
});

test('question items auto-settle when an authoritative projection no longer lists them', async () => {
  const { service, dir } = await makeService();
  try {
    await service.scanNow({ full: true });
    const item = service.snapshot().items.find(entry => entry.kind === 'question');
    service.ctx.get('sessionController').projections = async () => ({
      kind: 'sequenced',
      asOfSeq: 9,
      values: { userQuestions: { active: [], settled: [{ callId: 'call-1', answers: [] }] } },
    });
    await service.scanNow({ full: false });
    assert.equal(service.store.get(item.id).state, 'done');
    assert.equal(service.store.get(item.id).settleReason, 'answered');
  } finally {
    await service.dispose();
    await rm(dir, { recursive: true, force: true });
  }
});

test('reply continues a session and settles the interruption', async () => {
  const { service, calls, dir } = await makeService();
  try {
    await service.scanNow({ full: true });
    const item = service.snapshot().items.find(entry => entry.kind === 'interruption');
    await service.reply('s1', '继续排查', item.id);
    assert.equal(calls.prompts.length, 1);
    assert.equal(calls.prompts[0].sessionId, 's1');
    assert.deepEqual(calls.prompts[0].content, [{ type: 'text', text: '继续排查' }]);
    assert.equal(service.store.get(item.id).state, 'done');
  } finally {
    await service.dispose();
    await rm(dir, { recursive: true, force: true });
  }
});

test('only declared deliverable files can be previewed', async () => {
  const { service, calls, dir } = await makeService();
  try {
    await service.scanNow({ full: true });
    const preview = await service.preview('s1', 'docs/report.md');
    assert.equal(preview.kind, 'text');
    assert.match(preview.text, /hello/);
    await service.reveal('s1', 'docs/report.md');
    assert.equal(calls.revealed.length, 1);
    assert.equal(calls.revealed[0].action, 'reveal');
    await assert.rejects(() => service.preview('s1', 'docs/other.md'), /Only files declared/);
  } finally {
    await service.dispose();
    await rm(dir, { recursive: true, force: true });
  }
});

test('mark-read does not settle and assignment persists to items', async () => {
  const { service, dir, root } = await makeService();
  try {
    await service.scanNow({ full: true });
    const item = service.snapshot().items.find(entry => entry.kind === 'delivery');
    service.markRead(item.id);
    assert.equal(service.store.get(item.id).state, 'open');
    assert.notEqual(service.store.get(item.id).readAt, null);
    const project = service.store.state.projects[0];
    service.assign('s1', project.id);
    assert.equal(service.store.get(item.id).projectId, project.id);
    assert.ok(root);
  } finally {
    await service.dispose();
    await rm(dir, { recursive: true, force: true });
  }
});

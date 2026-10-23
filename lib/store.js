import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const STATE_VERSION = 1;
export const ITEM_KINDS = new Set(['question', 'delivery', 'interruption']);
export const ITEM_STATES = new Set(['open', 'done', 'ignored']);

function emptyState() {
  return {
    version: STATE_VERSION,
    projectRoots: [],
    projects: [],
    assignments: {},
    sessions: {},
    items: {},
    meta: {
      lastScanAt: 0,
      lastFullScanAt: 0,
      lastError: null,
      scans: 0,
    },
  };
}

function record(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLoadedState(raw) {
  const state = emptyState();
  if (!record(raw)) return state;
  if (Array.isArray(raw.projectRoots)) state.projectRoots = raw.projectRoots.filter(value => typeof value === 'string');
  if (Array.isArray(raw.projects)) state.projects = raw.projects.filter(record);
  if (record(raw.assignments)) state.assignments = { ...raw.assignments };
  if (record(raw.sessions)) state.sessions = { ...raw.sessions };
  if (record(raw.items)) {
    for (const [id, item] of Object.entries(raw.items)) {
      if (!record(item) || !ITEM_KINDS.has(item.kind) || !ITEM_STATES.has(item.state)) continue;
      state.items[id] = item;
    }
  }
  if (record(raw.meta)) state.meta = { ...state.meta, ...raw.meta };
  return state;
}

async function writeAtomic(file, text) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, text, { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, file);
}

export function priorityOf(item) {
  if (item.kind === 'question') return item.question?.state === 'continued' ? 2 : 0;
  if (item.kind === 'interruption') return 1;
  return 3;
}

export function sortItems(items) {
  return [...items].sort((left, right) => {
    const stateRank = (item) => (item.state === 'open' ? 0 : 1);
    return stateRank(left) - stateRank(right)
      || priorityOf(left) - priorityOf(right)
      || Number(left.readAt === null) * -1 - Number(right.readAt === null) * -1
      || right.updatedAt - left.updatedAt;
  });
}

/**
 * Durable inbox state. Mutations are queued so two RPC calls cannot interleave
 * a read-modify-write, and every save replaces the file atomically.
 */
export function createInboxStore({ file, clock = Date.now, logger = console }) {
  let state = emptyState();
  let loaded = false;
  let dirty = false;
  let writeChain = Promise.resolve();

  async function load() {
    if (loaded) return state;
    try {
      const text = await readFile(file, 'utf8');
      state = normalizeLoadedState(JSON.parse(text));
    } catch (error) {
      if (error?.code !== 'ENOENT') logger.warn?.(`dsh-inbox: state read failed: ${String(error)}`);
      state = emptyState();
    }
    loaded = true;
    return state;
  }

  function save() {
    dirty = true;
    writeChain = writeChain.then(async () => {
      if (!dirty) return;
      dirty = false;
      await writeAtomic(file, JSON.stringify(state, null, 2));
    }).catch(error => {
      logger.warn?.(`dsh-inbox: state write failed: ${String(error)}`);
    });
    return writeChain;
  }

  async function flush() {
    await writeChain;
    if (dirty) await save();
    await writeChain;
  }

  function upsertItem(next) {
    const now = clock();
    const existing = state.items[next.id];
    if (existing !== undefined && existing.state !== 'open') {
      // A settled item never reopens: the same turn/call cannot produce a second decision.
      existing.sessionTitle = next.sessionTitle ?? existing.sessionTitle;
      existing.projectId = next.projectId ?? existing.projectId;
      existing.updatedAt = Math.max(existing.updatedAt ?? 0, next.updatedAt ?? now);
      return existing;
    }
    state.items[next.id] = {
      createdAt: existing?.createdAt ?? next.createdAt ?? now,
      updatedAt: next.updatedAt ?? now,
      readAt: existing?.readAt ?? null,
      state: 'open',
      settledAt: null,
      settledBy: null,
      settleReason: null,
      ...existing,
      ...next,
      state: 'open',
      settledAt: null,
      settledBy: null,
      settleReason: null,
    };
    return state.items[next.id];
  }

  function markRead(id, at = clock()) {
    const item = state.items[id];
    if (item === undefined) return false;
    if (item.readAt === null) item.readAt = at;
    return true;
  }

  function markAllRead(ids) {
    const at = clock();
    let changed = 0;
    for (const id of ids) {
      const item = state.items[id];
      if (item !== undefined && item.readAt === null) {
        item.readAt = at;
        changed += 1;
      }
    }
    return changed;
  }

  function settle(id, { state: nextState, by = 'user', reason = null } = {}) {
    const item = state.items[id];
    if (item === undefined) return null;
    if (!ITEM_STATES.has(nextState) || nextState === 'open') throw new Error('invalid settle state');
    if (item.state === 'open') {
      item.state = nextState;
      item.settledAt = clock();
      item.settledBy = by;
      item.settleReason = reason;
      item.updatedAt = item.settledAt;
      if (item.readAt === null) item.readAt = item.settledAt;
    }
    return item;
  }

  function setProjects(projects) {
    state.projects = projects;
  }

  function setRoots(roots) {
    state.projectRoots = [...new Set(roots)];
  }

  function assign(sessionId, projectId) {
    if (projectId === null || projectId === undefined) delete state.assignments[sessionId];
    else state.assignments[sessionId] = projectId;
    const session = state.sessions[sessionId];
    if (session !== undefined) session.projectId = projectId ?? null;
    for (const item of Object.values(state.items)) {
      if (item.sessionId === sessionId) item.projectId = projectId ?? null;
    }
  }

  function setSession(sessionId, value) {
    state.sessions[sessionId] = { ...(state.sessions[sessionId] ?? {}), ...value };
  }

  function setMeta(patch) {
    state.meta = { ...state.meta, ...patch };
  }

  function prune({ retentionDays = 30, maxItems = 1000, maxSessions = 800 } = {}) {
    const now = clock();
    const cutoff = now - retentionDays * 86_400_000;
    const entries = Object.entries(state.items);
    const kept = entries.filter(([, item]) => item.state === 'open' || (item.settledAt ?? item.updatedAt ?? 0) >= cutoff);
    kept.sort((left, right) => (right[1].updatedAt ?? 0) - (left[1].updatedAt ?? 0));
    const limited = kept.slice(0, maxItems);
    state.items = Object.fromEntries(limited);

    const sessionEntries = Object.entries(state.sessions);
    if (sessionEntries.length > maxSessions) {
      sessionEntries.sort((left, right) => (right[1].updatedAt ?? 0) - (left[1].updatedAt ?? 0));
      state.sessions = Object.fromEntries(sessionEntries.slice(0, maxSessions));
    }
  }

  function get(id) {
    return state.items[id] ?? null;
  }

  function items() {
    return Object.values(state.items);
  }

  function stats() {
    const open = { total: 0, unread: 0, question: 0, delivery: 0, interruption: 0 };
    for (const item of Object.values(state.items)) {
      if (item.state !== 'open') continue;
      open.total += 1;
      if (item.readAt === null) open.unread += 1;
      open[item.kind] = (open[item.kind] ?? 0) + 1;
    }
    return {
      open,
      done: Object.values(state.items).filter(item => item.state === 'done').length,
      ignored: Object.values(state.items).filter(item => item.state === 'ignored').length,
    };
  }

  function snapshot() {
    return {
      version: STATE_VERSION,
      projectRoots: [...state.projectRoots],
      projects: [...state.projects].sort((left, right) => String(left.name).localeCompare(String(right.name))),
      assignments: { ...state.assignments },
      sessions: { ...state.sessions },
      items: sortItems(Object.values(state.items)).map(item => ({ ...item })),
      stats: stats(),
      meta: { ...state.meta },
    };
  }

  return {
    load,
    save,
    flush,
    get state() { return state; },
    get,
    items,
    stats,
    snapshot,
    upsertItem,
    markRead,
    markAllRead,
    settle,
    setProjects,
    setRoots,
    assign,
    setSession,
    setMeta,
    prune,
  };
}

import { readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { extractSessionFacts, itemIds, questionViewOf } from './events.js';
import { matchProjectForSession, scanProjectRoots } from './grouping.js';
import { joinPath, normalizePath } from './paths.js';
import { createInboxStore } from './store.js';

const MAX_TEXT_PREVIEW = 512 * 1024;
const MAX_ROOTS = 20;
const DAY = 86_400_000;

export class InboxError extends Error {
  constructor(message, code = 'INBOX_OPERATION_FAILED') {
    super(message);
    this.name = 'InboxError';
    this.code = code;
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveStateFile(ctx) {
  const profile = ctx.get?.('profileContext');
  if (typeof profile?.dir === 'string' && profile.dir.trim() !== '') {
    return join(profile.dir, '.dsh-inbox', 'state.json');
  }
  return join(homedir(), '.dsh', '.dsh-inbox', 'state.json');
}

function runtimeTitle(summary) {
  const value = summary?.projections?.values?.title;
  return typeof value === 'string' ? value.trim() : '';
}

function isQuestionActive(item) {
  return item.kind === 'question' && item.state === 'open';
}

async function mapLimit(values, limit, worker) {
  const results = new Array(values.length);
  let index = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, values.length)) }, async () => {
    for (;;) {
      const current = index;
      index += 1;
      if (current >= values.length) return;
      results[current] = await worker(values[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

function hasMethods(service, names) {
  return names.every(name => typeof service?.[name] === 'function');
}

/** Owns the durable inbox, the scanner, and every mutation behind the RPC surface. */
export class InboxService {
  constructor(ctx, config = {}, options = {}) {
    this.ctx = ctx;
    this.config = {
      projectRoots: Array.isArray(config.projectRoots) ? config.projectRoots : [],
      lookbackDays: positiveNumber(config.lookbackDays, 30),
      maxSessions: positiveNumber(config.maxSessions, 300),
      includeSubagents: config.includeSubagents === true,
      scanIntervalSeconds: positiveNumber(config.scanIntervalSeconds, 60),
      retentionDays: positiveNumber(config.retentionDays, 30),
      questionLookbackDays: positiveNumber(config.questionLookbackDays, 14),
    };
    this.clock = options.clock ?? Date.now;
    this.logger = options.logger ?? console;
    this.stateFile = options.stateFile ?? resolveStateFile(ctx);
    this.store = createInboxStore({ file: this.stateFile, clock: this.clock, logger: this.logger });
    this.scanPromise = null;
    this.interval = null;
    this.initialTimer = null;
    this.debounceTimer = null;
    this.disposed = false;
    this.scanning = false;
    this.abort = new AbortController();
    this.signal = this.abort.signal;
    this.runtimeVersion = null;
    this.capabilities = {};
    this.listeners = [];
  }

  async start() {
    await this.store.load();
    if (this.store.state.projectRoots.length === 0 && this.config.projectRoots.length > 0) {
      this.store.setRoots(this.config.projectRoots.map(normalizePath).filter(Boolean));
    }
    await this.refreshProjects();
    this.runtimeVersion = await readRuntimeVersion();
    this.capabilities = this.detectCapabilities();
    this.store.setMeta({ runtimeVersion: this.runtimeVersion });
    await this.store.save();
    this.attach();
    if (typeof this.ctx.inject === 'function') {
      this.ctx.inject(['sessionController'], () => {
        if (this.disposed) return;
        this.capabilities = this.detectCapabilities();
        void this.scanNow({ full: true, reason: 'controller-ready' });
      });
    }
    this.initialTimer = setTimeout(() => {
      void this.scanNow({ full: true, reason: 'startup' });
    }, 1200);
    this.interval = setInterval(() => {
      void this.scanNow({ full: false, reason: 'interval' });
    }, Math.max(15, this.config.scanIntervalSeconds) * 1000);
    this.interval.unref?.();
    return this;
  }

  detectCapabilities() {
    const controller = this.ctx.get('sessionController');
    const questions = this.ctx.get('userQuestions');
    const profile = this.ctx.get('profileContext');
    return {
      sessions: hasMethods(controller, ['list', 'inspect', 'projections']),
      prompt: hasMethods(controller, ['prompt', 'resolveAgent']),
      questions: hasMethods(questions, ['answer']),
      reveal: hasMethods(controller, ['openWorkspacePath']),
      profileDir: typeof profile?.dir === 'string',
      runtimeVersion: this.runtimeVersion,
    };
  }

  attach() {
    if (typeof this.ctx.on !== 'function') return;
    const on = (event, listener) => {
      this.listeners.push(this.ctx.on(event, listener, { global: true }));
    };
    on('session/event', (session, event) => {
      this.onSessionEvent(session, event);
    });
    on('api-session/error', (sessionId, message) => {
      this.onAgentError(String(sessionId), String(message ?? ''));
    });
    on('api-session/status', (sessionId, running) => {
      this.onStatus(String(sessionId), running === true);
    });
    on('api-session/added', () => {
      this.scheduleScan('session-added');
    });
  }

  async dispose() {
    this.disposed = true;
    this.abort.abort();
    if (this.initialTimer !== null) clearTimeout(this.initialTimer);
    if (this.interval !== null) clearInterval(this.interval);
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    for (const dispose of this.listeners) {
      try {
        dispose?.();
      } catch {
        // A listener that already unloaded is not this plugin's failure.
      }
    }
    this.listeners = [];
    await this.store.flush();
  }

  scheduleScan(reason) {
    if (this.disposed) return;
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.scanNow({ full: false, reason });
    }, 900);
    this.debounceTimer.unref?.();
  }

  async refreshProjects() {
    const roots = [...new Set(this.store.state.projectRoots.map(normalizePath).filter(Boolean))];
    this.store.setRoots(roots);
    try {
      const projects = await scanProjectRoots(roots);
      this.store.setProjects(projects);
      this.store.setMeta({ projectScanAt: this.clock(), projectScanError: null });
      return projects;
    } catch (error) {
      this.store.setMeta({ projectScanError: String(error?.message ?? error) });
      this.logger.warn?.(`dsh-inbox: project scan failed: ${String(error)}`);
      return this.store.state.projects;
    }
  }

  async scanNow({ full = false, reason = 'manual' } = {}) {
    if (this.disposed) return this.store.snapshot();
    if (this.scanPromise !== null) {
      if (!full) return this.scanPromise;
      await this.scanPromise;
      if (this.disposed) return this.store.snapshot();
      return this.scanNow({ full, reason });
    }
    this.scanning = true;
    this.scanPromise = this.#scan(full, reason)
      .catch(error => {
        if (this.disposed) return;
        this.store.setMeta({ lastError: String(error?.message ?? error) });
        this.logger.warn?.(`dsh-inbox: scan failed: ${String(error)}`);
      })
      .finally(() => {
        this.scanning = false;
        this.scanPromise = null;
      });
    return this.scanPromise;
  }

  async #scan(full, reason) {
    const controller = this.ctx.get('sessionController');
    if (!hasMethods(controller, ['list'])) {
      this.store.setMeta({ lastError: 'sessionController is unavailable in this deployment' });
      return;
    }
    const now = this.clock();
    const summaries = await controller.list({}, this.signal);
    const lookback = now - this.config.lookbackDays * DAY;
    const filtered = (Array.isArray(summaries) ? summaries : [])
      .filter(summary => this.config.includeSubagents || summary.origin !== 'subagent')
      .filter(summary => summary.blank !== true)
      .filter(summary => (summary.updatedAt ?? 0) >= lookback)
      .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
      .slice(0, this.config.maxSessions);

    this.store.setMeta({
      lastScanAt: now,
      ...(full ? { lastFullScanAt: now } : {}),
      lastScanReason: reason,
      scans: (this.store.state.meta.scans ?? 0) + 1,
      lastError: null,
    });

    await mapLimit(filtered, 3, summary => this.#scanSession(summary, { full, now }));
    await mapLimit(filtered, 3, summary => this.#scanQuestions(summary, { full, now }));
    this.store.prune({ retentionDays: this.config.retentionDays });
    await this.store.save();
  }

  #shouldInspect(summary, full, now) {
    const stored = this.store.state.sessions[summary.sessionId];
    if (full || stored === undefined) return true;
    if (summary.running === true || summary.agentAvailable === true) return true;
    if (stored.updatedAt !== summary.updatedAt) return true;
    if (stored.lastSeq === undefined) return true;
    // A cold session that has not been prompted cannot have appended events.
    return now - (stored.scannedAt ?? 0) > 30 * DAY;
  }

  async #scanSession(summary, { full, now }) {
    const sessionId = summary.sessionId;
    const stored = this.store.state.sessions[sessionId] ?? {};
    const project = matchProjectForSession(
      { id: sessionId, title: stored.title, firstMessage: stored.firstMessage, cwd: summary.cwd ?? stored.cwd },
      this.store.state.projects,
      this.store.state.assignments,
    );
    const projectId = project?.id ?? null;
    if (!this.#shouldInspect(summary, full, now)) {
      this.#updateItemContext(sessionId, stored.title ?? '', summary.cwd ?? stored.cwd ?? '', projectId);
      return;
    }

    let inspected;
    try {
      inspected = await this.ctx.get('sessionController').inspect(sessionId, this.signal);
    } catch (error) {
      if (this.disposed) return;
      this.store.setSession(sessionId, {
        ...stored,
        cwd: summary.cwd ?? stored.cwd ?? null,
        running: summary.running === true,
        updatedAt: summary.updatedAt,
        projectId,
        scanError: String(error?.message ?? error),
        scannedAt: now,
      });
      return;
    }

    const events = Array.isArray(inspected?.events) ? inspected.events : [];
    const facts = extractSessionFacts(events, {
      running: summary.running === true,
      inheritedEventCount: Number.isInteger(inspected?.inheritedEventCount) ? inspected.inheritedEventCount : 0,
    });
    const title = runtimeTitle(summary) || facts.title || stored.title || '';
    const firstMessage = facts.firstMessage || stored.firstMessage || '';
    const finalProject = matchProjectForSession(
      { id: sessionId, title, firstMessage, cwd: summary.cwd ?? stored.cwd },
      this.store.state.projects,
      this.store.state.assignments,
    );
    const finalProjectId = finalProject?.id ?? projectId;

    this.store.setSession(sessionId, {
      title,
      firstMessage,
      cwd: summary.cwd ?? stored.cwd ?? null,
      running: summary.running === true,
      agentAvailable: summary.agentAvailable === true,
      updatedAt: summary.updatedAt,
      lastSeq: facts.lastSeq,
      scannedAt: now,
      projectId: finalProjectId,
      questionCall: facts.questionCall === true,
      formatStatus: summary.formatStatus ?? null,
      scanError: null,
    });

    for (const delivery of facts.deliveries) {
      const id = itemIds.delivery(sessionId, delivery.turn, delivery.callId ?? delivery.seq);
      this.store.upsertItem({
        id,
        kind: 'delivery',
        sessionId,
        sessionTitle: title,
        cwd: summary.cwd ?? stored.cwd ?? '',
        projectId: finalProjectId,
        createdAt: delivery.time ?? now,
        updatedAt: delivery.time ?? now,
        delivery: {
          turn: delivery.turn,
          callId: delivery.callId,
          files: delivery.files,
          seq: delivery.seq,
          time: delivery.time,
          detectedAt: now,
        },
      });
    }

    for (const interruption of facts.interruptions) {
      const id = itemIds.interruption(sessionId, interruption.turn, interruption.kind);
      this.store.upsertItem({
        id,
        kind: 'interruption',
        sessionId,
        sessionTitle: title,
        cwd: summary.cwd ?? stored.cwd ?? '',
        projectId: finalProjectId,
        createdAt: interruption.time ?? now,
        updatedAt: interruption.time ?? now,
        interruption: {
          kind: interruption.kind,
          turn: interruption.turn,
          error: interruption.error ?? null,
          seq: interruption.seq ?? null,
          time: interruption.time ?? null,
          detectedAt: now,
        },
      });
    }

    this.#resolveFalseAlarms(sessionId, facts, now);
    this.#updateItemContext(sessionId, title, summary.cwd ?? stored.cwd ?? '', finalProjectId);
  }

  #resolveFalseAlarms(sessionId, facts, now) {
    for (const item of this.store.items()) {
      if (item.kind !== 'interruption' || item.state !== 'open' || item.sessionId !== sessionId) continue;
      if (item.interruption?.kind !== 'open-turn') continue;
      const reason = facts.endedTurns?.get(item.interruption.turn);
      if (reason === undefined) continue;
      if (reason.kind === 'error' || reason.kind === 'interrupted') continue;
      this.store.settle(item.id, { state: 'done', by: 'system', reason: 'turn-advanced' });
      item.updatedAt = now;
    }
  }

  #updateItemContext(sessionId, title, cwd, projectId) {
    for (const item of this.store.items()) {
      if (item.sessionId !== sessionId) continue;
      item.sessionTitle = title || item.sessionTitle;
      item.cwd = cwd || item.cwd;
      item.projectId = projectId ?? null;
    }
  }

  async #scanQuestions(summary, { full, now }) {
    const sessionId = summary.sessionId;
    const stored = this.store.state.sessions[sessionId] ?? {};
    const openQuestion = this.store.items().some(item => item.sessionId === sessionId && isQuestionActive(item));
    const recent = (summary.updatedAt ?? 0) >= now - this.config.questionLookbackDays * DAY;
    const hinted = summary.projections?.values?.userQuestions;
    const hintedView = hinted === undefined ? null : questionViewOf(hinted);
    const asked = stored.questionCall === true;
    const shouldRead = openQuestion
      || summary.running === true
      || summary.agentAvailable === true
      || asked
      || (recent && hinted === undefined)
      || (full && hinted === undefined);
    if (!shouldRead && hintedView === null) return;

    let view = hintedView;
    let authoritative = summary.projections?.kind === 'sequenced' && hintedView !== null;
    if (shouldRead) {
      const controller = this.ctx.get('sessionController');
      if (hasMethods(controller, ['projections'])) {
        try {
          const result = await controller.projections({ sessionId }, this.signal);
          if (result?.values?.userQuestions !== undefined) {
            view = questionViewOf(result.values.userQuestions);
            authoritative = result.kind === 'sequenced';
          } else if (result?.kind === 'migration-required' && result.values?.userQuestions !== undefined) {
            view = questionViewOf(result.values.userQuestions);
            authoritative = true;
          }
        } catch (error) {
          this.store.setSession(sessionId, {
            ...stored,
            questionScanError: String(error?.message ?? error),
            questionScannedAt: now,
          });
        }
      }
    }
    if (view === null) return;

    const activeIds = new Set(view.active.map(question => question.callId));
    const title = stored.title || runtimeTitle(summary);
    const cwd = stored.cwd ?? summary.cwd ?? '';
    const projectId = stored.projectId ?? null;
    for (const question of view.active) {
      const id = itemIds.question(sessionId, question.callId);
      const existing = this.store.get(id);
      const stateChanged = existing !== null && existing?.question?.state !== question.state;
      this.store.upsertItem({
        id,
        kind: 'question',
        sessionId,
        sessionTitle: title,
        cwd,
        projectId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: existing === null || stateChanged ? now : existing.updatedAt,
        question: {
          callId: question.callId,
          state: question.state,
          questions: question.questions,
          detectedAt: existing?.question?.detectedAt ?? now,
        },
      });
    }

    if (authoritative) {
      for (const item of this.store.items()) {
        if (item.sessionId !== sessionId || !isQuestionActive(item)) continue;
        if (activeIds.has(item.question?.callId)) continue;
        this.store.settle(item.id, { state: 'done', by: 'system', reason: 'answered' });
        item.updatedAt = now;
      }
    }
  }

  onSessionEvent(session, event) {
    if (this.disposed || !event || typeof event.type !== 'string') return;
    const sessionId = String(session?.id ?? session?.sessionId ?? '');
    if (!sessionId) return;
    const stored = this.store.state.sessions[sessionId] ?? {};
    const title = stored.title ?? '';
    const cwd = stored.cwd ?? session?.header?.cwd ?? '';
    const projectId = stored.projectId ?? null;
    const now = this.clock();

    if (event.type === 'user/message' && !stored.firstMessage) {
      const source = event.data?.source;
      if (source?.kind === 'user') {
        const text = (Array.isArray(event.data.content) ? event.data.content : [])
          .filter(block => block?.type === 'text')
          .map(block => block.text)
          .join('\n')
          .trim();
        if (text) this.store.setSession(sessionId, { ...stored, firstMessage: text.slice(0, 600) });
      }
    }

    if (event.type === 'session/title' && typeof event.data?.title === 'string') {
      this.store.setSession(sessionId, { ...stored, title: event.data.title.trim() });
      this.#updateItemContext(sessionId, event.data.title.trim(), cwd, projectId);
    }

    if (event.type === 'turn/end') {
      const turn = event.data?.turn;
      const reason = event.data?.reason;
      if (reason?.kind === 'error' || reason?.kind === 'interrupted') {
        const id = itemIds.interruption(sessionId, turn, reason.kind);
        this.store.upsertItem({
          id,
          kind: 'interruption',
          sessionId,
          sessionTitle: title,
          cwd,
          projectId,
          createdAt: event.time ?? now,
          updatedAt: event.time ?? now,
          interruption: {
            kind: reason.kind,
            turn: Number.isInteger(turn) ? turn : null,
            error: reason.kind === 'error' ? reason.error ?? null : null,
            seq: event.seq ?? null,
            time: event.time ?? now,
            detectedAt: now,
          },
        });
      } else if (reason?.kind === 'completed' || reason?.kind === 'aborted'
        || reason?.kind === 'max-tokens' || reason?.kind === 'forked') {
        for (const item of this.store.items()) {
          if (item.kind === 'interruption' && item.state === 'open' && item.sessionId === sessionId
            && item.interruption?.kind === 'open-turn' && item.interruption.turn === turn) {
            this.store.settle(item.id, { state: 'done', by: 'system', reason: 'turn-advanced' });
          }
        }
      }
      this.scheduleScan('turn-end');
    }

    if (event.type === 'deliverables/presented') {
      const files = (Array.isArray(event.data?.files) ? event.data.files : [])
        .filter(file => file && typeof file.path === 'string' && file.path.trim() !== '')
        .map(file => ({
          path: file.path,
          ...(typeof file.description === 'string' ? { description: file.description } : {}),
        }));
      if (files.length > 0) {
        const turn = event.data?.turn;
        const id = itemIds.delivery(sessionId, turn, event.data?.callId ?? event.seq);
        this.store.upsertItem({
          id,
          kind: 'delivery',
          sessionId,
          sessionTitle: title,
          cwd,
          projectId,
          createdAt: event.time ?? now,
          updatedAt: event.time ?? now,
          delivery: {
            turn: Number.isInteger(turn) ? turn : null,
            callId: typeof event.data?.callId === 'string' ? event.data.callId : null,
            files,
            seq: event.seq ?? null,
            time: event.time ?? now,
            detectedAt: now,
          },
        });
      }
      this.scheduleScan('delivery');
    }

    if (event.type === 'tool/call' && (event.data?.name === 'ask_user_question' || event.data?.name === 'run_code')) {
      this.scheduleScan('question-call');
    }
    if (event.type === 'tool/result') this.scheduleScan('tool-result');
  }

  onAgentError(sessionId, message) {
    if (this.disposed) return;
    const now = this.clock();
    const stored = this.store.state.sessions[sessionId] ?? {};
    const id = itemIds.agentError(sessionId, Math.floor(now / 60_000), message);
    this.store.upsertItem({
      id,
      kind: 'interruption',
      sessionId,
      sessionTitle: stored.title ?? '',
      cwd: stored.cwd ?? '',
      projectId: stored.projectId ?? null,
      createdAt: now,
      updatedAt: now,
      interruption: {
        kind: 'agent-error',
        turn: null,
        error: { message, code: 'AGENT_ERROR' },
        seq: null,
        time: now,
        detectedAt: now,
      },
    });
    void this.store.save();
  }

  onStatus(sessionId, running) {
    if (this.disposed) return;
    const stored = this.store.state.sessions[sessionId];
    if (stored !== undefined) stored.running = running;
    if (!running) this.scheduleScan('agent-idle');
  }

  snapshot() {
    this.capabilities = this.detectCapabilities();
    const snapshot = this.store.snapshot();
    return {
      ...snapshot,
      runtime: {
        pluginVersion: readPluginVersion(),
        runtimeVersion: this.runtimeVersion,
        capabilities: this.capabilities,
        scanning: this.scanning,
        now: this.clock(),
        stateFile: this.stateFile,
      },
    };
  }

  markRead(id) {
    if (!isRecord({ id }) || typeof id !== 'string' || id === '') throw new InboxError('id is required', 'BAD_REQUEST');
    if (!this.store.markRead(id)) throw new InboxError('Item not found', 'NOT_FOUND');
    void this.store.save();
    return this.snapshot();
  }

  markAllRead() {
    const ids = this.store.items().filter(item => item.state === 'open' && item.readAt === null).map(item => item.id);
    this.store.markAllRead(ids);
    void this.store.save();
    return this.snapshot();
  }

  settle(id, action) {
    if (typeof id !== 'string' || id === '') throw new InboxError('id is required', 'BAD_REQUEST');
    if (action !== 'done' && action !== 'ignore') throw new InboxError('action must be done or ignore', 'BAD_REQUEST');
    const item = this.store.settle(id, {
      state: action === 'ignore' ? 'ignored' : 'done',
      by: 'user',
      reason: action === 'ignore' ? 'ignored' : 'reviewed',
    });
    if (item === null) throw new InboxError('Item not found', 'NOT_FOUND');
    void this.store.save();
    return this.snapshot();
  }

  assign(sessionId, projectId) {
    if (typeof sessionId !== 'string' || sessionId === '') throw new InboxError('sessionId is required', 'BAD_REQUEST');
    let normalized = null;
    if (projectId !== null && projectId !== undefined) {
      const project = this.store.state.projects.find(entry => entry.id === projectId);
      if (project === undefined) throw new InboxError('Unknown project', 'BAD_PROJECT');
      normalized = project.id;
    }
    this.store.assign(sessionId, normalized);
    void this.store.save();
    return this.snapshot();
  }

  async setRoots(roots) {
    if (!Array.isArray(roots)) throw new InboxError('roots must be an array', 'BAD_REQUEST');
    if (roots.length > MAX_ROOTS) throw new InboxError(`At most ${MAX_ROOTS} project roots are supported`, 'BAD_REQUEST');
    const normalized = [...new Set(roots
      .filter(root => typeof root === 'string' && root.trim() !== '')
      .map(normalizePath)
      .filter(Boolean))];
    this.store.setRoots(normalized);
    this.store.setMeta({ rootsUpdatedAt: this.clock() });
    await this.refreshProjects();
    await this.store.save();
    await this.scanNow({ full: true, reason: 'roots-updated' });
    return this.snapshot();
  }

  async answer(sessionId, callId, answers) {
    if (typeof sessionId !== 'string' || sessionId === '') throw new InboxError('sessionId is required', 'BAD_REQUEST');
    if (typeof callId !== 'string' || callId === '') throw new InboxError('callId is required', 'BAD_REQUEST');
    if (!Array.isArray(answers)) throw new InboxError('answers must be an array', 'BAD_REQUEST');
    const item = this.store.get(itemIds.question(sessionId, callId));
    if (item === null || item.state !== 'open') throw new InboxError('Question is no longer open', 'NOT_FOUND');
    const expected = new Set((item.question?.questions ?? []).map(question => question.id));
    const seen = new Set();
    for (const answer of answers) {
      if (!isRecord(answer) || typeof answer.id !== 'string' || !Array.isArray(answer.selected)) {
        throw new InboxError('Each answer needs id and selected[]', 'BAD_ANSWER');
      }
      if (!expected.has(answer.id) || seen.has(answer.id)) throw new InboxError('Answer ids must match the question batch', 'BAD_ANSWER');
      seen.add(answer.id);
      if (answer.custom !== undefined && typeof answer.custom !== 'string') throw new InboxError('custom must be text', 'BAD_ANSWER');
    }
    if (seen.size !== expected.size) throw new InboxError('Answer batch must name every question exactly once', 'BAD_ANSWER');

    const controller = this.ctx.get('sessionController');
    if (!hasMethods(controller, ['resolveAgent'])) throw new InboxError('Session controller is unavailable', 'UNSUPPORTED');
    const resolved = await controller.resolveAgent(sessionId);
    if (!resolved?.agent) {
      throw new InboxError(resolved?.error?.message ?? 'Session could not be resumed', 'AGENT_UNAVAILABLE');
    }
    const questions = this.ctx.get('userQuestions');
    if (!hasMethods(questions, ['answer'])) throw new InboxError('User questions are unavailable', 'UNSUPPORTED');
    let accepted = false;
    try {
      accepted = questions.answer(resolved.agent, callId, { answers });
    } catch (error) {
      throw new InboxError(error?.message ?? 'The answer was rejected', error?.code ?? 'ANSWER_REJECTED');
    }
    if (accepted !== true) {
      throw new InboxError(
        '该问题仍在原会话前台等待回答；请先在原会话回答，或等待它转为可远程回答。',
        'QUESTION_OPEN',
      );
    }
    this.store.settle(item.id, { state: 'done', by: 'user', reason: 'answered' });
    await this.store.save();
    this.scheduleScan('answered');
    return this.snapshot();
  }

  async reply(sessionId, text, itemId = null) {
    if (typeof sessionId !== 'string' || sessionId === '') throw new InboxError('sessionId is required', 'BAD_REQUEST');
    const content = typeof text === 'string' && text.trim() !== '' ? text.trim() : '继续';
    const controller = this.ctx.get('sessionController');
    if (!hasMethods(controller, ['prompt'])) throw new InboxError('Session controller is unavailable', 'UNSUPPORTED');
    try {
      await controller.prompt({
        requestId: randomUUID(),
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: content }],
      }, this.signal);
    } catch (error) {
      throw new InboxError(error?.message ?? 'The prompt was rejected', error?.code ?? 'PROMPT_FAILED');
    }
    if (typeof itemId === 'string' && itemId !== '') {
      this.store.settle(itemId, { state: 'done', by: 'user', reason: 'continued' });
    }
    await this.store.save();
    this.scheduleScan('continued');
    return this.snapshot();
  }

  async preview(sessionId, path) {
    const { absolutePath, session } = this.#resolveDeliveredFile(sessionId, path);
    let info;
    try {
      info = await stat(absolutePath);
    } catch {
      throw new InboxError('File not found', 'FILE_NOT_FOUND');
    }
    if (!info.isFile()) throw new InboxError('Not a regular file', 'FILE_NOT_FOUND');
    if (info.size > MAX_TEXT_PREVIEW) {
      return { path, absolutePath, size: info.size, kind: 'binary', truncated: true };
    }
    const data = await readFile(absolutePath).catch(() => null);
    if (data === null) throw new InboxError('File could not be read', 'FILE_READ_FAILED');
    const probe = data.subarray(0, 8192);
    if (probe.includes(0)) return { path, absolutePath, size: info.size, kind: 'binary', truncated: false };
    return {
      path,
      absolutePath,
      size: info.size,
      kind: 'text',
      text: data.toString('utf8'),
      truncated: false,
      cwd: session?.cwd ?? null,
    };
  }

  async reveal(sessionId, path) {
    const { absolutePath } = this.#resolveDeliveredFile(sessionId, path);
    const controller = this.ctx.get('sessionController');
    if (!hasMethods(controller, ['openWorkspacePath'])) throw new InboxError('Desktop reveal is unavailable', 'UNSUPPORTED');
    try {
      await controller.openWorkspacePath({ path: absolutePath, action: 'reveal' }, this.signal);
    } catch (error) {
      throw new InboxError(error?.message ?? 'Reveal failed', error?.code ?? 'REVEAL_FAILED');
    }
    return { ok: true };
  }

  #resolveDeliveredFile(sessionId, path) {
    if (typeof sessionId !== 'string' || typeof path !== 'string' || path.trim() === '') {
      throw new InboxError('sessionId and path are required', 'BAD_REQUEST');
    }
    const session = this.store.state.sessions[sessionId];
    const cwd = session?.cwd ?? '';
    if (cwd === '' && !isAbsoluteLike(path)) {
      throw new InboxError('The session has no working directory for this relative path', 'FILE_NOT_DELIVERED');
    }
    const allowed = new Set();
    for (const item of this.store.items()) {
      if (item.sessionId !== sessionId || item.kind !== 'delivery') continue;
      for (const file of item.delivery?.files ?? []) {
        const resolved = normalizePath(isAbsoluteLike(file.path) ? file.path : joinPath(cwd, file.path));
        if (resolved) allowed.add(resolved);
      }
    }
    const request = normalizePath(isAbsoluteLike(path) ? path : joinPath(cwd, path));
    if (!allowed.has(request)) throw new InboxError('Only files declared as deliverables can be opened', 'FILE_NOT_DELIVERED');
    return { absolutePath: request, session };
  }
}

function isAbsoluteLike(value) {
  return /^[A-Za-z]:[\\/]/.test(value) || String(value).startsWith('/') || String(value).startsWith('\\\\');
}

function readPluginVersion() {
  try {
    const text = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    return JSON.parse(text).version ?? null;
  } catch {
    return null;
  }
}

async function readRuntimeVersion() {
  try {
    const runtime = await import('@deepseek-ai/dsh/package.json', { with: { type: 'json' } });
    return runtime.default?.version ?? null;
  } catch {
    return null;
  }
}

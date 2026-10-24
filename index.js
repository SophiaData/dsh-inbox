import z from '@deepseek-ai/schemastery';
import { InboxError, InboxService } from './lib/service.js';

export const name = 'dsh-inbox-plugin';
export const inject = [];

const rpcPrefix = 'dsh-inbox.';

/** All configuration is optional; the panel can edit roots at runtime without rewriting the patch. */
export const Config = z.object({
  projectRoots: z.array(z.string()).default([]),
  lookbackDays: z.number().default(30),
  backfillDays: z.number().default(7),
  maxSessions: z.number().default(300),
  includeSubagents: z.boolean().default(false),
  scanIntervalSeconds: z.number().default(60),
  retentionDays: z.number().default(30),
  questionLookbackDays: z.number().default(14),
});

const RPC_METHODS = [
  'inbox.snapshot',
  'inbox.mark-read',
  'inbox.mark-all-read',
  'inbox.settle',
  'inbox.assign',
  'inbox.set-roots',
  'inbox.rescan',
  'inbox.answer',
  'inbox.reply',
  'inbox.preview',
  'inbox.reveal',
];

const MUTATIONS = new Set([
  'inbox.mark-read',
  'inbox.mark-all-read',
  'inbox.settle',
  'inbox.assign',
  'inbox.set-roots',
  'inbox.rescan',
  'inbox.answer',
  'inbox.reply',
  'inbox.reveal',
]);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function payloadOf(message) {
  return isRecord(message?.payload) ? message.payload : {};
}

export function apply(ctx, config = {}) {
  const service = new InboxService(ctx, config);

  async function handleRpc(method, payload) {
    try {
      let value;
      switch (method) {
        case 'inbox.snapshot':
          value = service.snapshot();
          break;
        case 'inbox.mark-read':
          value = service.markRead(payload.id);
          break;
        case 'inbox.mark-all-read':
          value = service.markAllRead();
          break;
        case 'inbox.settle':
          value = service.settle(payload.id, payload.action);
          break;
        case 'inbox.assign':
          value = service.assign(payload.sessionId, payload.projectId ?? null);
          break;
        case 'inbox.set-roots':
          value = await service.setRoots(payload.roots);
          break;
        case 'inbox.rescan':
          await service.scanNow({ full: payload.full === true, reason: 'rpc' });
          value = service.snapshot();
          break;
        case 'inbox.answer':
          value = await service.answer(payload.sessionId, payload.callId, payload.answers);
          break;
        case 'inbox.reply':
          value = await service.reply(payload.sessionId, payload.text, payload.itemId ?? null);
          break;
        case 'inbox.preview':
          value = await service.preview(payload.sessionId, payload.path);
          break;
        case 'inbox.reveal':
          value = await service.reveal(payload.sessionId, payload.path);
          break;
        default:
          throw new InboxError('Unknown RPC method', 'BAD_REQUEST');
      }
      return { ok: true, value };
    } catch (error) {
      const known = error instanceof InboxError;
      return {
        ok: false,
        error: {
          code: known ? error.code : 'INBOX_OPERATION_FAILED',
          message: known ? error.message : 'Host operation failed; check the DSH logs.',
          details: {},
        },
      };
    }
  }

  ctx.inject(['connection'], webCtx => {
    if (typeof webCtx.connection?.fetch?.register !== 'function') return;
    webCtx.effect(function* registerRoutes() {
      for (const method of RPC_METHODS) {
        const endpoint = rpcPrefix + method;
        yield webCtx.connection.fetch.register({
          path: `/api/${endpoint}`,
          methods: ['POST'],
          requestBody: 'buffered',
          async fetch(request) {
            let message;
            try {
              message = await request.json();
            } catch {
              return new Response('Invalid JSON request', { status: 400 });
            }
            if (!isRecord(message) || message.type !== 'client-request'
              || typeof message.rpcId !== 'string' || message.method !== endpoint) {
              return new Response('Invalid RPC request', { status: 400 });
            }
            const denied = admit(webCtx, request, method);
            if (denied !== null) {
              return Response.json({
                type: 'server-response',
                rpcId: message.rpcId,
                result: { ok: false, error: { code: 'INBOX_FORBIDDEN', message: denied, details: {} } },
              });
            }
            const result = await handleRpc(method, payloadOf(message));
            return Response.json({ type: 'server-response', rpcId: message.rpcId, result });
          },
        });
      }
    }, 'dsh-inbox API routes');
  });

  ctx.effect(() => {
    void service.start().catch(error => {
      ctx.logger?.warn?.(`dsh-inbox: start failed: ${String(error)}`);
    });
    return () => {
      void service.dispose();
    };
  }, 'dsh-inbox service');
}

function admit(webCtx, request, method) {
  if (typeof webCtx.connection?.admit !== 'function') return null;
  let admission;
  try {
    admission = webCtx.connection.admit(request);
  } catch {
    return 'This request needs a local owner session.';
  }
  const peer = admission && 'peer' in admission ? admission.peer : undefined;
  if (!isRecord(peer?.principal) || peer.principal.kind !== 'owner') {
    return 'Inbox data is visible only to the local owner session.';
  }
  if (MUTATIONS.has(method) && peer.interactions !== 'answer') {
    return 'This action needs a local session that can confirm it.';
  }
  return null;
}

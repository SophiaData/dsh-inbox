const MAX_FIRST_MESSAGE = 600;
const MAX_TITLE = 80;

/** Join the text blocks of one message and cap the result for local storage. */
export function textOfMessage(message, limit = MAX_FIRST_MESSAGE) {
  if (!message || !Array.isArray(message.content)) return '';
  const text = message.content
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function titleFromFirstMessage(firstMessage) {
  const firstLine = String(firstMessage ?? '').split('\n').map(line => line.trim()).find(Boolean) ?? '';
  return firstLine.length > MAX_TITLE ? `${firstLine.slice(0, MAX_TITLE - 1)}…` : firstLine;
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files
    .filter(file => file && typeof file.path === 'string' && file.path.trim() !== '')
    .map(file => ({
      path: file.path,
      ...(typeof file.description === 'string' && file.description.trim() !== ''
        ? { description: file.description }
        : {}),
    }));
}

/**
 * Fold one Session log into the facts the inbox needs.
 * `running` decides whether an open turn is a real interruption or ordinary work.
 */
export function extractSessionFacts(events, { running = false, inheritedEventCount = 0 } = {}) {
  let firstMessage = '';
  let title = '';
  let openTurn = null;
  let lastSeq = -1;
  let questionCall = false;
  const deliveries = [];
  const interruptions = [];
  const endedTurns = new Map();

  for (const event of events ?? []) {
    if (!event || typeof event.type !== 'string') continue;
    if (Number.isInteger(event.seq)) lastSeq = Math.max(lastSeq, event.seq);
    const owned = !Number.isInteger(event.seq) || event.seq >= inheritedEventCount;
    switch (event.type) {
      case 'user/message': {
        if (firstMessage === '' && event.data?.source?.kind === 'user') {
          firstMessage = textOfMessage(event.data);
        }
        break;
      }
      case 'session/title': {
        if (typeof event.data?.title === 'string' && event.data.title.trim() !== '') {
          title = event.data.title.trim();
        }
        break;
      }
      case 'turn/start': {
        if (owned && Number.isInteger(event.data?.turn)) openTurn = event.data.turn;
        break;
      }
      case 'turn/end': {
        if (!owned) break;
        const turn = event.data?.turn;
        const reason = event.data?.reason;
        if (Number.isInteger(turn)) {
          if (openTurn === turn) openTurn = null;
          endedTurns.set(turn, reason);
        }
        if (reason?.kind === 'error') {
          interruptions.push({
            kind: 'error',
            turn: Number.isInteger(turn) ? turn : null,
            error: reason.error ?? null,
            seq: event.seq,
            time: event.time,
          });
        } else if (reason?.kind === 'interrupted') {
          interruptions.push({
            kind: 'interrupted',
            turn: Number.isInteger(turn) ? turn : null,
            seq: event.seq,
            time: event.time,
          });
        }
        break;
      }
      case 'deliverables/presented': {
        if (!owned) break;
        const files = normalizeFiles(event.data?.files);
        if (files.length > 0) {
          deliveries.push({
            turn: Number.isInteger(event.data?.turn) ? event.data.turn : null,
            callId: typeof event.data?.callId === 'string' ? event.data.callId : null,
            files,
            seq: event.seq,
            time: event.time,
          });
        }
        break;
      }
      case 'tool/call': {
        if (owned && (event.data?.name === 'ask_user_question' || event.data?.name === 'run_code')) questionCall = true;
        break;
      }
      default:
        break;
    }
  }

  if (openTurn !== null && running === false) {
    interruptions.push({ kind: 'open-turn', turn: openTurn, seq: lastSeq, time: null });
  }

  return {
    firstMessage,
    title: title || titleFromFirstMessage(firstMessage),
    lastSeq,
    openTurn,
    questionCall,
    deliveries: latestDeliveryPerTurn(deliveries),
    interruptions,
    endedTurns,
  };
}

/** A later `present` in the same turn replaces the earlier card. */
function latestDeliveryPerTurn(deliveries) {
  const byTurn = new Map();
  for (const delivery of deliveries) {
    const key = delivery.turn ?? `call:${delivery.callId ?? delivery.seq}`;
    const previous = byTurn.get(key);
    if (previous === undefined || (delivery.seq ?? -1) >= (previous.seq ?? -1)) byTurn.set(key, delivery);
  }
  return [...byTurn.values()];
}

/** Item identity helpers shared by the service and the tests. */
export const itemIds = {
  question: (sessionId, callId) => `question:${sessionId}:${callId}`,
  delivery: (sessionId, turn, fallback = '0') => `delivery:${sessionId}:${turn ?? fallback}`,
  interruption: (sessionId, turn, fallback = 'open') => `interruption:${sessionId}:${turn ?? fallback}`,
  agentError: (sessionId, time, message) => `interruption:${sessionId}:agent:${time}:${hash(message)}`,
};

/** Stable short hash for deduplicating agent errors that carry no sequence number. */
export function hash(value) {
  let result = 0;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    result = ((result << 5) - result + text.charCodeAt(index)) | 0;
  }
  return Math.abs(result).toString(36);
}

/** Normalize a question projection into plain data safe for the RPC snapshot. */
export function questionViewOf(projection) {
  if (!projection || !Array.isArray(projection.active)) {
    return { active: [], settled: [] };
  }
  return {
    active: projection.active
      .filter(question => question && typeof question.callId === 'string')
      .map(question => ({
        callId: question.callId,
        state: question.state === 'continued' ? 'continued' : 'open',
        questions: (Array.isArray(question.questions) ? question.questions : []).map(item => ({
          id: String(item.id ?? ''),
          question: String(item.question ?? ''),
          ...(typeof item.detail === 'string' ? { detail: item.detail } : {}),
          ...(typeof item.header === 'string' ? { header: item.header } : {}),
          ...(Array.isArray(item.options)
            ? {
                options: item.options
                  .filter(option => option && typeof option.label === 'string')
                  .map(option => ({
                    label: option.label,
                    ...(typeof option.description === 'string' ? { description: option.description } : {}),
                  })),
              }
            : {}),
          ...(item.multiSelect === true ? { multiSelect: true } : {}),
          ...(item.intent && item.intent.kind === 'plan-review' ? { intent: 'plan-review' } : {}),
        })),
      })),
    settled: Array.isArray(projection.settled)
      ? projection.settled.map(item => ({
          callId: item.callId,
          answers: Array.isArray(item.answers) ? item.answers : [],
        }))
      : [],
  };
}

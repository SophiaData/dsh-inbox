import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSessionFacts, questionViewOf, textOfMessage } from '../lib/events.js';

function event(type, seq, data, time = seq + 1) {
  return { type, seq, time, data };
}

test('textOfMessage joins text blocks and ignores non-text content', () => {
  assert.equal(textOfMessage({ content: [{ type: 'text', text: 'a' }, { type: 'image' }, { type: 'text', text: 'b' }] }), 'a\nb');
  assert.equal(textOfMessage({ content: [] }), '');
});

test('first human message, title, delivery, and an error turn are extracted', () => {
  const events = [
    event('session/title', 0, { title: 'Alpha work' }),
    event('user/message', 1, { source: { kind: 'system' }, content: [{ type: 'text', text: 'synthetic' }] }),
    event('user/message', 2, { source: { kind: 'user' }, content: [{ type: 'text', text: 'fix alpha' }] }),
    event('turn/start', 3, { turn: 1 }),
    event('deliverables/presented', 4, { turn: 1, callId: 'c1', files: [{ path: 'out/a.md', description: 'report' }] }),
    event('turn/end', 5, { turn: 1, reason: { kind: 'error', error: { message: 'boom', code: 'LLM_DOWN' } } }),
  ];
  const facts = extractSessionFacts(events, { running: false });
  assert.equal(facts.title, 'Alpha work');
  assert.equal(facts.firstMessage, 'fix alpha');
  assert.equal(facts.lastSeq, 5);
  assert.equal(facts.openTurn, null);
  assert.equal(facts.deliveries.length, 1);
  assert.equal(facts.deliveries[0].files[0].path, 'out/a.md');
  assert.equal(facts.interruptions.length, 1);
  assert.equal(facts.interruptions[0].kind, 'error');
  assert.equal(facts.interruptions[0].error.code, 'LLM_DOWN');
});

test('an open turn is an interruption only when the session is not running', () => {
  const events = [event('turn/start', 0, { turn: 2 })];
  assert.equal(extractSessionFacts(events, { running: true }).interruptions.length, 0);
  const cold = extractSessionFacts(events, { running: false });
  assert.equal(cold.interruptions.length, 1);
  assert.equal(cold.interruptions[0].kind, 'open-turn');
  assert.equal(cold.interruptions[0].turn, 2);
});

test('interrupted closers and completed turns are distinguished', () => {
  const interrupted = extractSessionFacts([
    event('turn/start', 0, { turn: 1 }),
    event('turn/end', 1, { turn: 1, reason: { kind: 'interrupted' } }),
  ]);
  assert.equal(interrupted.interruptions[0].kind, 'interrupted');
  const completed = extractSessionFacts([
    event('turn/start', 0, { turn: 1 }),
    event('turn/end', 1, { turn: 1, reason: { kind: 'completed' } }),
  ]);
  assert.equal(completed.interruptions.length, 0);
  assert.equal(completed.endedTurns.get(1).kind, 'completed');
});

test('a later present in the same turn replaces the earlier delivery', () => {
  const facts = extractSessionFacts([
    event('deliverables/presented', 0, { turn: 1, callId: 'a', files: [{ path: 'old.md' }] }),
    event('deliverables/presented', 1, { turn: 1, callId: 'b', files: [{ path: 'new.md' }] }),
  ]);
  assert.equal(facts.deliveries.length, 1);
  assert.equal(facts.deliveries[0].files[0].path, 'new.md');
});

test('fork-inherited deliveries and interruptions belong to the parent, not the child', () => {
  const inherited = [
    event('turn/start', 0, { turn: 1 }),
    event('deliverables/presented', 1, { turn: 1, callId: 'parent', files: [{ path: 'parent.md' }] }),
    event('turn/end', 2, { turn: 1, reason: { kind: 'error', error: { message: 'parent boom', code: 'X' } } }),
    event('deliverables/presented', 3, { turn: 2, callId: 'child', files: [{ path: 'child.md' }] }),
  ];
  const facts = extractSessionFacts(inherited, { inheritedEventCount: 3 });
  assert.equal(facts.deliveries.length, 1);
  assert.equal(facts.deliveries[0].files[0].path, 'child.md');
  assert.equal(facts.interruptions.length, 0);
});

test('question projection is narrowed to plain RPC data', () => {
  const view = questionViewOf({
    active: [{
      callId: 'call-1',
      state: 'continued',
      questions: [{
        id: 'q1',
        question: 'Pick one',
        options: [{ label: 'A', description: 'first' }],
        multiSelect: true,
        intent: { kind: 'plan-review', approve: 'A' },
      }],
    }],
    settled: [{ callId: 'call-0', answers: [{ id: 'q0', selected: ['B'] }] }],
  });
  assert.equal(view.active[0].state, 'continued');
  assert.equal(view.active[0].questions[0].multiSelect, true);
  assert.equal(view.active[0].questions[0].intent, 'plan-review');
  assert.deepEqual(view.settled[0].answers, [{ id: 'q0', selected: ['B'] }]);
});

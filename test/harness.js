const now = Date.now();
const projects = [
  { id: "E:/dw-modeling-template", name: "dw-modeling-template", path: "E:/dw-modeling-template", aliases: ["dw"], marker: ".git" },
  { id: "E:/dev-day", name: "dev-day", path: "E:/dev-day", aliases: ["dev"], marker: ".git" },
];
const items = [
  {
    id: "question:s1:call-1", kind: "question", sessionId: "s1",
    sessionTitle: "支付拒付件口径排查", cwd: "E:/dw-modeling-template",
    projectId: "E:/dw-modeling-template", createdAt: now - 5 * 60000, updatedAt: now - 5 * 60000,
    readAt: null, state: "open", settledAt: null, settledBy: null, settleReason: null,
    question: {
      callId: "call-1", state: "continued", detectedAt: now - 5 * 60000,
      questions: [{
        id: "q1", header: "口径确认",
        question: "拒付率按支付时间还是退款时间归属？",
        detail: "DWD 层已经按支付时间落一份，DWS 汇总前需要确认是否沿用支付时间，避免和财务口径对不上。",
        options: [
          { label: "按支付时间", description: "与 DWD 支付事实表一致，推荐" },
          { label: "按退款时间", description: "与财务退款流水一致，需要重算 DWS" },
        ],
      }],
    },
  },
  {
    id: "question:s2:call-2", kind: "question", sessionId: "s2",
    sessionTitle: "dsh inbox 插件联调", cwd: "E:/dev-day/dsh-inbox",
    projectId: "E:/dev-day", createdAt: now - 12 * 60000, updatedAt: now - 12 * 60000,
    readAt: null, state: "open", settledAt: null, settledBy: null, settleReason: null,
    question: {
      callId: "call-2", state: "open", detectedAt: now - 12 * 60000,
      questions: [{
        id: "q2", question: "收件箱面板默认展示哪些项目？",
        options: [{ label: "全部项目" }, { label: "仅未分配" }],
      }],
    },
  },
  {
    id: "interruption:s3:4", kind: "interruption", sessionId: "s3",
    sessionTitle: "周五发布巡检", cwd: "E:/dw-modeling-template",
    projectId: "E:/dw-modeling-template", createdAt: now - 26 * 60000, updatedAt: now - 26 * 60000,
    readAt: now - 20 * 60000, state: "open", settledAt: null, settledBy: null, settleReason: null,
    interruption: {
      kind: "error", turn: 4, error: { message: "upstream returned 503 after 3 retries", code: "LLM_UPSTREAM_503" },
      seq: 128, time: now - 26 * 60000, detectedAt: now - 25 * 60000,
    },
  },
  {
    id: "delivery:s4:7", kind: "delivery", sessionId: "s4",
    sessionTitle: "月度经营分析交付", cwd: "E:/dw-modeling-template",
    projectId: "E:/dw-modeling-template", createdAt: now - 48 * 60000, updatedAt: now - 48 * 60000,
    readAt: null, state: "open", settledAt: null, settledBy: null, settleReason: null,
    delivery: {
      turn: 7, callId: "present-7", seq: 260, time: now - 48 * 60000, detectedAt: now - 47 * 60000,
      files: [
        { path: "reports/2026-10-月度经营分析.md", description: "完整分析报告" },
        { path: "reports/2026-10-月度经营分析.xlsx", description: "明细数据" },
      ],
    },
  },
  {
    id: "delivery:s5:2", kind: "delivery", sessionId: "s5",
    sessionTitle: "竞品价格监控脚本", cwd: "E:/dev-day",
    projectId: "E:/dev-day", createdAt: now - 3 * 3600000, updatedAt: now - 3 * 3600000,
    readAt: now - 2 * 3600000, state: "open", settledAt: null, settledBy: null, settleReason: null,
    delivery: {
      turn: 2, callId: "present-2", seq: 80, time: now - 3 * 3600000, detectedAt: now - 3 * 3600000,
      files: [{ path: "scripts/price_monitor.py", description: "监控脚本" }],
    },
  },
  {
    id: "interruption:s6:1", kind: "interruption", sessionId: "s6",
    sessionTitle: "临时数据核对", cwd: "E:/dev-day",
    projectId: null, createdAt: now - 26 * 3600000, updatedAt: now - 26 * 3600000,
    readAt: now - 25 * 3600000, state: "done", settledAt: now - 25 * 3600000, settledBy: "user", settleReason: "continued",
    interruption: { kind: "open-turn", turn: 1, error: null, seq: 30, time: null, detectedAt: now - 26 * 3600000 },
  },
];
const threads = (() => {
  const map = new Map();
  for (const item of items) {
    const key = item.sessionId;
    if (!map.has(key)) {
      map.set(key, {
        sessionId: key,
        title: item.sessionTitle,
        cwd: item.cwd,
        projectId: item.projectId,
        counts: { open: 0, unread: 0, question: 0, delivery: 0, interruption: 0, archived: 0, settled: 0 },
        latestAt: 0,
        itemIds: [],
      });
    }
    const thread = map.get(key);
    thread.latestAt = Math.max(thread.latestAt, item.updatedAt ?? 0);
    thread.itemIds.push(item.id);
    if (item.state === "archived") thread.counts.archived += 1;
    else if (item.state === "open") {
      thread.counts.open += 1;
      if (item.readAt === null) thread.counts.unread += 1;
      thread.counts[item.kind] += 1;
    } else thread.counts.settled += 1;
  }
  return [...map.values()];
})();
const snapshot = {
  version: 1,
  projectRoots: ["E:/dw-modeling-template", "E:/dev-day"],
  projects,
  assignments: {},
  sessions: {},
  threads,
  items,
  stats: {
    open: { total: 5, unread: 3, question: 2, delivery: 2, interruption: 1 },
    done: 1,
    ignored: 0,
    archived: 0,
  },
  meta: { lastScanAt: now - 180000, lastError: null, scans: 42, lastScanReason: "interval" },
  runtime: {
    pluginVersion: "0.1.0",
    runtimeVersion: "0.2.1-rc.2",
    capabilities: { sessions: true, questions: true, prompt: true, reveal: true, profileDir: true },
    scanning: false,
    now,
    stateFile: "C:/Users/Administrator/.dsh/profiles/desktop/.dsh-inbox/state.json",
  },
};
const rpc = {
  call: async (_path, method, payload) => {
    (window.__rpcCalls ??= []).push({ method, payload });
    if (method === "dsh-inbox.inbox.preview") {
      return { ok: true, value: { kind: "text", path: payload.path, size: 42, text: "# 2026-10 月度经营分析\n\n收入环比 +8.4%，毛利率 31.2%。" } };
    }
    return { ok: true, value: snapshot };
  },
};
const registrations = [];
const ctx = {
  connection: { rpc },
  get() { return undefined; },
  inject() {},
  effect(fn) { const result = fn(); return typeof result === "function" ? result : () => {}; },
  slots: {
    inject(key, callback) { callback(); },
    register(options, component) { registrations.push({ options, component }); return () => {}; },
  },
};
window.__plugin.apply(ctx);
const main = registrations.find((entry) => entry.options.name === "main");
const actions = main.options.inject();
function useInbox(selector) {
  return React.useSyncExternalStore(
    actions.hooks.inbox.subscribe,
    () => selector(actions.hooks.inbox.getSnapshot()),
  );
}
setTimeout(() => {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(main.component, { ...actions, useInbox }));
}, 250);

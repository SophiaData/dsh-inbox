window.__ModuleLoader__.load({ id: "dsh-inbox-plugin", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
const React = require("react");
const h = React.createElement;

const NS = "dsh-inbox";
const PANEL_ID = "dsh-inbox";
const POLL_MS = 5000;

const zh = {
  panel: "收件箱",
  title: "收件箱",
  subtitle: "跨项目集中处理等待你回答、查收和关注的事。",
  "stats.open": "待处理 {count}",
  "stats.summary": "{open} 件待处理 · {sessions} 个会话",
  "stats.pending": "待处理",
  "stats.sessions": "个会话",
  "stats.unreadLabel": "未读",
  "day.sessions": "{count} 个会话",
  "stats.unread": "未读 {count}",
  "action.refresh": "刷新",
  "action.refreshing": "刷新中…",
  "action.markRead": "标记已读",
  "action.submitting": "发送中…",
  "action.markAllRead": "全部已读",
  "action.nothingUnread": "没有未读事项",
  "action.settings": "设置",
  "action.close": "关闭",
  "action.cancel": "取消",
  "action.save": "保存并扫描",
  "action.saving": "保存中…",
  "action.addRoot": "添加目录",
  "action.remove": "移除",
  "action.rescan": "立即重扫",
  "action.openSession": "在会话中打开",
  "action.preview": "预览",
  "action.reveal": "在文件夹中显示",
  "action.done": "已查收",
  "action.ignore": "忽略",
  "action.ack": "知道了",
  "action.continue": "继续会话",
  "action.submitAnswer": "发送答案",
  "action.skip": "跳过此题",
  "action.retry": "重试",
  "filter.all": "全部",
  "filter.question": "待回答",
  "filter.delivery": "待查收",
  "filter.interruption": "中断",
  "filter.settled": "已处理",
  "filter.history": "历史",
  "day.today": "今天",
  "day.yesterday": "昨天",
  "day.week": "本周",
  "day.earlier": "更早",
  "thread.pending": "{count} 条待处理",
  "thread.historyCount": "历史 {count} 条",
  "empty.history": "没有历史记录。",
  "project.all": "全部项目",
  "project.unassigned": "未分配",
  "search.placeholder": "搜索问题、文件、会话…",
  "kind.question": "待回答",
  "kind.delivery": "待查收",
  "kind.interruption": "中断",
  "kind.question.short": "问答",
  "kind.delivery.short": "交付",
  "kind.interruption.short": "中断",
  "state.answered": "已回答",
  "state.reviewed": "已查收",
  "state.ignored": "已忽略",
  "state.continued": "已继续",
  "state.turnAdvanced": "已自动恢复",
  "state.done": "已处理",
  "item.question": "待回答的问题",
  "item.deliveryFiles": "{count} 个交付文件",
  "item.interruption": "会话中断",
  "item.turn": "第 {turn} 轮",
  "item.noTurn": "轮次未知",
  "detail.session": "会话",
  "detail.project": "项目",
  "detail.time": "时间",
  "detail.turn": "回合",
  "detail.reason": "原因",
  "detail.error": "错误",
  "detail.files": "交付文件",
  "detail.noFiles": "这次交付没有记录文件。",
  "detail.questionProgress": "第 {index} / {total} 题",
  "detail.otherAnswer": "其他回答（可选）",
  "detail.otherPlaceholder": "输入自定义回答…",
  "detail.openHint": "该问题正在原会话前台等待。这里提交会尝试直接回答；若 DSH 仍要求前台回答，将提示你打开原会话。",
  "detail.continuedHint": "该问题已进入可远程回答状态（超时或重启后继续）。提交后会作为新一轮用户消息继续该会话。",
  "detail.answerRequired": "请回答第 {index} 题，或点「跳过此题」。",
  "detail.answered": "答案已发送。",
  "detail.openFallback": "DSH 要求在原会话前台回答。已为你准备好跳转。",
  "detail.continueHint": "给会话补一句话再继续；留空则发送「继续」。",
  "detail.continuePlaceholder": "补充说明（可选）…",
  "detail.interruption.error": "模型或宿主报错导致本回合中断。检查错误后可以继续该会话。",
  "detail.interruption.interrupted": "宿主崩溃或重启导致本回合中断。事件日志已保留，继续会话会开启新回合。",
  "detail.interruption.openTurn": "检测到一个没有结束标记的回合，且会话当前不在运行。通常是宿主重启或崩溃留下的。",
  "detail.interruption.agentError": "Agent 在回合之外报告了错误。",
  "detail.settled": "该条目已处理，查看记录不会重新打开。",
  "detail.noSelection": "从左侧选择一条收件箱事项。",
  "empty.all": "收件箱是空的。",
  "empty.filter": "这个筛选下没有待处理事项。",
  "empty.settled": "还没有已处理记录。",
  "empty.hint": "问题、交付和中断会自动汇总到这里。",
  "empty.setup": "先配置项目目录，收件箱才能自动归组。",
  "settings.title": "收件箱设置",
  "settings.roots": "项目目录",
  "settings.rootsHint": "扫描每个目录下的直接子目录作为项目；带 .git、package.json 等标记的目录优先。会话按 cwd、标题和首条用户消息自动归组。",
  "settings.rootPlaceholder": "例如 E:\\dev-day",
  "settings.projects": "已识别项目",
  "settings.noProjects": "还没有识别到项目。添加目录后点「保存并扫描」。",
  "settings.runtime": "运行信息",
  "settings.pluginVersion": "插件版本",
  "settings.runtimeVersion": "DSH 版本",
  "settings.lastScan": "上次扫描",
  "settings.scanning": "正在扫描…",
  "settings.lastError": "最近错误",
  "settings.capabilities": "能力",
  "settings.capability.sessions": "会话扫描",
  "settings.capability.questions": "远程回答",
  "settings.capability.prompt": "继续会话",
  "settings.capability.reveal": "文件定位",
  "settings.capability.yes": "可用",
  "settings.capability.no": "不可用",
  "settings.storage": "状态文件",
  "settings.rootsSaved": "项目目录已保存，正在重新扫描。",
  "notice.read": "已标记为已读。",
  "notice.settled": "已处理。",
  "notice.ignored": "已忽略。",
  "notice.assigned": "项目归属已更新。",
  "notice.refreshed": "已刷新。",
  "notice.opened": "已在原会话中打开。",
  "notice.copied": "已复制。",
  "notice.noWorkspace": "当前客户端不支持切换会话。",
  "notice.previewFailed": "预览失败。",
  "error.load": "收件箱读取失败：{message}",
  "error.unsupported": "当前 DSH 部署缺少收件箱依赖的接口。",
  "error.action": "操作失败：{message}",
  "error.backend": "Host 未返回有效数据。",
  "time.now": "刚刚",
  "time.minutes": "{count} 分钟前",
  "time.hours": "{count} 小时前",
  "time.days": "{count} 天前",
  "time.yesterday": "昨天",
  "reason.error": "模型报错",
  "reason.interrupted": "宿主重启/崩溃",
  "reason.openTurn": "未闭合回合",
  "reason.agentError": "Agent 错误",
  "badge.unread": "未读",
  "badge.settled": "已处理",
  "badge.open": "待处理",
  "preview.title": "文件预览",
  "preview.loading": "正在读取…",
  "preview.binary": "二进制或过大的文件，无法在面板内预览（{size}）。",
  "preview.truncated": "文件较大，仅显示开头部分。",
  "preview.empty": "文件为空。",
  "confirm.markAll": "把当前所有未读事项标记为已读？这不会结算任何事项。",
};

const en = {
  panel: "Inbox",
  title: "Inbox",
  subtitle: "One place for questions, deliverables, and interrupted turns across projects.",
  "stats.open": "{count} open",
  "stats.summary": "{open} pending · {sessions} sessions",
  "stats.pending": "pending",
  "stats.sessions": "sessions",
  "stats.unreadLabel": "unread",
  "day.sessions": "{count} sessions",
  "stats.unread": "{count} unread",
  "action.refresh": "Refresh",
  "action.refreshing": "Refreshing…",
  "action.markRead": "Mark read",
  "action.submitting": "Sending…",
  "action.markAllRead": "Mark all read",
  "action.nothingUnread": "Nothing unread",
  "action.settings": "Settings",
  "action.close": "Close",
  "action.cancel": "Cancel",
  "action.save": "Save and scan",
  "action.saving": "Saving…",
  "action.addRoot": "Add folder",
  "action.remove": "Remove",
  "action.rescan": "Rescan now",
  "action.openSession": "Open session",
  "action.preview": "Preview",
  "action.reveal": "Show in folder",
  "action.done": "Reviewed",
  "action.ignore": "Ignore",
  "action.ack": "Got it",
  "action.continue": "Continue session",
  "action.submitAnswer": "Send answer",
  "action.skip": "Skip this question",
  "action.retry": "Retry",
  "filter.all": "All",
  "filter.question": "Questions",
  "filter.delivery": "Deliverables",
  "filter.interruption": "Interruptions",
  "filter.settled": "Settled",
  "filter.history": "History",
  "day.today": "Today",
  "day.yesterday": "Yesterday",
  "day.week": "This week",
  "day.earlier": "Earlier",
  "thread.pending": "{count} pending",
  "thread.historyCount": "History {count}",
  "empty.history": "No history yet.",
  "project.all": "All projects",
  "project.unassigned": "Unassigned",
  "search.placeholder": "Search questions, files, sessions…",
  "kind.question": "Question",
  "kind.delivery": "Deliverable",
  "kind.interruption": "Interruption",
  "kind.question.short": "Q&A",
  "kind.delivery.short": "Files",
  "kind.interruption.short": "Alert",
  "state.answered": "Answered",
  "state.reviewed": "Reviewed",
  "state.ignored": "Ignored",
  "state.continued": "Continued",
  "state.turnAdvanced": "Recovered",
  "state.done": "Settled",
  "item.question": "Question waiting",
  "item.deliveryFiles": "{count} delivered files",
  "item.interruption": "Turn interrupted",
  "item.turn": "Turn {turn}",
  "item.noTurn": "Unknown turn",
  "detail.session": "Session",
  "detail.project": "Project",
  "detail.time": "Time",
  "detail.turn": "Turn",
  "detail.reason": "Reason",
  "detail.error": "Error",
  "detail.files": "Delivered files",
  "detail.noFiles": "No files were recorded for this delivery.",
  "detail.questionProgress": "Question {index} of {total}",
  "detail.otherAnswer": "Other answer (optional)",
  "detail.otherPlaceholder": "Type a custom answer…",
  "detail.openHint": "This question is still waiting in the original session. Submitting here tries a direct answer; if DSH requires the foreground card, you will be offered the session.",
  "detail.continuedHint": "This question is answerable remotely after a timeout or restart. Submitting continues the session as a new user turn.",
  "detail.answerRequired": "Answer question {index}, or choose Skip this question.",
  "detail.answered": "Answer sent.",
  "detail.openFallback": "DSH requires this question to be answered in the foreground. A session jump is ready.",
  "detail.continueHint": "Add a line before continuing; leave empty to send “continue”.",
  "detail.continuePlaceholder": "Extra instruction (optional)…",
  "detail.interruption.error": "A model or host error interrupted this turn. Review the error, then continue the session.",
  "detail.interruption.interrupted": "A host crash or restart interrupted this turn. The log is intact; continuing starts a new turn.",
  "detail.interruption.openTurn": "A turn has no end marker and the session is not running. This usually comes from a host crash or restart.",
  "detail.interruption.agentError": "The agent reported an error outside a turn.",
  "detail.settled": "This item is settled. Viewing its record does not reopen it.",
  "detail.noSelection": "Pick an inbox item on the left.",
  "empty.all": "Your inbox is empty.",
  "empty.filter": "Nothing open under this filter.",
  "empty.settled": "No settled records yet.",
  "empty.hint": "Questions, deliverables, and interruptions collect here automatically.",
  "empty.setup": "Add project folders so the inbox can group sessions.",
  "settings.title": "Inbox settings",
  "settings.roots": "Project folders",
  "settings.rootsHint": "Each immediate child folder becomes a project; folders with .git, package.json, and similar markers rank higher. Sessions are grouped by cwd, title, and first user message.",
  "settings.rootPlaceholder": "e.g. E:\\dev-day",
  "settings.projects": "Detected projects",
  "settings.noProjects": "No projects detected yet. Add a folder and choose Save and scan.",
  "settings.runtime": "Runtime",
  "settings.pluginVersion": "Plugin",
  "settings.runtimeVersion": "DSH",
  "settings.lastScan": "Last scan",
  "settings.scanning": "Scanning…",
  "settings.lastError": "Last error",
  "settings.capabilities": "Capabilities",
  "settings.capability.sessions": "Session scan",
  "settings.capability.questions": "Remote answers",
  "settings.capability.prompt": "Continue session",
  "settings.capability.reveal": "Reveal file",
  "settings.capability.yes": "available",
  "settings.capability.no": "unavailable",
  "settings.storage": "State file",
  "settings.rootsSaved": "Project folders saved; scanning again.",
  "notice.read": "Marked read.",
  "notice.settled": "Settled.",
  "notice.ignored": "Ignored.",
  "notice.assigned": "Project updated.",
  "notice.refreshed": "Refreshed.",
  "notice.opened": "Opened in the original session.",
  "notice.copied": "Copied.",
  "notice.noWorkspace": "This client cannot switch sessions.",
  "notice.previewFailed": "Preview failed.",
  "error.load": "Inbox read failed: {message}",
  "error.unsupported": "This DSH deployment is missing an interface the inbox needs.",
  "error.action": "Action failed: {message}",
  "error.backend": "The host returned no valid data.",
  "time.now": "just now",
  "time.minutes": "{count}m ago",
  "time.hours": "{count}h ago",
  "time.days": "{count}d ago",
  "time.yesterday": "yesterday",
  "reason.error": "Model error",
  "reason.interrupted": "Host restart/crash",
  "reason.openTurn": "Unclosed turn",
  "reason.agentError": "Agent error",
  "badge.unread": "Unread",
  "badge.settled": "Settled",
  "badge.open": "Open",
  "preview.title": "File preview",
  "preview.loading": "Reading…",
  "preview.binary": "Binary or oversized file; it cannot be previewed here ({size}).",
  "preview.truncated": "Large file; showing the beginning only.",
  "preview.empty": "The file is empty.",
  "confirm.markAll": "Mark every unread item as read? This settles nothing.",
};

function format(template, params) {
  if (!params) return template;
  return String(template).replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

const fallbackT = (key, params) => format(zh[key] ?? key, params);

function translateFrom(ctx) {
  const face = ctx.get("locale");
  if (face !== undefined && typeof face.bind === "function") return face.bind(NS);
  return fallbackT;
}

const css = `
.dsh-inbox-page{display:flex;flex-direction:column;gap:14px;height:100%;min-height:0;padding:20px 22px;color:var(--dsw-alias-label-primary,#1f2329);box-sizing:border-box;}
.dsh-inbox-page *{box-sizing:border-box;}
.dsh-inbox-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.dsh-inbox-title{display:flex;flex-direction:column;gap:4px;min-width:0;}
.dsh-inbox-title h1{margin:0;font-size:20px;font-weight:650;letter-spacing:-.01em;}
.dsh-inbox-subtitle{color:var(--dsw-alias-label-secondary,#59636e);font-size:12px;line-height:1.5;}
.dsh-inbox-header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.dsh-inbox-btn{border:1px solid var(--dsw-alias-border-l2,#cfd5dd);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1f2329);cursor:pointer;padding:6px 10px;font:inherit;font-size:12px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;}
.dsh-inbox-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#4677f5);color:var(--dsw-alias-brand-primary,#4677f5);}
.dsh-inbox-btn:disabled{cursor:not-allowed;opacity:.5;}
.dsh-inbox-btn-primary{border-color:var(--dsw-alias-brand-primary,#4677f5);background:var(--dsw-alias-brand-primary,#4677f5);color:#fff;}
.dsh-inbox-btn-primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary,#4677f5);color:#fff;opacity:.9;}
.dsh-inbox-btn-danger{color:var(--dsw-alias-state-error-primary,#d1242f);}
.dsh-inbox-btn-ghost{border-color:transparent;background:transparent;}
.dsh-inbox-btn-mini{padding:3px 7px;font-size:11px;}
.dsh-inbox-notice{border:1px solid var(--dsw-alias-border-l1,#d9dde3);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f4f6f8);padding:8px 10px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#59636e);display:flex;align-items:center;justify-content:space-between;gap:10px;}
.dsh-inbox-notice-error{border-color:var(--dsw-alias-state-error-primary,#d1242f);color:var(--dsw-alias-state-error-primary,#d1242f);}
.dsh-inbox-notice-ok{color:var(--dsw-alias-state-success-primary,#18864b);}
.dsh-inbox-notice-warn{border-color:var(--dsw-alias-state-warning-primary,#b26a00);color:var(--dsw-alias-state-warning-primary,#b26a00);}
.dsh-inbox-layout{display:grid;grid-template-columns:minmax(280px,380px) minmax(0,1fr);gap:12px;flex:1;min-height:0;}
.dsh-inbox-group{display:flex;flex-direction:column;gap:1px;padding:2px 0 8px;}
.dsh-inbox-group-title{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px 4px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary,#8a929c);}
.dsh-inbox-thread{border:0;border-left:3px solid transparent;border-radius:8px;background:transparent;color:inherit;cursor:pointer;padding:8px 10px;font:inherit;text-align:left;width:100%;display:flex;align-items:flex-start;gap:8px;}
.dsh-inbox-thread:hover{background:var(--dsw-alias-bg-layer-2,#f4f6f8);}
.dsh-inbox-thread.is-selected{background:var(--dsw-alias-bg-layer-2,#f4f6f8);border-left-color:var(--dsw-alias-brand-primary,#4677f5);}
.dsh-inbox-thread-dot-empty{flex:0 0 auto;width:7px;height:7px;border-radius:50%;background:transparent;}
.dsh-inbox-thread-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;}
.dsh-inbox-thread-title{font-size:13px;font-weight:600;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.dsh-inbox-thread-meta{font-size:10px;color:var(--dsw-alias-label-tertiary,#8a929c);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-inbox-thread-count{flex:0 0 auto;min-width:20px;text-align:center;border-radius:999px;background:var(--dsw-alias-bg-layer-2,#f4f6f8);color:var(--dsw-alias-label-secondary,#59636e);font-size:10px;padding:1px 6px;}
.dsh-inbox-thread-item{border:1px solid var(--dsw-alias-border-l1,#d9dde3);border-left:3px solid transparent;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--dsw-alias-bg-layer-1,#fff);}
.dsh-inbox-thread-item.k-question{border-left-color:var(--dsw-alias-brand-primary,#4677f5);}
.dsh-inbox-thread-item.k-interruption{border-left-color:var(--dsw-alias-state-error-primary,#d1242f);}
.dsh-inbox-thread-item.k-delivery{border-left-color:var(--dsw-alias-state-success-primary,#18864b);}
.dsh-inbox-thread-item.is-settled{opacity:.7;}
.dsh-inbox-thread-item-head{display:flex;align-items:center;gap:6px;min-width:0;}
.dsh-inbox-thread-item-title{flex:1;min-width:0;font-size:13px;font-weight:600;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-inbox-thread-item-time{flex:0 0 auto;font-size:10px;color:var(--dsw-alias-label-tertiary,#8a929c);}
.dsh-inbox-rail{border:1px solid var(--dsw-alias-border-l1,#d9dde3);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);padding:8px;display:flex;flex-direction:column;gap:2px;min-height:0;overflow:auto;}
.dsh-inbox-rail-title{font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary,#8a929c);text-transform:uppercase;letter-spacing:.05em;padding:6px 8px 4px;}
.dsh-inbox-rail-item{border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#59636e);cursor:pointer;padding:7px 8px;font:inherit;font-size:12px;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:8px;}
.dsh-inbox-rail-item:hover{background:var(--dsw-alias-bg-layer-2,#f4f6f8);}
.dsh-inbox-rail-item[aria-current="true"]{background:var(--dsw-alias-bg-layer-2,#f4f6f8);color:var(--dsw-alias-label-primary,#1f2329);font-weight:600;}
.dsh-inbox-rail-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-inbox-rail-count{flex:0 0 auto;min-width:18px;text-align:center;border-radius:999px;background:var(--dsw-alias-bg-layer-2,#f4f6f8);color:var(--dsw-alias-label-tertiary,#8a929c);font-size:10px;padding:1px 5px;}
.dsh-inbox-list-pane{border:1px solid var(--dsw-alias-border-l1,#d9dde3);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);display:flex;flex-direction:column;min-height:0;overflow:hidden;}
.dsh-inbox-filters{display:flex;gap:3px;padding:8px 8px 6px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l1,#d9dde3);}
.dsh-inbox-chip{border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary,#59636e);cursor:pointer;padding:4px 8px;font:inherit;font-size:11px;display:inline-flex;align-items:center;gap:4px;}
.dsh-inbox-chip[aria-selected="true"]{background:var(--dsw-alias-bg-layer-2,#f4f6f8);color:var(--dsw-alias-label-primary,#1f2329);font-weight:600;}
.dsh-inbox-chip-count{color:var(--dsw-alias-label-tertiary,#8a929c);font-weight:400;}
.dsh-inbox-search{padding:8px;border-bottom:1px solid var(--dsw-alias-border-l1,#d9dde3);}
.dsh-inbox-input{width:100%;border:1px solid var(--dsw-alias-border-l2,#cfd5dd);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1f2329);padding:6px 8px;font:inherit;font-size:12px;}
.dsh-inbox-input:focus{outline:2px solid var(--dsw-alias-brand-primary,#4677f5);outline-offset:1px;}
.dsh-inbox-items{flex:1;min-height:0;overflow:auto;padding:6px;}
.dsh-inbox-item{border:1px solid transparent;border-left:3px solid transparent;border-radius:8px;background:transparent;cursor:pointer;padding:9px 10px;display:flex;flex-direction:column;gap:5px;text-align:left;width:100%;font:inherit;}
.dsh-inbox-item:hover{background:var(--dsw-alias-bg-layer-2,#f4f6f8);}
.dsh-inbox-item[aria-current="true"]{background:var(--dsw-alias-bg-layer-2,#f4f6f8);border-color:var(--dsw-alias-border-l2,#cfd5dd);}
.dsh-inbox-item.k-question{border-left-color:var(--dsw-alias-brand-primary,#4677f5);}
.dsh-inbox-item.k-interruption{border-left-color:var(--dsw-alias-state-error-primary,#d1242f);}
.dsh-inbox-item.k-delivery{border-left-color:var(--dsw-alias-state-success-primary,#18864b);}
.dsh-inbox-item.is-settled{opacity:.62;}
.dsh-inbox-item-top{display:flex;align-items:center;gap:6px;min-width:0;}
.dsh-inbox-item-title{font-size:13px;font-weight:600;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;flex:1;min-width:0;}
.dsh-inbox-dot{flex:0 0 auto;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary,#4677f5);}
.dsh-inbox-item-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:10px;color:var(--dsw-alias-label-tertiary,#8a929c);}
.dsh-inbox-tag{border-radius:4px;background:var(--dsw-alias-bg-layer-2,#f4f6f8);color:var(--dsw-alias-label-secondary,#59636e);padding:1px 5px;font-size:10px;font-weight:500;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-inbox-tag-brand{color:var(--dsw-alias-brand-primary,#4677f5);}
.dsh-inbox-tag-error{color:var(--dsw-alias-state-error-primary,#d1242f);}
.dsh-inbox-tag-ok{color:var(--dsw-alias-state-success-primary,#18864b);}
.dsh-inbox-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:30px 20px;color:var(--dsw-alias-label-secondary,#59636e);text-align:center;font-size:13px;line-height:1.6;}
.dsh-inbox-empty-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#8a929c);}
.dsh-inbox-detail{border:1px solid var(--dsw-alias-border-l1,#d9dde3);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);display:flex;flex-direction:column;min-height:0;overflow:hidden;}
.dsh-inbox-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#d9dde3);}
.dsh-inbox-detail-title{display:flex;flex-direction:column;gap:5px;min-width:0;}
.dsh-inbox-detail-title h2{margin:0;font-size:15px;font-weight:650;line-height:1.4;overflow-wrap:anywhere;}
.dsh-inbox-detail-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--dsw-alias-label-tertiary,#8a929c);}
.dsh-inbox-detail-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
.dsh-inbox-detail-body{flex:1;min-height:0;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px;}
.dsh-inbox-section{border:1px solid var(--dsw-alias-border-l1,#d9dde3);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--dsw-alias-bg-layer-1,#fff);}
.dsh-inbox-section-title{font-size:12px;font-weight:650;display:flex;align-items:center;justify-content:space-between;gap:8px;}
.dsh-inbox-label{font-size:12px;font-weight:600;line-height:1.5;}
.dsh-inbox-question-text{font-size:13px;line-height:1.6;overflow-wrap:anywhere;}
.dsh-inbox-detail-text{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#59636e);white-space:pre-wrap;overflow-wrap:anywhere;}
.dsh-inbox-options{display:flex;flex-direction:column;gap:6px;}
.dsh-inbox-option{border:1px solid var(--dsw-alias-border-l2,#cfd5dd);border-radius:7px;background:var(--dsw-alias-bg-layer-1,#fff);cursor:pointer;padding:8px 10px;text-align:left;font:inherit;display:flex;flex-direction:column;gap:2px;}
.dsh-inbox-option:hover{border-color:var(--dsw-alias-brand-primary,#4677f5);}
.dsh-inbox-option[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary,#4677f5);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4677f5) 8%,transparent);}
.dsh-inbox-option-label{font-size:12px;font-weight:600;}
.dsh-inbox-option-desc{font-size:11px;color:var(--dsw-alias-label-secondary,#59636e);line-height:1.45;}
.dsh-inbox-custom{display:flex;flex-direction:column;gap:4px;}
.dsh-inbox-custom-label{font-size:11px;color:var(--dsw-alias-label-secondary,#59636e);}
.dsh-inbox-textarea{width:100%;min-height:64px;border:1px solid var(--dsw-alias-border-l2,#cfd5dd);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1f2329);padding:7px 8px;font:inherit;font-size:12px;line-height:1.5;resize:vertical;}
.dsh-inbox-textarea:focus{outline:2px solid var(--dsw-alias-brand-primary,#4677f5);outline-offset:1px;}
.dsh-inbox-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.dsh-inbox-file{border:1px solid var(--dsw-alias-border-l1,#d9dde3);border-radius:7px;padding:8px 10px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.dsh-inbox-file-main{min-width:0;display:flex;flex-direction:column;gap:3px;}
.dsh-inbox-file-path{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;overflow-wrap:anywhere;}
.dsh-inbox-file-desc{font-size:11px;color:var(--dsw-alias-label-secondary,#59636e);line-height:1.45;overflow-wrap:anywhere;}
.dsh-inbox-kv{display:grid;grid-template-columns:88px minmax(0,1fr);gap:6px 10px;font-size:11px;line-height:1.5;}
.dsh-inbox-kv dt{color:var(--dsw-alias-label-tertiary,#8a929c);margin:0;}
.dsh-inbox-kv dd{margin:0;overflow-wrap:anywhere;}
.dsh-inbox-code{border-radius:4px;background:var(--dsw-alias-bg-layer-2,#f4f6f8);padding:1px 5px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;overflow-wrap:anywhere;}
.dsh-inbox-pre{margin:0;max-height:52vh;overflow:auto;border-radius:6px;background:var(--dsw-alias-bg-layer-2,#f4f6f8);padding:10px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary,#59636e);}
.dsh-inbox-select{border:1px solid var(--dsw-alias-border-l2,#cfd5dd);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1f2329);padding:5px 7px;font:inherit;font-size:11px;max-width:220px;}
.dsh-inbox-icon-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;}
.dsh-inbox-icon-badge{position:absolute;top:-5px;right:-7px;min-width:14px;height:14px;border-radius:999px;background:var(--dsw-alias-state-error-primary,#d1242f);color:#fff;font-size:9px;line-height:14px;text-align:center;padding:0 3px;font-weight:700;box-shadow:0 0 0 1px var(--dsw-alias-bg-layer-1,#fff);}
.dsh-inbox-drawer-overlay{position:fixed;inset:0;background:rgba(15,20,28,.28);z-index:60;display:flex;justify-content:flex-end;}
.dsh-inbox-drawer{width:min(440px,100%);height:100%;background:var(--dsw-alias-bg-layer-1,#fff);border-left:1px solid var(--dsw-alias-border-l1,#d9dde3);box-shadow:-12px 0 32px rgba(15,20,28,.16);display:flex;flex-direction:column;min-height:0;}
.dsh-inbox-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#d9dde3);}
.dsh-inbox-drawer-head h2{margin:0;font-size:15px;font-weight:650;}
.dsh-inbox-drawer-body{flex:1;min-height:0;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:16px;}
.dsh-inbox-root-row{display:flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1,#d9dde3);border-radius:6px;padding:6px 8px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;overflow-wrap:anywhere;}
.dsh-inbox-root-row span{flex:1;min-width:0;}
.dsh-inbox-root-add{display:flex;gap:6px;}
.dsh-inbox-root-add .dsh-inbox-input{flex:1;}
.dsh-inbox-project-row{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l1,#d9dde3);padding:6px 0;font-size:11px;}
.dsh-inbox-project-row:last-child{border-bottom:0;}
.dsh-inbox-project-name{font-weight:600;}
.dsh-inbox-project-path{color:var(--dsw-alias-label-tertiary,#8a929c);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;overflow-wrap:anywhere;}
.dsh-inbox-capability{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;padding:2px 0;}
.dsh-inbox-modal{position:absolute;inset:0;background:rgba(15,20,28,.28);z-index:20;display:flex;align-items:center;justify-content:center;padding:24px;}
.dsh-inbox-modal-card{width:min(760px,100%);max-height:100%;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,#d9dde3);border-radius:12px;box-shadow:0 18px 48px rgba(15,20,28,.22);display:flex;flex-direction:column;min-height:0;overflow:hidden;}
.dsh-inbox-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,#d9dde3);}
.dsh-inbox-modal-title{font-size:13px;font-weight:650;overflow-wrap:anywhere;}
.dsh-inbox-modal-body{padding:14px;overflow:auto;min-height:0;}
.dsh-inbox-toast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:30;border-radius:8px;background:var(--dsw-alias-label-primary,#1f2329);color:var(--dsw-alias-bg-layer-1,#fff);padding:8px 12px;font-size:12px;box-shadow:0 8px 24px rgba(15,20,28,.2);max-width:min(560px,90%);}
.dsh-inbox-toast.error{background:var(--dsw-alias-state-error-primary,#d1242f);}
.dsh-inbox-page{position:relative;}
.dsh-inbox-skeleton{border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f4f6f8);height:56px;margin:6px;animation:dsh-inbox-pulse 1.4s ease-in-out infinite;}
@keyframes dsh-inbox-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@media(max-width:1100px){.dsh-inbox-layout{grid-template-columns:160px minmax(250px,320px) minmax(0,1fr);}}
@media(max-width:900px){.dsh-inbox-layout{grid-template-columns:minmax(0,1fr);}.dsh-inbox-rail{display:none;}.dsh-inbox-list-pane{max-height:42%;}.dsh-inbox-detail{min-height:0;}}
@media(max-width:680px){.dsh-inbox-page{padding:14px}.dsh-inbox-header{align-items:stretch;flex-direction:column}.dsh-inbox-detail-head{flex-direction:column}.dsh-inbox-detail-actions{justify-content:flex-start}.dsh-inbox-kv{grid-template-columns:1fr}.dsh-inbox-root-add{flex-direction:column}}
/* ---------- card feed ---------- */
.dsh-inbox-page{max-width:880px;margin:0 auto;padding:34px 28px 64px;gap:20px;}
.dsh-inbox-header{align-items:flex-end;gap:20px;}
.dsh-inbox-brand{display:flex;flex-direction:column;gap:6px;min-width:0;}
.dsh-inbox-title{flex-direction:row;align-items:baseline;gap:14px;}
.dsh-inbox-title h1{font-size:22px;font-weight:700;letter-spacing:-.02em;}
.dsh-inbox-subtitle{font-size:12px;color:var(--dsw-alias-label-secondary,#6B7280);}
.dsh-inbox-scan{font-size:11px;color:var(--dsw-alias-label-tertiary,#9CA3AF);}
.dsh-inbox-head-right{display:flex;align-items:center;gap:24px;flex-wrap:wrap;justify-content:flex-end;}
.dsh-inbox-stats{display:flex;gap:26px;}
.dsh-inbox-stat{display:flex;flex-direction:column;gap:3px;text-align:right;}
.dsh-inbox-stat b{font-size:26px;font-weight:750;letter-spacing:-.03em;line-height:1;color:var(--dsw-alias-label-primary,#111827);}
.dsh-inbox-stat span{font-size:11px;color:var(--dsw-alias-label-secondary,#6B7280);}
.dsh-inbox-toolbar{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,#E5E7EB);border-radius:12px;padding:6px;}
.dsh-inbox-filters{display:flex;gap:2px;flex-wrap:wrap;}
.dsh-inbox-chip{padding:7px 12px;border-radius:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#6B7280);}
.dsh-inbox-chip:hover{background:var(--dsw-alias-bg-layer-2,#F3F4F6);}
.dsh-inbox-chip[aria-selected="true"]{background:var(--dsw-alias-label-primary,#111827);color:var(--dsw-alias-bg-layer-1,#fff);font-weight:600;}
.dsh-inbox-chip[aria-selected="true"] .dsh-inbox-chip-count{color:var(--dsw-alias-bg-layer-1,#fff);opacity:.75;}
.dsh-inbox-chip-count{font-size:10.5px;font-variant-numeric:tabular-nums;}
.dsh-inbox-search{flex:1;min-width:170px;display:flex;align-items:center;gap:6px;padding:0 10px;height:32px;border:1px solid var(--dsw-alias-border-l1,#E5E7EB);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#FAFAFA);color:var(--dsw-alias-label-tertiary,#9CA3AF);}
.dsh-inbox-search .dsh-inbox-input{border:0;padding:0;height:auto;background:transparent;outline:none;}
.dsh-inbox-project-filter{max-width:190px;height:32px;border-radius:8px;}
.dsh-inbox-sheet-head:focus-visible,.dsh-inbox-entry-head:focus-visible,.dsh-inbox-chip:focus-visible,.dsh-inbox-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#2563EB);outline-offset:-2px;}
.dsh-inbox-feed{display:flex;flex-direction:column;padding-top:6px;}
.dsh-inbox-day{display:flex;flex-direction:column;}
.dsh-inbox-day-label{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:24px 4px 10px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary,#9CA3AF);}
.dsh-inbox-day-count{font-size:11px;font-weight:500;}
.dsh-inbox-sheet{border:1px solid var(--dsw-alias-border-l1,#E5E7EB);border-radius:14px;background:var(--dsw-alias-bg-layer-1,#fff);margin-bottom:9px;box-shadow:0 1px 2px rgba(17,24,39,.04);overflow:hidden;}
.dsh-inbox-sheet-head{display:grid;grid-template-columns:4px minmax(0,1fr) auto;gap:16px;align-items:center;width:100%;padding:15px 18px;border:0;background:transparent;cursor:pointer;text-align:left;font:inherit;color:inherit;}
.dsh-inbox-sheet-head:hover{background:var(--dsw-alias-bg-layer-2,#FAFAFA);}
.dsh-inbox-band{width:4px;height:34px;border-radius:2px;background:var(--dsw-alias-label-tertiary,#9CA3AF);}
.dsh-inbox-band.k-question{background:var(--dsw-alias-brand-primary,#2563EB);}
.dsh-inbox-band.k-interruption{background:var(--dsw-alias-state-error-primary,#DC2626);}
.dsh-inbox-band.k-delivery{background:var(--dsw-alias-state-success-primary,#059669);}
.dsh-inbox-sheet-main{display:flex;flex-direction:column;gap:4px;min-width:0;}
.dsh-inbox-sheet-titleline{display:flex;align-items:center;gap:7px;min-width:0;}
.dsh-inbox-unread-dot{flex:0 0 auto;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary,#2563EB);}
.dsh-inbox-sheet-title{font-size:14px;font-weight:650;line-height:1.35;color:var(--dsw-alias-label-primary,#111827);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-inbox-sheet-summary{font-size:12px;line-height:1.4;color:var(--dsw-alias-label-secondary,#6B7280);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-inbox-sheet-right{display:flex;align-items:center;gap:14px;}
.dsh-inbox-sheet-counts{display:flex;gap:6px;}
.dsh-inbox-count{font-size:11px;font-weight:600;border-radius:7px;padding:4px 8px;background:var(--dsw-alias-bg-layer-2,#F3F4F6);color:var(--dsw-alias-label-secondary,#6B7280);white-space:nowrap;}
.dsh-inbox-count.k-question{background:rgba(37,99,235,.09);color:#2563EB;}
.dsh-inbox-count.k-interruption{background:rgba(220,38,38,.09);color:#DC2626;}
.dsh-inbox-count.k-delivery{background:rgba(5,150,105,.09);color:#059669;}
.dsh-inbox-sheet-time{font-size:11px;color:var(--dsw-alias-label-tertiary,#9CA3AF);font-variant-numeric:tabular-nums;white-space:nowrap;}
.dsh-inbox-chevron{width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;font-size:15px;line-height:1;color:var(--dsw-alias-label-tertiary,#9CA3AF);}
.dsh-inbox-sheet-body{border-top:1px solid var(--dsw-alias-border-l1,#E5E7EB);padding:8px 14px 12px;background:var(--dsw-alias-bg-layer-2,#FAFAFA);display:flex;flex-direction:column;gap:2px;}
.dsh-inbox-entry{border-radius:9px;}
.dsh-inbox-entry.is-open{background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 1px 2px rgba(17,24,39,.05);}
.dsh-inbox-entry-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto 22px;align-items:center;gap:9px;width:100%;padding:9px 10px;border:0;background:transparent;cursor:pointer;text-align:left;font:inherit;color:inherit;border-radius:9px;}
.dsh-inbox-entry-head:hover{background:var(--dsw-alias-bg-layer-2,#F3F4F6);}
.dsh-inbox-entry-kind{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#6B7280);white-space:nowrap;}
.dsh-inbox-entry.k-question .dsh-inbox-entry-kind{color:var(--dsw-alias-brand-primary,#2563EB);}
.dsh-inbox-entry.k-interruption .dsh-inbox-entry-kind{color:var(--dsw-alias-state-error-primary,#DC2626);}
.dsh-inbox-entry.k-delivery .dsh-inbox-entry-kind{color:var(--dsw-alias-state-success-primary,#059669);}
.dsh-inbox-entry-title{font-size:12.5px;line-height:1.4;color:var(--dsw-alias-label-primary,#111827);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-inbox-entry-note{font-size:11px;color:var(--dsw-alias-label-tertiary,#9CA3AF);white-space:nowrap;}
.dsh-inbox-entry-time{font-size:11px;color:var(--dsw-alias-label-tertiary,#9CA3AF);font-variant-numeric:tabular-nums;}
.dsh-inbox-entry-body{padding:2px 10px 14px;display:flex;flex-direction:column;gap:10px;}
.dsh-inbox-entry-body .dsh-inbox-section{border:0;padding:0;background:transparent;gap:9px;}
.dsh-inbox-entry.is-settled .dsh-inbox-entry-title{color:var(--dsw-alias-label-tertiary,#9CA3AF);}
.dsh-inbox-empty{padding:64px 20px;gap:10px;}
@media(max-width:760px){
.dsh-inbox-page{padding:20px 16px 48px;}
.dsh-inbox-head-right{gap:14px;}
.dsh-inbox-stats{gap:16px;}
.dsh-inbox-sheet-head{gap:12px;padding:13px 14px;}
.dsh-inbox-sheet-counts{display:none;}
.dsh-inbox-sheet-time{display:none;}
.dsh-inbox-search{min-width:0;}
.dsh-inbox-toolbar{align-items:stretch;}
}
`;

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function formatRelative(timestamp, t, now = Date.now()) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) return "";
  const delta = Math.max(0, now - timestamp);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return t("time.now");
  if (minutes < 60) return t("time.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("time.hours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("time.yesterday");
  if (days < 30) return t("time.days", { count: days });
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(timestamp) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) return "—";
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatBytes(size) {
  if (typeof size !== "number" || !Number.isFinite(size)) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function kindOf(item) {
  return item?.kind === "question" || item?.kind === "delivery" || item?.kind === "interruption"
    ? item.kind
    : "delivery";
}

function kindLabel(kind, t) {
  return t(`kind.${kind}`);
}

function reasonLabel(kind, t) {
  if (kind === "error") return t("reason.error");
  if (kind === "interrupted") return t("reason.interrupted");
  if (kind === "open-turn") return t("reason.openTurn");
  if (kind === "agent-error") return t("reason.agentError");
  return kind || t("reason.interrupted");
}

function stateLabel(item, t) {
  if (item.settleReason === "answered") return t("state.answered");
  if (item.settleReason === "reviewed") return t("state.reviewed");
  if (item.settleReason === "ignored") return t("state.ignored");
  if (item.settleReason === "continued") return t("state.continued");
  if (item.settleReason === "turn-advanced") return t("state.turnAdvanced");
  return item.state === "ignored" ? t("state.ignored") : t("state.done");
}

function itemTitle(item, t) {
  if (item.kind === "question") {
    const first = item.question?.questions?.[0];
    return first?.question || t("item.question");
  }
  if (item.kind === "delivery") {
    const files = item.delivery?.files ?? [];
    if (files.length === 1) return files[0].path;
    return t("item.deliveryFiles", { count: files.length });
  }
  return `${t("item.interruption")} · ${reasonLabel(item.interruption?.kind, t)}`;
}

/** File paths are useful in the entry row but swamp the one-line session summary. */
function shortItemTitle(item, t) {
  const title = itemTitle(item, t);
  if (item.kind !== "delivery") return title;
  const cut = Math.max(title.lastIndexOf("\\"), title.lastIndexOf("/"));
  return cut >= 0 ? title.slice(cut + 1) : title;
}

function IconBase({ size = 16, children, viewBox = "0 0 24 24" }) {
  return h("svg", {
    width: size,
    height: size,
    viewBox,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  }, children);
}

function InboxGlyph({ size = 16 }) {
  return h(IconBase, { size },
    h("path", { d: "M4.5 5.75A2.25 2.25 0 0 1 6.75 3.5h10.5a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-4.19l-3.2 3.2a.9.9 0 0 1-1.54-.64V15.5H6.75a2.25 2.25 0 0 1-2.25-2.25v-7.5Z" }),
    h("path", { d: "M8 7.75h8M8 10.75h5" }));
}
function QuestionGlyph({ size = 16 }) {
  return h(IconBase, { size },
    h("path", { d: "M12 21a9 9 0 1 0-9-9c0 1.6.42 3.1 1.16 4.4L3 21l4.7-1.13A8.96 8.96 0 0 0 12 21Z" }),
    h("path", { d: "M9.6 9.2a2.4 2.4 0 1 1 3.4 2.2c-.7.35-1 .9-1 1.6" }),
    h("path", { d: "M12 16.2h.01" }));
}
function DeliveryGlyph({ size = 16 }) {
  return h(IconBase, { size },
    h("path", { d: "M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" }),
    h("path", { d: "m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9" }));
}
function AlertGlyph({ size = 16 }) {
  return h(IconBase, { size },
    h("path", { d: "M10.3 4.2 2.7 17.4A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.6L13.7 4.2a2 2 0 0 0-3.4 0Z" }),
    h("path", { d: "M12 9v4.2M12 16.6h.01" }));
}
function GearGlyph({ size = 16 }) {
  return h(IconBase, { size },
    h("circle", { cx: 12, cy: 12, r: 3 }),
    h("path", { d: "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .06 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.06-1 1.7 1.7 0 0 0-1.56-1H2a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 3.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.06 1.7 1.7 0 0 0 1-1.56V2a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 .06 1 1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" }));
}
function RefreshGlyph({ size = 16 }) {
  return h(IconBase, { size },
    h("path", { d: "M20 11a8 8 0 1 0-2.34 5.66" }),
    h("path", { d: "M20 4v7h-7" }));
}
function ExternalGlyph({ size = 16 }) {
  return h(IconBase, { size },
    h("path", { d: "M14 4h6v6" }),
    h("path", { d: "m20 4-9 9" }),
    h("path", { d: "M20 14v4.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H10" }));
}
function CheckGlyph({ size = 16 }) {
  return h(IconBase, { size }, h("path", { d: "m5 12.5 4.2 4.2L19 7" }));
}
function XGlyph({ size = 16 }) {
  return h(IconBase, { size }, h("path", { d: "M6 6l12 12M18 6 6 18" }));
}
function SearchGlyph({ size = 16 }) {
  return h(IconBase, { size }, h("circle", { cx: 11, cy: 11, r: 6.5 }), h("path", { d: "m16 16 4.5 4.5" }));
}
function FolderGlyph({ size = 16 }) {
  return h(IconBase, { size }, h("path", { d: "M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" }));
}
function EyeGlyph({ size = 16 }) {
  return h(IconBase, { size },
    h("path", { d: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" }),
    h("circle", { cx: 12, cy: 12, r: 2.5 }));
}

function KindIcon({ kind, size = 14 }) {
  if (kind === "question") return h(QuestionGlyph, { size });
  if (kind === "interruption") return h(AlertGlyph, { size });
  return h(DeliveryGlyph, { size });
}

function createInboxStore(connection) {
  let snapshot = {
    loading: true,
    loadError: null,
    items: [],
    projects: [],
    stats: { open: { total: 0, unread: 0, question: 0, delivery: 0, interruption: 0 }, done: 0, ignored: 0 },
    runtime: {},
    meta: {},
  };
  let error = null;
  const listeners = new Set();

  function emit() {
    for (const listener of listeners) listener();
  }

  function set(next) {
    snapshot = { ...next, loading: false, loadError: null };
    error = null;
    emit();
  }

  async function request(method, payload) {
    if (!connection || typeof connection.rpc?.call !== "function") {
      throw new Error("connection.rpc is unavailable");
    }
    const result = await connection.rpc.call("/api", `dsh-inbox.${method}`, payload ?? {});
    if (!result || typeof result.ok !== "boolean") throw new Error("Host RPC returned an invalid envelope");
    if (result.ok !== true) {
      const failure = new Error(result.error?.message || "Host operation failed");
      failure.code = result.error?.code || "INBOX_OPERATION_FAILED";
      failure.details = result.error?.details;
      throw failure;
    }
    return result.value;
  }

  async function refresh({ quiet = false } = {}) {
    if (!quiet) {
      snapshot = { ...snapshot, loading: snapshot.items.length === 0 };
      emit();
    }
    try {
      const value = await request("inbox.snapshot", {});
      set(value);
      return value;
    } catch (failure) {
      error = failure;
      snapshot = { ...snapshot, loading: false, loadError: failure?.message ?? String(failure) };
      emit();
      throw failure;
    }
  }

  async function act(method, payload) {
    const value = await request(method, payload);
    if (value && Array.isArray(value.items)) set(value);
    return value;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    hooks: { getSnapshot: () => snapshot, subscribe },
    getSnapshot: () => snapshot,
    getError: () => error,
    refresh,
    act,
    request,
  };
}

function InboxIcon({ size = 18, active, useInbox }) {
  const unread = useInbox((snapshot) => snapshot.stats?.open?.unread ?? 0);
  return h("span", { className: "dsh-inbox-icon-wrap", style: active ? { color: "var(--dsw-alias-brand-primary,#4677f5)" } : undefined },
    h(InboxGlyph, { size }),
    unread > 0 ? h("span", { className: "dsh-inbox-icon-badge" }, unread > 99 ? "99+" : String(unread)) : null);
}

function Toast({ notice, onClose }) {
  if (!notice) return null;
  return h("div", {
    className: cx("dsh-inbox-toast", notice.kind === "error" && "error"),
    role: "status",
    onClick: onClose,
  }, notice.text);
}

function formatClock(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dayBucket(timestamp, now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  if (timestamp >= today) return 0;
  if (timestamp >= today - 86_400_000) return 1;
  if (timestamp >= today - 6 * 86_400_000) return 2;
  return 3;
}

const DAY_LABEL_KEYS = ["day.today", "day.yesterday", "day.week", "day.earlier"];

function FeedEntry({ item, open, onToggle, busy, onSettle, onAnswer, onReply, onPreview, onReveal, t, capabilities, now }) {
  const settled = item.state !== "open";
  const note = item.kind === "delivery"
    ? `${item.delivery?.files?.length ?? 0} 个文件`
    : item.kind === "interruption" ? reasonLabel(item.interruption?.kind, t) : "";
  return h("section", { className: cx("dsh-inbox-entry", `k-${kindOf(item)}`, settled && "is-settled", open && "is-open") },
    h("button", { type: "button", className: "dsh-inbox-entry-head", "aria-expanded": open, onClick: onToggle },
      h("span", { className: "dsh-inbox-entry-kind" },
        h(KindIcon, { kind: kindOf(item), size: 13 }),
        kindLabel(kindOf(item), t)),
      h("span", { className: "dsh-inbox-entry-title" }, itemTitle(item, t)),
      note ? h("span", { className: "dsh-inbox-entry-note" }, note) : null,
      item.state === "archived" ? h("span", { className: "dsh-inbox-entry-note" }, t("filter.history")) : null,
      h("time", { className: "dsh-inbox-entry-time" }, formatClock(item.updatedAt)),
      h("span", { className: "dsh-inbox-chevron" }, open ? "−" : "+")),
    open
      ? h("div", { className: "dsh-inbox-entry-body" },
          item.kind === "question" && !settled
            ? h(QuestionBlock, { item, busy, onSubmit: onAnswer, t, disabled: capabilities.questions === false })
            : null,
          item.kind === "delivery"
            ? h(DeliveryBlock, {
                item,
                busy,
                onPreview: (path) => onPreview(item, path),
                onReveal: (path) => onReveal(item, path),
                onSettle: (action) => onSettle(item, action),
                t,
                canReveal: capabilities.reveal !== false,
                settled,
              })
            : null,
          item.kind === "interruption"
            ? h(InterruptionBlock, {
                item,
                busy,
                onContinue: (text) => onReply(item, text),
                onSettle: (action) => onSettle(item, action),
                t,
                canContinue: capabilities.prompt !== false,
                settled,
              })
            : null,
          item.kind === "question" && settled
            ? h("div", { className: "dsh-inbox-detail-text" }, t("detail.settled"))
            : null)
      : null);
}

function SessionSheet({ thread, entries, open, openItems, onToggle, onToggleItem, busy, onSettle, onAnswer, onReply, onPreview, onReveal, t, capabilities, now }) {
  const latest = entries[0];
  const dominant = thread.counts.question > 0 ? "question" : thread.counts.interruption > 0 ? "interruption" : thread.counts.delivery > 0 ? "delivery" : "settled";
  return h("article", { className: cx("dsh-inbox-sheet", open && "is-open") },
    h("button", { type: "button", className: "dsh-inbox-sheet-head", "aria-expanded": open, onClick: onToggle },
      h("span", { className: cx("dsh-inbox-band", `k-${dominant}`) }),
      h("span", { className: "dsh-inbox-sheet-main" },
        h("span", { className: "dsh-inbox-sheet-titleline" },
          thread.counts.unread > 0 ? h("span", { className: "dsh-inbox-unread-dot", title: t("badge.unread") }) : null,
          h("span", { className: "dsh-inbox-sheet-title" }, thread.title || thread.sessionId)),
        latest
          ? h("span", { className: "dsh-inbox-sheet-summary" }, `${kindLabel(kindOf(latest), t)} · ${shortItemTitle(latest, t)}`)
          : null),
      h("span", { className: "dsh-inbox-sheet-right" },
        h("span", { className: "dsh-inbox-sheet-counts" },
          [["question", thread.counts.question], ["delivery", thread.counts.delivery], ["interruption", thread.counts.interruption]]
            .filter(([, count]) => count > 0)
            .map(([kind, count]) => h("span", {
              key: kind,
              className: cx("dsh-inbox-count", `k-${kind}`),
              title: `${count} ${kindLabel(kind, t)}`,
            }, `${kindLabel(kind, t)} ${count}`))),
        h("time", { className: "dsh-inbox-sheet-time" }, formatClock(thread.latestAt)),
        h("span", { className: "dsh-inbox-chevron" }, open ? "−" : "+"))),
    open
      ? h("div", { className: "dsh-inbox-sheet-body" },
          entries.map((item) => h(FeedEntry, {
            key: item.id,
            item,
            open: openItems.has(item.id),
            onToggle: () => onToggleItem(item.id),
            busy,
            onSettle,
            onAnswer,
            onReply,
            onPreview,
            onReveal,
            t,
            capabilities,
            now,
          })))
      : null);
}

function QuestionBlock({ item, busy, onSubmit, t, disabled = false }) {
  const question = item.question ?? { questions: [], state: "open" };
  const [draft, setDraft] = React.useState(() => initialDraft(question));
  const [error, setError] = React.useState("");
  const [openFallback, setOpenFallback] = React.useState(false);

  React.useEffect(() => {
    setDraft(initialDraft(question));
    setError("");
    setOpenFallback(false);
  }, [item.id, question.state]);

  function update(questionId, patch) {
    setDraft((current) => ({
      ...current,
      [questionId]: { ...(current[questionId] ?? { selected: [], custom: "", skipped: false }), ...patch },
    }));
  }

  function toggleOption(questionItem, label) {
    const current = draft[questionItem.id] ?? { selected: [], custom: "", skipped: false };
    const selected = questionItem.multiSelect === true
      ? (current.selected.includes(label) ? current.selected.filter((value) => value !== label) : [...current.selected, label])
      : [label];
    update(questionItem.id, { selected, skipped: false });
  }

  async function submit() {
    const answers = [];
    for (const [index, questionItem] of (question.questions ?? []).entries()) {
      const value = draft[questionItem.id] ?? { selected: [], custom: "", skipped: false };
      const custom = String(value.custom ?? "").trim();
      if (!value.skipped && value.selected.length === 0 && custom === "") {
        setError(t("detail.answerRequired", { index: index + 1 }));
        return;
      }
      answers.push({
        id: questionItem.id,
        selected: questionItem.multiSelect === true ? value.selected : (custom !== "" ? [] : value.selected),
        ...(custom !== "" ? { custom } : {}),
      });
    }
    setError("");
    setOpenFallback(false);
    try {
      await onSubmit({ sessionId: item.sessionId, callId: question.callId, answers });
    } catch (failure) {
      if (failure?.code === "QUESTION_OPEN") {
        setOpenFallback(true);
        setError(failure.message);
      } else {
        setError(failure?.message || String(failure));
      }
    }
  }

  return h(React.Fragment, null,
    disabled ? h("div", { className: "dsh-inbox-notice dsh-inbox-notice-error" }, t("error.unsupported")) : null,
    h("div", { className: cx("dsh-inbox-notice", question.state === "open" ? "dsh-inbox-notice-warn" : "") },
      question.state === "open" ? t("detail.openHint") : t("detail.continuedHint")),
    (question.questions ?? []).map((questionItem, index) => {
      const value = draft[questionItem.id] ?? { selected: [], custom: "", skipped: false };
      return h("section", { className: "dsh-inbox-section", key: questionItem.id || String(index) },
        h("div", { className: "dsh-inbox-section-title" },
          h("span", null, questionItem.header ? `${questionItem.header} · ` : "", questionItem.question),
          h("span", { className: "dsh-inbox-tag" }, t("detail.questionProgress", { index: index + 1, total: question.questions.length }))),
        questionItem.detail ? h("div", { className: "dsh-inbox-detail-text" }, questionItem.detail) : null,
        (questionItem.options ?? []).length > 0
          ? h("div", { className: "dsh-inbox-options", role: questionItem.multiSelect === true ? "group" : "radiogroup" },
              questionItem.options.map((option) => h("button", {
                type: "button",
                key: option.label,
                className: "dsh-inbox-option",
                "aria-pressed": value.selected.includes(option.label),
                onClick: () => toggleOption(questionItem, option.label),
              },
                h("span", { className: "dsh-inbox-option-label" }, option.label),
                option.description ? h("span", { className: "dsh-inbox-option-desc" }, option.description) : null)))
          : null,
        h("label", { className: "dsh-inbox-custom" },
          h("span", { className: "dsh-inbox-custom-label" }, t("detail.otherAnswer")),
          h("input", {
            className: "dsh-inbox-input",
            type: "text",
            value: value.custom,
            placeholder: t("detail.otherPlaceholder"),
            onChange: (event) => update(questionItem.id, { custom: event.target.value, skipped: false }),
          })),
        h("div", { className: "dsh-inbox-actions" },
          h("button", {
            type: "button",
            className: "dsh-inbox-btn dsh-inbox-btn-mini dsh-inbox-btn-ghost",
            onClick: () => update(questionItem.id, { selected: [], custom: "", skipped: true }),
          }, t("action.skip")),
          value.skipped ? h("span", { className: "dsh-inbox-tag" }, t("action.skip")) : null));
    }),
    error ? h("div", { className: cx("dsh-inbox-notice", "dsh-inbox-notice-error") },
      h("span", null, error),
      openFallback ? h("button", {
        type: "button",
        className: "dsh-inbox-btn dsh-inbox-btn-mini",
        onClick: () => onSubmit({ openSession: true, sessionId: item.sessionId }),
      }, t("action.openSession")) : null) : null,
    h("div", { className: "dsh-inbox-actions" },
      h("button", {
        type: "button",
        className: "dsh-inbox-btn dsh-inbox-btn-primary",
        disabled: disabled || busy === "answer",
        onClick: submit,
      }, busy === "answer" ? t("action.submitting") : t("action.submitAnswer"))));
}

function initialDraft(question) {
  const draft = {};
  for (const item of question?.questions ?? []) {
    draft[item.id] = { selected: [], custom: "", skipped: false };
  }
  return draft;
}

function DeliveryBlock({ item, onPreview, onReveal, busy, onSettle, t, canReveal = true, settled = false }) {
  const files = item.delivery?.files ?? [];
  return h(React.Fragment, null,
    h("section", { className: "dsh-inbox-section" },
      h("div", { className: "dsh-inbox-section-title" }, h("span", null, t("detail.files")), h("span", { className: "dsh-inbox-tag" }, String(files.length))),
      files.length === 0
        ? h("div", { className: "dsh-inbox-detail-text" }, t("detail.noFiles"))
        : files.map((file) => h("div", { className: "dsh-inbox-file", key: file.path },
            h("div", { className: "dsh-inbox-file-main" },
              h("span", { className: "dsh-inbox-file-path" }, file.path),
              file.description ? h("span", { className: "dsh-inbox-file-desc" }, file.description) : null),
            h("div", { className: "dsh-inbox-actions" },
              h("button", { type: "button", className: "dsh-inbox-btn dsh-inbox-btn-mini", onClick: () => onPreview(file.path) },
                h(EyeGlyph, { size: 12 }), t("action.preview")),
              canReveal ? h("button", { type: "button", className: "dsh-inbox-btn dsh-inbox-btn-mini dsh-inbox-btn-ghost", onClick: () => onReveal(file.path) },
                h(FolderGlyph, { size: 12 }), t("action.reveal")) : null)))),
    settled ? null : h("div", { className: "dsh-inbox-actions" },
      h("button", {
        type: "button",
        className: "dsh-inbox-btn dsh-inbox-btn-primary",
        disabled: busy === "settle",
        onClick: () => onSettle("done"),
      }, h(CheckGlyph, { size: 13 }), t("action.done")),
      h("button", {
        type: "button",
        className: "dsh-inbox-btn",
        disabled: busy === "settle",
        onClick: () => onSettle("ignore"),
      }, h(XGlyph, { size: 13 }), t("action.ignore"))));
}

function InterruptionBlock({ item, busy, onContinue, onSettle, t, canContinue = true, settled = false }) {
  const [text, setText] = React.useState("");
  const interruption = item.interruption ?? {};
  const reason = interruption.kind;
  const description = reason === "error" ? t("detail.interruption.error")
    : reason === "interrupted" ? t("detail.interruption.interrupted")
      : reason === "agent-error" ? t("detail.interruption.agentError")
        : t("detail.interruption.openTurn");
  return h(React.Fragment, null,
    h("div", { className: "dsh-inbox-notice dsh-inbox-notice-error" }, description),
    h("section", { className: "dsh-inbox-section" },
      h("dl", { className: "dsh-inbox-kv" },
        h("dt", null, t("detail.reason")), h("dd", null, reasonLabel(reason, t)),
        h("dt", null, t("detail.turn")), h("dd", null, interruption.turn === null || interruption.turn === undefined ? t("item.noTurn") : String(interruption.turn)),
        interruption.error?.code ? h(React.Fragment, null, h("dt", null, t("detail.error")), h("dd", null, h("span", { className: "dsh-inbox-code" }, interruption.error.code))) : null,
        interruption.error?.message ? h(React.Fragment, null, h("dt", null, "Message"), h("dd", null, interruption.error.message)) : null)),
    settled ? null : h("label", { className: "dsh-inbox-custom" },
      h("span", { className: "dsh-inbox-custom-label" }, t("detail.continueHint")),
      h("textarea", {
        className: "dsh-inbox-textarea",
        value: text,
        placeholder: t("detail.continuePlaceholder"),
        onChange: (event) => setText(event.target.value),
      })),
    settled ? null : h("div", { className: "dsh-inbox-actions" },
      h("button", {
        type: "button",
        className: "dsh-inbox-btn dsh-inbox-btn-primary",
        disabled: !canContinue || busy === "reply",
        onClick: () => onContinue(text),
      }, h(ExternalGlyph, { size: 13 }), t("action.continue")),
      h("button", {
        type: "button",
        className: "dsh-inbox-btn",
        disabled: busy === "settle",
        onClick: () => onSettle("done"),
      }, h(CheckGlyph, { size: 13 }), t("action.ack")),
      h("button", {
        type: "button",
        className: "dsh-inbox-btn dsh-inbox-btn-danger",
        disabled: busy === "settle",
        onClick: () => onSettle("ignore"),
      }, h(XGlyph, { size: 13 }), t("action.ignore"))));
}

function SettingsDrawer({ snapshot, busy, onClose, onSaveRoots, onRescan, t }) {
  const [roots, setRoots] = React.useState(snapshot.projectRoots ?? []);
  const [draft, setDraft] = React.useState("");
  React.useEffect(() => { setRoots(snapshot.projectRoots ?? []); }, [snapshot.projectRoots?.join("|")]);
  const runtime = snapshot.runtime ?? {};
  const capabilities = runtime.capabilities ?? {};
  const projects = snapshot.projects ?? [];

  function addRoot() {
    const value = draft.trim();
    if (!value || roots.includes(value)) return;
    setRoots([...roots, value]);
    setDraft("");
  }

  return h("div", { className: "dsh-inbox-drawer-overlay", onMouseDown: (event) => { if (event.target === event.currentTarget) onClose(); } },
    h("aside", { className: "dsh-inbox-drawer", role: "dialog", "aria-label": t("settings.title") },
      h("header", { className: "dsh-inbox-drawer-head" },
        h("h2", null, t("settings.title")),
        h("button", { type: "button", className: "dsh-inbox-btn dsh-inbox-btn-ghost", onClick: onClose, "aria-label": t("action.close") }, h(XGlyph, { size: 15 }))),
      h("div", { className: "dsh-inbox-drawer-body" },
        h("section", { className: "dsh-inbox-section" },
          h("div", { className: "dsh-inbox-section-title" }, h("span", null, t("settings.roots"))),
          h("div", { className: "dsh-inbox-detail-text" }, t("settings.rootsHint")),
          roots.map((root) => h("div", { className: "dsh-inbox-root-row", key: root },
            h("span", null, root),
            h("button", {
              type: "button",
              className: "dsh-inbox-btn dsh-inbox-btn-mini dsh-inbox-btn-danger",
              onClick: () => setRoots(roots.filter((value) => value !== root)),
            }, t("action.remove")))),
          h("div", { className: "dsh-inbox-root-add" },
            h("input", {
              className: "dsh-inbox-input",
              value: draft,
              placeholder: t("settings.rootPlaceholder"),
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: (event) => { if (event.key === "Enter") { event.preventDefault(); addRoot(); } },
            }),
            h("button", { type: "button", className: "dsh-inbox-btn", onClick: addRoot }, t("action.addRoot"))),
          h("div", { className: "dsh-inbox-actions" },
            h("button", {
              type: "button",
              className: "dsh-inbox-btn dsh-inbox-btn-primary",
              disabled: busy === "roots",
              onClick: () => onSaveRoots(roots),
            }, busy === "roots" ? t("action.saving") : t("action.save")),
            h("button", {
              type: "button",
              className: "dsh-inbox-btn",
              disabled: busy === "rescan",
              onClick: onRescan,
            }, h(RefreshGlyph, { size: 13 }), t("action.rescan")))),
        h("section", { className: "dsh-inbox-section" },
          h("div", { className: "dsh-inbox-section-title" }, h("span", null, t("settings.projects")), h("span", { className: "dsh-inbox-tag" }, String(projects.length))),
          projects.length === 0
            ? h("div", { className: "dsh-inbox-detail-text" }, t("settings.noProjects"))
            : projects.map((project) => h("div", { className: "dsh-inbox-project-row", key: project.id },
                h("div", null,
                  h("div", { className: "dsh-inbox-project-name" }, project.name),
                  h("div", { className: "dsh-inbox-project-path" }, project.path)),
                project.marker ? h("span", { className: "dsh-inbox-tag" }, project.marker) : null))),
        h("section", { className: "dsh-inbox-section" },
          h("div", { className: "dsh-inbox-section-title" }, h("span", null, t("settings.runtime"))),
          h("dl", { className: "dsh-inbox-kv" },
            h("dt", null, t("settings.pluginVersion")), h("dd", null, String(runtime.pluginVersion ?? "—")),
            h("dt", null, t("settings.runtimeVersion")), h("dd", null, String(runtime.runtimeVersion ?? "—")),
            h("dt", null, t("settings.lastScan")), h("dd", null, runtime.scanning ? t("settings.scanning") : formatDateTime(snapshot.meta?.lastScanAt)),
            h("dt", null, t("settings.storage")), h("dd", null, h("span", { className: "dsh-inbox-code" }, String(runtime.stateFile ?? "—")))),
          snapshot.meta?.lastError ? h("div", { className: "dsh-inbox-notice dsh-inbox-notice-error" }, `${t("settings.lastError")}: ${snapshot.meta.lastError}`) : null,
          h("div", { className: "dsh-inbox-capability" },
            h("span", null, t("settings.capability.sessions")),
            h("span", { className: capabilities.sessions ? "dsh-inbox-tag dsh-inbox-tag-ok" : "dsh-inbox-tag dsh-inbox-tag-error" }, capabilities.sessions ? t("settings.capability.yes") : t("settings.capability.no"))),
          h("div", { className: "dsh-inbox-capability" },
            h("span", null, t("settings.capability.questions")),
            h("span", { className: capabilities.questions ? "dsh-inbox-tag dsh-inbox-tag-ok" : "dsh-inbox-tag dsh-inbox-tag-error" }, capabilities.questions ? t("settings.capability.yes") : t("settings.capability.no"))),
          h("div", { className: "dsh-inbox-capability" },
            h("span", null, t("settings.capability.prompt")),
            h("span", { className: capabilities.prompt ? "dsh-inbox-tag dsh-inbox-tag-ok" : "dsh-inbox-tag dsh-inbox-tag-error" }, capabilities.prompt ? t("settings.capability.yes") : t("settings.capability.no"))),
          h("div", { className: "dsh-inbox-capability" },
            h("span", null, t("settings.capability.reveal")),
            h("span", { className: capabilities.reveal ? "dsh-inbox-tag dsh-inbox-tag-ok" : "dsh-inbox-tag dsh-inbox-tag-error" }, capabilities.reveal ? t("settings.capability.yes") : t("settings.capability.no")))))));
}

function PreviewModal({ preview, onClose, onReveal, t }) {
  if (!preview) return null;
  const data = preview.data;
  return h("div", { className: "dsh-inbox-modal", onMouseDown: (event) => { if (event.target === event.currentTarget) onClose(); } },
    h("div", { className: "dsh-inbox-modal-card", role: "dialog", "aria-label": t("preview.title") },
      h("header", { className: "dsh-inbox-modal-head" },
        h("div", { className: "dsh-inbox-modal-title" }, preview.path),
        h("div", { className: "dsh-inbox-actions" },
          data && data.kind === "text" ? h("button", {
            type: "button",
            className: "dsh-inbox-btn dsh-inbox-btn-mini",
            onClick: () => onReveal(preview.path),
          }, h(FolderGlyph, { size: 12 }), t("action.reveal")) : null,
          h("button", { type: "button", className: "dsh-inbox-btn dsh-inbox-btn-mini dsh-inbox-btn-ghost", onClick: onClose, "aria-label": t("action.close") }, h(XGlyph, { size: 14 })))),
      h("div", { className: "dsh-inbox-modal-body" },
        preview.loading ? h("div", { className: "dsh-inbox-detail-text" }, t("preview.loading"))
          : preview.error ? h("div", { className: "dsh-inbox-notice dsh-inbox-notice-error" }, preview.error)
            : !data ? h("div", { className: "dsh-inbox-detail-text" }, t("preview.empty"))
              : data.kind === "binary" ? h("div", { className: "dsh-inbox-detail-text" }, t("preview.binary", { size: formatBytes(data.size) }))
                : h("pre", { className: "dsh-inbox-pre" }, data.text || t("preview.empty")))));
}

function InboxPage({ useInbox, act, request, openSession, t }) {
  const snapshot = useInbox((value) => value);
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [openSessions, setOpenSessions] = React.useState(() => new Set());
  const [openItems, setOpenItems] = React.useState(() => new Set());
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [settings, setSettings] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [notice, setNotice] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const now = snapshot.runtime?.now ?? Date.now();

  const items = snapshot.items ?? [];
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const settledCount = (snapshot.stats?.done ?? 0) + (snapshot.stats?.ignored ?? 0);
  const archiveCount = snapshot.stats?.archived ?? 0;
  const openCount = snapshot.stats?.open?.total ?? 0;
  const unreadCount = snapshot.stats?.open?.unread ?? 0;
  const openSessionCount = (snapshot.threads ?? []).filter((thread) => thread.counts.open > 0).length;

  function itemMatchesFilter(item) {
    if (filter === "history") return item.state === "archived";
    if (filter === "settled") return item.state === "done" || item.state === "ignored";
    if (item.state !== "open") return false;
    return filter === "all" || item.kind === filter;
  }

  function threadItemsOf(thread) {
    return thread.itemIds
      .map((id) => itemsById.get(id))
      .filter((item) => item !== undefined && itemMatchesFilter(item));
  }

  const visibleThreads = (snapshot.threads ?? []).filter((thread) => {
    if (projectFilter !== "all" && (thread.projectId ?? "__none") !== projectFilter) return false;
    const matching = threadItemsOf(thread);
    if (matching.length === 0) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    const haystack = [
      thread.title,
      ...matching.map((item) => [itemTitle(item, t), item.delivery?.files?.map((file) => file.path).join(" ") ?? ""].join(" ")),
    ].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
  const projectOptions = (() => {
    const seen = new Map();
    for (const thread of snapshot.threads ?? []) {
      const id = thread.projectId ?? "__none";
      if (seen.has(id)) continue;
      const name = id === "__none"
        ? t("project.unassigned")
        : ((snapshot.projects ?? []).find((project) => project.id === id)?.name ?? id);
      seen.set(id, name);
    }
    return [...seen.entries()].sort((left, right) => String(left[1]).localeCompare(String(right[1])));
  })();

  const dayGroups = (() => {
    const buckets = new Map();
    for (const thread of visibleThreads) {
      const bucket = dayBucket(thread.latestAt, now);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(thread);
    }
    return [...buckets.entries()].sort((left, right) => left[0] - right[0]);
  })();

  function showNotice(kind, text) {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 4200);
  }

  async function run(label, action) {
    setBusy(label);
    try {
      return await action();
    } finally {
      setBusy("");
    }
  }

  function toggleSession(sessionId) {
    setOpenSessions((current) => {
      const next = new Set(current);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  /** Opening an entry is the moment its content is actually read. */
  function toggleItem(itemId) {
    const opening = !openItems.has(itemId);
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    if (!opening) return;
    const item = itemsById.get(itemId);
    if (item !== undefined && item.state === "open" && item.readAt === null) {
      void act("inbox.mark-read", { id: itemId }).catch(() => {});
    }
  }

  function selectThread(thread) {
    toggleSession(thread.sessionId);
  }

  async function handleAnswer(payload) {
    if (payload.openSession) {
      openCurrentSession(payload.sessionId);
      return;
    }
    return run("answer", async () => {
      try {
        await act("inbox.answer", payload);
        showNotice("ok", t("detail.answered"));
      } catch (failure) {
        if (failure?.code === "QUESTION_OPEN") {
          showNotice("error", failure.message);
          throw failure;
        }
        showNotice("error", t("error.action", { message: failure?.message ?? String(failure) }));
        throw failure;
      }
    });
  }

  async function handleSettle(item, action) {
    return run("settle", async () => {
      try {
        await act("inbox.settle", { id: item.id, action });
        showNotice("ok", action === "ignore" ? t("notice.ignored") : t("notice.settled"));
      } catch (failure) {
        showNotice("error", t("error.action", { message: failure?.message ?? String(failure) }));
      }
    });
  }

  async function handleReply(item, text) {
    return run("reply", async () => {
      try {
        await act("inbox.reply", { sessionId: item.sessionId, text, itemId: item.id });
        showNotice("ok", t("action.continue"));
      } catch (failure) {
        showNotice("error", t("error.action", { message: failure?.message ?? String(failure) }));
      }
    });
  }

  async function handleAssign(item, projectId) {
    return run("assign", async () => {
      try {
        await act("inbox.assign", { sessionId: item.sessionId, projectId });
        showNotice("ok", t("notice.assigned"));
      } catch (failure) {
        showNotice("error", t("error.action", { message: failure?.message ?? String(failure) }));
      }
    });
  }

  async function handlePreview(item, path) {
    setPreview({ loading: true, path, item, data: null, error: null });
    try {
      const data = await request("inbox.preview", { sessionId: item.sessionId, path });
      setPreview({ loading: false, path, item, data, error: null });
    } catch (failure) {
      setPreview({ loading: false, path, item, data: null, error: failure?.message ?? String(failure) });
    }
  }

  async function handleReveal(item, path) {
    try {
      await request("inbox.reveal", { sessionId: item.sessionId, path });
      showNotice("ok", t("action.reveal"));
    } catch (failure) {
      showNotice("error", t("error.action", { message: failure?.message ?? String(failure) }));
    }
  }

  function openCurrentSession(sessionId) {
    if (openSession(sessionId)) showNotice("ok", t("notice.opened"));
    else showNotice("error", t("notice.noWorkspace"));
  }

  async function handleRoots(roots) {
    return run("roots", async () => {
      try {
        await act("inbox.set-roots", { roots });
        showNotice("ok", t("settings.rootsSaved"));
      } catch (failure) {
        showNotice("error", t("error.action", { message: failure?.message ?? String(failure) }));
      }
    });
  }

  async function handleRescan() {
    return run("rescan", async () => {
      try {
        await act("inbox.rescan", { full: true });
        showNotice("ok", t("notice.refreshed"));
      } catch (failure) {
        showNotice("error", t("error.action", { message: failure?.message ?? String(failure) }));
      }
    });
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    if (!window.confirm(t("confirm.markAll"))) return;
    try {
      await act("inbox.mark-all-read", {});
      showNotice("ok", t("notice.read"));
    } catch (failure) {
      showNotice("error", t("error.action", { message: failure?.message ?? String(failure) }));
    }
  }

  const runtime = snapshot.runtime ?? {};
  const capabilities = runtime.capabilities ?? {};
  return h("div", { className: "dsh-inbox-page" },
    h("header", { className: "dsh-inbox-header" },
      h("div", { className: "dsh-inbox-brand" },
        h("div", { className: "dsh-inbox-title" },
          h("h1", null, t("title")),
          h("span", { className: "dsh-inbox-subtitle" }, t("subtitle"))),
        runtime.scanning ? h("span", { className: "dsh-inbox-scan" }, t("settings.scanning")) : null),
      h("div", { className: "dsh-inbox-head-right" },
        h("div", { className: "dsh-inbox-stats" },
          h("div", { className: "dsh-inbox-stat" }, h("b", null, String(openCount)), h("span", null, t("stats.pending"))),
          h("div", { className: "dsh-inbox-stat" }, h("b", null, String(openSessionCount)), h("span", null, t("stats.sessions"))),
          unreadCount > 0 ? h("div", { className: "dsh-inbox-stat" }, h("b", null, String(unreadCount)), h("span", null, t("stats.unreadLabel"))) : null),
        h("div", { className: "dsh-inbox-header-actions" },
        h("button", { type: "button", className: "dsh-inbox-btn", disabled: busy === "refresh", onClick: () => run("refresh", async () => { try { await act("inbox.snapshot", {}); } catch (failure) { showNotice("error", t("error.action", { message: failure?.message ?? String(failure) })); } }) },
          h(RefreshGlyph, { size: 13 }), busy === "refresh" ? t("action.refreshing") : t("action.refresh")),
        h("button", {
          type: "button",
          className: "dsh-inbox-btn",
          disabled: unreadCount === 0,
          title: unreadCount === 0 ? t("action.nothingUnread") : undefined,
          onClick: handleMarkAllRead,
        }, h(CheckGlyph, { size: 13 }), t("action.markAllRead")),
        h("button", { type: "button", className: "dsh-inbox-btn", onClick: () => setSettings(true) }, h(GearGlyph, { size: 13 }), t("action.settings"))))),
    snapshot.loading && items.length === 0
      ? h("div", { className: "dsh-inbox-layout" },
          h("div", { className: "dsh-inbox-list-pane" }, h("div", { className: "dsh-inbox-skeleton" }), h("div", { className: "dsh-inbox-skeleton" }), h("div", { className: "dsh-inbox-skeleton" })),
          h("div", { className: "dsh-inbox-detail" }, h("div", { className: "dsh-inbox-skeleton", style: { height: "80%" } })))
      : null,
    !capabilities.sessions && !snapshot.loading
      ? h("div", { className: "dsh-inbox-notice dsh-inbox-notice-error" }, t("error.unsupported"))
      : null,
    snapshot.loadError
      ? h("div", { className: "dsh-inbox-notice dsh-inbox-notice-error" }, t("error.load", { message: snapshot.loadError }))
      : null,
    (snapshot.projectRoots ?? []).length === 0 && !snapshot.loading
      ? h("div", { className: "dsh-inbox-notice dsh-inbox-notice-warn" },
          h("span", null, t("empty.setup")),
          h("button", { type: "button", className: "dsh-inbox-btn dsh-inbox-btn-mini", onClick: () => setSettings(true) }, t("action.settings")))
      : null,
    h("div", { className: "dsh-inbox-toolbar" },
      h("div", { className: "dsh-inbox-filters", role: "tablist" },
        [["all", t("filter.all"), snapshot.stats?.open?.total ?? 0],
          ["question", t("filter.question"), snapshot.stats?.open?.question ?? 0],
          ["delivery", t("filter.delivery"), snapshot.stats?.open?.delivery ?? 0],
          ["interruption", t("filter.interruption"), snapshot.stats?.open?.interruption ?? 0],
          ["settled", t("filter.settled"), settledCount],
          ["history", t("filter.history"), archiveCount]].map(([value, label, count]) => h("button", {
            type: "button",
            key: value,
            className: "dsh-inbox-chip",
            role: "tab",
            "aria-selected": filter === value,
            onClick: () => setFilter(value),
          }, label, h("span", { className: "dsh-inbox-chip-count" }, String(count))))),
      h("label", { className: "dsh-inbox-search" },
        h(SearchGlyph, { size: 14 }),
        h("input", {
          className: "dsh-inbox-input",
          value: query,
          placeholder: t("search.placeholder"),
          onChange: (event) => setQuery(event.target.value),
        })),
      h("select", {
        className: "dsh-inbox-select dsh-inbox-project-filter",
        value: projectFilter,
        onChange: (event) => setProjectFilter(event.target.value),
        title: t("settings.projects"),
      },
        h("option", { value: "all" }, t("project.all")),
        projectOptions.map(([id, name]) => h("option", { key: id, value: id }, name)))),
    h("div", { className: "dsh-inbox-feed" },
      visibleThreads.length === 0
        ? h("div", { className: "dsh-inbox-empty" },
            h(InboxGlyph, { size: 28 }),
            h("span", null, filter === "history" ? t("empty.history") : filter === "settled" ? t("empty.settled") : (query || filter !== "all" ? t("empty.filter") : t("empty.all"))),
            h("span", { className: "dsh-inbox-empty-hint" }, t("empty.hint")))
        : dayGroups.map(([bucket, threads]) => h("section", { key: bucket, className: "dsh-inbox-day" },
            h("div", { className: "dsh-inbox-day-label" },
              h("span", null, t(DAY_LABEL_KEYS[bucket])),
              h("span", { className: "dsh-inbox-day-count" }, t("day.sessions", { count: threads.length }))),
            threads.map((thread) => h(SessionSheet, {
              key: thread.sessionId,
              thread,
              entries: threadItemsOf(thread),
              open: openSessions.has(thread.sessionId),
              openItems,
              onToggle: () => selectThread(thread),
              onToggleItem: toggleItem,
              busy,
              onSettle: handleSettle,
              onAnswer: handleAnswer,
              onReply: handleReply,
              onPreview: handlePreview,
              onReveal: handleReveal,
              t,
              now: snapshot.runtime?.now ?? now,
              capabilities: snapshot.runtime?.capabilities ?? {},
            }))))),
    settings ? h(SettingsDrawer, {
      snapshot,
      busy,
      onClose: () => setSettings(false),
      onSaveRoots: handleRoots,
      onRescan: handleRescan,
      t,
    }) : null,
    preview ? h(PreviewModal, {
      preview,
      onClose: () => setPreview(null),
      onReveal: (path) => preview?.item ? handleReveal(preview.item, path) : undefined,
      t,
    }) : null,
    h(Toast, { notice, onClose: () => setNotice(null) }));
}

function withT(Component) {
  return function BoundComponent(props) {
    const t = typeof props.t === "function" ? props.t : fallbackT;
    return h(Component, { ...props, t });
  };
}

function apply(ctx) {
  const store = createInboxStore(ctx.connection);
  const translate = translateFrom(ctx);
  const BoundPage = withT(InboxPage);
  const BoundIcon = withT(InboxIcon);

  const actions = {
    hooks: { inbox: store.hooks },
    act: store.act,
    request: store.request,
    openSession: (sessionId) => {
      const workspace = ctx.get("uiWorkspace");
      if (workspace !== undefined && typeof workspace.openSession === "function") {
        workspace.openSession(sessionId);
        return true;
      }
      return false;
    },
  };

  if (typeof ctx.inject === "function") {
    ctx.inject(["locale"], (localized) => {
      localized.effect(() => localized.locale.register(NS, { zh, en }), "dsh-inbox dictionaries");
    });
  }

  const localeSeat = ctx.get("locale") === undefined ? {} : { locale: NS };

  ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: PANEL_ID,
    ...localeSeat,
    inject: () => actions,
  }, BoundPage));

  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: PANEL_ID,
    order: 30,
    label: () => translate("panel"),
    ...localeSeat,
    inject: () => actions,
  }, BoundIcon));

  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.dataset.plugin = "dsh-inbox";
    tag.textContent = css;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, "dsh-inbox stylesheet");

  ctx.effect(() => {
    let timer = null;
    let disposed = false;
    const tick = () => {
      if (disposed) return;
      if (document.visibilityState === "hidden") return;
      void store.refresh({ quiet: true }).catch(() => {});
    };
    void store.refresh().catch(() => {});
    timer = window.setInterval(tick, POLL_MS);
    const onVisibility = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, "dsh-inbox polling");
}

exports.inject = ["slots", "connection"];
exports.apply = apply;
return module.exports; } });

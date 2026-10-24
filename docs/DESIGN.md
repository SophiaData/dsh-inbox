# dsh-inbox 设计说明

> 范围：DSH 0.2.1-rc.2（基线）/ 0.2.1-rc.3（兼容探测）。本文记录「为什么这样改」，实现细节以 `lib/` 与 `client.js` 为准。

## 目标 / 非目标

**目标**

1. 一个跨项目的全局收件箱，聚合三类需要人处理的事项：待回答问题、待查收交付、中断回合。
2. 查看与结算分离：打开/阅读只写已读，不删除、不结算。
3. 原地处理：continued 问题直接回答；中断会话直接补消息继续；交付可预览后查收/忽略。
4. 自动归组：项目目录 → 项目；会话按 cwd、标题、首条用户消息归组；不确定就留未分配。
5. 重启补报：插件启动时回扫最近会话，补出安装/重启前的中断。

**非目标**

- 不做另一个会话浏览器；会话列表仍归 `ui-workspace`。
- 不改 DSH 的会话日志、不写 `deliverables` 事件、不替模型生成答案。
- 不接管 open 问题的前台 answerer（官方没有跨面板 Remote，见「边界」）。
- 不持久化完整消息；只存判断所需的最小摘要。

## 依赖的 DSH 契约

| 用途 | 契约 | 出处 |
| --- | --- | --- |
| 枚举会话 | `ctx.sessionController.list({}, signal)` → `{ items: SessionSummary[] }`（0.2.1-rc.2；旧实现返回裸数组，已兼容） | `packages/api/session-controller/src/index.ts` |
| 冷读日志 | `ctx.sessionController.inspect(sessionId, signal)` → `{ meta, events }` | 同上 |
| 读投影 | `ctx.sessionController.projections({ sessionId }, signal)` → `{ kind, values }` | 同上 |
| 恢复 Agent | `ctx.sessionController.resolveAgent(sessionId)` → `{ agent }` / `{ error }` | `packages/api/session-controller/src/agent.ts` |
| 继续会话 | `ctx.sessionController.prompt({ requestId, sessionId, mode: 'queue', content }, signal)` | `packages/api/session-controller/src/types.ts` |
| 定位文件 | `ctx.sessionController.openWorkspacePath({ path, action: 'reveal' }, signal)` | 同上 |
| 回答问题 | `ctx.userQuestions.answer(agent, callId, { answers })` | `packages/interaction/user-questions/src/index.ts` |
| 交付事件 | `deliverables/presented: { turn, callId, files }` | `packages/deliverables/tool-present/src/types.ts` |
| 中断事件 | `turn/end: { turn, reason }`；`reason.kind` 为 `error` / `interrupted` / `completed` / `aborted` / `max-tokens` / `forked` | `packages/core/session/src/types.ts` |
| 问题投影 | `userQuestions.active[]`，每项 `{ callId, state: 'open' \| 'continued', questions }` | `packages/interaction/user-questions/src/projection.ts` |
| 实时事件 | `session/event(session, event)`、`api-session/error(sessionId, message)`、`api-session/status(sessionId, running)` | `docs/subsystems/session.md` |
| 面板 | `sidebar.panellist`（root list）+ `main`（root keyed） | `packages/client/ui-sidebar/src/client/contract/slots.ts`、`ui-layout` |
| 跳会话 | `ctx.uiWorkspace.openSession(sessionId)` | `packages/client/ui-workspace/src/client/navigation.ts` |

## 数据模型

状态文件 `<profile>/.dsh-inbox/state.json`（`0600`，原子替换）：

```json
{
  "version": 1,
  "projectRoots": ["E:/dev-day"],
  "projects": [{ "id": "E:/dev-day/dsh-inbox", "name": "dsh-inbox", "path": "...", "aliases": ["..."], "marker": ".git" }],
  "assignments": { "<sessionId>": "<projectId>" },
  "sessions": {
    "<sessionId>": { "title": "...", "firstMessage": "...", "cwd": "...", "projectId": "...", "updatedAt": 0, "lastSeq": 0, "running": false }
  },
  "items": {
    "question:<sessionId>:<callId>": {
      "kind": "question",
      "sessionId": "...",
      "state": "open",
      "readAt": null,
      "createdAt": 0,
      "updatedAt": 0,
      "question": { "callId": "...", "state": "continued", "questions": [] }
    }
  },
  "meta": { "lastScanAt": 0, "lastFullScanAt": 0, "lastError": null }
}
```

条目 id 规则：

- 问题：`question:<sessionId>:<callId>`
- 交付：`delivery:<sessionId>:<turn>`（同回合多次 `present` 以最后一次为准）
- 中断：`interruption:<sessionId>:<turn>`（`open-turn` 与后续 closer 共用 id）
- 回合外 Agent 错误：`interruption:<sessionId>:agent:<minute>:<hash>`

状态机：

```text
open ── 用户回答/查收/继续/知道了 ──> done
  │
  ├── 用户忽略 ──> ignored
  │
  ├── createdAt 早于 backfillDays 窗口 ──> archived (settledBy=backfill，只在「历史」筛选可见)
  │
  └── 问题在别处被回答（权威投影不再列出）──> done (settledBy=system, reason=answered)
```

`readAt` 与 `state` 正交。`upsertItem` 对已结算（含 archived）条目不重开，避免同一 turn/call 反复提醒。

快照另带 `threads`：按 `sessionId` 聚合条目，给出 `open/unread/question/delivery/interruption/archived/settled` 计数与 `itemIds`。面板渲染 thread，条目仍是唯一事实源。

## 扫描算法

### 启动 / 周期

1. `sessionController.list` 枚举可见会话；过滤空会话、子代理（可配）、`lookbackDays` 之外、超过 `maxSessions`。
2. 对需要更新的会话 `inspect`：
   - 全量扫描 / 新会话 / `updatedAt` 变化 / live / running / 30 天未扫。
   - 冷会话只要没有被 prompt 过就不会追加事件，因此 `updatedAt` 不变即可跳过。
3. `extractSessionFacts` 折叠日志：
   - 首条 `user/message` 且 `source.kind === 'user'`（跳过 synthetic 注入）；
   - `session/title`；
   - `turn/start` / `turn/end` 的 open turn 与 reason；
   - `deliverables/presented`；
   - `ask_user_question` / `run_code` 工具调用（用于触发问题投影重读）。
4. 归组：手动 assignment → cwd 最长匹配 → 标题/首条消息 token 打分（非 generic 3 分，generic 1 分；最高分并列则未分配；阈值 ≥3）。
5. 问题投影：live/最近/已有 open 问题的会话读 `projections`；否则用 `list` 的缓存投影。只有权威投影（`sequenced`）消失时才自动结算，避免缓存滞后误结算。
6. `prune`：保留所有 open 条目；已结算条目默认 30 天；条目上限 1000、会话记录上限 800。

### 实时

- `session/event`：
  - `turn/end` 的 error/interrupted 立即建中断条目；completed/aborted/max-tokens/forked 结算同回合的 open-turn 误报；
  - `deliverables/presented` 立即建交付条目；
  - `tool/call`（ask_user_question/run_code）与 `tool/result` 触发 900ms 防抖重扫；
  - `session/title`、首条 `user/message` 更新会话记录。
- `api-session/error`：回合外错误，按分钟+哈希去重。
- `api-session/status`：running=false 时触发重扫，以发现未闭合回合。
- 周期扫描默认 60s，作为兜底。

## RPC

客户端用 `ctx.connection.rpc.call('/api', 'dsh-inbox.<method>', payload)`；Host 用精确 POST 路由复用 DSH `/api` 认证。

| 方法 | 作用 | 写 |
| --- | --- | --- |
| `inbox.snapshot` | 条目、项目、统计、运行信息 | 否 |
| `inbox.mark-read` | 标记单条已读 | 是 |
| `inbox.mark-all-read` | 标记全部已读 | 是 |
| `inbox.settle` | `done` / `ignore` | 是 |
| `inbox.assign` | 手动归组 / 取消归组 | 是 |
| `inbox.set-roots` | 保存项目目录并全量重扫 | 是 |
| `inbox.rescan` | 立即重扫 | 是 |
| `inbox.answer` | 回答 continued 问题 | 是 |
| `inbox.reply` | 给会话发消息继续 | 是 |
| `inbox.preview` | 预览已声明交付文件（≤512KB，二进制检测） | 否 |
| `inbox.reveal` | 在系统文件管理器中定位已声明交付文件 | 是 |

所有方法要求 owner principal；写方法还要求 `interactions === 'answer'`。非 owner 返回 `INBOX_FORBIDDEN`。

## 边界与失败模式

- **open 问题**：`userQuestions.answer` 只接受 `continued`。面板对 open 问题仍展示表单，提交后若返回 `false` 转成 `QUESTION_OPEN`，提示并允许跳回原会话；不伪造答案、不排队假 reply。
- **交付**：只认 `deliverables/presented`。`workspace/changes` 的 summary 只活在 Host 内存，重启后不可回读，所以不做持久收件项。
- **崩溃检测**：只能看见日志里的未闭合 `turn/start`；如果进程在写入任何事件前就崩溃，DSH 没有可读证据。
- **权限**：Host 读取绕过 `sessionController.list` 的 remoteAccess 过滤，因此 RPC 层必须自己要求 owner；这是本插件不把 RPC 开放给非 owner 的原因。
- **状态文件损坏**：JSON 解析失败按空状态启动并记录 warning；不会删除原文件（下一次写入覆盖）。如需保留证据，先备份。
- **并发写**：所有 mutation 串行经过 store 的写队列；文件写用临时文件 + rename。
- **大文件**：预览上限 512KB；超出按 binary 处理，避免把大文件读进面板。

## 备选方案与取舍

| 方案 | 结论 |
| --- | --- |
| 只做客户端插件，直接读 `useSessions` 投影 | 只能看到已打开/已缓存会话，冷会话与重启补报做不到；Host 扫描是必须的。 |
| 把项目目录写进 `cordis.patch.yml` | 每次保存触发 Loader reconcile，面板会闪断；状态文件更适合运行期配置。 |
| 做右侧栏 per-session tab | 无法跨项目总览；全局主面板 + 侧栏入口更符合「收件箱」语义。 |
| 接管 open 问题的 answerer | 官方 answerer waterfall 不允许无侵入地旁观/接管；会与内置 composer 卡片竞争，风险高于收益。先按 continued 路径交付，等官方接口。 |
| 用 `workspace/changes` 作为交付 | 重启后 summary 不可回读，会造成「重启即丢交付」的假象；只认 `present`。 |
| 用 LLM 判断项目归属 | 引入模型调用、成本和不确定性；cwd + 标题/首条消息的确定性打分足够，且可解释。 |

## 兼容 rc.3

- 所有调用都做方法存在性探测；缺失能力降级为只读/隐藏入口。
- 版本从 `@deepseek-ai/dsh/package.json` 读取，不联网。
- `engines.dsh` 覆盖 `>=0.2.1-rc.2 <0.3.0`；rc.3 若改变方法语义，面板会在运行信息里显示版本，便于定位。
- 没有使用 rc.2 私有的 Typert 生成产物；只用公开 Host 服务与事件名。

# Agent Note: 收件箱按会话聚合 + 7 天回填窗口

Status: implemented — 列表从「一条事件一行」改为「一个会话一行」，超过 7 天的历史条目自动归档，不再占用待处理。

## Problem

接入真实 DSH 后，30 天回填把 461 个会话里的历史事件全部变成永久待办：

- 256 条待处理中 175 条是中断（154 条模型报错、21 条中断），最老的追到 30 天前
- 单个会话最多贡献 22 条（`订单履约工作台`、`支付拒付口径排查` 等），列表被同一会话刷屏
- 用户不需要处理三周前的模型 500，但旧数据既不能删也不能假装不存在

同时三栏布局（项目树 / 条目平铺 / 详情）在 256 行时中栏就是一堵墙。

## Decision

1. **按会话聚合**：条目仍是唯一事实源，快照新增 `threads`（按 `sessionId` 分组，带 `open/unread/question/delivery/interruption/archived/settled` 计数与 `itemIds`）。列表渲染 thread，详情渲染该 thread 的条目。
2. **7 天回填窗口**：新增配置 `backfillDays`（默认 7）。扫描结束后把 `createdAt` 早于窗口的 open 条目转为新状态 `archived`（`settledBy: 'backfill'`），计入 `stats.archived`，只在「历史」筛选下可见。
3. **时间流 + 卡片列表**：按「今天 / 昨天 / 本周 / 更早」分段，一个会话一张可展开卡片（左侧类型色条、右侧带底色的「待查收 N / 中断 N」标签、时间与展开符）；条目在卡片内再展开才出现操作。顶部工具栏为类型筛选 + 搜索 + 项目筛选（只列出实际有会话的项目，避免把 `docs/`、`scripts/` 之类目录当成项目）。
4. 筛选改为 全部 / 待回答 / 待查收 / 中断 / 已处理 / 历史，搜索同时匹配会话标题与条目内容。

## Alternatives considered

- **基线式不回扫**：安装时只记录现状，历史永不可见。最干净，但用户明确要求历史仍可查，否决。
- **每个会话只留最新一条**：会丢掉同一会话里不同 turn 的交付记录，且「忽略一条」的语义不清，否决。
- **在客户端做聚合**：快照仍按条目平铺，UI 自己分组。实现更散，且统计口径（open/archived）要在两处维护，否决。
- **删除历史条目**：不可逆，且与「查看只标已读、不结算」的产品原则冲突，否决。

## Acceptance criteria

- `npm test` 覆盖：`archiveBefore` 只归档窗口外的 open 条目；快照按会话聚合且计数正确；扫描后回填条目落在 `archived`。
- 真机：141 个会话 → 52 个 thread；256 条待处理收敛为 88 条 open + 169 条 archived。
- 未验证：Electron 桌面版的真实渲染（CLI web + headless 截图验证）。

## Consequences

- `state.json` 的 `ITEM_STATES` 增加 `archived`；旧状态文件无需迁移，扫描时会按时间自动归档。
- `stats` 增加 `archived` 字段，UI 的「历史」筛选依赖它。
- `sessionController.list` 同时兼容 `{ items }`（rc.2）与裸数组（旧实现），见同 commit 的修复。

## Risks

- 窗口按 `createdAt` 计算：一个 8 天前提出、至今仍待回答的问题会被归档。当前 DSH 的 active 问题投影通常已被回答，风险低。
- 归档条目仍留在 `state.json`，由既有 `retentionDays` 裁剪；长期使用需要观察文件体积。

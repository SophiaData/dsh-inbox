# 验证记录

日期：2026-10-23。运行环境：仓库内 Linux 验证机（Node 22.23.2）+ 临时安装的 dsh 0.2.1-rc.2。

## 1. 基线与依赖

- `npm view @deepseek-ai/dsh dist-tags`：`latest=0.2.1-rc.2`，`next=0.2.1-rc.3`（rc.3 发布于 2026-10-23 07:54 UTC）。
- 临时 profile 通过 `link:` 挂载本仓库；`@deepseek-ai/dsh` 0.2.1-rc.2 安装在 `/tmp/dsh-verify2`。

## 2. Bundle / patch / schema

```sh
DSH_HOME=/tmp/dsh-home dsh --profile inbox-test --dump-config
```

结果尾部：

```yaml
# == dsh-inbox
- id: dsh-inbox
  name: dsh-inbox
  config:
    projectRoots: []
```

```sh
DSH_HOME=/tmp/dsh-home dsh --profile inbox-test --dump-config-schema
```

`x-cordis.entries` 中：

```json
{ "path": "/96", "id": "dsh-inbox", "name": "dsh-inbox", "status": "schema", "configRef": "#/$defs/config66" }
```

`diagnostics: []`。说明 `dsh.bundle.patch`、`Config` schema、`engines.dsh` 都被 0.2.1-rc.2 接受。

## 3. Web 宿主启动与客户端模块

```sh
DSH_HOME=/tmp/dsh-home dsh --profile inbox-web --port 8899 --no-open
```

- 宿主启动成功，返回带 token 的 URL。
- `__DSH_BOOT__` 中的条目：

```json
{
  "id": "dsh-inbox",
  "url": "plugins/??dsh-inbox/client.js&rev=...",
  "rev": "...",
  "inject": [
    "@deepseek-ai/dsh-client-connection",
    "@deepseek-ai/dsh-client-ui-sidebar",
    "@deepseek-ai/dsh-client-ui-layout",
    "@deepseek-ai/dsh-client-ui-workspace"
  ]
}
```

- 带 cookie 请求该 bundle：`status=200`，约 75 KB，包含 `dsh-inbox-page` 样式标记。说明浏览器半侧被 `dsh-client-modules` 正确登记与分发。

## 4. Host RPC

带浏览器 cookie POST：

```json
{"type":"client-request","rpcId":"final","method":"dsh-inbox.inbox.snapshot","payload":{}}
```

响应：

```json
{
  "ok": true,
  "value": {
    "items": [],
    "runtime": {
      "pluginVersion": "0.1.0",
      "runtimeVersion": "0.2.1-rc.2",
      "capabilities": {
        "sessions": true, "prompt": true, "questions": true, "reveal": true, "profileDir": true
      }
    }
  }
}
```

`inbox.set-roots` 也验证通过：指向 `/tmp/dsh-home/demo-projects` 后返回 `projects: [{"name":"alpha","marker":".git"}]`，状态文件权限为 `0600`。

## 5. 单元 / 集成 / 客户端渲染

```sh
npm test
# 31 tests, 31 pass
npm run check
# exit 0
npm pack --dry-run
# 13 files, 126.4 kB
```

客户端面板用 `test/harness.js`（示例数据）在 React 18 实际渲染过：

- 回答提交：点击选项 → 发送答案，RPC 调用为 `inbox.answer`，参数 `{sessionId, callId, answers:[{id, selected}]}`，提示「答案已发送」。
- 设置抽屉：项目目录、已识别项目、运行版本、能力状态均渲染。
- 交付预览：调用 `inbox.preview`，文本内容显示在模态框。
- 已处理条目：只显示记录，不再渲染操作按钮。

## 6. 未覆盖

- 未在 rc.3 运行时启动；rc.3 兼容通过 `engines.dsh` 范围与方法存在性探测保障，需在 rc.3 发布后补一次真机回归。
- 未用真实模型会话触发 `open` 问题与宿主崩溃；相关路径用构造的 `SessionEvent` 日志覆盖（单测）。
- Electron 桌面版未安装验证；安装方式与 `dsh-mcp-skill-manager` 相同的 Bundle URL 路径。

## 7. GitHub 远端与 CI

- 仓库：`https://github.com/SophiaData/dsh-inbox`，默认分支 `main`。
- 推送提交：`312f228`；远端 `refs/heads/main` 与本地一致。
- CI：`CI` workflow run `40054093919` 完成，结论 `success`。
- 认证：使用仓库级 deploy key（`Allow write access`）；私钥只在本会话临时目录，未写入仓库。


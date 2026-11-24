**何时读我**：首次配置 Cloudflare Pages Direct Upload、配置 GitHub Secrets/Variables、执行回滚或排查线上异常时阅读。
**单一事实来源**：构建与部署流水线见 [deploy.yml](../.github/workflows/deploy.yml) 与 [sync-board.yml](../.github/workflows/sync-board.yml)，响应头与缓存策略见 [\_headers](../public/_headers)。
**维护边界**：纯静态无后端架构约束见 [ADR-01](DECISIONS.md#adr-01)，工作流完整清单见 [CI.md](CI.md)。

# 部署与运维指南

生产站点：<https://rh-triage-board.pages.dev>

## 部署拓扑与 Cloudflare Pages 接入

本仓库采用 **Cloudflare Pages Direct Upload**，由 GitHub Actions 在构建时注入最新 `public/data/board.json` 并通过 `wrangler pages deploy` 原子发布，**严禁启用 Cloudflare Pages 自带 Git 集成**（否则 Cloudflare 会与 GitHub Actions 各自触发部署，且因缺少 `build` 命令或无法隔离定时数据同步而相互覆盖报错）。

### 首次环境配置清单

1. **创建 Direct Upload 模式的 Pages 项目**：在 Cloudflare Dashboard → Workers & Pages → Create → Pages → 选择 **Direct Upload**（项目名默认 `rh-triage-board`），先完成一次占位发布或直接由工作流创建。
2. **创建 Cloudflare API Token**：权限至少包含 `Account -> Cloudflare Pages -> Edit` 与 `Account -> Account Settings -> Read`。
3. **配置 GitHub Repository Secrets & Variables**（Settings → Secrets and variables → Actions）：
   - Secret `CLOUDFLARE_API_TOKEN`：上述 API Token
   - Secret `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账号 ID
   - Variable `CLOUDFLARE_PROJECT_NAME`（可选）：默认为 `rh-triage-board`
   - Variable `RH_BOARD_ORIGIN`（可选）：默认为 `https://rh-triage-board.pages.dev`

## 自动同步、巡检与回滚

- **部署触发（`deploy.yml`）**：PR 合并至 `main` 且涉及可部署产物时，自动拉取最新上游快照、执行 `pnpm run build` 与 `pnpm run verify:build`、发布 Pages 并重试最多 5 次执行线上冒烟。
- **每 15 分钟定时刷新（`sync-board.yml`）**：以 `contents: read` 只读检出代码，拉取 `leanprover-community/riemann-hypothesis` 最新 PR/Issue/Commit 状态后构建发布，绝不向 `main` 提交任何数据文件。
- **每 6 小时线上巡检（`smoke.yml`）**：只读验证首页挂载节点、CSP/安全响应头、`/favicon.svg`、`/robots.txt`、`/llms.txt`、`/skills/*` 与 `/data/board.json` 契约。

### 线上版本查看与回滚

```bash
pnpm dlx wrangler@4 pages deployment list --project-name=rh-triage-board
```

如需回滚代码，可在 Cloudflare Pages Dashboard 的 **Deployments** 列表中选中上一个健康部署点击 **Rollback to this deployment**，或在修复提交合并前暂时保留该版本（注意回滚后需确认下一次 `sync-board.yml` 同步仍使用正常代码）。

## 常见故障排查

| 现象                            | 排查方向与处理                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 线上页面白屏或样式错乱          | 确认 Pages 项目是否为 **Direct Upload** 而非空构建命令的 Git 集成；查看最近一次 `Deploy · 应用` 或 `Sync · 定时数据同步` 运行日志；执行 `pnpm run smoke` 核查首页与静态资源 |
| 浏览器显示 `Mock Fallback` 徽章 | 说明 `/data/board.json` 未生成或请求非 2xx；检查 `sync-board.yml` 最近一次是否成功，或本地运行 `pnpm run fetch:board` 后刷新                                                |
| 新建仓库定时同步尚未自动触发    | GitHub Actions `schedule` 在新仓库通常存在 30–90 分钟以上冷启动延迟，且 `:00/:15/:30/:45` 高峰期可能延迟或跳过；可先手动触发 `workflow_dispatch` 验证同步链路               |
| PR 无法合并提示等待状态检查     | 确认 `main` 分支保护绑定的 required check 名称为 `CI 门禁`（`ci-gate` 聚合任务）                                                                                            |

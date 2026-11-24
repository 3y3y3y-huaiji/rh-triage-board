**何时读我**：修改 `.github/workflows/`、变更分类逻辑、Cloudflare Pages 部署配置或线上定时同步与巡检策略时阅读。
**单一事实来源**：变更分档规则见 `scripts/detect-changes.mjs`，工作流实现见 `.github/workflows/` 目录下的 YAML 文件。
**维护边界**：本文件只记录本仓 GitHub Actions 工作流矩阵、Secrets/Variables 与运维命令；`.github/workflows/*.yml` 与本表必须保持 1:1 严格一致（由 `verify:docs` 校验）。

# CI / CD 工作流地图

| 工作流                                                                      | 触发方式                                                     | 核心职责                                                                                                                                                                    | 权限与产物影响                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [ci.yml](../.github/workflows/ci.yml) `CI · 应用`                           | `pull_request`、`workflow_dispatch`、`workflow_call`         | 通过 `scripts/detect-changes.mjs` 按改动范围分档：纯文档仅跑 `docs-check`；工作流改动额外跑 `actionlint`；源码改动跑 `static`、`test`、`build`、`e2e`（依赖改动跑 `audit`） | `contents: read`；输出 PR 门禁结果，不部署 |
| [deploy.yml](../.github/workflows/deploy.yml) `Deploy · 应用`               | `push` (`main`)、`workflow_dispatch`                         | 门禁检查后采集最新 `public/data/board.json`，构建 `dist/`、执行 `verify:build`、部署 Cloudflare Pages 并执行线上冒烟                                                        | 部署生产站点并刷新数据快照                 |
| [sync-board.yml](../.github/workflows/sync-board.yml) `Sync · 定时数据同步` | `schedule`（每 15 分钟 `*/15 * * * *`）、`workflow_dispatch` | 使用内置 `secrets.GITHUB_TOKEN` 运行 `scripts/fetch-board.mjs`，构建并部署至 Cloudflare Pages；**严禁 commit/push 回 `main`**                                               | `contents: read`；只读同步并发布 Pages     |
| [smoke.yml](../.github/workflows/smoke.yml) `Smoke · 线上巡检`              | `schedule`（每 6 小时）、`workflow_dispatch`                 | 零依赖运行 `scripts/smoke.mjs`，只读校验线上首页与 `/data/board.json` 可用性与结构                                                                                          | 只读巡检，不修改任何部署或代码             |

## Secrets 与 Variables

| 名称                      | 类型                        | 用途                                                                                  |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`            | GitHub 内置 Secret          | `fetch-board.mjs` 拉取 `leanprover-community/riemann-hypothesis` PR/Issue/Commit 数据 |
| `CLOUDFLARE_API_TOKEN`    | Repository Secret           | `wrangler pages deploy` 鉴权                                                          |
| `CLOUDFLARE_ACCOUNT_ID`   | Repository Secret           | Cloudflare Pages 所属账号 ID                                                          |
| `CLOUDFLARE_PROJECT_NAME` | Repository Variable（可选） | 目标 Pages 项目名，默认 `rh-triage-board`                                             |
| `RH_BOARD_ORIGIN`         | Repository Variable（可选） | `smoke.yml` 目标站点源，默认 `https://rh-triage-board.pages.dev`                      |

## 常用本地校验命令

日常本地开发只需运行轻量静态与单测门禁，Playwright 多视口 E2E 统一由 GitHub Actions `CI · 应用` 在云端执行：

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run verify:docs
pnpm test
pnpm run build && pnpm run verify:build
```

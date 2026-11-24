**何时读我**：修改 `.github/workflows/`、变更分类逻辑、分支保护 required checks 或安全扫描策略时阅读。
**单一事实来源**：变更分档规则见 `scripts/detect-changes.mjs`，工作流实现见 `.github/workflows/` 目录下的 YAML 文件，依赖自动更新见 [dependabot.yml](../.github/dependabot.yml)。
**维护边界**：本文件只记录本仓 GitHub Actions 工作流矩阵、分支保护门禁与 Secrets/Variables；`.github/workflows/*.yml` 与本表必须保持 1:1 严格一致（由 `verify:docs` 校验）。

# CI / CD 与安全工作流地图

| 工作流                                                                                   | 触发方式                                                                             | 核心职责                                                                                                                                                         | 权限与产物影响                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [ci.yml](../.github/workflows/ci.yml) `CI · 应用`                                        | `pull_request`、`workflow_dispatch`、`workflow_call`                                 | 通过 `scripts/detect-changes.mjs` 按改动范围分档：`docs-check`、`actionlint`、`static`、`test`、`build`、`e2e`、`audit`，并由 `ci-gate`（`CI 门禁`）统一汇总结果 | `contents: read`；输出 PR 门禁结果，不部署                |
| [deploy.yml](../.github/workflows/deploy.yml) `Deploy · 应用`                            | `push` (`main`)、`workflow_dispatch`                                                 | 判定来源与部署范围后采集最新 `public/data/board.json`，构建 `dist/`、执行 `verify:build`、部署 Cloudflare Pages 并执行线上冒烟                                   | 部署生产站点并刷新数据快照                                |
| [sync-board.yml](../.github/workflows/sync-board.yml) `Sync · 定时数据同步`              | `schedule`（每 15 分钟 `*/15 * * * *`）、`workflow_dispatch`                         | 使用内置 `secrets.GITHUB_TOKEN` 运行 `scripts/fetch-board.mjs`，构建并部署至 Cloudflare Pages；**严禁 commit/push 回 `main`**                                    | `contents: read`；只读同步并发布 Pages                    |
| [smoke.yml](../.github/workflows/smoke.yml) `Smoke · 线上巡检`                           | `schedule`（每 6 小时）、`workflow_dispatch`                                         | 零依赖运行 `scripts/smoke.mjs`，只读校验线上首页、安全头、静态资源与 `/data/board.json` 契约                                                                     | 只读巡检，不修改任何部署或代码                            |
| [codeql.yml](../.github/workflows/codeql.yml) `Security · CodeQL`                        | `push`/`pull_request`（`main`）、每周一 `17 3 * * 1`、`workflow_dispatch`            | 对 `javascript-typescript` 执行 CodeQL 静态安全分析并上传结果至 GitHub Security                                                                                  | `contents: read` / `security-events: write`；只读安全扫描 |
| [scorecard.yml](../.github/workflows/scorecard.yml) `Security · OpenSSF Scorecard`       | `branch_protection_rule`、`push`（`main`）、每周一 `23 4 * * 1`、`workflow_dispatch` | 运行 OpenSSF Scorecard 供应链安全评分并将 SARIF 报告发布与上传至代码扫描面板                                                                                     | `contents: read` / `security-events: write`；安全评分上链 |
| [pr-cleanup.yml](../.github/workflows/pr-cleanup.yml) `Cleanup · 自动删除已合并 PR 分支` | `pull_request`（`types: [closed]`）                                                  | PR 合并后自动删除同仓库临时来源分支（跳过 `main`、`release/*`、`spike/*`）                                                                                       | `contents: write`（仅限清理分支 job）                     |

## 分支保护与供应链加固

- **`main` 分支保护**：禁止强推与删除，要求开启审查对话解决（`required_conversation_resolution`），并将 `CI · 应用` 的聚合任务 **`CI 门禁`**（`ci-gate`）设为 required status check（内部按改动范围跳过未触发的分档 job 时，仍能稳定上报通过状态）。
- **供应链 SHA 锁定**：所有 `.github/workflows/` 中的第三方 Action 均锁定 40 位 commit SHA 且对 `actions/checkout` 显式关闭 `persist-credentials: false`（由 `src/architecture-invariants.test.ts` 自动守卫）。
- **Dependabot 自动巡检**：[.github/dependabot.yml](../.github/dependabot.yml) 每周一检查 `npm` 与 `github-actions` 更新并限制并发 PR 上限为 5。

## Secrets 与 Variables

| 名称                      | 类型                        | 用途                                                                                  |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`            | GitHub 内置 Secret          | `fetch-board.mjs` 拉取 `leanprover-community/riemann-hypothesis` PR/Issue/Commit 数据 |
| `CLOUDFLARE_API_TOKEN`    | Repository Secret           | `wrangler pages deploy` 鉴权                                                          |
| `CLOUDFLARE_ACCOUNT_ID`   | Repository Secret           | Cloudflare Pages 所属账号 ID                                                          |
| `CLOUDFLARE_PROJECT_NAME` | Repository Variable（可选） | 目标 Pages 项目名，默认 `rh-triage-board`                                             |
| `RH_BOARD_ORIGIN`         | Repository Variable（可选） | `smoke.yml` 目标站点源，默认 `https://rh-triage-board.pages.dev`                      |

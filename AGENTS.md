# AGENTS.md · 仓库总导航地图

面向在本仓库工作的 AI Agent 与协作者。**按任务懒加载子目录指南与 `docs/` 专题文档，避免无关阅读。**

## 1. 三大子系统地形图

| 子系统                   | 职责与核心路径                                                                                                                                           | 进一步阅读                                                                            | 默认快速验证                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **纯函数分析引擎**       | `src/domain/`（队列调度、PR 撞车雷达、Mega-Refactor 溢出预警、Batch 收编识别、低门槛任务与算力门槛评估）                                                 | [domain 指南](src/domain/AGENTS.md)、[ARCHITECTURE](docs/ARCHITECTURE.md)             | `pnpm exec vitest run src/domain/`                                          |
| **多语种纯静态前端**     | `src/i18n/`（`en`/`zh`/`fr`/`de`/`ja` 5 语种字典）、`src/views/`（纯字符串视图）、`src/data/`（同源 `/data/board.json` 加载与 Mock 兜底）、`src/config/` | [i18n 指南](src/i18n/AGENTS.md)、[ARCHITECTURE](docs/ARCHITECTURE.md)                 | `pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm test` |
| **数据同步脚本与 CI/CD** | `scripts/`（`fetch-board.mjs`、`verify-docs.mjs`、`detect-changes.mjs`、`verify-build.mjs`、`e2e-ui.mjs`、`smoke.mjs`）与 `.github/workflows/`           | [scripts 指南](scripts/AGENTS.md)、[CI](docs/CI.md)、[OPERATIONS](docs/OPERATIONS.md) | `pnpm run verify:docs && pnpm exec vitest run scripts/`                     |

## 2. 单一事实来源（SSOT）与强联动表

| 单一事实来源                 | 必须同步的消费者与注意点                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/types.ts`        | `src/domain/`、`src/data/`、`src/views/`、`scripts/fetch-board.mjs` 产出契约                                                            |
| `src/config/ecosystem.ts`    | 顶部生态导航与上游 `AGENTS.md`（#312）贡献者守则展示                                                                                    |
| `src/i18n/types.ts`          | `src/i18n/en.ts`、`zh.ts`、`fr.ts`、`de.ts`、`ja.ts`（由 `locale-parity.test.ts` 强校验对称性）                                         |
| `public/_headers`            | `scripts/verify-build.mjs`、CSP 与 `/data/board.json` 缓存头（由 `src/architecture-invariants.test.ts` 锁定）                           |
| `scripts/detect-changes.mjs` | `.github/workflows/ci.yml` 与 `.github/workflows/deploy.yml` 变更分档输出                                                               |
| `.github/workflows/*.yml`    | `docs/CI.md` 工作流清单（由 `scripts/verify-docs.mjs` 强制 1:1 校验）与 40 位 SHA 锁定（由 `src/architecture-invariants.test.ts` 锁定） |

## 3. 机器难拦的物理与平台红线

1. **包管理唯一用 `pnpm`**（Node >= 24）：严禁使用 `npm`、`npx` 或 `yarn`；所有构建与检查通过 `pnpm run` 或 `pnpm exec` 执行。
2. **纯静态零后端架构**：不引入 Cloudflare Workers、KV、R2 或 `functions/` 目录；前端仅请求同源 `/data/board.json`（失败自动回退内置 Mock），**绝不在浏览器端直连 `api.github.com`**（见 [ADR-01](docs/DECISIONS.md#adr-01)）。
3. **禁止将同步数据 commit 回 `main`**：`public/data/board.json` 已加入 `.gitignore`，`.github/workflows/sync-board.yml` 必须保持 `contents: read` 并直接构建部署 Cloudflare Pages。
4. **Mega-Refactor Diff 溢出保护**：当上游 PR 出现 `changed_files === 0` 且命中超大变更或 `/files` API 422 / 截断时，**严禁判定为零冲突**，必须显式标记 `Mega-Refactor / Global Conflict Risk`（见 [ADR-02](docs/DECISIONS.md#adr-02)）。
5. **Batch 收编降噪不可误杀**：仅当 Batch PR 明确列出收编语义与 `#NNN` 且目标 PR 仍为 Open 时才标记 Subsumed；避免将 `depends on` / `review of` 误判为收编（见 [ADR-03](docs/DECISIONS.md#adr-03)）。
6. **逻辑层与视图层解耦及覆盖率白名单**：`src/domain/` 严禁导入 DOM/fetch/视图模块；`vitest.config.ts` 的 `coverage.exclude` 仅允许纯类型声明与薄入口 `src/main.ts`，由 `src/architecture-invariants.test.ts` 锁定。
7. **多语种同步、供应链与复杂度上限**：用户可见文案必须同步更新 `src/i18n/` 下全部 5 个语种文件；第三方 Action 必须锁定 40 位 commit SHA 且 `persist-credentials: false`（见 [ADR-06](docs/DECISIONS.md#adr-06)）；单文件受 ESLint `max-lines` 限制，严禁使用空 `catch {}` 或 `continue-on-error: true`。

## 4. PR 协作与 CI/CD 铁律

- **严禁直接 push `main`**：从最新 `origin/main` 拉取特性分支提交 PR，一件事一个 PR，提交标题严格遵循 `<type>(<scope>): 一句话结论`（如 `feat(domain): detect diff-overflow mega refactors`）。
- **变更分档与分支保护**：`CI · 应用` 通过 `scripts/detect-changes.mjs` 自动按改动物范围执行门禁，并由聚合任务 `CI 门禁` 统一向 `main` 分支保护汇报。
- **文档即代码（Docs-as-Code）**：改动工作流、架构决策或脚本命令后，必须同步更新对应 `docs/*.md` 并通过 `pnpm run verify:docs`。

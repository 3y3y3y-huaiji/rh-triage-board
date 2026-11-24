**何时读我**：理解 `rh-triage-board` 的纯静态数据同步链路、纯函数领域层与 UI 层解耦边界及离线兜底机制时阅读。
**单一事实来源**：领域类型契约见 `src/domain/types.ts`（由 [AGENTS.md](../AGENTS.md) 统筹约束）。
**维护边界**：不在此重复 CI 工作流触发矩阵（见 [CI.md](CI.md)），运维与部署步骤见 [OPERATIONS.md](OPERATIONS.md)，关键权衡与禁用替代方案见 [DECISIONS.md](DECISIONS.md)。

# 系统架构与纯静态同步设计

`rh-triage-board` 是面向 `leanprover-community/riemann-hypothesis` 的纯静态协作调度看板，托管于 Cloudflare Pages，**不依赖任何后端 Worker、KV、R2 或 Pages Functions**。

## 分层边界与数据流

```text
构建期数据同步（GitHub Actions 每 15 分钟 / 手动触发）
  scripts/fetch-board.mjs (GITHUB_TOKEN)
    ├── 拉取 main 分支最新 commit
    ├── 拉取 Open PRs 及 /pulls/{number}/files（标注 overflow / truncated）
    └── 拉取跟踪 Issue（#229、good first issue、batch 等）
          ↓ 生成 public/data/board.json（不入库）
          ↓ pnpm run build → dist/data/board.json（附带 llms.txt、skills/、favicon.svg、robots.txt）
          ↓ wrangler pages deploy dist（原子部署到 Cloudflare Pages）

浏览器端运行时（纯静态消费）
  src/main.ts
    ├── src/data/load-board.ts   请求同源 /data/board.json（失败自动回退 Mock）
    ├── src/domain/              纯函数分析引擎（队列 / 撞车雷达 / 收编 / 低门槛池 / Rebase）
    ├── src/i18n/                5 语种字典（en / zh / fr / de / ja，默认英文）
    └── src/views/               纯 HTML 字符串渲染（置顶刷新栏、四栏分诊视图、安全转义）
```

## 核心分析子模块（`src/domain/`）与界面契约

1. **Mega-Refactor / Diff 溢出检测**：识别 `diffStatus` 为 `'overflow'` / `'truncated'`，或 `changedFilesCount === 0` 且命中超大改动 / `extra large` 标签 / clump 关键词的 PR（如全仓合并文件的 `#324` 类型 PR），将其纳入全局冲突风险提示。
2. **Batch 收编识别（Subsumed）**：从 Batch/Rollup PR 的标题和正文中解析被合并收编的 `#NNN` Open PR，排除 `depends on`、`follow-up to`、`review of`、`stacked on` 等非收编引用，为队列、碰撞雷达与 Rebase 列表提供减噪标记。
3. **PR 撞车雷达（Conflict Radar）**：基于精确文件路径与目录前缀建立倒排索引，聚类存在文件重叠的 PR 组，并按 `Performance/Imports`、`Dead Code/Deduplication`、`Tactic Modernization`、`Docs/Infra`、`Math Refactor` 五大主题自动分组。
4. **线性合并队列与 Rebase 推荐**：识别带队列/高优先级标签或已收编碎片 PR 的 Batch PR，按优先级排出线性顺序并标注推荐 Rebase 基准 commit。
5. **低门槛任务池（Up for Grabs）**：合并上游跟踪 Issue 与常规可独立推进任务，标注算力门槛（`免编译` / `16GB 笔记本可跑` / `需大内存 Runner`）、碰撞热区避坑提示以及上游 `AGENTS.md`（#312）规范指引。
6. **置顶刷新栏与 Agent 静态接口**：页面顶部固定展示 `<time>` 精确 UTC 刷新时间、每 30 秒实时递增的相对耗时、上游 `main` 短 SHA、每 15 分钟轮询标识与手动刷新按钮；同时在站点根路径提供 `public/llms.txt`、`public/skills/lean-proof-golfing.md` 与 `public/skills/mathlib-pr-conventions.md`，供外部 AI Agent 免限流读取。

## 纯静态同步策略摘要（详见 ADR-01）

- 构建时静态生成 `public/data/board.json` 并随 Vite 打包进入 `dist/`，前端**只请求同源 `/data/board.json`**，彻底规避 GitHub API 未认证 60 次/小时限流与凭证泄露风险。
- `public/data/board.json` 列入 `.gitignore`，定时同步工作流仅具备 `contents: read` 权限，避免自动化 commit 污染 Git 历史或死循环触发代码 CI。
- 当本地开发或离线环境缺失 `/data/board.json` 时，自动无缝回退到内置高保真 Mock 快照，确保离线开发与 Playwright E2E 稳定通过。

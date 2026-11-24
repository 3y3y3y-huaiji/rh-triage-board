**何时读我**：需要理解系统关键架构取舍、或计划修改数据同步方式、冲突判定策略、测试覆盖率边界前阅读。
**单一事实来源**：总架构约束见 [AGENTS.md](../AGENTS.md)，工程实现以 `src/`、`scripts/` 与 `.github/workflows/` 为准。
**维护边界**：每条 ADR 只写清「决定 / 原因 / 禁止回退的替代方案」；新增重大决策追加编号，不随意删除旧记录。

# 架构决策记录（ADR）

## ADR-01：构建时静态同步 + 同源 JSON 消费，严禁数据回写 `main` {#adr-01}

- **决定**：由 `.github/workflows/sync-board.yml` 每 15 分钟使用 `GITHUB_TOKEN` 运行 `scripts/fetch-board.mjs` 生成 `public/data/board.json` 后直接构建并部署 Cloudflare Pages；前端仅请求同源 `/data/board.json`。
- **原因**：既避免了浏览器直连 GitHub API 触发 60 次/小时未认证限流与 CORS/CSP 暴露，又避免自动化同步 commit 回 `main` 污染 Git 历史或引发无休止的 CI 循环；同时无需部署 Workers/KV。
- **禁止回退的方案**：禁止在前端 `src/` 中直连 `api.github.com`，也禁止在 `sync-board.yml` 中赋予 `contents: write` 并执行 `git commit` / `git push`。

## ADR-02：Diff 溢出与 `changed_files === 0` 大型 PR 强制标记全局冲突风险 {#adr-02}

- **决定**：当 GitHub API 返回 HTTP 422（diff 过大）、`/files` 达到 300 条截断上限，或 `changed_files === 0` 但具有超大变更规模 / `extra large` / clump 特征（如 `#324` 类全仓 file-clumping PR），或改动文件数 > 200 时，冲突雷达将其标记为 `Mega-Refactor / Global Conflict Risk`，并**隔离出常规路径碰撞聚类与 Batch 收编计算**。
- **原因**：GitHub API 在 diff 溢出时会返回空文件列表或截断列表，若按常规文件交集计算会被误判为“零冲突”，从而误导协作者在全仓重构期间提交高冲突 PR；若让全仓 PR 参与倒排索引，还会把数十个互不相关的 PR 串成单个巨型碰撞簇，并让小型 PR 误吞其编号。
- **禁止回退的方案**：禁止仅因 `files.length === 0` 就把大型重构 PR 判定为“无文件冲突”或“低风险”，也禁止让 Mega-Refactor PR 进入常规碰撞簇或收编映射。

## ADR-03：Batch 收编（Subsumed）识别与负向语境隔离 {#adr-03}

- **决定**：仅在具备 Batch/Rollup 语义（标签或标题/正文关键词）的 PR 中提取被收编的 `#NNN` Open PR，且显式过滤 `depends on`、`follow-up to`、`review of`、`stacked on` 等非收编上下文；Mega-Refactor 不参与收编计算，隐式收编只允许双方均为非 Mega PR 的严格文件集包含，并禁止较小或更晚创建的 PR 反向收编较大/更早的 PR，部分重合仅算 `Overlaps`。
- **原因**：在高频协作期，队列头部的 Batch PR 会批量打包十余个小 PR；明确标出已被收编的碎片 PR 可显著降低维护者重复 Review 与贡献者无效 Rebase 的噪声，同时防止普通依赖引用或小 PR 对全仓 Mega-Refactor 的误吞被标记为“已收编”。
- **禁止回退的方案**：禁止对所有 PR 正文里的任意 `#NNN` 无差别标记为“已被收编”，也禁止让小型 PR 收编改动文件数远超自身的 Mega-Refactor。

## ADR-04：内置高保真 Mock 兜底，保证离线与 E2E 稳定性 {#adr-04}

- **决定**：`src/data/load-board.ts` 在 `/data/board.json` 请求失败、HTTP 非 2xx 或 schema 校验不通过时，自动回退到 `src/data/mock-board.ts` 并在页头清晰展示 `Mock Fallback` 状态徽章。
- **原因**：本地开发、未配置 GitHub Token 的分支预览与无外网 Playwright E2E 环境不一定存在已同步的 `/data/board.json`，静默白屏或报错会阻断开发与验证。
- **禁止回退的方案**：禁止在缺少 `/data/board.json` 时抛出未捕获异常导致界面无法渲染，或依赖外网实时抓取才能通过 E2E。

## ADR-05：纯函数领域层隔离、`max-lines` 上限与覆盖率白名单锁死 {#adr-05}

- **决定**：核心分析逻辑全部收拢到零 DOM/fetch 依赖的 `src/domain/`，受 `vitest.config.ts` 高阈值覆盖率检查与 ESLint `max-lines` 约束，`coverage.exclude` 仅限纯类型文件与薄入口 `src/main.ts`，并由 `src/architecture-invariants.test.ts` 锁死。
- **原因**：防止 UI 视图与业务逻辑耦合导致测试退化，也防止 AI 或协作者通过扩大 `coverage.exclude` 绕过门禁。
- **禁止回退的方案**：禁止向 `vitest.config.ts` 的 `coverage.exclude` 塞入业务逻辑模块，或在 `src/domain/` 中引入 `document` / `fetch`。

## ADR-06：双协议（Apache-2.0 OR MulanPSL-2.0）与供应链 SHA 锁定 {#adr-06}

- **决定**：本项目以 `(Apache-2.0 OR MulanPSL-2.0)` 双协议对外授权，同时将 `.github/workflows/` 内全部第三方 GitHub Action 锁定到 40 位 commit SHA 并关闭 checkout 凭证持久化（`persist-credentials: false`）。
- **原因**：双协议兼顾国际开源生态兼容（Apache-2.0）与国内友好合规（木兰宽松许可证 v2）；工作流 SHA 锁定与最小权限则是对抗第三方 Action tag 投毒、满足 OpenSSF Scorecard 与长期无人值守运行的基础防线。
- **禁止回退的方案**：禁止撤除双协议之一，也禁止在工作流中使用未锁定 SHA 的浮动主版本标签（如 `@v4`）。

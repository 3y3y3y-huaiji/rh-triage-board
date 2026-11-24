# src/domain/AGENTS.md · 纯函数分析引擎规范

仅在修改 `src/domain/` 下的调度、碰撞、收编或任务推荐逻辑时阅读本指南。全仓总约束见根目录 [AGENTS.md](../../AGENTS.md)。

## 1. 模块职责与纯函数边界

- `src/domain/` 所有模块必须保持**零副作用纯函数**：严禁访问 `window`、`document`、`fetch`、计时器或导入 `src/views/`、`src/data/`。
- 所有边界契约在 `src/domain/types.ts` 统一声明，由 `src/architecture-invariants.test.ts` 自动守卫。

## 2. 核心业务红线

- **Mega-Refactor / Diff 溢出预警**：`changedFilesCount === 0` 叠加 `extra large` / 超大增删行数 / clump 关键词，或 `diffStatus` 为 `'overflow'` / `'truncated'`，或改动文件数 > 200 时，必须输出 `Mega-Refactor / Global Conflict Risk`，绝不误报零冲突；此类 PR 不得参与常规文件/目录碰撞聚类与 Batch 收编计算，仅在 Mega-Refactor 预警区展示。
- **Batch 收编识别（Subsumed）**：从 Batch PR 标题与正文提取显式收编关系（排除 `depends on`、`follow-up to`、`review of`、`stacked on` 等反向/依赖语境），并仅对双方均非 Mega 的 PR 采用严格文件集包含兜底；禁止较小或更晚创建的 PR 反向收编较大/更早的 PR，部分文件重合只算 `Overlaps`，建立 `subsumedBy` 索引供队列、雷达和 Rebase 面板减噪。
- **低门槛任务池避坑**：`Up for Grabs` 必须结合当前碰撞热区目录（`hotspotPrefixes`）与活跃 `src/` Mega-Refactor 提示算力门槛与热区避坑状态。

## 3. 验收标准

```bash
pnpm exec vitest run src/domain/ src/architecture-invariants.test.ts
pnpm run typecheck && pnpm run lint
```

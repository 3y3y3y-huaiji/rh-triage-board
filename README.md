# rh-triage-board

面向 [`leanprover-community/riemann-hypothesis`](https://github.com/leanprover-community/riemann-hypothesis) 的纯静态协作调度看板（Cloudflare Pages 托管），提供线性合并队列跟踪、PR 撞车雷达、Mega-Refactor 溢出预警、Batch 收编减噪与低门槛任务认领指引。

[English](README.en.md) · [文档导航](docs/README.md) · [系统架构](docs/ARCHITECTURE.md) · [CI / CD](docs/CI.md)

## 核心特性

- **纯静态零后端架构**：每 15 分钟通过 GitHub Actions 生成 `/data/board.json` 并原子部署到 Cloudflare Pages，无需 Worker / KV / Functions，生成数据不入库。
- **PR 撞车雷达 & Mega-Refactor 预警**：基于精确文件与目录前缀探测重叠冲突，并对 diff 溢出 / `changed_files === 0` 的全仓重构 PR 显式发出 `Mega-Refactor / Global Conflict Risk` 预警。
- **Batch 收编减噪**：自动识别已被 Batch PR 收编的碎片 PR，避免维护者重复 Review 与贡献者无效 Rebase。
- **低门槛任务池（Up for Grabs）**：标注 `免编译` / `16GB 笔记本可跑` / `需大内存 Runner` 算力门槛、重构热区避坑提示及上游 `AGENTS.md`（#312）规范指引。
- **中英双语 + 离线 Mock 兜底**：本地缺失 `/data/board.json` 时自动回退到高保真 Mock 快照。

## 快速开始

```bash
pnpm install
pnpm dev
```

拉取实时数据快照（可选，支持配置 `GITHUB_TOKEN`）：

```bash
pnpm run fetch:board
```

## 质量门禁

本地只跑轻量检查（Playwright E2E 由 GitHub Actions 自动执行）：

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run verify:docs
pnpm test
pnpm run build && pnpm run verify:build
```

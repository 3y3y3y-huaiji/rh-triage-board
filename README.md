<h3>简体中文 | <a href="README.en.md">English</a></h3>

# rh-triage-board

[![CI · 应用](https://github.com/3y3y3y-huaiji/rh-triage-board/actions/workflows/ci.yml/badge.svg)](https://github.com/3y3y3y-huaiji/rh-triage-board/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/3y3y3y-huaiji/rh-triage-board/badge)](https://scorecard.dev/viewer/?uri=github.com/3y3y3y-huaiji/rh-triage-board)
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MulanPSL--2.0-blue)](LICENSE)

面向 [`leanprover-community/riemann-hypothesis`](https://github.com/leanprover-community/riemann-hypothesis) 的纯静态协作调度看板，提供线性合并队列跟踪、PR 撞车雷达、Mega-Refactor 溢出预警、Batch 收编减噪与低门槛任务认领指引。

线上访问：<https://rh-triage-board.pages.dev>

[文档导航](docs/README.md) · [系统架构](docs/ARCHITECTURE.md) · [本地开发](docs/DEVELOPMENT.md) · [CI / CD](docs/CI.md) · [部署与运维](docs/OPERATIONS.md) · [安全政策](SECURITY.md)

## 核心特性

- **纯静态零后端架构**：每 15 分钟通过 GitHub Actions 生成 `/data/board.json` 并原子部署到 Cloudflare Pages，无需 Worker / KV / Functions，生成数据不入库。
- **置顶实时刷新状态栏**：顶部常驻显示精确 UTC 更新时间、每 30 秒刷新的相对耗时、上游 `main` 短 SHA、每 15 分钟自动轮询标识与手动刷新按钮。
- **PR 撞车雷达 & Mega-Refactor 预警**：基于精确文件与目录前缀探测重叠冲突，并对 diff 溢出 / `changed_files === 0` 的全仓重构 PR 显式发出 `Mega-Refactor / Global Conflict Risk` 预警。
- **Batch 收编减噪**：自动识别已被 Batch PR 收编的碎片 PR，避免维护者重复 Review 与贡献者无效 Rebase。
- **低门槛任务池（Up for Grabs）**：标注 `免编译` / `16GB 笔记本可跑` / `需大内存 Runner` 算力门槛、重构热区避坑提示及上游 `AGENTS.md`（#312）规范指引。
- **5 语种支持 + 离线 Mock 兜底**：支持 `en` / `zh` / `fr` / `de` / `ja` 五种界面语言（默认英文），本地缺失 `/data/board.json` 时自动回退到高保真 Mock 快照。
- **面向 Agent 的静态接口**：站内托管 `/data/board.json`、`/llms.txt`、`/skills/lean-proof-golfing.md` 与 `/skills/mathlib-pr-conventions.md`，支持下游 AI Agent 零限流读取规则。

## 快速开始

```bash
pnpm install
pnpm run dev
```

拉取实时数据快照（可选，支持配置 `GITHUB_TOKEN`）：

```bash
pnpm run fetch:board
```

## 质量门禁

本地只跑轻量检查（Playwright 多视口 E2E 由 GitHub Actions 自动执行）：

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run verify:docs
pnpm test
pnpm run build && pnpm run verify:build
```

## 贡献与安全

- 贡献流程与约束请先阅读 [AGENTS.md](AGENTS.md) 与 [本地开发](docs/DEVELOPMENT.md)；请勿直接向 `main` 推送，统一通过特性分支提交 PR 并等待 `CI 门禁` 通过。
- 安全漏洞请勿在公开 Issue 披露，遵循 [安全政策](SECURITY.md) 私下联系维护者。

## 许可证

本项目采用 **双协议**，你可以任选其一使用与分发：

- [Apache License 2.0](LICENSE)
- [木兰宽松许可证，第 2 版](LICENSE-MULAN)（Mulan Permissive Software License v2）

SPDX 标识：`(Apache-2.0 OR MulanPSL-2.0)`。

# scripts/AGENTS.md · 数据采集、门禁与 E2E 脚本规范

仅在修改 `scripts/` 下的采集、文档校验、变更分档、构建校验、E2E 或冒烟脚本时阅读本指南。工作流全貌见 [CI.md](../docs/CI.md)。

## 1. 运行环境与语言规范

- `scripts/*.mjs` 统一使用 **Node 24+ 原生 ESM**，零编译步骤，尽量减少外部运行依赖，受根目录 `eslint.config.js` 与 `vitest.config.ts` 管理。

## 2. 路径与行为红线

- **禁止硬编码生产域名**：线上巡检 `scripts/smoke.mjs` 统一读取环境变量 `RH_BOARD_ORIGIN`（未设置时默认回退到 `https://rh-triage-board.pages.dev`）。
- **禁止写入 Git 追踪目录**：`scripts/fetch-board.mjs` 仅输出到 `public/data/board.json`（已被 `.gitignore` 忽略），工作流严禁 commit 该文件。
- **溢出与截断必须显式留痕**：`fetch-board.mjs` 遇到 GitHub `/pulls/{number}/files` HTTP 422、达到 300 文件分页上限或 `changed_files === 0` 时，必须记录 `diffStatus` 为 `'overflow'` 或 `'truncated'`。
- **禁止静默失败**：`verify-docs.mjs`、`verify-build.mjs`、`smoke.mjs` 与 `e2e-ui.mjs` 失败时必须非零退出。

## 3. 强联动

- `scripts/detect-changes.mjs` ↔ `.github/workflows/ci.yml` & `.github/workflows/deploy.yml`
- `scripts/verify-docs.mjs` ↔ `docs/CI.md` & `package.json`

## 4. 验收标准

```bash
pnpm run format:check && pnpm run lint && pnpm run verify:docs
pnpm exec vitest run scripts/
```

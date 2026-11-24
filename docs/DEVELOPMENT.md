**何时读我**：搭建本地开发环境、运行轻量质量门禁、了解覆盖率阈值与版本发布规范时阅读。
**单一事实来源**：脚本命令定义见 [package.json](../package.json)，覆盖率与 ESLint 约束见 [vitest.config.ts](../vitest.config.ts) 与 [eslint.config.js](../eslint.config.js)。
**维护边界**：不重复抄写 CI 工作流分档表（见 [CI.md](CI.md)）或 Cloudflare Pages 运维步骤（见 [OPERATIONS.md](OPERATIONS.md)）。

# 本地开发与质量门禁

项目整体定位见 [README.md](../README.md)；系统分层设计见 [ARCHITECTURE.md](ARCHITECTURE.md)；部署与故障排查见 [OPERATIONS.md](OPERATIONS.md)。

## 环境要求与包管理

- **Node.js >= 24** 与 **pnpm `12.21.0`**（`package.json` 的 `packageManager` 字段锁定版本）。
- 严禁使用 `npm`、`npx` 或 `yarn`；`pnpm-lock.yaml` 与 `pnpm-workspace.yaml` 为唯一依赖锁定来源。
- 仓库根目录 [`.gitattributes`](../.gitattributes) 强制统一采用 `LF` 换行符，避免 Windows 检出转为 `CRLF` 后触发 `format:check` 失败。

## 常用命令

```bash
pnpm install             # 安装依赖
pnpm run dev             # 启动 Vite 本地开发服务器（缺失 /data/board.json 时自动走 Mock 兜底）
pnpm run fetch:board     # 从 GitHub 拉取实时看板快照到 public/data/board.json（可选 GITHUB_TOKEN）
pnpm run build           # 生成纯静态 dist/ 构建产物
pnpm run verify:build    # 校验 dist/ 关键文件与构建完整性
pnpm run preview         # 本地预览 dist/
pnpm run smoke           # 对线上生产站点执行只读冒烟巡检
```

## 质量门禁与分工

日常本地开发只需运行轻量静态检查与 Vitest 单测；多视口 Playwright UI E2E（`pnpm run e2e`）统一交由 PR 的 GitHub Actions（`CI · 应用`）在云端执行：

| 命令                                      | 检查范围                | 说明                                                                               |
| ----------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| `pnpm run format:check`                   | Prettier 格式校验       | 发现格式差异时可先执行 `pnpm run format`                                           |
| `pnpm run lint`                           | ESLint 静态规则         | 禁用空 `catch {}`；`src/` 业务文件受 `max-lines` 限制                              |
| `pnpm run typecheck`                      | `tsc --noEmit`          | 严格 TypeScript 类型检查                                                           |
| `pnpm run verify:docs`                    | Docs-as-Code 校验       | 检查断链、仓内路径、脚本名、`AGENTS.md` 行数与 `docs/CI.md` 同步                   |
| `pnpm test`                               | Vitest 单元测试与覆盖率 | 全局阈值 80%/75%/80%/80%，`src/domain/` 阈值 90%/85%/90%/90%                       |
| `pnpm run build && pnpm run verify:build` | 静态打包与产物契约      | 验证 `index.html`、`_headers`、`favicon.svg`、`robots.txt`、`llms.txt`、`skills/*` |

> [!TIP]
> 若本地默认 npm 镜像（例如部分国内加速镜像）不支持 `pnpm audit` 的 POST 接口并返回 `405`，请显式指定官方源运行：
> `pnpm audit --registry=https://registry.npmjs.org`

## 贡献与提交流程

- 修改代码前先阅读根目录 [AGENTS.md](../AGENTS.md) 以及对应子目录指南（`src/domain/AGENTS.md`、`src/i18n/AGENTS.md`、`scripts/AGENTS.md`）。
- 严禁直接向 `main` 推送提交；请从最新 `origin/main` 拉取特性分支，提交信息遵循 `<type>(<scope>): 一句话结论`，并通过 Pull Request 触发 `CI 门禁`。
- 用户可见文案须在 `src/i18n/` 下 5 个语种文件（`en`/`zh`/`fr`/`de`/`ja`）严格 1:1 对齐，由 `src/i18n/locale-parity.test.ts` 自动守卫。

## 版本约定

- `main` 分支合入即自动部署到 Cloudflare Pages；对外里程碑节点可使用 annotated git tag（例如 `v0.1.0`、`v0.2.0`）标记：
  - `MINOR`：新增分诊规则、视图交互或静态接口字段；
  - `PATCH`：缺陷修复、文案修正或依赖安全升级；
  - 纯文档或内部重构不单独打 tag。

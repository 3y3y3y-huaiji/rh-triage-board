# Security Policy · 安全政策

## Reporting a Vulnerability / 漏洞上报

请**勿**在公开的 GitHub Issues、Discussions 或 Pull Requests 中披露尚未修复的安全漏洞。

- **联系邮箱 / Contact**: <sumingkai1@outlook.com>
- **建议提供信息 / What to include**: 受影响路径（如 Cloudflare Pages 响应头与 CSP 策略 `public/_headers`、GitHub Actions 同步与部署流水线 `.github/workflows/`、静态数据与 Agent 接口 `/data/board.json`、`/llms.txt`、`/skills/`，或前端 HTML 安全转义 `src/views/html.ts`）、复现步骤、潜在影响与可行缓解建议。

Please **do not** disclose unpatched security vulnerabilities in public GitHub Issues, Discussions, or Pull Requests. Send a private report to <sumingkai1@outlook.com> with reproduction steps and impact details.

## Response SLA / 响应周期

- **确认收到 / Acknowledgement**: 72 小时内确认邮件并建立沟通 / Within 72 hours.
- **评估与修复 / Triage & Fix**: 14 天内完成严重性评估并给出修复计划或临时缓解措施；高危问题优先修复，并在修复发布后协调公开致谢 / Within 14 days.

## Supported Versions / 受支持与不支持版本

| Scope / 范围                                                     | Status / 状态        | Notes / 说明               |
| ---------------------------------------------------------------- | -------------------- | -------------------------- |
| `main` 分支与线上生产部署（`https://rh-triage-board.pages.dev`） | Supported / 受支持   | 持续接收安全修复与依赖更新 |
| 历史旧提交或已归档分支 / Older commits & archived branches       | Unsupported / 不支持 | 请升级至最新 `main`        |

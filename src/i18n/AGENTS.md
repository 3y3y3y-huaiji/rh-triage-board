# src/i18n/AGENTS.md · 多语种字典与文案同步规范

仅在修改 `src/i18n/` 时阅读本指南。全仓总约束见根目录 [AGENTS.md](../../AGENTS.md)。

## 1. 强联动文件

- `src/i18n/types.ts`：唯一接口定义，新增任何界面字段必须先在此声明。
- `src/i18n/zh.ts`、`src/i18n/en.ts`、`src/i18n/fr.ts`、`src/i18n/de.ts`、`src/i18n/ja.ts`：键结构必须 1:1 严格对称，所有字符串非空。
- `src/i18n/index.ts`：只暴露 `SUPPORTED_LOCALES`、`DICTS`、`normalizeLocale` 与 `getMessages`。

## 2. 验收标准

```bash
pnpm exec vitest run src/i18n/
pnpm run typecheck && pnpm run lint
```

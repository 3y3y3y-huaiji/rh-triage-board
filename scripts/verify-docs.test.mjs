// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectLiveDocs, verifyDocs } from './verify-docs.mjs';

const tempDirs = [];

const makeRepo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'rh-verify-docs-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, 'docs'), { recursive: true });
  mkdirSync(join(dir, 'src/domain'), { recursive: true });
  mkdirSync(join(dir, '.github/workflows'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ scripts: { test: 'vitest run', build: 'vite build' } }),
  );
  writeFileSync(join(dir, '.github/workflows/ci.yml'), 'name: CI\n');
  writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n见 [CI](docs/CI.md)\n`src/domain/`\n');
  writeFileSync(
    join(dir, 'docs/CI.md'),
    '**何时读我**：CI\n**单一事实来源**：[ci.yml](../.github/workflows/ci.yml)\n**维护边界**：CI\n\n## 列表\n\n运行 `pnpm run test`。\n',
  );
  return dir;
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('verify-docs', () => {
  it('正常仓库结构下校验通过', () => {
    const dir = makeRepo();
    expect(collectLiveDocs(dir)).toEqual(['AGENTS.md', 'docs/CI.md']);
    expect(verifyDocs(dir)).toEqual([]);
  });

  it('拦截断链、幽灵路径、幽灵命令与缺少定位头的文档', () => {
    const dir = makeRepo();
    writeFileSync(
      join(dir, 'docs/ARCHITECTURE.md'),
      '缺少定位头\n[missing](missing.md)\n`src/not-real.ts`\n`pnpm run ghost`\n',
    );
    const errors = verifyDocs(dir);
    expect(errors.some((e) => e.includes('存在断链'))).toBe(true);
    expect(errors.some((e) => e.includes('src/not-real.ts'))).toBe(true);
    expect(errors.some((e) => e.includes('pnpm run ghost'))).toBe(true);
    expect(errors.some((e) => e.includes('AI 定位头标记'))).toBe(true);
  });

  it('拦截超出 200/120 行上限的 AGENTS.md 与工作流遗漏', () => {
    const dir = makeRepo();
    writeFileSync(join(dir, 'AGENTS.md'), Array(205).fill('line').join('\n'));
    writeFileSync(join(dir, 'src/domain/AGENTS.md'), Array(125).fill('line').join('\n'));
    writeFileSync(join(dir, '.github/workflows/deploy.yml'), 'name: Deploy\n');
    const errors = verifyDocs(dir);
    expect(errors.some((e) => e.includes('AGENTS.md 超出上限'))).toBe(true);
    expect(errors.some((e) => e.includes('src/domain/AGENTS.md 超出上限'))).toBe(true);
    expect(errors.some((e) => e.includes('缺少工作流登记 (deploy.yml)'))).toBe(true);
  });
});

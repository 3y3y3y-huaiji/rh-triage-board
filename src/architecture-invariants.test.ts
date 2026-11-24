// @vitest-environment node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import gitignoreSource from '../.gitignore?raw';
import headersSource from '../public/_headers?raw';
import vitestConfigSource from '../vitest.config.ts?raw';

const EXPECTED_COVERAGE_EXCLUDE = [
  'src/**/*.test.ts',
  'src/**/*.d.ts',
  'src/i18n/types.ts',
  'src/domain/types.ts',
  'src/main.ts',
];

const DOMAIN_MODULES = import.meta.glob('./domain/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const VIEW_MODULES = import.meta.glob('./views/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const WORKFLOW_MODULES = import.meta.glob('../.github/workflows/*.yml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('架构与纯静态边界不变量', () => {
  it('锁定 vitest.config.ts 的 coverage.exclude 白名单，禁止塞入业务逻辑文件', () => {
    const blockMatch = /exclude:\s*\[([\s\S]*?)\]/.exec(vitestConfigSource);
    expect(blockMatch).not.toBeNull();
    const actual = Array.from(blockMatch![1]!.matchAll(/'([^']+)'/g), (m) => m[1]!);
    expect(actual).toEqual(EXPECTED_COVERAGE_EXCLUDE);
  });

  it('纯函数领域层 src/domain/ 严禁访问 DOM、fetch 或跨层导入 UI/Data 模块', () => {
    const forbiddenPattern =
      /\b(?:window|document|localStorage|fetch|navigator)\b|(?:from\s+['"][^'"]*(?:\/views\/|\/data\/|\/i18n\/))/;
    for (const [path, content] of Object.entries(DOMAIN_MODULES)) {
      if (path.endsWith('.test.ts')) continue;
      expect(content, path).not.toMatch(forbiddenPattern);
    }
  });

  it('视图层 src/views/ 严禁直连网络 fetch 或导入 scripts/', () => {
    const forbiddenPattern = /\bfetch\s*\(|(?:from\s+['"][^'"]*scripts\/)/;
    for (const [path, content] of Object.entries(VIEW_MODULES)) {
      if (path.endsWith('.test.ts')) continue;
      expect(content, path).not.toMatch(forbiddenPattern);
    }
  });

  it('保持纯静态 Cloudflare Pages 架构：无 functions/，CSP 锁死同源 connect-src，且忽略生成数据', () => {
    expect(existsSync(resolve('functions'))).toBe(false);
    expect(headersSource).toContain("connect-src 'self'");
    expect(headersSource).not.toContain('api.github.com');
    expect(headersSource).not.toContain('raw.githubusercontent.com');
    expect(gitignoreSource).toContain('public/data/board.json');
  });

  it('工作流禁止 continue-on-error: true，且 sync-board.yml 严禁回写 Git', () => {
    for (const [path, content] of Object.entries(WORKFLOW_MODULES)) {
      expect(content, path).not.toMatch(/continue-on-error:\s*true/);
      if (path.endsWith('sync-board.yml')) {
        expect(content).toContain('contents: read');
        expect(content).not.toMatch(/contents:\s*write/);
        expect(content).not.toMatch(/\bgit\s+(?:commit|push)\b/);
      }
    }
  });

  it('所有第三方 GitHub Action 必须锁定 40 位 commit SHA', () => {
    for (const [path, content] of Object.entries(WORKFLOW_MODULES)) {
      for (const match of content.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
        const target = match[1]!;
        if (target.startsWith('./')) continue;
        expect(target, `${path} -> ${target}`).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });

  it('仓库根目录必须具备双协议与安全政策治理文件', () => {
    expect(existsSync(resolve('LICENSE'))).toBe(true);
    expect(existsSync(resolve('LICENSE-MULAN'))).toBe(true);
    expect(existsSync(resolve('SECURITY.md'))).toBe(true);
  });
});

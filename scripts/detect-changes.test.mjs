// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { classifyFiles } from './detect-changes.mjs';

describe('detect-changes', () => {
  it('纯文档改动仅触发 docs-check，跳过 static/test/build/e2e', () => {
    expect(classifyFiles(['README.md', 'docs/ARCHITECTURE.md', 'src/domain/AGENTS.md'])).toEqual({
      docsOnly: true,
      workflows: false,
      workflowsOnly: false,
      static: false,
      test: false,
      build: false,
      e2e: false,
      deps: false,
      deployable: false,
    });
  });

  it('纯工作流改动触发 actionlint，跳过源码测试与构建', () => {
    expect(classifyFiles(['.github/workflows/ci.yml', 'docs/CI.md'])).toEqual({
      docsOnly: false,
      workflows: true,
      workflowsOnly: true,
      static: false,
      test: false,
      build: false,
      e2e: false,
      deps: false,
      deployable: false,
    });
  });

  it('源码与依赖改动触发全套门禁与部署标记', () => {
    expect(classifyFiles(['src/domain/conflict-radar.ts', 'package.json'])).toEqual({
      docsOnly: false,
      workflows: false,
      workflowsOnly: false,
      static: true,
      test: true,
      build: true,
      e2e: true,
      deps: true,
      deployable: true,
    });
  });

  it('仅修改测试文件时跑 static 与 test，不触发构建部署', () => {
    expect(classifyFiles(['src/domain/conflict-radar.test.ts'])).toEqual({
      docsOnly: false,
      workflows: false,
      workflowsOnly: false,
      static: true,
      test: true,
      build: false,
      e2e: false,
      deps: false,
      deployable: false,
    });
  });
});

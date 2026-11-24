import { describe, expect, it } from 'vitest';
import type { PullRequestRecord } from './types';
import {
  classifyTopic,
  detectMegaRefactor,
  extractDirectoryPrefix,
  isBatchPr,
  isQueueLabeled,
} from './triage-rules';

const makePr = (overrides: Partial<PullRequestRecord> = {}): PullRequestRecord => ({
  number: 100,
  title: 'refactor: tidy helper',
  body: '',
  author: 'alice',
  url: 'https://github.com/leanprover-community/riemann-hypothesis/pull/100',
  createdAt: '2026-11-24T01:00:00Z',
  updatedAt: '2026-11-24T02:00:00Z',
  draft: false,
  labels: [],
  baseRef: 'main',
  baseSha: 'abc1234',
  headRef: 'feat/test',
  changedFilesCount: 1,
  additions: 10,
  deletions: 5,
  diffStatus: 'ok',
  files: [
    {
      filename: 'src/Lemmata/Test.lean',
      status: 'modified',
      additions: 10,
      deletions: 5,
      changes: 15,
    },
  ],
  ...overrides,
});

describe('triage-rules', () => {
  it('识别队列标签与 Batch PR', () => {
    expect(isQueueLabeled(['extra small', 'merge queue'])).toBe(true);
    expect(isQueueLabeled(['batch queue'])).toBe(true);
    expect(isQueueLabeled(['inbox'])).toBe(false);

    expect(isBatchPr(makePr({ labels: ['batch queue'] }))).toBe(true);
    expect(isBatchPr(makePr({ title: 'batch: combine cleanups' }))).toBe(true);
    expect(isBatchPr(makePr({ title: 'fix: typo' }))).toBe(false);
  });

  it('将 #324 类 diff 溢出及 changedFilesCount===0 的巨型重构标为 Mega-Refactor', () => {
    const overflowPr = makePr({
      number: 324,
      title: 'perf: delete thin wrappers and combine modules into import-graph clumps',
      labels: ['extra large'],
      changedFilesCount: 0,
      additions: 12000,
      deletions: 50000,
      diffStatus: 'ok',
      files: [],
    });
    expect(detectMegaRefactor(overflowPr)?.reason).toBe('diff-overflow');

    const truncatedPr = makePr({
      number: 500,
      changedFilesCount: 450,
      diffStatus: 'truncated',
      files: [],
    });
    expect(detectMegaRefactor(truncatedPr)?.reason).toBe('truncated-files');

    expect(detectMegaRefactor(makePr())).toBeNull();
  });

  it('按标题、标签与路径正确归类五大主题', () => {
    expect(classifyTopic(makePr({ labels: ['CI'], title: 'fix ci' }))).toBe('docs-infra');
    expect(classifyTopic(makePr({ title: 'chore: delete unused empty files' }))).toBe(
      'dead-code-dedup',
    );
    expect(classifyTopic(makePr({ title: 'perf: tighten imports and clump speed' }))).toBe(
      'performance-imports',
    );
    expect(classifyTopic(makePr({ title: 'replace slow nlinarith with lia' }))).toBe(
      'tactic-modernization',
    );
    expect(classifyTopic(makePr({ title: 'generalize KerCokerEq to Ring' }))).toBe('math-refactor');
  });

  it('规范化提取目录碰撞前缀并过滤过宽的 src 根路径', () => {
    expect(
      extractDirectoryPrefix('src/Formalism/SharpRestriction/GlobalSchurBounds/MainSup.lean'),
    ).toBe('src/Formalism/SharpRestriction/GlobalSchurBounds');
    expect(extractDirectoryPrefix('src/Main.lean')).toBeNull();
    expect(extractDirectoryPrefix('tools/ci_native/prepare.py')).toBe('tools/ci_native');
    expect(extractDirectoryPrefix('README.md')).toBeNull();
  });
});

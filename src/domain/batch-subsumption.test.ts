import { describe, expect, it } from 'vitest';
import { analyzeBatchSubsumptions } from './batch-subsumption';
import type { PullRequestRecord } from './types';

const makePr = (
  number: number,
  title: string,
  body: string,
  labels: string[] = [],
  extra: Partial<PullRequestRecord> = {},
): PullRequestRecord => ({
  number,
  title,
  body,
  author: 'dev',
  url: `https://github.com/leanprover-community/riemann-hypothesis/pull/${number}`,
  createdAt: '2026-11-24T01:00:00Z',
  updatedAt: '2026-11-24T02:00:00Z',
  draft: false,
  labels,
  baseRef: 'main',
  baseSha: 'abc',
  headRef: `pr-${number}`,
  changedFilesCount: 1,
  additions: 1,
  deletions: 1,
  diffStatus: 'ok',
  files: [],
  ...extra,
});

const file = (filename: string) => ({
  filename,
  status: 'modified',
  additions: 1,
  deletions: 1,
  changes: 2,
});

describe('batch-subsumption', () => {
  it('提取 Batch PR 标题与正文收编的 Open PR，同时过滤 depends on 等负向语境与已关闭编号', () => {
    const prs = [
      makePr(
        996,
        'batch: consolidate cleanups (#993, #992)',
        'Includes #993, #992, https://github.com/leanprover-community/riemann-hypothesis/pull/980 and #229.\nDepends on: #998\nFollow-up to #994',
        ['batch queue'],
      ),
      makePr(998, 'perf: mega clump', 'independent head', ['merge queue']),
      makePr(994, 'ci: fix script', 'normal PR'),
      makePr(993, 'cleanup A', ''),
      makePr(992, 'cleanup B', ''),
      makePr(980, 'cleanup C', ''),
    ];

    const result = analyzeBatchSubsumptions(prs);
    expect(result.subsumedBy[993]).toEqual([996]);
    expect(result.subsumedBy[992]).toEqual([996]);
    expect(result.subsumedBy[980]).toEqual([996]);
    expect(result.subsumedBy[998]).toBeUndefined();
    expect(result.subsumedBy[994]).toBeUndefined();
    // #229 是 Issue 不是 Open PR，不应该出现在收编列表里
    expect(result.subsumedBy[229]).toBeUndefined();
  });

  it('普通 PR 正文提到单条 #NNN（无收编语义）不误标为收编', () => {
    const prs = [
      makePr(901, 'fix: small lemma', 'See also #900 for context'),
      makePr(900, 'feat: base lemma', ''),
    ];
    const result = analyzeBatchSubsumptions(prs);
    expect(result.subsumptions).toEqual([]);
  });

  it('Mega-Refactor 完全隔离收编：#565 不吞 #97（59k 文件），#1064 不吞 #1021（12k 文件）', () => {
    const prs = [
      makePr(97, 'chore: auto-format the entire repository', 'Formats every Lean module.', [], {
        changedFilesCount: 59672,
        additions: 200000,
        deletions: 180000,
      }),
      makePr(565, 'ci: check for sorry and custom axioms', 'Includes #97\nSubsumes #97'),
      makePr(1021, 'refactor: move modules in bulk', 'Includes #1064', [], {
        changedFilesCount: 12354,
        additions: 90000,
        deletions: 80000,
        createdAt: '2026-11-24T00:30:00Z',
      }),
      makePr(1064, 'chore: remove 7 unused modules', 'Subsumes #1021', [], {
        createdAt: '2026-11-24T01:30:00Z',
      }),
    ];

    const result = analyzeBatchSubsumptions(prs);
    expect(result.subsumptions).toEqual([]);
    expect(result.subsumedBy[97]).toBeUndefined();
    expect(result.subsumedBy[1021]).toBeUndefined();
    expect(result.subsumedBy[1064]).toBeUndefined();
    expect(result.subsumedBy[565]).toBeUndefined();
  });

  it('非 Mega PR 严格文件集包含可隐式收编，部分文件重合仅视为碰撞（Overlaps）', () => {
    const prs = [
      makePr(700, 'refactor: consolidate three helpers', 'No explicit cue here.', [], {
        createdAt: '2026-11-24T00:00:00Z',
        changedFilesCount: 3,
        files: [file('src/A/X.lean'), file('src/A/Y.lean'), file('src/A/Z.lean')],
      }),
      makePr(701, 'refactor: tidy shared helpers', 'No explicit cue here.', [], {
        createdAt: '2026-11-24T01:00:00Z',
        changedFilesCount: 2,
        files: [file('src/A/X.lean'), file('src/A/Y.lean')],
      }),
      makePr(702, 'fix: partial overlap only', '', [], {
        createdAt: '2026-11-24T02:00:00Z',
        changedFilesCount: 2,
        files: [file('src/A/Y.lean'), file('src/B/W.lean')],
      }),
    ];

    const result = analyzeBatchSubsumptions(prs);
    expect(result.subsumedBy[701]).toEqual([700]);
    expect(result.subsumedBy[702]).toBeUndefined();
  });
});

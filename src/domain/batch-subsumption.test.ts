import { describe, expect, it } from 'vitest';
import { analyzeBatchSubsumptions } from './batch-subsumption';
import type { PullRequestRecord } from './types';

const makePr = (
  number: number,
  title: string,
  body: string,
  labels: string[] = [],
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
});

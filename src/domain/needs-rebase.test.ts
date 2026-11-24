import { describe, expect, it } from 'vitest';
import { analyzeNeedsRebase } from './needs-rebase';
import type { MainBranchInfo, MergeQueueEntry, PullRequestRecord } from './types';

const mainBranch: MainBranchInfo = {
  sha: 'latestsha1234',
  shortSha: 'latests',
  message: 'latest commit',
  committedAt: '2026-11-24T09:00:00Z',
  url: '',
};

const makePr = (number: number, baseSha: string, mergeableState?: string): PullRequestRecord => ({
  number,
  title: `PR #${number}`,
  body: '',
  author: 'dev',
  url: '',
  createdAt: '2026-11-24T01:00:00Z',
  updatedAt: '2026-11-24T02:00:00Z',
  draft: false,
  labels: [],
  baseRef: 'main',
  baseSha,
  headRef: `branch-${number}`,
  mergeableState,
  changedFilesCount: 1,
  additions: 5,
  deletions: 2,
  diffStatus: 'ok',
  files: [],
});

describe('needs-rebase', () => {
  it('区分活跃需 Rebase PR 与已被 Batch 收编的可跳过 PR', () => {
    const prs = [
      makePr(10, 'oldsha', 'dirty'),
      makePr(11, 'oldsha', 'behind'),
      makePr(12, mainBranch.sha, 'clean'),
    ];
    const queue: MergeQueueEntry[] = [
      {
        position: 1,
        pr: makePr(99, mainBranch.sha, 'clean'),
        isBatch: true,
        isMegaRefactor: false,
        subsumedPrNumbers: [11],
        recommendedBaseRef: 'main',
        recommendedBaseSha: 'latests',
        priorityTier: 'batch-head',
        topic: 'math-refactor',
      },
    ];

    const list = analyzeNeedsRebase(prs, mainBranch, { 11: [99] }, queue);
    expect(list.map((entry) => entry.pr.number)).toEqual([10, 11]);
    expect(list[0]?.skipRebaseReason).toBeNull();
    expect(list[0]?.recommendedBaseSha).toBe('PR#99');
    expect(list[1]?.skipRebaseReason).toBe('subsumed');
    expect(list[1]?.subsumedByPrNumbers).toEqual([99]);
  });
});

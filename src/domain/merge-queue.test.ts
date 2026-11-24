import { describe, expect, it } from 'vitest';
import { analyzeMergeQueue } from './merge-queue';
import type {
  MainBranchInfo,
  MegaRefactorAlert,
  PullRequestRecord,
  SubsumptionLink,
} from './types';

const mainBranch: MainBranchInfo = {
  sha: 'c9883164b0b3d762cee21f889d03d59a53b3ba3b',
  shortSha: 'c988316',
  message: 'chore: clean headers',
  committedAt: '2026-11-24T09:00:00Z',
  url: 'https://github.com/leanprover-community/riemann-hypothesis/commit/c988316',
};

const makePr = (number: number, labels: string[], draft = false): PullRequestRecord => ({
  number,
  title: `PR #${number}`,
  body: '',
  author: 'dev',
  url: `https://github.com/leanprover-community/riemann-hypothesis/pull/${number}`,
  createdAt: `2026-11-24T0${number % 9}:00:00Z`,
  updatedAt: '2026-11-24T09:00:00Z',
  draft,
  labels,
  baseRef: 'main',
  baseSha: mainBranch.sha,
  headRef: `branch-${number}`,
  changedFilesCount: 1,
  additions: 10,
  deletions: 2,
  diffStatus: 'ok',
  files: [],
});

describe('merge-queue', () => {
  it('按 merge-queue -> batch-head -> batch-queue -> priority 排序并标注建议 rebase 基准', () => {
    const prs = [
      makePr(990, ['priority']),
      makePr(992, ['batch queue']),
      makePr(996, ['batch queue']),
      makePr(998, ['merge queue', 'extra large']),
      makePr(999, ['merge queue'], true),
    ];
    const subsumptions: SubsumptionLink[] = [
      { fragmentPrNumber: 980, batchPrNumber: 996, batchPrTitle: 'batch', batchPrUrl: '' },
      { fragmentPrNumber: 981, batchPrNumber: 996, batchPrTitle: 'batch', batchPrUrl: '' },
    ];
    const megaRefactors: MegaRefactorAlert[] = [
      {
        prNumber: 998,
        title: 'PR #998',
        author: 'dev',
        url: '',
        diffStatus: 'overflow',
        changedFilesCount: 0,
        additions: 10000,
        deletions: 40000,
        reason: 'diff-overflow',
      },
    ];

    const queue = analyzeMergeQueue(prs, mainBranch, subsumptions, megaRefactors);
    expect(queue.map((item) => item.pr.number)).toEqual([998, 996, 992, 990]);
    expect(queue[0]?.recommendedBaseRef).toBe('main');
    expect(queue[0]?.recommendedBaseSha).toBe('c988316');
    expect(queue[1]?.recommendedBaseSha).toBe('PR#998');
    expect(queue[1]?.subsumedPrNumbers).toEqual([980, 981]);
  });

  it('building 标签占据队头，其次 inbox 与显式 batch，草稿 PR 不进入活跃队列', () => {
    const prs = [
      makePr(1001, ['inbox']),
      makePr(1002, ['batch queue']),
      makePr(1003, ['building']),
      makePr(1004, ['building'], true),
    ];

    const queue = analyzeMergeQueue(prs, mainBranch, [], []);
    expect(queue.map((item) => item.pr.number)).toEqual([1003, 1001, 1002]);
    expect(queue[0]?.priorityTier).toBe('building');
    expect(queue[1]?.priorityTier).toBe('inbox');
    expect(queue[2]?.priorityTier).toBe('batch-queue');
  });
});

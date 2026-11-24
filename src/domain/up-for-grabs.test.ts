import { describe, expect, it } from 'vitest';
import type { IssueRecord, MegaRefactorAlert } from './types';
import { analyzeUpForGrabs } from './up-for-grabs';

describe('up-for-grabs', () => {
  it('输出算力门槛分级并在存在 src 热区/Mega-Refactor 时标记避坑提示', () => {
    const issues: IssueRecord[] = [
      {
        number: 229,
        title: 'Identify and track technical debt',
        body: 'Clean up src/Lemmata and docs/',
        author: 'thorimur',
        url: 'https://github.com/leanprover-community/riemann-hypothesis/issues/229',
        createdAt: '2026-11-23T02:38:37Z',
        updatedAt: '2026-11-23T10:11:05Z',
        labels: [],
        comments: 2,
      },
      {
        number: 410,
        title: 'docs: add bibliographic references to README',
        body: 'Only touches docs/ and README.md',
        author: 'alice',
        url: 'https://github.com/leanprover-community/riemann-hypothesis/issues/410',
        createdAt: '2026-11-24T01:00:00Z',
        updatedAt: '2026-11-24T02:00:00Z',
        labels: ['good first issue', 'documentation'],
        comments: 0,
      },
    ];
    const megaRefactors: MegaRefactorAlert[] = [
      {
        prNumber: 998,
        title: 'mega clump',
        author: 'kim-em',
        url: '',
        diffStatus: 'overflow',
        changedFilesCount: 0,
        additions: 10000,
        deletions: 40000,
        reason: 'diff-overflow',
      },
    ];

    const tasks = analyzeUpForGrabs(issues, { 'src/Lemmata': [950] }, megaRefactors);
    const docIssue = tasks.find((task) => task.issueNumber === 410);
    const lemmataTrack = tasks.find((task) => task.id === 'track-lemmata-mathlib');
    const docsTrack = tasks.find((task) => task.id === 'track-docs-triage-board');

    expect(docIssue?.computeTier).toBe('no-compile');
    expect(docIssue?.avoidsRefactorHotspots).toBe(true);
    expect(docsTrack?.hotspotStatus).toBe('safe');

    expect(lemmataTrack?.computeTier).toBe('laptop-16gb');
    expect(lemmataTrack?.hotspotStatus).toBe('caution');
    expect(lemmataTrack?.overlappingPrNumbers).toEqual([950, 998]);
  });
});

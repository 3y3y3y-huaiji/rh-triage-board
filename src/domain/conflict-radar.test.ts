import { describe, expect, it } from 'vitest';
import { analyzeConflicts } from './conflict-radar';
import type { PullRequestRecord } from './types';

const makePr = (
  number: number,
  title: string,
  filenames: string[],
  extra: Partial<PullRequestRecord> = {},
): PullRequestRecord => ({
  number,
  title,
  body: '',
  author: 'dev',
  url: `https://github.com/leanprover-community/riemann-hypothesis/pull/${number}`,
  createdAt: '2026-11-24T01:00:00Z',
  updatedAt: '2026-11-24T02:00:00Z',
  draft: false,
  labels: [],
  baseRef: 'main',
  baseSha: 'abc',
  headRef: `pr-${number}`,
  changedFilesCount: filenames.length,
  additions: 10,
  deletions: 5,
  diffStatus: 'ok',
  files: filenames.map((filename) => ({
    filename,
    status: 'modified',
    additions: 10,
    deletions: 5,
    changes: 15,
  })),
  ...extra,
});

describe('conflict-radar', () => {
  it('识别精确文件碰撞、目录前缀碰撞、全局 Mega-Refactor 预警及主题分布', () => {
    const prs = [
      makePr(324, 'perf: file-clumping mega refactor', [], {
        labels: ['extra large'],
        changedFilesCount: 0,
        additions: 15000,
        deletions: 45000,
        diffStatus: 'overflow',
      }),
      makePr(995, 'perf: replace nlinarith in MainSup', [
        'src/Formalism/SharpRestriction/GlobalSchurBounds/MainSup.lean',
      ]),
      makePr(983, 'Simplify odd-series in MainSup', [
        'src/Formalism/SharpRestriction/GlobalSchurBounds/MainSup.lean',
      ]),
      makePr(984, 'chore: delete unused file in GlobalSchurBounds', [
        'src/Formalism/SharpRestriction/GlobalSchurBounds/TopDensity.lean',
      ]),
      makePr(970, 'ci: tidy workflow', ['.github/workflows/ci.yml']),
    ];

    const result = analyzeConflicts(prs, { 983: [998] });
    expect(result.hasGlobalConflictRisk).toBe(true);
    expect(result.megaRefactors.map((m) => m.prNumber)).toEqual([324]);

    expect(result.conflictGroups).toHaveLength(1);
    expect(result.conflictGroups[0]).toMatchObject({
      severity: 'high',
      prNumbers: [983, 984, 995],
      sharedFiles: ['src/Formalism/SharpRestriction/GlobalSchurBounds/MainSup.lean'],
      sharedPrefixes: ['src/Formalism/SharpRestriction/GlobalSchurBounds'],
    });
    expect(result.hotspotPrefixes['src/Formalism/SharpRestriction/GlobalSchurBounds']).toEqual([
      983, 984, 995,
    ]);
    expect(
      result.topicGroups.find((g) => g.topic === 'docs-infra')?.activePrs.map((p) => p.number),
    ).toEqual([970]);
    expect(
      result.topicGroups.find((g) => g.topic === 'math-refactor')?.subsumedPrs.map((p) => p.number),
    ).toEqual([983]);
  });

  it('将 Mega-Refactor 隔离出路径碰撞聚类，避免 59k 文件全仓 PR 串成 90+ PR 巨型簇', () => {
    const sharedFiles = Array.from(
      { length: 90 },
      (_, index) => `src/Module${index}/Part${index}.lean`,
    );
    const mega = makePr(97, 'chore: auto-format the entire repository', sharedFiles, {
      changedFilesCount: 59672,
      additions: 200000,
      deletions: 180000,
    });
    const fragments = sharedFiles.map((filename, index) =>
      makePr(1000 + index, `refactor: tidy module ${index}`, [filename]),
    );

    const result = analyzeConflicts([mega, ...fragments], {});
    expect(result.megaRefactors.map((alert) => alert.prNumber)).toEqual([97]);
    expect(result.conflictGroups).toEqual([]);
    expect(result.hotspotPrefixes).toEqual({});
    expect(result.topicGroups.flatMap((group) => group.activePrs)).toHaveLength(90);
  });

  it('12k 文件 Mega #1021 不串并常规 PR，仅保留真实小范围碰撞', () => {
    const mega = makePr(1021, 'refactor: move modules in bulk', ['src/A/X.lean', 'src/A/Y.lean'], {
      changedFilesCount: 12354,
      additions: 90000,
      deletions: 80000,
    });
    const smallA = makePr(1064, 'chore: remove unused modules', ['src/A/X.lean', 'src/A/Y.lean']);
    const smallB = makePr(1066, 'fix: adjust shared module', ['src/A/X.lean']);

    const result = analyzeConflicts([mega, smallA, smallB], {});
    expect(result.megaRefactors.map((alert) => alert.prNumber)).toEqual([1021]);
    expect(result.conflictGroups).toHaveLength(1);
    expect(result.conflictGroups[0]?.prNumbers).toEqual([1064, 1066]);
    expect(result.conflictGroups[0]?.prNumbers).not.toContain(1021);
  });
});

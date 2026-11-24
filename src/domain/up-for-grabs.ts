import type {
  ComputeTier,
  HotspotStatus,
  IssueRecord,
  MegaRefactorAlert,
  UpForGrabsTask,
} from './types';

const QUALIFYING_ISSUE_LABELS = [
  'good first issue',
  'help wanted',
  'batch',
  'cleanup',
  'documentation',
  'triage',
  'roadmap',
];

const CURATED_STARTER_TRACKS: Array<{
  id: string;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  url: string;
  labels: string[];
  computeTier: ComputeTier;
  targetPaths: string[];
}> = [
  {
    id: 'track-non-ascii-filenames',
    titleZh: '非 ASCII 文件名与 Unicode 模块名审计清理',
    titleEn: 'Non-ASCII Filename & Unicode Module Audit',
    summaryZh:
      '排查仓库中的非 ASCII 路径或命名残留，按规范批量重命名并同步 import，避开证明主体热区。',
    summaryEn:
      'Audit non-ASCII filenames or path remnants, rename cleanly, and update imports without touching core proof bodies.',
    url: 'https://github.com/leanprover-community/riemann-hypothesis/issues/229',
    labels: ['cleanup', 'good first issue'],
    computeTier: 'laptop-16gb',
    targetPaths: ['scripts/', 'docs/'],
  },
  {
    id: 'track-empty-decls',
    titleZh: '空声明文件与孤立冗余包装清理',
    titleEn: 'Empty Declaration Files & Orphan Wrapper Cleanup',
    summaryZh: '定位只含注释或无引用声明的空模块，单模块 lake env lean 快速校验后删减冗余文件。',
    summaryEn:
      'Identify empty Lean files or unreferenced wrappers, verify direct importers locally, and remove dead boilerplate.',
    url: 'https://github.com/leanprover-community/riemann-hypothesis/issues/229',
    labels: ['dead-code', 'cleanup'],
    computeTier: 'laptop-16gb',
    targetPaths: ['src/Lemmata'],
  },
  {
    id: 'track-lemmata-mathlib',
    titleZh: 'src/Lemmata 独立引理替换为 Mathlib 原生定理',
    titleEn: 'Replace Standalone src/Lemmata Helpers with Mathlib Lemmas',
    summaryZh:
      '在底层 Lemmata 目录检索可被 Mathlib4 既有引理替代的自造声明，单文件编译可在 16GB 笔记本完成。',
    summaryEn:
      'Substitute custom helpers in src/Lemmata with upstream Mathlib4 lemmas; single-module builds fit on a 16GB laptop.',
    url: 'https://github.com/leanprover-community/riemann-hypothesis/issues/229',
    labels: ['good first issue', 'mathlib-reuse'],
    computeTier: 'laptop-16gb',
    targetPaths: ['src/Lemmata'],
  },
  {
    id: 'track-docs-triage-board',
    titleZh: '文档注释去 AI 水词与协作看板维护',
    titleEn: 'Slop-Free Documentation & Triage Board Maintenance',
    summaryZh: '补齐文献引用注释、清理无意义注释模板或改进纯静态看板脚本，完全无需编译 Lean 工程。',
    summaryEn:
      'Add bibliographic citations, strip AI comment slop, or improve static triage tooling with zero Lean compilation.',
    url: 'https://github.com/leanprover-community/riemann-hypothesis/issues/229',
    labels: ['documentation', 'triage'],
    computeTier: 'no-compile',
    targetPaths: ['docs/bibliography', 'rh-triage-board'],
  },
];

const inferComputeTier = (issue: IssueRecord): ComputeTier => {
  const text = `${issue.title}\n${issue.body}\n${issue.labels.join(' ')}`.toLowerCase();
  if (
    issue.labels.some((label) => ['documentation', 'ci', 'triage'].includes(label.toLowerCase())) ||
    /\b(?:docs?|readme|agents\.md|triage|dashboard|non-ascii|comment)\b/.test(text)
  ) {
    return 'no-compile';
  }
  if (/\b(?:full build|comparator|clump|all modules|whole repo|100,000)\b/.test(text)) {
    return 'large-runner';
  }
  return 'laptop-16gb';
};

const inferTargetPaths = (issue: IssueRecord): string[] => {
  const text = `${issue.title}\n${issue.body}`;
  const matches =
    text.match(
      /(?:src|docs|scripts|tools|verification)\/[A-Za-z0-9_./-]*|README\.md|AGENTS\.md/g,
    ) ?? [];
  if (matches.length > 0) {
    return [...new Set(matches)].slice(0, 4);
  }
  return issue.number === 229 ? ['src/Lemmata', 'docs/'] : ['src/'];
};

const evaluateHotspotAvoidance = (
  targetPaths: string[],
  computeTier: ComputeTier,
  hotspotPrefixes: Record<string, number[]>,
  megaRefactors: MegaRefactorAlert[],
): {
  hotspotStatus: HotspotStatus;
  avoidsRefactorHotspots: boolean;
  overlappingPrNumbers: number[];
} => {
  const overlapping = new Set<number>();
  const touchesLeanSrc = targetPaths.some((path) => path.startsWith('src/'));

  for (const path of targetPaths) {
    for (const [prefix, prNumbers] of Object.entries(hotspotPrefixes)) {
      if (path.startsWith(prefix) || prefix.startsWith(path.replace(/\/$/, ''))) {
        for (const num of prNumbers) overlapping.add(num);
      }
    }
  }

  // 非免编译且触及 src/ 的任务会受到活跃 Mega-Refactor（如 #324）全局重构风险影响。
  if (computeTier !== 'no-compile' && touchesLeanSrc) {
    for (const mega of megaRefactors) {
      overlapping.add(mega.prNumber);
    }
  }

  const overlappingPrNumbers = [...overlapping].sort((a, b) => a - b);
  const avoidsRefactorHotspots = overlappingPrNumbers.length === 0;
  return {
    hotspotStatus: avoidsRefactorHotspots ? 'safe' : 'caution',
    avoidsRefactorHotspots,
    overlappingPrNumbers,
  };
};

const isRoadmapIssue = (issue: IssueRecord): boolean =>
  issue.labels.some((label) => label.toLowerCase() === 'roadmap');

const isQualifyingIssue = (issue: IssueRecord): boolean => {
  if (issue.number === 229) return true;
  const lowerLabels = issue.labels.map((label) => label.toLowerCase());
  if (lowerLabels.some((label) => QUALIFYING_ISSUE_LABELS.some((q) => label.includes(q)))) {
    return true;
  }
  const text = `${issue.title} ${issue.body}`.toLowerCase();
  return /\b(?:good first|batch|tech debt|technical debt|cleanup|non-ascii|lemmata|roadmap)\b/.test(
    text,
  );
};

/**
 * 构建低门槛任务池：整合上游跟踪 Issue 与常规可认领赛道，并标注算力门槛与热区避坑提示。
 */
export const analyzeUpForGrabs = (
  issues: IssueRecord[],
  hotspotPrefixes: Record<string, number[]>,
  megaRefactors: MegaRefactorAlert[],
): UpForGrabsTask[] => {
  const issueTasks: UpForGrabsTask[] = issues
    .filter(isQualifyingIssue)
    .sort((a, b) => Number(isRoadmapIssue(b)) - Number(isRoadmapIssue(a)) || a.number - b.number)
    .map((issue) => {
      const computeTier = inferComputeTier(issue);
      const targetPaths = inferTargetPaths(issue);
      const hotspot = evaluateHotspotAvoidance(
        targetPaths,
        computeTier,
        hotspotPrefixes,
        megaRefactors,
      );

      return {
        id: `issue-${issue.number}`,
        kind: 'issue',
        issueNumber: issue.number,
        titleZh: `#${issue.number} ${issue.title}`,
        titleEn: `#${issue.number} ${issue.title}`,
        summaryZh:
          issue.number === 229
            ? '上游技术债总追踪 Issue，适合认领去重、注释清理与独立小模块重构。'
            : issue.body.slice(0, 140) ||
              '上游开放认领 Issue，欢迎结合 AGENTS.md 规范拆分为小 PR。',
        summaryEn:
          issue.number === 229
            ? 'Upstream technical-debt tracker for modular cleanup, deduplication, and concise isolated PRs.'
            : issue.body.slice(0, 140) ||
              'Upstream open issue suitable for a focused, single-purpose PR.',
        url: issue.url,
        labels: issue.labels,
        computeTier,
        ...hotspot,
        targetPaths,
      };
    });

  const curatedTasks: UpForGrabsTask[] = CURATED_STARTER_TRACKS.map((track) => {
    const hotspot = evaluateHotspotAvoidance(
      track.targetPaths,
      track.computeTier,
      hotspotPrefixes,
      megaRefactors,
    );
    return {
      ...track,
      kind: 'curated-track',
      ...hotspot,
    };
  });

  return [...issueTasks, ...curatedTasks];
};

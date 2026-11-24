import type { MegaRefactorAlert, PullRequestRecord, TopicClusterId } from './types';

const QUEUE_LABEL_PATTERNS = [
  'merge queue',
  'batch queue',
  'ready to merge',
  'priority',
  'high priority',
  'awaiting-merge',
];

const BATCH_LABEL_PATTERNS = ['batch queue', 'batch'];
const BATCH_TEXT_PATTERN = /\b(?:batch|rollup|roll-up|combined|subsumes|combines)\b/i;

const MEGA_REFACTOR_KEYWORDS =
  /\b(?:clump|clumping|thin wrapper|file-clumping|monolith|import-graph)\b/i;

const MEGA_CHANGED_FILES_THRESHOLD = 250;
const MEGA_LINES_THRESHOLD = 5000;

/** 判断标签列表中是否包含指定名称（忽略大小写）。 */
export const hasLabel = (pr: Pick<PullRequestRecord, 'labels'>, target: string): boolean => {
  const needle = target.toLowerCase();
  return pr.labels.some((label) => label.toLowerCase() === needle);
};

/** 判断 PR 是否处于队列或高优先级调度中。 */
export const isQueueLabeled = (labels: string[]): boolean =>
  labels.some((label) => {
    const normalized = label.toLowerCase();
    return QUEUE_LABEL_PATTERNS.some((pattern) => normalized.includes(pattern));
  });

/** 判断 PR 是否属于 Batch 打包合流类型。 */
export const isBatchPr = (pr: Pick<PullRequestRecord, 'labels' | 'title' | 'body'>): boolean => {
  if (
    pr.labels.some((label) => {
      const normalized = label.toLowerCase();
      return BATCH_LABEL_PATTERNS.some((pattern) => normalized.includes(pattern));
    })
  ) {
    return true;
  }
  return BATCH_TEXT_PATTERN.test(`${pr.title}\n${pr.body}`);
};

/**
 * 识别巨型重构 / Diff 溢出 PR（例如 #324 全仓 clump 类 PR）。
 * 当 API 因 diff 过大返回 changed_files === 0 或 422 / 截断时，绝不能误判为零冲突。
 */
export const detectMegaRefactor = (pr: PullRequestRecord): MegaRefactorAlert | null => {
  const totalLines = pr.additions + pr.deletions;
  const text = `${pr.title}\n${pr.body}`;
  const isOverflow = pr.diffStatus === 'overflow';
  const isTruncated = pr.diffStatus === 'truncated';
  const zeroFilesWithMassiveHint =
    pr.changedFilesCount === 0 &&
    (totalLines >= MEGA_LINES_THRESHOLD ||
      hasLabel(pr, 'extra large') ||
      MEGA_REFACTOR_KEYWORDS.test(text));
  const hugeFileCount =
    pr.changedFilesCount >= MEGA_CHANGED_FILES_THRESHOLD ||
    pr.files.length >= MEGA_CHANGED_FILES_THRESHOLD;

  if (!isOverflow && !isTruncated && !zeroFilesWithMassiveHint && !hugeFileCount) {
    return null;
  }

  let reason: MegaRefactorAlert['reason'] = 'massive-clump';
  if (isOverflow || zeroFilesWithMassiveHint) {
    reason = 'diff-overflow';
  } else if (isTruncated) {
    reason = 'truncated-files';
  }

  return {
    prNumber: pr.number,
    title: pr.title,
    author: pr.author,
    url: pr.url,
    diffStatus: pr.diffStatus,
    changedFilesCount: pr.changedFilesCount,
    additions: pr.additions,
    deletions: pr.deletions,
    reason,
  };
};

/** 按标题、标签和改动路径自动聚类到五大维护主题之一。 */
export const classifyTopic = (pr: PullRequestRecord): TopicClusterId => {
  const titleLower = pr.title.toLowerCase();
  const labelsLower = pr.labels.map((label) => label.toLowerCase());
  const filePaths = pr.files.map((file) => file.filename.toLowerCase());

  if (
    labelsLower.includes('ci') ||
    /^(?:ci|doc|docs|infra)\b/i.test(pr.title) ||
    titleLower.includes('agents.md') ||
    titleLower.includes('workflow') ||
    (filePaths.length > 0 &&
      filePaths.every(
        (path) =>
          path.startsWith('.github/') ||
          path.startsWith('scripts/') ||
          path.startsWith('tools/') ||
          path.startsWith('docs/') ||
          path.endsWith('.md'),
      ))
  ) {
    return 'docs-infra';
  }

  if (
    titleLower.includes('dead code') ||
    titleLower.includes('unused') ||
    titleLower.includes('dedup') ||
    titleLower.includes('duplicate') ||
    titleLower.includes('thin wrapper') ||
    titleLower.includes('empty') ||
    titleLower.includes('drop the') ||
    titleLower.includes('delete ') ||
    titleLower.includes('non-ascii')
  ) {
    return 'dead-code-dedup';
  }

  if (
    /^perf\b/i.test(pr.title) ||
    titleLower.includes('import') ||
    titleLower.includes('clump') ||
    titleLower.includes('cpu') ||
    titleLower.includes('speed up') ||
    titleLower.includes('faster') ||
    titleLower.includes('skip unused')
  ) {
    return 'performance-imports';
  }

  if (
    titleLower.includes('tactic') ||
    /\b(?:nlinarith|linarith|grind|lia|omega|simp|golf)\b/.test(titleLower)
  ) {
    return 'tactic-modernization';
  }

  return 'math-refactor';
};

/**
 * 提取目录碰撞前缀。
 * `src/Formalism/SharpRestriction/GlobalSchurBounds/MainSup.lean` -> `src/Formalism/SharpRestriction/GlobalSchurBounds`
 * 忽略过宽的根目录（如单独的 `src`）。
 */
export const extractDirectoryPrefix = (filePath: string): string | null => {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 1) return null;

  const dirParts = parts.slice(0, -1);
  if (dirParts[0] === 'src') {
    if (dirParts.length === 1) return null;
    return dirParts.slice(0, Math.min(4, dirParts.length)).join('/');
  }

  return dirParts.slice(0, Math.min(2, dirParts.length)).join('/');
};

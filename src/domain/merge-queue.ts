import { classifyTopic, hasLabel, isBatchPr, isQueueLabeled } from './triage-rules';
import type {
  MainBranchInfo,
  MegaRefactorAlert,
  MergeQueueEntry,
  PullRequestRecord,
  SubsumptionLink,
} from './types';

const TIER_RANK: Record<MergeQueueEntry['priorityTier'], number> = {
  'merge-queue': 0,
  'batch-head': 1,
  'batch-queue': 2,
  priority: 3,
};

const resolvePriorityTier = (
  pr: PullRequestRecord,
  subsumedCount: number,
  isMega: boolean,
): MergeQueueEntry['priorityTier'] => {
  if (
    hasLabel(pr, 'merge queue') ||
    hasLabel(pr, 'ready to merge') ||
    hasLabel(pr, 'awaiting-merge')
  ) {
    return 'merge-queue';
  }
  if (subsumedCount >= 2 || (isBatchPr(pr) && isMega)) {
    return 'batch-head';
  }
  if (hasLabel(pr, 'batch queue') || isBatchPr(pr)) {
    return 'batch-queue';
  }
  return 'priority';
};

/**
 * 构建线性合并队列并推算每个 PR 的推荐 Rebase 基准分支/Commit。
 */
export const analyzeMergeQueue = (
  prs: PullRequestRecord[],
  mainBranch: MainBranchInfo,
  subsumptions: SubsumptionLink[],
  megaRefactors: MegaRefactorAlert[],
): MergeQueueEntry[] => {
  const megaSet = new Set(megaRefactors.map((alert) => alert.prNumber));
  const subsumedByBatch = new Map<number, number[]>();
  for (const link of subsumptions) {
    const list = subsumedByBatch.get(link.batchPrNumber) ?? [];
    list.push(link.fragmentPrNumber);
    subsumedByBatch.set(link.batchPrNumber, list);
  }

  const candidates = prs
    .filter((pr) => {
      if (pr.draft) return false;
      const subsumedCount = subsumedByBatch.get(pr.number)?.length ?? 0;
      return isQueueLabeled(pr.labels) || subsumedCount >= 2 || megaSet.has(pr.number);
    })
    .map((pr) => {
      const subsumedPrNumbers = [...new Set(subsumedByBatch.get(pr.number) ?? [])].sort(
        (a, b) => a - b,
      );
      const isMegaRefactor = megaSet.has(pr.number);
      const isBatch = isBatchPr(pr) || subsumedPrNumbers.length > 0;
      const priorityTier = resolvePriorityTier(pr, subsumedPrNumbers.length, isMegaRefactor);
      return {
        pr,
        isBatch,
        isMegaRefactor,
        subsumedPrNumbers,
        priorityTier,
        topic: classifyTopic(pr),
      };
    });

  candidates.sort((a, b) => {
    const tierDiff = TIER_RANK[a.priorityTier] - TIER_RANK[b.priorityTier];
    if (tierDiff !== 0) return tierDiff;
    if (a.isMegaRefactor !== b.isMegaRefactor) return a.isMegaRefactor ? -1 : 1;
    return a.pr.createdAt.localeCompare(b.pr.createdAt) || a.pr.number - b.pr.number;
  });

  const head = candidates[0];
  return candidates.map((item, index) => {
    const shouldStackOnHead = index > 0 && head && (head.isMegaRefactor || head.isBatch);
    return {
      position: index + 1,
      ...item,
      recommendedBaseRef: shouldStackOnHead ? `PR #${head.pr.number} (${head.pr.headRef})` : 'main',
      recommendedBaseSha: shouldStackOnHead ? `PR#${head.pr.number}` : mainBranch.shortSha,
    };
  });
};

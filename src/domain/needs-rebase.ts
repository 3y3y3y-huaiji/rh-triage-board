import type { MainBranchInfo, MergeQueueEntry, NeedsRebaseEntry, PullRequestRecord } from './types';

/**
 * 识别需要 Rebase 或存在合并冲突的 PR，并标注已被 Batch PR 收编、可跳过无效 Rebase 的条目。
 */
export const analyzeNeedsRebase = (
  prs: PullRequestRecord[],
  mainBranch: MainBranchInfo,
  subsumedBy: Record<number, number[]>,
  mergeQueue: MergeQueueEntry[],
): NeedsRebaseEntry[] => {
  const queueHead = mergeQueue[0];
  const entries: NeedsRebaseEntry[] = [];

  for (const pr of prs) {
    const isDirty = pr.mergeableState === 'dirty';
    const isBehind =
      pr.mergeableState === 'behind' ||
      (Boolean(pr.baseSha) && Boolean(mainBranch.sha) && pr.baseSha !== mainBranch.sha);

    if (!isDirty && !isBehind) continue;

    const subsumedByPrNumbers = subsumedBy[pr.number] ?? [];
    const skipRebaseReason = subsumedByPrNumbers.length > 0 ? 'subsumed' : null;
    const useQueueHead = Boolean(
      queueHead &&
      queueHead.pr.number !== pr.number &&
      (queueHead.isBatch || queueHead.isMegaRefactor),
    );

    entries.push({
      pr,
      reason: isDirty ? 'merge-conflict' : 'stale-base',
      recommendedBaseRef: useQueueHead
        ? `PR #${queueHead!.pr.number} (${queueHead!.pr.headRef})`
        : 'main',
      recommendedBaseSha: useQueueHead ? `PR#${queueHead!.pr.number}` : mainBranch.shortSha,
      subsumedByPrNumbers,
      skipRebaseReason,
    });
  }

  entries.sort((a, b) => {
    // 活跃需 Rebase 的 PR 排在已被收编 PR 之前。
    if ((a.skipRebaseReason === null) !== (b.skipRebaseReason === null)) {
      return a.skipRebaseReason === null ? -1 : 1;
    }
    if (a.reason !== b.reason) return a.reason === 'merge-conflict' ? -1 : 1;
    return b.pr.number - a.pr.number;
  });

  return entries;
};

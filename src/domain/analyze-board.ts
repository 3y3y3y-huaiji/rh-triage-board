import { analyzeBatchSubsumptions } from './batch-subsumption';
import { analyzeConflicts } from './conflict-radar';
import { analyzeMergeQueue } from './merge-queue';
import { analyzeNeedsRebase } from './needs-rebase';
import type { AnalyzedBoard, BoardSnapshot } from './types';
import { analyzeUpForGrabs } from './up-for-grabs';

/**
 * 看板核心纯函数分析入口：输入标准快照，输出队列、碰撞雷达、Mega-Refactor 预警、Batch 收编与任务池。
 */
export const analyzeBoard = (snapshot: BoardSnapshot): AnalyzedBoard => {
  const { subsumptions, subsumedBy } = analyzeBatchSubsumptions(snapshot.pullRequests);
  const { megaRefactors, hasGlobalConflictRisk, conflictGroups, topicGroups, hotspotPrefixes } =
    analyzeConflicts(snapshot.pullRequests, subsumedBy);
  const mergeQueue = analyzeMergeQueue(
    snapshot.pullRequests,
    snapshot.mainBranch,
    subsumptions,
    megaRefactors,
  );
  const upForGrabs = analyzeUpForGrabs(snapshot.issues, hotspotPrefixes, megaRefactors);
  const needsRebase = analyzeNeedsRebase(
    snapshot.pullRequests,
    snapshot.mainBranch,
    subsumedBy,
    mergeQueue,
  );

  return {
    snapshot,
    summary: {
      totalOpenPrs: snapshot.pullRequests.length,
      queuedCount: mergeQueue.length,
      megaRefactorCount: megaRefactors.length,
      subsumedCount: Object.keys(subsumedBy).length,
      collisionGroupCount: conflictGroups.length,
      needsRebaseCount: needsRebase.filter((item) => item.skipRebaseReason === null).length,
      safeStarterCount: upForGrabs.filter((task) => task.avoidsRefactorHotspots).length,
    },
    megaRefactors,
    hasGlobalConflictRisk,
    subsumptions,
    subsumedBy,
    mergeQueue,
    conflictGroups,
    topicGroups,
    hotspotPrefixes,
    upForGrabs,
    needsRebase,
  };
};

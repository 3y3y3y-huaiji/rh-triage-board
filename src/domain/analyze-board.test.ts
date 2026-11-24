import { describe, expect, it } from 'vitest';
import { MOCK_BOARD_SNAPSHOT } from '../data/mock-board';
import { analyzeBoard } from './analyze-board';

describe('analyzeBoard', () => {
  it('端到端分析 Mock 快照并生成一致的汇总指标', () => {
    const analyzed = analyzeBoard(MOCK_BOARD_SNAPSHOT);

    expect(analyzed.summary.totalOpenPrs).toBe(MOCK_BOARD_SNAPSHOT.pullRequests.length);
    expect(analyzed.hasGlobalConflictRisk).toBe(true);
    expect(analyzed.megaRefactors.map((m) => m.prNumber)).toEqual([998]);
    expect(analyzed.subsumedBy[995]).toBeUndefined();
    expect(analyzed.subsumedBy[993]).toEqual([996]);
    expect(analyzed.mergeQueue[0]?.pr.number).toBe(998);
    expect(analyzed.conflictGroups.length).toBeGreaterThanOrEqual(2);
    expect(analyzed.upForGrabs.length).toBeGreaterThanOrEqual(5);
    expect(analyzed.needsRebase.some((entry) => entry.skipRebaseReason === 'subsumed')).toBe(true);
  });
});

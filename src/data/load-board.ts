import type { BoardSnapshot } from '../domain/types';
import { MOCK_BOARD_SNAPSHOT } from './mock-board';

export type BoardFallbackReason = 'http-error' | 'network-error' | 'invalid-schema' | null;

export interface LoadedBoardResult {
  snapshot: BoardSnapshot;
  fallbackReason: BoardFallbackReason;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** 校验同源 `/data/board.json` 是否符合预期契约结构。 */
export const isValidBoardSnapshot = (value: unknown): value is BoardSnapshot => {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1) return false;
  if (typeof value.repo !== 'string' || typeof value.generatedAt !== 'string') return false;
  if (!isRecord(value.mainBranch)) return false;
  if (
    typeof value.mainBranch.sha !== 'string' ||
    typeof value.mainBranch.shortSha !== 'string' ||
    typeof value.mainBranch.message !== 'string'
  ) {
    return false;
  }
  if (!Array.isArray(value.pullRequests) || !Array.isArray(value.issues)) return false;
  return true;
};

/**
 * 纯静态数据加载器：仅请求同源 `/data/board.json`，异常或缺失时无缝回退内置 Mock 快照。
 */
export const loadBoardSnapshot = async (
  fetchImpl: typeof fetch = fetch,
): Promise<LoadedBoardResult> => {
  try {
    const response = await fetchImpl('/data/board.json', {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { snapshot: MOCK_BOARD_SNAPSHOT, fallbackReason: 'http-error' };
    }
    const payload: unknown = await response.json();
    if (!isValidBoardSnapshot(payload)) {
      return { snapshot: MOCK_BOARD_SNAPSHOT, fallbackReason: 'invalid-schema' };
    }
    return { snapshot: payload, fallbackReason: null };
  } catch {
    return { snapshot: MOCK_BOARD_SNAPSHOT, fallbackReason: 'network-error' };
  }
};

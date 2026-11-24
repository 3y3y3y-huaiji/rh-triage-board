import { describe, expect, it, vi } from 'vitest';
import { isValidBoardSnapshot, loadBoardSnapshot } from './load-board';
import { MOCK_BOARD_SNAPSHOT } from './mock-board';

describe('load-board', () => {
  it('成功加载合法的同源 /data/board.json', async () => {
    const livePayload = {
      ...MOCK_BOARD_SNAPSHOT,
      source: 'github' as const,
      generatedAt: '2026-11-24T10:00:00Z',
    };
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/data/board.json');
      return new Response(JSON.stringify(livePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await loadBoardSnapshot(mockFetch as unknown as typeof fetch);
    expect(result.fallbackReason).toBeNull();
    expect(result.snapshot.source).toBe('github');
    expect(result.snapshot.generatedAt).toBe('2026-11-24T10:00:00Z');
  });

  it('HTTP 404 时优雅回退内置 Mock 快照', async () => {
    const mockFetch = vi.fn(async () => new Response('Not Found', { status: 404 }));
    const result = await loadBoardSnapshot(mockFetch as unknown as typeof fetch);
    expect(result.fallbackReason).toBe('http-error');
    expect(result.snapshot).toEqual(MOCK_BOARD_SNAPSHOT);
  });

  it('网络异常或 JSON 结构非法时回退内置 Mock 快照', async () => {
    const networkFetch = vi.fn(async () => {
      throw new Error('offline');
    });
    expect((await loadBoardSnapshot(networkFetch as unknown as typeof fetch)).fallbackReason).toBe(
      'network-error',
    );

    const invalidFetch = vi.fn(
      async () => new Response(JSON.stringify({ schemaVersion: 99 }), { status: 200 }),
    );
    expect((await loadBoardSnapshot(invalidFetch as unknown as typeof fetch)).fallbackReason).toBe(
      'invalid-schema',
    );
    expect(isValidBoardSnapshot(null)).toBe(false);
    expect(isValidBoardSnapshot(MOCK_BOARD_SNAPSHOT)).toBe(true);
  });
});

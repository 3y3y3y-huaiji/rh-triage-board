import { describe, expect, it } from 'vitest';
import { MOCK_BOARD_SNAPSHOT } from '../data/mock-board';
import { analyzeBoard } from '../domain/analyze-board';
import { getMessages } from '../i18n';
import { renderBoardShell, type BoardUiState } from './board-shell';
import { escapeHtml, safeHref } from './html';

const baseState = (overrides: Partial<BoardUiState> = {}): BoardUiState => ({
  locale: 'zh',
  theme: 'light',
  activeTab: 'all',
  search: '',
  topic: 'all',
  computeTier: 'all',
  hideSubsumed: false,
  promptCopied: false,
  ...overrides,
});

describe('views structural & security contracts', () => {
  it('转义恶意 HTML 标题并拦截非 http(s)/同源 URL', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(safeHref('javascript:alert(1)')).toBe('#');
    expect(safeHref('https://rh-shrink.github.io/')).toBe('https://rh-shrink.github.io/');
    expect(safeHref('/data/board.json')).toBe('/data/board.json');
  });

  it('渲染全景四栏、Mega-Refactor 预警、Batch 收编徽章、Agent 入口与生态链接', () => {
    const board = analyzeBoard(MOCK_BOARD_SNAPSHOT);
    const html = renderBoardShell(board, 'http-error', baseState(), getMessages('zh'));

    expect(html).toContain('data-testid="data-source-badge"');
    expect(html).toContain('data-testid="mega-refactor-banner"');
    expect(html).toContain('Mega-Refactor / Global Conflict Risk');
    expect(html).toContain('data-testid="subsumed-badge"');
    expect(html).toContain('data-testid="agent-endpoints"');
    expect(html).toContain('/data/board.json');
    expect(html).toContain('/llms.txt');
    expect(html).toContain('rh-shrink.github.io');
    expect(html).toContain('rh-kernel-backbone');
    expect(html).toContain('riemann.verifytask.cn');
    expect(html).toContain('leanprover.zulipchat.com');
    expect(html).toContain('data-testid="agent-guardrails"');
  });

  it('支持 hideSubsumed 降噪切换、多语种切换与单栏视图切换', () => {
    const board = analyzeBoard(MOCK_BOARD_SNAPSHOT);
    const hiddenHtml = renderBoardShell(
      board,
      null,
      baseState({ locale: 'ja', activeTab: 'conflict-radar', hideSubsumed: true }),
      getMessages('ja'),
    );
    expect(hiddenHtml).not.toContain('data-testid="subsumed-badge"');
    expect(hiddenHtml).toContain('Batch 候補');

    const upForGrabsHtml = renderBoardShell(
      board,
      null,
      baseState({ locale: 'en', activeTab: 'up-for-grabs', computeTier: 'no-compile' }),
      getMessages('en'),
    );
    expect(upForGrabsHtml).toContain('Avoids Refactor Hotspots (Safe)');
    expect(upForGrabsHtml).toContain('Copy Agent Guardrail Prompt');
  });
});

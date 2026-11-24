import { describe, expect, it } from 'vitest';
import { MOCK_BOARD_SNAPSHOT } from '../data/mock-board';
import { analyzeBoard } from '../domain/analyze-board';
import { getMessages } from '../i18n';
import { renderBoardShell, renderLoadingShell, type BoardUiState } from './board-shell';
import {
  escapeHtml,
  formatCompactNumber,
  formatNumber,
  formatRebaseTarget,
  formatRelativeAge,
  formatUtcShort,
  safeHref,
} from './html';

const baseState = (overrides: Partial<BoardUiState> = {}): BoardUiState => ({
  locale: 'zh',
  theme: 'light',
  activeTab: 'all',
  search: '',
  topic: 'all',
  computeTier: 'all',
  hideSubsumed: false,
  promptCopied: false,
  expandedSections: new Set<string>(),
  ...overrides,
});

describe('views structural & security contracts', () => {
  it('转义恶意 HTML、格式化大数字并消除重复 PR 基线后缀', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(safeHref('javascript:alert(1)')).toBe('#');
    expect(safeHref('https://rh-shrink.github.io/')).toBe('https://rh-shrink.github.io/');
    expect(safeHref('/data/board.json')).toBe('/data/board.json');

    expect(formatNumber(162028)).toBe('162,028');
    expect(formatCompactNumber(8049172)).toBe('8.05M');
    expect(formatCompactNumber(162028)).toBe('162k');
    expect(formatRebaseTarget('main', '73958da')).toBe('main (73958da)');
    expect(formatRebaseTarget('PR #669 (codex/clump)', 'PR#669')).toBe('PR #669 (codex/clump)');
    expect(formatUtcShort('2026-11-24T10:16:16Z')).toBe('Nov 24, 10:16 UTC');

    const enRel = getMessages('en').relativeTime;
    const baseMs = Date.parse('2026-11-24T10:30:00Z');
    expect(formatRelativeAge('2026-11-24T10:29:40Z', enRel, baseMs)).toBe('<1m ago');
    expect(formatRelativeAge('2026-11-24T10:18:00Z', enRel, baseMs)).toBe('12m ago');
    expect(formatRelativeAge('2026-11-24T08:00:00Z', enRel, baseMs)).toBe('2h ago');
    expect(formatRelativeAge('2026-11-22T10:00:00Z', enRel, baseMs)).toBe('2d ago');
  });

  it('渲染全景四栏、Pin 刷新栏、Mega-Refactor 预警、Batch 收编徽章、Agent 入口与生态链接', () => {
    const board = analyzeBoard(MOCK_BOARD_SNAPSHOT);
    const html = renderBoardShell(board, 'http-error', baseState(), getMessages('zh'));

    expect(html).toContain('data-testid="pinned-refresh-bar"');
    expect(html).toContain('datetime="2026-11-24T09:30:00Z"');
    expect(html).toContain('>Nov 24, 09:30 UTC</time>');
    expect(html).toContain('data-action="refresh-board"');
    expect(html).toContain('data-testid="data-source-badge"');
    expect(html).toContain('data-testid="refresh-interval-badge"');
    expect(html).toContain('每 15 分钟自动轮询');
    expect(html).toContain('data-testid="mega-refactor-banner"');
    expect(html).toContain('Mega-Refactor');
    expect(html).toContain('data-testid="subsumed-badge"');
    expect(html).toContain('data-testid="agent-endpoints"');
    expect(html).toContain('/data/board.json');
    expect(html).toContain('/llms.txt');
    expect(html).toContain('/skills/lean-proof-golfing.md');
    expect(html).toContain('/skills/mathlib-pr-conventions.md');
    expect(html).toContain('rh-shrink.github.io');
    expect(html).toContain('rh-kernel-backbone');
    expect(html).toContain('riemann.verifytask.cn');
    expect(html).toContain('leanprover.zulipchat.com');
    expect(html).toContain('data-testid="agent-guardrails"');

    const loadingHtml = renderLoadingShell(MOCK_BOARD_SNAPSHOT, baseState(), getMessages('en'));
    expect(loadingHtml).toContain('Loading live triage snapshot');
  });

  it('支持长列表分页折叠、hideSubsumed 降噪与多语种切换', () => {
    const base = analyzeBoard(MOCK_BOARD_SNAPSHOT);
    // 构造超 10 条 Needs Rebase 以验证默认分页与展开切换
    const manyRebase = Array.from({ length: 12 }, (_, idx) => ({
      ...base.needsRebase[0]!,
      pr: { ...base.needsRebase[0]!.pr, number: 500 + idx, title: `Rebase item ${idx}` },
      skipRebaseReason: null,
    }));
    const largeBoard = { ...base, needsRebase: manyRebase };

    const collapsedHtml = renderBoardShell(largeBoard, null, baseState(), getMessages('en'));
    expect(collapsedHtml).toContain('data-section="needs-rebase"');
    expect(collapsedHtml).toContain('Show more (4)');
    expect(collapsedHtml).not.toContain('Rebase item 11');

    const expandedHtml = renderBoardShell(
      largeBoard,
      null,
      baseState({ expandedSections: new Set(['needs-rebase']) }),
      getMessages('en'),
    );
    expect(expandedHtml).toContain('Collapse');
    expect(expandedHtml).toContain('Rebase item 11');

    const hiddenHtml = renderBoardShell(
      base,
      null,
      baseState({ locale: 'ja', activeTab: 'conflict-radar', hideSubsumed: true }),
      getMessages('ja'),
    );
    expect(hiddenHtml).not.toContain('data-testid="subsumed-badge"');
    expect(hiddenHtml).toContain('Batch 候補');
  });
});

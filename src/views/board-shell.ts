import type { BoardFallbackReason } from '../data/load-board';
import type { AnalyzedBoard, BoardSnapshot, ComputeTier, TopicClusterId } from '../domain/types';
import type { Locale, Messages } from '../i18n/types';
import { renderHeader, type ThemePreference } from './header';
import { escapeHtml } from './html';
import { renderConflictRadarPanel } from './panel-conflict-radar';
import { renderMergeQueuePanel } from './panel-merge-queue';
import { renderNeedsRebasePanel } from './panel-needs-rebase';
import { renderUpForGrabsPanel } from './panel-up-for-grabs';
import { renderQueueBanner } from './queue-banner';

export type BoardTab = 'all' | 'merge-queue' | 'up-for-grabs' | 'conflict-radar' | 'needs-rebase';

export interface BoardUiState {
  locale: Locale;
  theme: ThemePreference;
  activeTab: BoardTab;
  search: string;
  topic: TopicClusterId | 'all';
  computeTier: ComputeTier | 'all';
  hideSubsumed: boolean;
  promptCopied: boolean;
  expandedSections: ReadonlySet<string>;
}

const TOPIC_OPTIONS: TopicClusterId[] = [
  'performance-imports',
  'dead-code-dedup',
  'tactic-modernization',
  'docs-infra',
  'math-refactor',
];

export const renderLoadingShell = (
  placeholderSnapshot: BoardSnapshot,
  state: BoardUiState,
  messages: Messages,
): string => `<div class="min-h-screen flex flex-col">
  ${renderHeader({
    snapshot: placeholderSnapshot,
    fallbackReason: null,
    locale: state.locale,
    theme: state.theme,
    messages,
    loading: true,
  })}
  <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
    <div class="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
      ${escapeHtml(messages.loadingSnapshot)}
    </div>
  </main>
</div>`;

export const renderBoardShell = (
  board: AnalyzedBoard,
  fallbackReason: BoardFallbackReason,
  state: BoardUiState,
  messages: Messages,
): string => {
  const { summary } = board;
  const kpiCards: Array<{
    label: string;
    value: number;
    dot: string;
    targetTab: BoardTab;
  }> = [
    {
      label: messages.stats.openPrs,
      value: summary.totalOpenPrs,
      dot: 'bg-zinc-400',
      targetTab: 'all',
    },
    {
      label: messages.stats.queued,
      value: summary.queuedCount,
      dot: 'bg-indigo-500',
      targetTab: 'merge-queue',
    },
    {
      label: messages.stats.megaRefactors,
      value: summary.megaRefactorCount,
      dot: 'bg-rose-500',
      targetTab: 'conflict-radar',
    },
    {
      label: messages.stats.subsumed,
      value: summary.subsumedCount,
      dot: 'bg-violet-500',
      targetTab: 'conflict-radar',
    },
    {
      label: messages.stats.collisions,
      value: summary.collisionGroupCount,
      dot: 'bg-amber-500',
      targetTab: 'conflict-radar',
    },
    {
      label: messages.stats.needsRebase,
      value: summary.needsRebaseCount,
      dot: 'bg-orange-500',
      targetTab: 'needs-rebase',
    },
    {
      label: messages.stats.safeStarters,
      value: summary.safeStarterCount,
      dot: 'bg-emerald-500',
      targetTab: 'up-for-grabs',
    },
  ];

  const tabs: Array<{ id: BoardTab; label: string }> = [
    { id: 'all', label: messages.tabs.allOverview },
    { id: 'merge-queue', label: messages.tabs.mergeQueue },
    { id: 'up-for-grabs', label: messages.tabs.upForGrabs },
    { id: 'conflict-radar', label: messages.tabs.conflictRadar },
    { id: 'needs-rebase', label: messages.tabs.needsRebase },
  ];

  const isOverview = state.activeTab === 'all';
  const mergeQueueHtml = renderMergeQueuePanel(
    board.mergeQueue,
    {
      search: state.search,
      topic: state.topic,
      defaultLimit: isOverview ? 6 : 12,
      expandedSections: state.expandedSections,
    },
    messages,
  );
  const upForGrabsHtml = renderUpForGrabsPanel(
    board.upForGrabs,
    { search: state.search, computeTier: state.computeTier },
    state.locale,
    messages,
    state.promptCopied,
  );
  const radarHtml = renderConflictRadarPanel(
    board,
    {
      search: state.search,
      topic: state.topic,
      hideSubsumed: state.hideSubsumed,
      expandedSections: state.expandedSections,
    },
    messages,
  );
  const rebaseHtml = renderNeedsRebasePanel(
    board.needsRebase,
    {
      search: state.search,
      topic: state.topic,
      hideSubsumed: state.hideSubsumed,
      defaultLimit: isOverview ? 8 : 15,
      expandedSections: state.expandedSections,
    },
    messages,
  );

  const renderActivePanels = (): string => {
    if (isOverview) {
      return `<div class="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <div class="space-y-4">
          ${mergeQueueHtml}
          ${upForGrabsHtml}
        </div>
        <div class="space-y-4">
          ${radarHtml}
          ${rebaseHtml}
        </div>
      </div>`;
    }
    if (state.activeTab === 'merge-queue') return mergeQueueHtml;
    if (state.activeTab === 'up-for-grabs') return upForGrabsHtml;
    if (state.activeTab === 'conflict-radar') return radarHtml;
    return rebaseHtml;
  };
  const mainPanels = renderActivePanels();

  return `<div class="min-h-screen flex flex-col">
    ${renderHeader({
      snapshot: board.snapshot,
      fallbackReason,
      locale: state.locale,
      theme: state.theme,
      messages,
    })}
    ${renderQueueBanner(board, messages)}

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6">
      <section aria-label="KPI summary" class="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        ${kpiCards
          .map(
            (
              card,
              index,
            ) => `<button type="button" data-action="set-tab" data-tab="${card.targetTab}" class="${
              index === kpiCards.length - 1 ? 'col-span-2 sm:col-span-2 lg:col-span-1 ' : ''
            }group rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-left shadow-2xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-zinc-700">
              <div class="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                <span class="h-1.5 w-1.5 rounded-full ${card.dot}"></span>
                <span class="truncate">${escapeHtml(card.label)}</span>
              </div>
              <div class="mt-1 font-mono text-xl font-semibold tracking-tight text-zinc-950 tabular-nums dark:text-zinc-50">${card.value}</div>
            </button>`,
          )
          .join('')}
      </section>

      <section aria-label="Filters and navigation" class="mt-3.5 flex flex-col gap-2.5 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/70">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="inline-flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200/80 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-950/70" role="tablist">
            ${tabs
              .map(
                (tab) =>
                  `<button type="button" role="tab" aria-selected="${state.activeTab === tab.id}" data-action="set-tab" data-tab="${tab.id}" class="rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    state.activeTab === tab.id
                      ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }">${escapeHtml(tab.label)}</button>`,
              )
              .join('')}
          </div>
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
            <input id="hide-subsumed-toggle" type="checkbox" ${state.hideSubsumed ? 'checked' : ''} class="accent-indigo-600" />
            <span>${escapeHtml(messages.filters.hideSubsumed)}</span>
          </label>
        </div>

        <div class="flex flex-col gap-2 md:flex-row md:items-center">
          <input id="board-search" type="search" value="${escapeHtml(state.search)}" placeholder="${escapeHtml(messages.filters.searchPlaceholder)}" class="w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-400 md:flex-1" />
          <select id="topic-select" aria-label="${escapeHtml(messages.filters.allTopics)}" class="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-1.5 text-xs font-medium text-zinc-800 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            <option value="all" ${state.topic === 'all' ? 'selected' : ''}>${escapeHtml(messages.filters.allTopics)}</option>
            ${TOPIC_OPTIONS.map(
              (topicId) =>
                `<option value="${topicId}" ${state.topic === topicId ? 'selected' : ''}>${escapeHtml(messages.topics[topicId])}</option>`,
            ).join('')}
          </select>
        </div>
      </section>

      <div class="mt-4">${mainPanels}</div>
    </main>
  </div>`;
};

import type { BoardFallbackReason } from '../data/load-board';
import type { AnalyzedBoard, ComputeTier, TopicClusterId } from '../domain/types';
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
}

const TOPIC_OPTIONS: TopicClusterId[] = [
  'performance-imports',
  'dead-code-dedup',
  'tactic-modernization',
  'docs-infra',
  'math-refactor',
];

export const renderBoardShell = (
  board: AnalyzedBoard,
  fallbackReason: BoardFallbackReason,
  state: BoardUiState,
  messages: Messages,
): string => {
  const { summary } = board;
  const kpiCards: Array<{ label: string; value: number; accent: string }> = [
    {
      label: messages.stats.openPrs,
      value: summary.totalOpenPrs,
      accent: 'text-slate-900 dark:text-white',
    },
    {
      label: messages.stats.queued,
      value: summary.queuedCount,
      accent: 'text-indigo-700 dark:text-indigo-300',
    },
    {
      label: messages.stats.megaRefactors,
      value: summary.megaRefactorCount,
      accent: 'text-rose-700 dark:text-rose-300',
    },
    {
      label: messages.stats.subsumed,
      value: summary.subsumedCount,
      accent: 'text-violet-700 dark:text-violet-300',
    },
    {
      label: messages.stats.collisions,
      value: summary.collisionGroupCount,
      accent: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: messages.stats.needsRebase,
      value: summary.needsRebaseCount,
      accent: 'text-orange-700 dark:text-orange-300',
    },
    {
      label: messages.stats.safeStarters,
      value: summary.safeStarterCount,
      accent: 'text-emerald-700 dark:text-emerald-300',
    },
  ];

  const tabs: Array<{ id: BoardTab; label: string }> = [
    { id: 'all', label: messages.tabs.allOverview },
    { id: 'merge-queue', label: messages.tabs.mergeQueue },
    { id: 'up-for-grabs', label: messages.tabs.upForGrabs },
    { id: 'conflict-radar', label: messages.tabs.conflictRadar },
    { id: 'needs-rebase', label: messages.tabs.needsRebase },
  ];

  const mergeQueueHtml = renderMergeQueuePanel(
    board.mergeQueue,
    { search: state.search, topic: state.topic },
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
    { search: state.search, topic: state.topic, hideSubsumed: state.hideSubsumed },
    messages,
  );
  const rebaseHtml = renderNeedsRebasePanel(
    board.needsRebase,
    { search: state.search, topic: state.topic, hideSubsumed: state.hideSubsumed },
    messages,
  );

  const renderActivePanels = (): string => {
    if (state.activeTab === 'all') {
      return `<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      ${mergeQueueHtml}
      ${radarHtml}
      ${upForGrabsHtml}
      ${rebaseHtml}
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
            ) => `<div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">${escapeHtml(card.label)}</div>
              <div class="mt-0.5 font-mono text-xl font-bold ${card.accent}">${card.value}</div>
            </div>`,
          )
          .join('')}
      </section>

      <section aria-label="Filters and navigation" class="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-wrap items-center gap-1.5" role="tablist">
          ${tabs
            .map(
              (tab) =>
                `<button type="button" role="tab" aria-selected="${state.activeTab === tab.id}" data-action="set-tab" data-tab="${tab.id}" class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  state.activeTab === tab.id
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }">${escapeHtml(tab.label)}</button>`,
            )
            .join('')}
        </div>

        <div class="flex flex-col gap-2.5 md:flex-row md:items-center">
          <input id="board-search" type="search" value="${escapeHtml(state.search)}" placeholder="${escapeHtml(messages.filters.searchPlaceholder)}" class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:flex-1" />
          <select id="topic-select" aria-label="${escapeHtml(messages.filters.allTopics)}" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <option value="all" ${state.topic === 'all' ? 'selected' : ''}>${escapeHtml(messages.filters.allTopics)}</option>
            ${TOPIC_OPTIONS.map(
              (topicId) =>
                `<option value="${topicId}" ${state.topic === topicId ? 'selected' : ''}>${escapeHtml(messages.topics[topicId])}</option>`,
            ).join('')}
          </select>
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <input id="hide-subsumed-toggle" type="checkbox" ${state.hideSubsumed ? 'checked' : ''} class="accent-indigo-600" />
            <span>${escapeHtml(messages.filters.hideSubsumed)}</span>
          </label>
        </div>
      </section>

      <div class="mt-4">${mainPanels}</div>
    </main>
  </div>`;
};

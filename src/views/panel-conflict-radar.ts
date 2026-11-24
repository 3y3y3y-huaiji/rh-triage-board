import type { AnalyzedBoard, TopicClusterId } from '../domain/types';
import type { Messages } from '../i18n/types';
import { escapeHtml, matchesSearch, safeHref } from './html';

export interface RadarPanelFilters {
  search: string;
  topic: TopicClusterId | 'all';
  hideSubsumed: boolean;
}

export const renderConflictRadarPanel = (
  board: AnalyzedBoard,
  filters: RadarPanelFilters,
  messages: Messages,
): string => {
  const megaCards = board.megaRefactors
    .filter((alert) => matchesSearch(filters.search, [alert.prNumber, alert.title, alert.author]))
    .map(
      (
        alert,
      ) => `<article class="rounded-xl border border-rose-300 bg-rose-50/80 p-3 dark:border-rose-800 dark:bg-rose-950/40">
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class="rounded bg-rose-600 px-2 py-0.5 font-bold text-white">${escapeHtml(messages.megaRefactorBadge)}</span>
          <a href="${safeHref(alert.url)}" target="_blank" rel="noopener noreferrer" class="font-mono font-bold text-rose-800 hover:underline dark:text-rose-200">#${alert.prNumber}</a>
          <span class="font-mono text-rose-700 dark:text-rose-300">diffStatus=${escapeHtml(alert.diffStatus)}, changed_files=${alert.changedFilesCount} (+${alert.additions}/-${alert.deletions})</span>
        </div>
        <p class="mt-1 break-words text-sm font-semibold text-rose-950 dark:text-rose-100">${escapeHtml(alert.title)}</p>
      </article>`,
    )
    .join('');

  const filteredCollisions = board.conflictGroups.filter((group) => {
    if (filters.topic !== 'all' && group.dominantTopic !== filters.topic) return false;
    return matchesSearch(filters.search, [
      ...group.prNumbers,
      ...group.sharedFiles,
      ...group.sharedPrefixes,
      group.suggestedBatchName,
    ]);
  });

  const collisionCards =
    filteredCollisions.length === 0
      ? `<p class="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">${escapeHtml(messages.radarPanel.collisionsEmpty)}</p>`
      : `<div class="space-y-2.5">
          ${filteredCollisions
            .map(
              (
                group,
              ) => `<article class="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <span class="rounded px-2 py-0.5 font-semibold ${
                    group.severity === 'high'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200'
                  }">${escapeHtml(group.severity === 'high' ? messages.radarPanel.severityHigh : messages.radarPanel.severityMedium)}</span>
                  <span class="rounded bg-slate-200 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(messages.topics[group.dominantTopic])}</span>
                  ${group.prNumbers
                    .map(
                      (num) =>
                        `<span class="rounded bg-indigo-100 px-1.5 py-0.5 font-mono font-semibold text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200">#${num}</span>`,
                    )
                    .join('')}
                </div>
                ${
                  group.sharedFiles.length > 0
                    ? `<div class="mt-2 text-xs text-slate-600 dark:text-slate-400">
                        <span class="font-semibold">${escapeHtml(messages.radarPanel.sharedFilesLabel)}:</span>
                        <div class="mt-1 flex flex-wrap gap-1">${group.sharedFiles
                          .slice(0, 4)
                          .map(
                            (file) =>
                              `<code class="break-all rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">${escapeHtml(file)}</code>`,
                          )
                          .join('')}</div>
                      </div>`
                    : ''
                }
                <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>${escapeHtml(messages.radarPanel.sharedPrefixesLabel)}:</span>
                  ${group.sharedPrefixes
                    .slice(0, 3)
                    .map(
                      (prefix) =>
                        `<code class="break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-slate-800">${escapeHtml(prefix)}</code>`,
                    )
                    .join('')}
                </div>
                <div class="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                  ${escapeHtml(messages.radarPanel.suggestedBatchLabel)}: <code class="font-mono font-semibold">${escapeHtml(group.suggestedBatchName)}</code>
                </div>
              </article>`,
            )
            .join('')}
        </div>`;

  const topicCards = board.topicGroups
    .filter((group) => filters.topic === 'all' || group.topic === filters.topic)
    .map((group) => {
      const prsToShow = (
        filters.hideSubsumed ? group.activePrs : [...group.activePrs, ...group.subsumedPrs]
      ).filter((pr) =>
        matchesSearch(filters.search, [
          pr.number,
          pr.title,
          pr.author,
          ...pr.files.map((f) => f.filename),
        ]),
      );

      if (prsToShow.length === 0) return '';

      return `<article class="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100">${escapeHtml(messages.topics[group.topic])}</h4>
          <div class="flex items-center gap-1.5 text-[11px]">
            <span class="rounded bg-slate-200 px-1.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(messages.radarPanel.activePrsCount)}: ${group.activePrs.length}</span>
            <span class="rounded bg-violet-100 px-1.5 py-0.5 text-violet-800 dark:bg-violet-950/70 dark:text-violet-200">${escapeHtml(messages.radarPanel.subsumedPrsCount)}: ${group.subsumedPrs.length}</span>
          </div>
        </div>
        <ul class="mt-2 space-y-1.5">
          ${prsToShow
            .map((pr) => {
              const subsumers = board.subsumedBy[pr.number] ?? [];
              const subsumedBadge =
                subsumers.length > 0
                  ? `<span data-testid="subsumed-badge" class="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-violet-800 dark:bg-violet-950/70 dark:text-violet-200">${escapeHtml(messages.radarPanel.subsumedBadgePrefix)} ${subsumers.map((n) => `#${n}`).join(', ')}</span>`
                  : '';
              return `<li class="flex flex-wrap items-center gap-1.5 text-xs">
                <a href="${safeHref(pr.url)}" target="_blank" rel="noopener noreferrer" class="font-mono font-semibold text-indigo-700 hover:underline dark:text-indigo-300">#${pr.number}</a>
                ${subsumedBadge}
                <span class="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">${escapeHtml(pr.title)}</span>
              </li>`;
            })
            .join('')}
        </ul>
      </article>`;
    })
    .filter(Boolean)
    .join('');

  return `<section data-testid="panel-conflict-radar" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-3">
      <h2 class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(messages.radarPanel.title)}</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(messages.radarPanel.subtitle)}</p>
    </div>

    ${
      megaCards
        ? `<div class="mb-4">
            <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">${escapeHtml(messages.radarPanel.megaSectionTitle)}</h3>
            <div class="space-y-2">${megaCards}</div>
          </div>`
        : ''
    }

    <div class="mb-4">
      <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapeHtml(messages.radarPanel.collisionsTitle)}</h3>
      ${collisionCards}
    </div>

    <div>
      <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapeHtml(messages.radarPanel.topicsTitle)}</h3>
      <div class="space-y-2.5">${topicCards}</div>
    </div>
  </section>`;
};

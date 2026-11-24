import { classifyTopic } from '../domain/triage-rules';
import type { NeedsRebaseEntry, TopicClusterId } from '../domain/types';
import type { Messages } from '../i18n/types';
import { escapeHtml, matchesSearch, safeHref } from './html';

export interface RebasePanelFilters {
  search: string;
  topic: TopicClusterId | 'all';
  hideSubsumed: boolean;
}

export const renderNeedsRebasePanel = (
  entries: NeedsRebaseEntry[],
  filters: RebasePanelFilters,
  messages: Messages,
): string => {
  const filtered = entries.filter((entry) => {
    if (filters.hideSubsumed && entry.skipRebaseReason === 'subsumed') return false;
    if (filters.topic !== 'all' && classifyTopic(entry.pr) !== filters.topic) return false;
    return matchesSearch(filters.search, [
      entry.pr.number,
      entry.pr.title,
      entry.pr.author,
      ...entry.subsumedByPrNumbers,
    ]);
  });

  const body =
    filtered.length === 0
      ? `<p class="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">${escapeHtml(messages.rebasePanel.empty)}</p>`
      : `<div class="space-y-2.5">
          ${filtered
            .map((entry) => {
              const isSubsumed = entry.skipRebaseReason === 'subsumed';
              return `<article class="rounded-xl border ${
                isSubsumed
                  ? 'border-violet-200 bg-violet-50/40 dark:border-violet-900 dark:bg-violet-950/20'
                  : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50'
              } p-3.5">
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="font-mono font-bold text-indigo-700 hover:underline dark:text-indigo-300">#${entry.pr.number}</a>
                  <span class="rounded px-2 py-0.5 font-semibold ${
                    entry.reason === 'merge-conflict'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200'
                  }">${escapeHtml(
                    entry.reason === 'merge-conflict'
                      ? messages.rebasePanel.reasonConflict
                      : messages.rebasePanel.reasonStale,
                  )}</span>
                  ${
                    isSubsumed
                      ? `<span class="rounded bg-violet-100 px-2 py-0.5 font-semibold text-violet-800 dark:bg-violet-950/70 dark:text-violet-200">${escapeHtml(messages.rebasePanel.skipSubsumedBadge)}: ${entry.subsumedByPrNumbers.map((n) => `#${n}`).join(', ')}</span>`
                      : ''
                  }
                </div>
                <h3 class="mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="hover:underline">${escapeHtml(entry.pr.title)}</a>
                </h3>
                <p class="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  ${
                    isSubsumed
                      ? escapeHtml(messages.rebasePanel.skipSubsumedNotice)
                      : `${escapeHtml(messages.rebasePanel.activeActionLabel)} <code class="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">${escapeHtml(entry.recommendedBaseRef)} (${escapeHtml(entry.recommendedBaseSha)})</code>`
                  }
                </p>
              </article>`;
            })
            .join('')}
        </div>`;

  return `<section data-testid="panel-needs-rebase" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-3">
      <h2 class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(messages.rebasePanel.title)}</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(messages.rebasePanel.subtitle)}</p>
    </div>
    ${body}
  </section>`;
};

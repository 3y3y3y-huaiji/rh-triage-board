import { classifyTopic } from '../domain/triage-rules';
import type { NeedsRebaseEntry, TopicClusterId } from '../domain/types';
import type { Messages } from '../i18n/types';
import { escapeHtml, formatRebaseTarget, matchesSearch, safeHref } from './html';

export interface RebasePanelFilters {
  search: string;
  topic: TopicClusterId | 'all';
  hideSubsumed: boolean;
  defaultLimit: number;
  expandedSections: ReadonlySet<string>;
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

  const activeCount = filtered.filter((entry) => entry.skipRebaseReason === null).length;
  const subsumedCount = filtered.length - activeCount;

  const isExpanded = filters.expandedSections.has('needs-rebase');
  const visible = isExpanded ? filtered : filtered.slice(0, filters.defaultLimit);
  const remaining = filtered.length - visible.length;

  const body =
    filtered.length === 0
      ? `<p class="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">${escapeHtml(messages.rebasePanel.empty)}</p>`
      : `<div class="space-y-2">
          ${visible
            .map((entry) => {
              const isSubsumed = entry.skipRebaseReason === 'subsumed';
              const targetLabel = formatRebaseTarget(
                entry.recommendedBaseRef,
                entry.recommendedBaseSha,
              );
              return `<article class="rounded-lg border ${
                isSubsumed
                  ? 'border-violet-200/80 bg-violet-50/30 dark:border-violet-500/25 dark:bg-violet-950/15'
                  : 'border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800/90 dark:bg-zinc-950/50'
              } p-3">
                <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="font-mono text-xs font-semibold text-zinc-900 hover:text-indigo-600 hover:underline dark:text-zinc-100 dark:hover:text-indigo-300">#${entry.pr.number}</a>
                  <span class="rounded border px-1.5 py-0.5 font-medium ${
                    entry.reason === 'merge-conflict'
                      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                  }">${escapeHtml(
                    entry.reason === 'merge-conflict'
                      ? messages.rebasePanel.reasonConflict
                      : messages.rebasePanel.reasonStale,
                  )}</span>
                  ${
                    isSubsumed
                      ? `<span class="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">${escapeHtml(messages.rebasePanel.skipSubsumedBadge)}: ${entry.subsumedByPrNumbers.map((n) => `#${n}`).join(', ')}</span>`
                      : ''
                  }
                </div>
                <h3 class="mt-1.5 break-words text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                  <a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="hover:underline">${escapeHtml(entry.pr.title)}</a>
                </h3>
                <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  ${
                    isSubsumed
                      ? escapeHtml(messages.rebasePanel.skipSubsumedNotice)
                      : `${escapeHtml(messages.rebasePanel.activeActionLabel)} <code class="break-all rounded border border-zinc-200/80 bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">${escapeHtml(targetLabel)}</code>`
                  }
                </p>
              </article>`;
            })
            .join('')}
        </div>
        ${
          filtered.length > visible.length || isExpanded
            ? `<div class="mt-3 flex items-center justify-between gap-2 border-t border-zinc-200/70 pt-2.5 text-xs dark:border-zinc-800/80">
                <span class="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">${escapeHtml(messages.pagination.showingOf)} ${visible.length} / ${filtered.length}</span>
                <button type="button" data-action="toggle-section" data-section="needs-rebase" class="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:border-zinc-600">
                  ${escapeHtml(isExpanded ? messages.pagination.collapse : `${messages.pagination.showMorePrefix} (${remaining})`)}
                </button>
              </div>`
            : ''
        }`;

  return `<section data-testid="panel-needs-rebase" class="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/70">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 class="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-base">${escapeHtml(messages.rebasePanel.title)}</h2>
        <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">${escapeHtml(messages.rebasePanel.subtitle)}</p>
      </div>
      <div class="flex items-center gap-1.5 font-mono text-xs tabular-nums">
        <span class="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 font-medium text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">${activeCount}</span>
        ${
          subsumedCount > 0
            ? `<span class="rounded border border-violet-200 bg-violet-50 px-2 py-0.5 font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">+${subsumedCount}</span>`
            : ''
        }
      </div>
    </div>
    ${body}
  </section>`;
};

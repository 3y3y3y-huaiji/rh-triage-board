import type { MergeQueueEntry, TopicClusterId } from '../domain/types';
import type { Messages } from '../i18n/types';
import { escapeHtml, matchesSearch, safeHref } from './html';

export interface QueuePanelFilters {
  search: string;
  topic: TopicClusterId | 'all';
}

export const renderMergeQueuePanel = (
  entries: MergeQueueEntry[],
  filters: QueuePanelFilters,
  messages: Messages,
): string => {
  const filtered = entries.filter((entry) => {
    if (filters.topic !== 'all' && entry.topic !== filters.topic) return false;
    return matchesSearch(filters.search, [
      entry.pr.number,
      entry.pr.title,
      entry.pr.author,
      entry.pr.headRef,
      ...entry.pr.files.map((file) => file.filename),
    ]);
  });

  const body =
    filtered.length === 0
      ? `<p class="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">${escapeHtml(messages.queuePanel.empty)}</p>`
      : `<div class="space-y-2.5">
          ${filtered
            .map((entry) => {
              const subsumedChips =
                entry.subsumedPrNumbers.length > 0
                  ? `<div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span class="font-medium text-slate-500 dark:text-slate-400">${escapeHtml(messages.queuePanel.subsumesLabel)}:</span>
                      ${entry.subsumedPrNumbers
                        .map(
                          (num) =>
                            `<span class="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-violet-800 dark:bg-violet-950/70 dark:text-violet-200">#${num}</span>`,
                        )
                        .join('')}
                    </div>`
                  : '';

              return `<article class="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5 text-xs">
                      <span class="rounded bg-indigo-600 px-2 py-0.5 font-mono font-bold text-white">${escapeHtml(messages.queuePanel.positionPrefix)} #${entry.position}</span>
                      <a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="font-mono font-bold text-indigo-700 hover:underline dark:text-indigo-300">#${entry.pr.number}</a>
                      ${entry.isBatch ? `<span class="rounded bg-violet-100 px-2 py-0.5 font-semibold text-violet-800 dark:bg-violet-950/70 dark:text-violet-200">${escapeHtml(messages.queuePanel.batchTag)}</span>` : ''}
                      ${entry.isMegaRefactor ? `<span class="rounded bg-rose-600 px-2 py-0.5 font-semibold text-white">${escapeHtml(messages.megaRefactorBadge)}</span>` : ''}
                      <span class="rounded bg-slate-200 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(messages.topics[entry.topic])}</span>
                    </div>
                    <h3 class="mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="hover:underline">${escapeHtml(entry.pr.title)}</a>
                    </h3>
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <span>@${escapeHtml(entry.pr.author)}</span>
                  <span>${escapeHtml(
                    entry.isMegaRefactor
                      ? messages.queuePanel.overflowFilesLabel
                      : `${messages.queuePanel.filesDeltaLabel}: ${entry.pr.changedFilesCount} (+${entry.pr.additions}/-${entry.pr.deletions})`,
                  )}</span>
                  <span class="font-mono text-emerald-700 dark:text-emerald-300">${escapeHtml(messages.recommendedRebaseLabel)}: ${escapeHtml(entry.recommendedBaseRef)}</span>
                </div>
                ${subsumedChips}
              </article>`;
            })
            .join('')}
        </div>`;

  return `<section data-testid="panel-merge-queue" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-3">
      <h2 class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(messages.queuePanel.title)}</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(messages.queuePanel.subtitle)}</p>
    </div>
    ${body}
  </section>`;
};

import type { MergeQueueEntry, TopicClusterId } from '../domain/types';
import type { Messages } from '../i18n/types';
import {
  escapeHtml,
  formatCompactNumber,
  formatNumber,
  formatRebaseTarget,
  matchesSearch,
  safeHref,
} from './html';

export interface QueuePanelFilters {
  search: string;
  topic: TopicClusterId | 'all';
  defaultLimit: number;
  expandedSections: ReadonlySet<string>;
}

const MAX_SUBSUMED_CHIPS = 6;

const UPSTREAM_LABEL_BADGES = ['building', 'inbox', 'roadmap'] as const;

const renderUpstreamLabelBadges = (labels: string[]): string =>
  UPSTREAM_LABEL_BADGES.filter((target) => labels.some((label) => label.toLowerCase() === target))
    .map(
      (label) =>
        `<span data-testid="upstream-label-badge" class="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-mono font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">${escapeHtml(label)}</span>`,
    )
    .join('');

const renderPaginationFooter = (
  sectionId: string,
  total: number,
  shown: number,
  isExpanded: boolean,
  messages: Messages,
): string => {
  if (total <= shown && !isExpanded) return '';
  const remaining = total - shown;
  const label = isExpanded
    ? messages.pagination.collapse
    : `${messages.pagination.showMorePrefix} (${remaining})`;
  return `<div class="mt-3 flex items-center justify-between gap-2 border-t border-zinc-200/70 pt-2.5 text-xs dark:border-zinc-800/80">
    <span class="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">${escapeHtml(messages.pagination.showingOf)} ${shown} / ${total}</span>
    <button type="button" data-action="toggle-section" data-section="${escapeHtml(sectionId)}" class="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:border-zinc-600">
      ${escapeHtml(label)}
    </button>
  </div>`;
};

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

  const isExpanded = filters.expandedSections.has('merge-queue');
  const visible = isExpanded ? filtered : filtered.slice(0, filters.defaultLimit);

  const body =
    filtered.length === 0
      ? `<p class="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">${escapeHtml(messages.queuePanel.empty)}</p>`
      : `<div class="space-y-2">
          ${visible
            .map((entry) => {
              const subsumedKey = `subsumed-${entry.pr.number}`;
              const subsumedExpanded = filters.expandedSections.has(subsumedKey);
              const visibleSubsumed = subsumedExpanded
                ? entry.subsumedPrNumbers
                : entry.subsumedPrNumbers.slice(0, MAX_SUBSUMED_CHIPS);
              const hiddenSubsumedCount = entry.subsumedPrNumbers.length - visibleSubsumed.length;

              const subsumedChips =
                entry.subsumedPrNumbers.length > 0
                  ? `<div class="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                      <span class="font-medium text-zinc-400 dark:text-zinc-500">${escapeHtml(messages.queuePanel.subsumesLabel)}:</span>
                      ${visibleSubsumed
                        .map(
                          (num) =>
                            `<span class="rounded border border-violet-200/80 bg-violet-50/70 px-1.5 py-0.5 font-mono text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300">#${num}</span>`,
                        )
                        .join('')}
                      ${
                        entry.subsumedPrNumbers.length > MAX_SUBSUMED_CHIPS
                          ? `<button type="button" data-action="toggle-section" data-section="${subsumedKey}" class="rounded border border-violet-200 bg-white px-1.5 py-0.5 font-mono text-[11px] font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:bg-zinc-900 dark:text-violet-300">
                              ${escapeHtml(subsumedExpanded ? messages.pagination.collapse : `${messages.pagination.moreItemsPrefix}${hiddenSubsumedCount}`)}
                            </button>`
                          : ''
                      }
                    </div>`
                  : '';

              const rebaseLabel = formatRebaseTarget(
                entry.recommendedBaseRef,
                entry.recommendedBaseSha,
              );

              return `<article class="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 transition hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-950/50 dark:hover:border-zinc-700">
                <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span class="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-mono font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">${escapeHtml(messages.queuePanel.positionPrefix)} #${entry.position}</span>
                  <a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="font-mono text-xs font-semibold text-zinc-900 hover:text-indigo-600 hover:underline dark:text-zinc-100 dark:hover:text-indigo-300">#${entry.pr.number}</a>
                  ${entry.isBatch ? `<span class="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">${escapeHtml(messages.queuePanel.batchTag)}</span>` : ''}
                  ${entry.isMegaRefactor ? `<span class="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">${escapeHtml(messages.megaRefactorBadge)}</span>` : ''}
                  ${renderUpstreamLabelBadges(entry.pr.labels)}
                  <span class="rounded border border-zinc-200/80 bg-white px-1.5 py-0.5 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">${escapeHtml(messages.topics[entry.topic])}</span>
                </div>
                <h3 class="mt-1.5 break-words text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                  <a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="hover:underline">${escapeHtml(entry.pr.title)}</a>
                </h3>
                <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>@${escapeHtml(entry.pr.author)}</span>
                  <span>${escapeHtml(
                    entry.isMegaRefactor
                      ? `${messages.queuePanel.overflowFilesLabel} (${formatNumber(entry.pr.changedFilesCount)} ${messages.filesUnit})`
                      : `${messages.queuePanel.filesDeltaLabel}: ${formatNumber(entry.pr.changedFilesCount)} (+${formatCompactNumber(entry.pr.additions)}/-${formatCompactNumber(entry.pr.deletions)})`,
                  )}</span>
                  <span class="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">${escapeHtml(messages.recommendedRebaseLabel)}: ${escapeHtml(rebaseLabel)}</span>
                </div>
                ${subsumedChips}
              </article>`;
            })
            .join('')}
        </div>
        ${renderPaginationFooter('merge-queue', filtered.length, visible.length, isExpanded, messages)}`;

  return `<section data-testid="panel-merge-queue" class="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/70">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 class="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-base">${escapeHtml(messages.queuePanel.title)}</h2>
        <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">${escapeHtml(messages.queuePanel.subtitle)}</p>
      </div>
      <span class="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs font-medium text-zinc-600 tabular-nums dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">${filtered.length}</span>
    </div>
    ${body}
  </section>`;
};

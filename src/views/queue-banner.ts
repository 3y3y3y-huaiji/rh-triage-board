import type { AnalyzedBoard } from '../domain/types';
import type { Messages } from '../i18n/types';
import { escapeHtml, safeHref } from './html';

export const renderQueueBanner = (board: AnalyzedBoard, messages: Messages): string => {
  const { mainBranch } = board.snapshot;
  const queueChain = board.mergeQueue
    .slice(0, 6)
    .map(
      (entry) =>
        `<a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-md border ${
          entry.isMegaRefactor
            ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
            : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
        } px-2 py-0.5 font-mono text-xs font-semibold hover:underline">
          <span>${entry.position}. #${entry.pr.number}</span>
          ${entry.isBatch ? `<span class="text-[10px] opacity-80">batch</span>` : ''}
        </a>`,
    )
    .join('<span aria-hidden="true" class="text-slate-400">→</span>');

  const headTarget = board.mergeQueue[0]
    ? `${board.mergeQueue[0].recommendedBaseRef} (${board.mergeQueue[0].recommendedBaseSha})`
    : `main (${mainBranch.shortSha})`;

  const megaAlertBanner = board.hasGlobalConflictRisk
    ? `<div data-testid="mega-refactor-banner" role="alert" class="mt-3 rounded-xl border border-rose-300 bg-rose-50/90 px-4 py-3 text-rose-950 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center rounded bg-rose-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">${escapeHtml(messages.megaRefactorBadge)}</span>
              <span class="text-sm font-semibold">${escapeHtml(messages.megaRefactorBannerTitle)}</span>
            </div>
            <p class="mt-1 text-xs leading-relaxed text-rose-800 dark:text-rose-200">${escapeHtml(messages.megaRefactorBannerDesc)}</p>
          </div>
          <div class="flex flex-wrap gap-1.5 shrink-0">
            ${board.megaRefactors
              .map(
                (alert) =>
                  `<a href="${safeHref(alert.url)}" target="_blank" rel="noopener noreferrer" class="rounded-md border border-rose-400 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-rose-800 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-900/60 dark:text-rose-100">#${alert.prNumber} (${escapeHtml(alert.diffStatus)})</a>`,
              )
              .join('')}
          </div>
        </div>
      </div>`
    : '';

  return `<section aria-label="${escapeHtml(messages.queueBannerTitle)}" class="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
    <div class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap items-center gap-2 min-w-0">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapeHtml(messages.queueMainLabel)}:</span>
          <a href="${safeHref(mainBranch.url)}" target="_blank" rel="noopener noreferrer" class="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">${escapeHtml(mainBranch.shortSha)}</a>
          <span class="truncate text-xs text-slate-600 dark:text-slate-300 max-w-full sm:max-w-md">${escapeHtml(mainBranch.message)}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-semibold text-slate-500 dark:text-slate-400">${escapeHtml(messages.queueOrderLabel)}:</span>
          ${queueChain || `<span class="text-slate-500 dark:text-slate-400">${escapeHtml(messages.queueEmpty)}</span>`}
          <span class="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
            ${escapeHtml(messages.recommendedRebaseLabel)}: ${escapeHtml(headTarget)}
          </span>
        </div>
      </div>
      ${megaAlertBanner}
    </div>
  </section>`;
};

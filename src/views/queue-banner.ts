import type { AnalyzedBoard, MegaRefactorAlert } from '../domain/types';
import type { Messages } from '../i18n/types';
import { escapeHtml, formatCompactNumber, formatRebaseTarget, safeHref } from './html';

const MAX_BANNER_MEGA_CHIPS = 6;

const formatBannerChipLabel = (alert: MegaRefactorAlert, messages: Messages): string => {
  if (alert.changedFilesCount > 0) {
    return `#${alert.prNumber} · ${formatCompactNumber(alert.changedFilesCount)} ${messages.filesUnit}`;
  }
  const reasonLabel =
    alert.reason === 'truncated-files'
      ? messages.diffStatusLabels.truncated
      : messages.diffStatusLabels.overflow;
  return `#${alert.prNumber} · ${reasonLabel}`;
};

export const renderQueueBanner = (board: AnalyzedBoard, messages: Messages): string => {
  const { mainBranch } = board.snapshot;
  const queueChain = board.mergeQueue
    .slice(0, 5)
    .map(
      (entry) =>
        `<a href="${safeHref(entry.pr.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-md border ${
          entry.isMegaRefactor
            ? 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
            : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
        } px-2 py-0.5 font-mono text-[11px] font-medium hover:border-indigo-400 hover:underline">
          <span>${entry.position}. #${entry.pr.number}</span>
          ${entry.isBatch ? `<span class="text-[10px] opacity-65">batch</span>` : ''}
        </a>`,
    )
    .join('<span aria-hidden="true" class="text-zinc-300 dark:text-zinc-700">→</span>');

  const headTarget = board.mergeQueue[0]
    ? formatRebaseTarget(
        board.mergeQueue[0].recommendedBaseRef,
        board.mergeQueue[0].recommendedBaseSha,
      )
    : `main (${mainBranch.shortSha})`;

  const visibleMegaChips = board.megaRefactors.slice(0, MAX_BANNER_MEGA_CHIPS);
  const extraMegaCount = Math.max(0, board.megaRefactors.length - MAX_BANNER_MEGA_CHIPS);

  const megaAlertBanner = board.hasGlobalConflictRisk
    ? `<div data-testid="mega-refactor-banner" role="alert" class="mt-3 min-w-0 max-w-full overflow-hidden rounded-lg border border-rose-200/90 border-l-4 border-l-rose-500 bg-rose-50/60 px-3.5 py-2.5 text-rose-950 dark:border-rose-500/25 dark:border-l-rose-500 dark:bg-rose-950/25 dark:text-rose-100">
        <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center rounded border border-rose-300 bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">${escapeHtml(messages.megaRefactorBadge)} · ${board.megaRefactors.length}</span>
              <span class="text-xs font-semibold sm:text-sm">${escapeHtml(messages.megaRefactorBannerTitle)}</span>
            </div>
            <p class="mt-1 break-words text-xs leading-relaxed text-rose-800/90 dark:text-rose-200/80">${escapeHtml(messages.megaRefactorBannerDesc)}</p>
          </div>
          <div class="flex min-w-0 flex-wrap gap-1.5">
            ${visibleMegaChips
              .map(
                (alert) =>
                  `<a href="${safeHref(alert.url)}" target="_blank" rel="noopener noreferrer" class="max-w-full rounded-md border border-rose-200 bg-white/90 px-2 py-0.5 font-mono text-[11px] font-medium text-rose-800 transition hover:border-rose-400 dark:border-rose-500/30 dark:bg-zinc-900/90 dark:text-rose-200 dark:hover:border-rose-400">${escapeHtml(formatBannerChipLabel(alert, messages))}</a>`,
              )
              .join('')}
            ${
              extraMegaCount > 0
                ? `<span class="rounded-md border border-rose-200 bg-rose-100/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-200">+${extraMegaCount}</span>`
                : ''
            }
          </div>
        </div>
      </div>`
    : '';

  return `<section aria-label="${escapeHtml(messages.queueBannerTitle)}" class="mx-auto w-full max-w-7xl px-4 pt-3.5 sm:px-6">
    <div class="min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/70">
      <div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">${escapeHtml(messages.queueMainLabel)}</span>
          <a href="${safeHref(mainBranch.url)}" target="_blank" rel="noopener noreferrer" class="rounded-md border border-zinc-300 bg-zinc-900 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-indigo-300">${escapeHtml(mainBranch.shortSha)}</a>
          <span class="min-w-0 break-words text-xs text-zinc-600 dark:text-zinc-400 sm:max-w-md sm:truncate">${escapeHtml(mainBranch.message)}</span>
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">${escapeHtml(messages.queueOrderLabel)}</span>
          ${queueChain || `<span class="text-zinc-500 dark:text-zinc-400">${escapeHtml(messages.queueEmpty)}</span>`}
          <span class="max-w-full break-all rounded-md border border-emerald-200 bg-emerald-50/80 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            ${escapeHtml(messages.recommendedRebaseLabel)}: ${escapeHtml(headTarget)}
          </span>
        </div>
      </div>
      ${megaAlertBanner}
    </div>
  </section>`;
};

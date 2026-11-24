import { ECOSYSTEM_LINKS } from '../config/ecosystem';
import type { BoardFallbackReason } from '../data/load-board';
import type { BoardSnapshot } from '../domain/types';
import { SUPPORTED_LOCALES } from '../i18n';
import type { Locale, Messages } from '../i18n/types';
import { escapeHtml, formatTimestamp, safeHref } from './html';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface HeaderRenderState {
  snapshot: BoardSnapshot;
  fallbackReason: BoardFallbackReason;
  locale: Locale;
  theme: ThemePreference;
  messages: Messages;
}

export const renderHeader = ({
  snapshot,
  fallbackReason,
  locale,
  theme,
  messages,
}: HeaderRenderState): string => {
  const isMock = fallbackReason !== null || snapshot.source === 'mock';
  const sourceBadgeClass = isMock
    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700'
    : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700';

  const localeOptions = SUPPORTED_LOCALES.map(
    (item) =>
      `<option value="${item.code}" ${item.code === locale ? 'selected' : ''}>${escapeHtml(item.label)}</option>`,
  ).join('');

  const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: messages.themeSystem },
    { value: 'light', label: messages.themeLight },
    { value: 'dark', label: messages.themeDark },
  ];

  const ecosystemChips = ECOSYSTEM_LINKS.map((link) => {
    const label = locale === 'zh' ? link.labelZh : link.labelEn;
    const desc = locale === 'zh' ? link.descriptionZh : link.descriptionEn;
    return `<a href="${safeHref(link.href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(desc)}" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300">
      <span>${escapeHtml(label)}</span>
      <span aria-hidden="true" class="text-[10px] opacity-60">↗</span>
    </a>`;
  }).join('');

  return `<header class="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
    <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">${escapeHtml(messages.brandTitle)}</h1>
            <a href="https://github.com/${escapeHtml(snapshot.repo)}" target="_blank" rel="noopener noreferrer" class="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(snapshot.repo)}</a>
            <span data-testid="data-source-badge" class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sourceBadgeClass}">${escapeHtml(isMock ? messages.dataSourceMock : messages.dataSourceLive)}</span>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">${escapeHtml(messages.brandSubtitle)}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 text-xs">
          <span class="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            ${escapeHtml(messages.updatedAtLabel)}: ${escapeHtml(formatTimestamp(snapshot.generatedAt))}
          </span>
          <label class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
            <span class="text-slate-500 dark:text-slate-400">${escapeHtml(messages.localeLabel)}</span>
            <select id="locale-select" aria-label="${escapeHtml(messages.localeLabel)}" class="bg-transparent font-medium text-slate-800 outline-none dark:text-slate-100">
              ${localeOptions}
            </select>
          </label>
          <label class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
            <span class="text-slate-500 dark:text-slate-400">${escapeHtml(messages.themeLabel)}</span>
            <select id="theme-select" aria-label="${escapeHtml(messages.themeLabel)}" class="bg-transparent font-medium text-slate-800 outline-none dark:text-slate-100">
              ${themeOptions
                .map(
                  (opt) =>
                    `<option value="${opt.value}" ${opt.value === theme ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`,
                )
                .join('')}
            </select>
          </label>
        </div>
      </div>

      <div class="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapeHtml(messages.ecosystemTitle)}:</span>
          ${ecosystemChips}
        </div>
        <div data-testid="agent-endpoints" class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-semibold text-indigo-700 dark:text-indigo-300">${escapeHtml(messages.agentEndpointsTitle)}:</span>
          <a href="/data/board.json" target="_blank" rel="noopener noreferrer" class="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">/data/board.json</a>
          <a href="/llms.txt" target="_blank" rel="noopener noreferrer" class="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">/llms.txt</a>
          <span class="hidden text-slate-500 xl:inline dark:text-slate-400">${escapeHtml(messages.agentEndpointsDesc)}</span>
        </div>
      </div>
    </div>
  </header>`;
};

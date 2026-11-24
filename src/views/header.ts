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
  loading?: boolean;
}

const renderEcosystemChips = (locale: Locale): string =>
  ECOSYSTEM_LINKS.map((link) => {
    const label = locale === 'zh' ? link.labelZh : link.labelEn;
    const desc = locale === 'zh' ? link.descriptionZh : link.descriptionEn;
    return `<a href="${safeHref(link.href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(desc)}" class="inline-flex items-center gap-1 rounded-md border border-zinc-200/80 bg-zinc-50/80 px-2 py-0.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white">
      <span>${escapeHtml(label)}</span>
      <span aria-hidden="true" class="text-[10px] text-zinc-400">↗</span>
    </a>`;
  }).join('');

const renderAgentEndpoints = (messages: Messages): string =>
  `<div data-testid="agent-endpoints" class="flex flex-wrap items-center gap-1.5 text-xs">
    <span class="font-medium text-zinc-500 dark:text-zinc-400">${escapeHtml(messages.agentEndpointsTitle)}</span>
    <a href="/data/board.json" target="_blank" rel="noopener noreferrer" class="rounded-md border border-indigo-200/80 bg-indigo-50/70 px-2 py-0.5 font-mono text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20">/data/board.json</a>
    <a href="/llms.txt" target="_blank" rel="noopener noreferrer" class="rounded-md border border-indigo-200/80 bg-indigo-50/70 px-2 py-0.5 font-mono text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20">/llms.txt</a>
  </div>`;

export const renderHeader = ({
  snapshot,
  fallbackReason,
  locale,
  theme,
  messages,
  loading = false,
}: HeaderRenderState): string => {
  const isMock = fallbackReason !== null || snapshot.source === 'mock';
  const dotClass = loading ? 'bg-zinc-400' : isMock ? 'bg-amber-500' : 'bg-emerald-500';
  const sourceBadgeClass = loading
    ? 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
    : isMock
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300';

  const sourceLabel = loading
    ? messages.loadingSnapshot
    : isMock
      ? messages.dataSourceMock
      : messages.dataSourceLive;

  const localeOptions = SUPPORTED_LOCALES.map(
    (item) =>
      `<option value="${item.code}" ${item.code === locale ? 'selected' : ''}>${escapeHtml(item.label)}</option>`,
  ).join('');

  const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: messages.themeSystem },
    { value: 'light', label: messages.themeLight },
    { value: 'dark', label: messages.themeDark },
  ];

  const ecosystemChips = renderEcosystemChips(locale);
  const agentEndpoints = renderAgentEndpoints(messages);

  return `<header class="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85">
    <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6">
      <div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900 font-mono text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">RH</span>
            <h1 class="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-lg">${escapeHtml(messages.brandTitle)}</h1>
            <a href="https://github.com/${escapeHtml(snapshot.repo)}" target="_blank" rel="noopener noreferrer" class="rounded-md border border-zinc-200 bg-zinc-100/80 px-2 py-0.5 font-mono text-[11px] text-zinc-600 transition hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">${escapeHtml(snapshot.repo)}</a>
            <span data-testid="data-source-badge" class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${sourceBadgeClass}">
              <span class="h-1.5 w-1.5 rounded-full ${dotClass}"></span>
              <span>${escapeHtml(sourceLabel)}</span>
            </span>
          </div>
          <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">${escapeHtml(messages.brandSubtitle)}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="rounded-md border border-zinc-200/80 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            ${escapeHtml(messages.updatedAtLabel)}: ${escapeHtml(formatTimestamp(snapshot.generatedAt))}
          </span>
          <label class="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            <span class="text-zinc-400 dark:text-zinc-500">${escapeHtml(messages.localeLabel)}</span>
            <select id="locale-select" aria-label="${escapeHtml(messages.localeLabel)}" class="cursor-pointer bg-transparent font-medium text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-100">
              ${localeOptions}
            </select>
          </label>
          <div role="group" aria-label="${escapeHtml(messages.themeLabel)}" class="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            ${themeOptions
              .map(
                (opt) =>
                  `<button type="button" data-action="set-theme" data-theme="${opt.value}" aria-pressed="${opt.value === theme}" class="rounded px-2 py-0.5 text-[11px] font-medium transition ${
                    opt.value === theme
                      ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }">${escapeHtml(opt.label)}</button>`,
              )
              .join('')}
          </div>
        </div>
      </div>

      <div class="mt-2.5 hidden flex-wrap items-center justify-between gap-2 border-t border-zinc-200/70 pt-2.5 dark:border-zinc-800/80 sm:flex">
        <div class="flex min-w-0 flex-wrap items-center gap-1.5">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">${escapeHtml(messages.ecosystemTitle)}</span>
          ${ecosystemChips}
        </div>
        ${agentEndpoints}
      </div>

      <details class="mt-2 border-t border-zinc-200/70 pt-2 dark:border-zinc-800/80 sm:hidden">
        <summary class="cursor-pointer select-none text-xs font-medium text-zinc-600 dark:text-zinc-300">
          ${escapeHtml(messages.headerMoreLinks)} (6 + API)
        </summary>
        <div class="mt-2 space-y-2">
          <div class="flex flex-wrap gap-1.5">${ecosystemChips}</div>
          ${agentEndpoints}
        </div>
      </details>
    </div>
  </header>`;
};

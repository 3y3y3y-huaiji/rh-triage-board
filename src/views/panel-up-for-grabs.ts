import { AGENT_GUARDRAIL_RULES } from '../config/ecosystem';
import type { ComputeTier, UpForGrabsTask } from '../domain/types';
import type { Locale, Messages } from '../i18n/types';
import { escapeHtml, matchesSearch, safeHref } from './html';

export interface UpForGrabsFilters {
  search: string;
  computeTier: ComputeTier | 'all';
}

const TIER_BADGE_STYLE: Record<ComputeTier, string> = {
  'no-compile':
    'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
  'laptop-16gb':
    'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800',
  'large-runner':
    'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
};

export const renderUpForGrabsPanel = (
  tasks: UpForGrabsTask[],
  filters: UpForGrabsFilters,
  locale: Locale,
  messages: Messages,
  promptCopied: boolean,
): string => {
  const filtered = tasks.filter((task) => {
    if (filters.computeTier !== 'all' && task.computeTier !== filters.computeTier) return false;
    return matchesSearch(filters.search, [
      task.issueNumber,
      task.titleZh,
      task.titleEn,
      task.summaryZh,
      task.summaryEn,
      ...task.labels,
      ...task.targetPaths,
    ]);
  });

  const tierButtons: Array<{ value: ComputeTier | 'all'; label: string }> = [
    { value: 'all', label: messages.filters.computeAll },
    { value: 'no-compile', label: messages.filters.computeNoCompile },
    { value: 'laptop-16gb', label: messages.filters.computeLaptop16gb },
    { value: 'large-runner', label: messages.filters.computeLargeRunner },
  ];

  const taskCards =
    filtered.length === 0
      ? `<p class="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">${escapeHtml(messages.upForGrabsPanel.empty)}</p>`
      : `<div class="space-y-2.5">
          ${filtered
            .map((task) => {
              const title = locale === 'zh' ? task.titleZh : task.titleEn;
              const summary = locale === 'zh' ? task.summaryZh : task.summaryEn;
              const hotspotClass = task.avoidsRefactorHotspots
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
              const hotspotLabel = task.avoidsRefactorHotspots
                ? messages.upForGrabsPanel.hotspotSafe
                : `${messages.upForGrabsPanel.hotspotCaution} (${messages.upForGrabsPanel.hotspotOverlapPrefix}: ${task.overlappingPrNumbers.map((n) => `#${n}`).join(', ')})`;

              return `<article class="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <span class="rounded-full border px-2 py-0.5 font-semibold ${TIER_BADGE_STYLE[task.computeTier]}">${escapeHtml(messages.computeTiers[task.computeTier])}</span>
                  <span data-testid="hotspot-badge" class="rounded-full border px-2 py-0.5 font-medium ${hotspotClass}">${escapeHtml(hotspotLabel)}</span>
                </div>
                <h3 class="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <a href="${safeHref(task.url)}" target="_blank" rel="noopener noreferrer" class="hover:underline">${escapeHtml(title)}</a>
                </h3>
                <p class="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(summary)}</p>
                <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>${escapeHtml(messages.upForGrabsPanel.targetPathsLabel)}:</span>
                  ${task.targetPaths
                    .map(
                      (p) =>
                        `<code class="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(p)}</code>`,
                    )
                    .join('')}
                </div>
              </article>`;
            })
            .join('')}
        </div>`;

  const guardrailItems = AGENT_GUARDRAIL_RULES.map((rule) => {
    const title = locale === 'zh' ? rule.titleZh : rule.titleEn;
    const detail = locale === 'zh' ? rule.detailZh : rule.detailEn;
    return `<li class="rounded-lg border border-indigo-100 bg-white/80 p-2.5 dark:border-indigo-900/70 dark:bg-slate-900/80">
      <div class="text-xs font-semibold text-slate-900 dark:text-slate-100">${escapeHtml(title)}</div>
      <div class="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(detail)}</div>
    </li>`;
  }).join('');

  return `<section data-testid="panel-up-for-grabs" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(messages.upForGrabsPanel.title)}</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(messages.upForGrabsPanel.subtitle)}</p>
      </div>
      <div class="flex flex-wrap gap-1">
        ${tierButtons
          .map(
            (btn) =>
              `<button type="button" data-action="set-compute-tier" data-tier="${btn.value}" class="rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                filters.computeTier === btn.value
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }">${escapeHtml(btn.label)}</button>`,
          )
          .join('')}
      </div>
    </div>
    ${taskCards}

    <div data-testid="agent-guardrails" class="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 dark:border-indigo-900 dark:bg-indigo-950/30">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">${escapeHtml(messages.upForGrabsPanel.guardrailsTitle)}</h3>
          <p class="text-xs text-indigo-700 dark:text-indigo-300">${escapeHtml(messages.upForGrabsPanel.guardrailsSubtitle)}</p>
        </div>
        <button type="button" data-action="copy-agent-prompt" class="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700">
          ${escapeHtml(promptCopied ? messages.upForGrabsPanel.copiedPromptBtn : messages.upForGrabsPanel.copyPromptBtn)}
        </button>
      </div>
      <ul class="mt-2.5 space-y-2">${guardrailItems}</ul>
    </div>
  </section>`;
};

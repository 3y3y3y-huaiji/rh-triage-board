import { AGENT_GUARDRAIL_RULES } from '../config/ecosystem';
import type { ComputeTier, UpForGrabsTask } from '../domain/types';
import type { Locale, Messages } from '../i18n/types';
import { escapeHtml, matchesSearch, safeHref } from './html';

export interface UpForGrabsFilters {
  search: string;
  computeTier: ComputeTier | 'all';
}

const MAX_HOTSPOT_PRS_INLINE = 4;

const TIER_BADGE_STYLE: Record<ComputeTier, string> = {
  'no-compile':
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  'laptop-16gb':
    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
  'large-runner':
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
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
      ? `<p class="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">${escapeHtml(messages.upForGrabsPanel.empty)}</p>`
      : `<div class="space-y-2">
          ${filtered
            .map((task) => {
              const title = locale === 'zh' ? task.titleZh : task.titleEn;
              const summary = locale === 'zh' ? task.summaryZh : task.summaryEn;
              const hotspotClass = task.avoidsRefactorHotspots
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300';
              const hotspotLabel = task.avoidsRefactorHotspots
                ? messages.upForGrabsPanel.hotspotSafe
                : `${messages.upForGrabsPanel.hotspotCaution} (${task.overlappingPrNumbers.length} PRs)`;

              const visibleHotspotPrs = task.overlappingPrNumbers.slice(0, MAX_HOTSPOT_PRS_INLINE);
              const extraHotspotPrs = Math.max(
                0,
                task.overlappingPrNumbers.length - MAX_HOTSPOT_PRS_INLINE,
              );

              const hotspotLine =
                !task.avoidsRefactorHotspots && task.overlappingPrNumbers.length > 0
                  ? `<div class="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                      <span>${escapeHtml(messages.upForGrabsPanel.hotspotOverlapPrefix)}:</span>
                      ${visibleHotspotPrs
                        .map(
                          (num) =>
                            `<span class="rounded border border-amber-200/80 bg-amber-50 px-1.5 py-0.5 font-mono dark:border-amber-500/25 dark:bg-amber-500/10">#${num}</span>`,
                        )
                        .join('')}
                      ${
                        extraHotspotPrs > 0
                          ? `<span class="rounded border border-amber-200/80 bg-amber-50 px-1.5 py-0.5 font-mono dark:border-amber-500/25 dark:bg-amber-500/10">+${extraHotspotPrs}</span>`
                          : ''
                      }
                    </div>`
                  : '';

              return `<article class="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 transition hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-950/50 dark:hover:border-zinc-700">
                <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span class="rounded-md border px-2 py-0.5 font-medium ${TIER_BADGE_STYLE[task.computeTier]}">${escapeHtml(messages.computeTiers[task.computeTier])}</span>
                  <span data-testid="hotspot-badge" class="rounded-md border px-2 py-0.5 font-medium ${hotspotClass}">${escapeHtml(hotspotLabel)}</span>
                </div>
                <h3 class="mt-1.5 break-words text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                  <a href="${safeHref(task.url)}" target="_blank" rel="noopener noreferrer" class="hover:underline">${escapeHtml(title)}</a>
                </h3>
                <p class="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">${escapeHtml(summary)}</p>
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>${escapeHtml(messages.upForGrabsPanel.targetPathsLabel)}:</span>
                  ${task.targetPaths
                    .map(
                      (p) =>
                        `<code class="rounded border border-zinc-200/80 bg-white px-1.5 py-0.5 font-mono text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">${escapeHtml(p)}</code>`,
                    )
                    .join('')}
                </div>
                ${hotspotLine}
              </article>`;
            })
            .join('')}
        </div>`;

  const guardrailItems = AGENT_GUARDRAIL_RULES.map((rule) => {
    const title = locale === 'zh' ? rule.titleZh : rule.titleEn;
    const detail = locale === 'zh' ? rule.detailZh : rule.detailEn;
    return `<li class="rounded-lg border border-zinc-200/80 bg-white/90 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/90">
      <div class="text-xs font-medium text-zinc-900 dark:text-zinc-100">${escapeHtml(title)}</div>
      <div class="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">${escapeHtml(detail)}</div>
    </li>`;
  }).join('');

  return `<section data-testid="panel-up-for-grabs" class="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/70">
    <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-base">${escapeHtml(messages.upForGrabsPanel.title)}</h2>
        <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">${escapeHtml(messages.upForGrabsPanel.subtitle)}</p>
      </div>
      <div class="inline-flex flex-wrap gap-1 rounded-lg border border-zinc-200/80 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-950/70">
        ${tierButtons
          .map(
            (btn) =>
              `<button type="button" data-action="set-compute-tier" data-tier="${btn.value}" class="rounded-md px-2 py-1 text-[11px] font-medium transition ${
                filters.computeTier === btn.value
                  ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }">${escapeHtml(btn.label)}</button>`,
          )
          .join('')}
      </div>
    </div>
    ${taskCards}

    <div data-testid="agent-guardrails" class="mt-4 rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-950/20">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-xs font-semibold tracking-wide text-indigo-950 dark:text-indigo-200">${escapeHtml(messages.upForGrabsPanel.guardrailsTitle)}</h3>
          <p class="text-xs text-indigo-700/80 dark:text-indigo-300/80">${escapeHtml(messages.upForGrabsPanel.guardrailsSubtitle)}</p>
        </div>
        <button type="button" data-action="copy-agent-prompt" class="rounded-md border border-indigo-300 bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-500 dark:border-indigo-500/40">
          ${escapeHtml(promptCopied ? messages.upForGrabsPanel.copiedPromptBtn : messages.upForGrabsPanel.copyPromptBtn)}
        </button>
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <a href="/skills/lean-proof-golfing.md" target="_blank" rel="noopener noreferrer" class="rounded-md border border-indigo-200 bg-white/90 px-2 py-0.5 font-mono text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-zinc-900/90 dark:text-indigo-300">SKILL: lean-proof-golfing.md ↗</a>
        <a href="/skills/mathlib-pr-conventions.md" target="_blank" rel="noopener noreferrer" class="rounded-md border border-indigo-200 bg-white/90 px-2 py-0.5 font-mono text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-zinc-900/90 dark:text-indigo-300">SKILL: mathlib-pr-conventions.md ↗</a>
        <a href="/llms.txt" target="_blank" rel="noopener noreferrer" class="rounded-md border border-indigo-200 bg-white/90 px-2 py-0.5 font-mono text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-zinc-900/90 dark:text-indigo-300">/llms.txt ↗</a>
      </div>
      <ul class="mt-2.5 space-y-2">${guardrailItems}</ul>
    </div>
  </section>`;
};

import type { AnalyzedBoard, MegaRefactorAlert, TopicClusterId } from '../domain/types';
import type { Messages } from '../i18n/types';
import { escapeHtml, formatCompactNumber, formatNumber, matchesSearch, safeHref } from './html';

export interface RadarPanelFilters {
  search: string;
  topic: TopicClusterId | 'all';
  hideSubsumed: boolean;
  expandedSections: ReadonlySet<string>;
}

const MAX_MEGA_DEFAULT = 3;
const MAX_COLLISION_CHIPS = 10;
const MAX_TOPIC_ITEMS = 5;

const megaReasonLabel = (reason: MegaRefactorAlert['reason'], messages: Messages): string => {
  if (reason === 'truncated-files') return messages.diffStatusLabels.truncated;
  if (reason === 'massive-clump') return messages.diffStatusLabels.massive;
  return messages.diffStatusLabels.overflow;
};

export const renderConflictRadarPanel = (
  board: AnalyzedBoard,
  filters: RadarPanelFilters,
  messages: Messages,
): string => {
  const filteredMegas = board.megaRefactors.filter((alert) =>
    matchesSearch(filters.search, [alert.prNumber, alert.title, alert.author]),
  );
  const megasExpanded = filters.expandedSections.has('mega-refactors');
  const visibleMegas = megasExpanded ? filteredMegas : filteredMegas.slice(0, MAX_MEGA_DEFAULT);

  const megaCards = visibleMegas
    .map(
      (
        alert,
      ) => `<article class="rounded-lg border border-rose-200/80 border-l-3 border-l-rose-500 bg-rose-50/40 p-3 dark:border-rose-500/25 dark:border-l-rose-500 dark:bg-rose-950/20">
        <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span class="rounded border border-rose-200 bg-rose-100/80 px-1.5 py-0.5 font-medium text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">${escapeHtml(messages.megaRefactorBadge)}</span>
          <a href="${safeHref(alert.url)}" target="_blank" rel="noopener noreferrer" class="font-mono text-xs font-semibold text-zinc-900 hover:text-rose-600 hover:underline dark:text-zinc-100 dark:hover:text-rose-300">#${alert.prNumber}</a>
          <span class="rounded border border-rose-200/80 bg-white/80 px-1.5 py-0.5 font-medium text-rose-700 dark:border-rose-500/25 dark:bg-zinc-900/80 dark:text-rose-300">${escapeHtml(megaReasonLabel(alert.reason, messages))}</span>
          <span class="font-mono text-zinc-600 dark:text-zinc-400">${formatNumber(alert.changedFilesCount)} ${escapeHtml(messages.filesUnit)} · +${formatCompactNumber(alert.additions)} / -${formatCompactNumber(alert.deletions)}</span>
        </div>
        <p class="mt-1.5 break-words text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">${escapeHtml(alert.title)}</p>
      </article>`,
    )
    .join('');

  const megaToggle =
    filteredMegas.length > MAX_MEGA_DEFAULT
      ? `<button type="button" data-action="toggle-section" data-section="mega-refactors" class="mt-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200">
          ${escapeHtml(megasExpanded ? messages.pagination.collapse : `${messages.pagination.showMorePrefix} (${filteredMegas.length - MAX_MEGA_DEFAULT})`)}
        </button>`
      : '';

  const filteredCollisions = board.conflictGroups.filter((group) => {
    if (filters.topic !== 'all' && group.dominantTopic !== filters.topic) return false;
    return matchesSearch(filters.search, [
      ...group.prNumbers,
      ...group.sharedFiles,
      ...group.sharedPrefixes,
      group.suggestedBatchName,
    ]);
  });

  const collisionCards =
    filteredCollisions.length === 0
      ? `<p class="rounded-lg border border-dashed border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">${escapeHtml(messages.radarPanel.collisionsEmpty)}</p>`
      : `<div class="space-y-2">
          ${filteredCollisions
            .map((group) => {
              const sectionKey = `collision-${group.id}`;
              const expanded = filters.expandedSections.has(sectionKey);
              const visibleNums = expanded
                ? group.prNumbers
                : group.prNumbers.slice(0, MAX_COLLISION_CHIPS);
              const hiddenNums = group.prNumbers.length - visibleNums.length;

              return `<article class="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800/90 dark:bg-zinc-950/50">
                <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span class="rounded border px-1.5 py-0.5 font-medium ${
                    group.severity === 'high'
                      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                  }">${escapeHtml(group.severity === 'high' ? messages.radarPanel.severityHigh : messages.radarPanel.severityMedium)}</span>
                  <span class="rounded border border-zinc-200/80 bg-white px-1.5 py-0.5 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">${escapeHtml(messages.topics[group.dominantTopic])}</span>
                  <span class="font-mono text-zinc-500 dark:text-zinc-400">(${group.prNumbers.length} PRs)</span>
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-1">
                  ${visibleNums
                    .map(
                      (num) =>
                        `<span class="rounded border border-indigo-200/70 bg-indigo-50/70 px-1.5 py-0.5 font-mono text-[11px] font-medium text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300">#${num}</span>`,
                    )
                    .join('')}
                  ${
                    group.prNumbers.length > MAX_COLLISION_CHIPS
                      ? `<button type="button" data-action="toggle-section" data-section="${escapeHtml(sectionKey)}" class="rounded border border-indigo-200 bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-zinc-900 dark:text-indigo-300">
                          ${escapeHtml(expanded ? messages.pagination.collapse : `${messages.pagination.moreItemsPrefix}${hiddenNums}`)}
                        </button>`
                      : ''
                  }
                </div>
                ${
                  group.sharedFiles.length > 0
                    ? `<div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span class="font-medium">${escapeHtml(messages.radarPanel.sharedFilesLabel)}:</span>
                        <div class="mt-1 flex flex-wrap gap-1">${group.sharedFiles
                          .slice(0, 3)
                          .map(
                            (file) =>
                              `<code class="break-all rounded border border-zinc-200/80 bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">${escapeHtml(file)}</code>`,
                          )
                          .join('')}</div>
                      </div>`
                    : ''
                }
                <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>${escapeHtml(messages.radarPanel.sharedPrefixesLabel)}:</span>
                  ${group.sharedPrefixes
                    .slice(0, 3)
                    .map(
                      (prefix) =>
                        `<code class="break-all rounded border border-zinc-200/80 bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">${escapeHtml(prefix)}</code>`,
                    )
                    .join('')}
                </div>
                <div class="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                  ${escapeHtml(messages.radarPanel.suggestedBatchLabel)}: <code class="font-mono font-medium">${escapeHtml(group.suggestedBatchName)}</code>
                </div>
              </article>`;
            })
            .join('')}
        </div>`;

  const topicCards = board.topicGroups
    .filter((group) => filters.topic === 'all' || group.topic === filters.topic)
    .map((group) => {
      const prsToShow = (
        filters.hideSubsumed ? group.activePrs : [...group.activePrs, ...group.subsumedPrs]
      ).filter((pr) =>
        matchesSearch(filters.search, [
          pr.number,
          pr.title,
          pr.author,
          ...pr.files.map((f) => f.filename),
        ]),
      );

      if (prsToShow.length === 0) return '';

      const topicKey = `topic-${group.topic}`;
      const topicExpanded = filters.expandedSections.has(topicKey);
      const visiblePrs = topicExpanded ? prsToShow : prsToShow.slice(0, MAX_TOPIC_ITEMS);
      const remainingPrs = prsToShow.length - visiblePrs.length;

      return `<article class="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800/90 dark:bg-zinc-950/50">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-xs font-semibold text-zinc-900 dark:text-zinc-100">${escapeHtml(messages.topics[group.topic])}</h4>
          <div class="flex items-center gap-1.5 text-[11px]">
            <span class="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">${escapeHtml(messages.radarPanel.activePrsCount)}: ${group.activePrs.length}</span>
            <span class="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">${escapeHtml(messages.radarPanel.subsumedPrsCount)}: ${group.subsumedPrs.length}</span>
          </div>
        </div>
        <ul class="mt-2 space-y-1.5">
          ${visiblePrs
            .map((pr) => {
              const subsumers = board.subsumedBy[pr.number] ?? [];
              const subsumedBadge =
                subsumers.length > 0
                  ? `<span data-testid="subsumed-badge" class="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">${escapeHtml(messages.radarPanel.subsumedBadgePrefix)} ${subsumers.map((n) => `#${n}`).join(', ')}</span>`
                  : '';
              return `<li class="flex flex-wrap items-center gap-1.5 text-xs">
                <a href="${safeHref(pr.url)}" target="_blank" rel="noopener noreferrer" class="font-mono font-semibold text-indigo-700 hover:underline dark:text-indigo-300">#${pr.number}</a>
                ${subsumedBadge}
                <span class="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300">${escapeHtml(pr.title)}</span>
              </li>`;
            })
            .join('')}
        </ul>
        ${
          prsToShow.length > MAX_TOPIC_ITEMS
            ? `<button type="button" data-action="toggle-section" data-section="${escapeHtml(topicKey)}" class="mt-2 rounded-md border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                ${escapeHtml(topicExpanded ? messages.pagination.collapse : `${messages.pagination.showMorePrefix} (${remainingPrs})`)}
              </button>`
            : ''
        }
      </article>`;
    })
    .filter(Boolean)
    .join('');

  return `<section data-testid="panel-conflict-radar" class="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/70">
    <div class="mb-3">
      <h2 class="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-base">${escapeHtml(messages.radarPanel.title)}</h2>
      <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">${escapeHtml(messages.radarPanel.subtitle)}</p>
    </div>

    ${
      megaCards
        ? `<div class="mb-4">
            <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">${escapeHtml(messages.radarPanel.megaSectionTitle)} (${filteredMegas.length})</h3>
            <div class="space-y-2">${megaCards}</div>
            ${megaToggle}
          </div>`
        : ''
    }

    <div class="mb-4">
      <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">${escapeHtml(messages.radarPanel.collisionsTitle)}</h3>
      ${collisionCards}
    </div>

    <div>
      <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">${escapeHtml(messages.radarPanel.topicsTitle)}</h3>
      <div class="space-y-2">${topicCards}</div>
    </div>
  </section>`;
};

export type Locale = 'zh' | 'en' | 'fr' | 'de' | 'ja';

export interface Messages {
  htmlLang: string;
  brandTitle: string;
  brandSubtitle: string;
  dataSourceLive: string;
  dataSourceMock: string;
  updatedAtLabel: string;
  lastSyncedLabel: string;
  lastCommitLabel: string;
  refreshIntervalLabel: string;
  refreshNowLabel: string;
  unofficialBadge: string;
  relativeTime: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
  loadingSnapshot: string;
  headerMoreLinks: string;
  filesUnit: string;
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  localeLabel: string;
  agentEndpointsTitle: string;
  agentEndpointsDesc: string;
  ecosystemTitle: string;
  queueBannerTitle: string;
  queueMainLabel: string;
  queueOrderLabel: string;
  queueEmpty: string;
  recommendedRebaseLabel: string;
  megaRefactorBannerTitle: string;
  megaRefactorBannerDesc: string;
  megaRefactorBadge: string;
  diffStatusLabels: {
    overflow: string;
    truncated: string;
    massive: string;
  };
  pagination: {
    showMorePrefix: string;
    showAll: string;
    collapse: string;
    showingOf: string;
    moreItemsPrefix: string;
  };
  stats: {
    openPrs: string;
    queued: string;
    megaRefactors: string;
    subsumed: string;
    collisions: string;
    needsRebase: string;
    safeStarters: string;
  };
  tabs: {
    allOverview: string;
    mergeQueue: string;
    upForGrabs: string;
    conflictRadar: string;
    needsRebase: string;
  };
  filters: {
    searchPlaceholder: string;
    allTopics: string;
    hideSubsumed: string;
    computeAll: string;
    computeNoCompile: string;
    computeLaptop16gb: string;
    computeLargeRunner: string;
  };
  topics: {
    'performance-imports': string;
    'dead-code-dedup': string;
    'tactic-modernization': string;
    'docs-infra': string;
    'math-refactor': string;
  };
  computeTiers: {
    'no-compile': string;
    'laptop-16gb': string;
    'large-runner': string;
  };
  queuePanel: {
    title: string;
    subtitle: string;
    empty: string;
    positionPrefix: string;
    batchTag: string;
    subsumesLabel: string;
    filesDeltaLabel: string;
    overflowFilesLabel: string;
  };
  upForGrabsPanel: {
    title: string;
    subtitle: string;
    empty: string;
    hotspotSafe: string;
    hotspotCaution: string;
    hotspotOverlapPrefix: string;
    guardrailsTitle: string;
    guardrailsSubtitle: string;
    copyPromptBtn: string;
    copiedPromptBtn: string;
    targetPathsLabel: string;
  };
  radarPanel: {
    title: string;
    subtitle: string;
    megaSectionTitle: string;
    collisionsTitle: string;
    collisionsEmpty: string;
    severityHigh: string;
    severityMedium: string;
    sharedFilesLabel: string;
    sharedPrefixesLabel: string;
    suggestedBatchLabel: string;
    topicsTitle: string;
    activePrsCount: string;
    subsumedPrsCount: string;
    subsumedBadgePrefix: string;
  };
  rebasePanel: {
    title: string;
    subtitle: string;
    empty: string;
    reasonConflict: string;
    reasonStale: string;
    skipSubsumedBadge: string;
    skipSubsumedNotice: string;
    activeActionLabel: string;
  };
}

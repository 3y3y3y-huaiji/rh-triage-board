export type DiffFetchStatus = 'ok' | 'truncated' | 'overflow';

export interface MainBranchInfo {
  sha: string;
  shortSha: string;
  message: string;
  committedAt: string;
  url: string;
}

export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface PullRequestRecord {
  number: number;
  title: string;
  body: string;
  author: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  labels: string[];
  baseRef: string;
  baseSha: string;
  headRef: string;
  mergeableState?: string;
  changedFilesCount: number;
  additions: number;
  deletions: number;
  diffStatus: DiffFetchStatus;
  files: PullRequestFile[];
}

export interface IssueRecord {
  number: number;
  title: string;
  body: string;
  author: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  comments: number;
}

export interface BoardSnapshot {
  schemaVersion: 1;
  repo: string;
  generatedAt: string;
  source: 'github' | 'mock';
  mainBranch: MainBranchInfo;
  pullRequests: PullRequestRecord[];
  issues: IssueRecord[];
}

export type TopicClusterId =
  | 'performance-imports'
  | 'dead-code-dedup'
  | 'tactic-modernization'
  | 'docs-infra'
  | 'math-refactor';

export type ComputeTier = 'no-compile' | 'laptop-16gb' | 'large-runner';

export type HotspotStatus = 'safe' | 'caution';

export interface MegaRefactorAlert {
  prNumber: number;
  title: string;
  author: string;
  url: string;
  diffStatus: DiffFetchStatus;
  changedFilesCount: number;
  additions: number;
  deletions: number;
  reason: 'diff-overflow' | 'truncated-files' | 'massive-clump';
}

export interface SubsumptionLink {
  fragmentPrNumber: number;
  batchPrNumber: number;
  batchPrTitle: string;
  batchPrUrl: string;
}

export interface MergeQueueEntry {
  position: number;
  pr: PullRequestRecord;
  isBatch: boolean;
  isMegaRefactor: boolean;
  subsumedPrNumbers: number[];
  recommendedBaseRef: string;
  recommendedBaseSha: string;
  priorityTier: 'building' | 'inbox' | 'merge-queue' | 'batch-head' | 'batch-queue' | 'priority';
  topic: TopicClusterId;
}

export interface ConflictGroup {
  id: string;
  severity: 'high' | 'medium';
  prNumbers: number[];
  sharedFiles: string[];
  sharedPrefixes: string[];
  dominantTopic: TopicClusterId;
  suggestedBatchName: string;
}

export interface TopicBatchGroup {
  topic: TopicClusterId;
  activePrs: PullRequestRecord[];
  subsumedPrs: PullRequestRecord[];
  totalLinesDelta: number;
}

export interface UpForGrabsTask {
  id: string;
  kind: 'issue' | 'curated-track';
  issueNumber?: number;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  url: string;
  labels: string[];
  computeTier: ComputeTier;
  hotspotStatus: HotspotStatus;
  avoidsRefactorHotspots: boolean;
  overlappingPrNumbers: number[];
  targetPaths: string[];
}

export interface NeedsRebaseEntry {
  pr: PullRequestRecord;
  reason: 'stale-base' | 'merge-conflict';
  recommendedBaseRef: string;
  recommendedBaseSha: string;
  subsumedByPrNumbers: number[];
  skipRebaseReason: 'subsumed' | null;
}

export interface BoardSummary {
  totalOpenPrs: number;
  queuedCount: number;
  megaRefactorCount: number;
  subsumedCount: number;
  collisionGroupCount: number;
  needsRebaseCount: number;
  safeStarterCount: number;
}

export interface AnalyzedBoard {
  snapshot: BoardSnapshot;
  summary: BoardSummary;
  megaRefactors: MegaRefactorAlert[];
  hasGlobalConflictRisk: boolean;
  subsumptions: SubsumptionLink[];
  subsumedBy: Record<number, number[]>;
  mergeQueue: MergeQueueEntry[];
  conflictGroups: ConflictGroup[];
  topicGroups: TopicBatchGroup[];
  hotspotPrefixes: Record<string, number[]>;
  upForGrabs: UpForGrabsTask[];
  needsRebase: NeedsRebaseEntry[];
}

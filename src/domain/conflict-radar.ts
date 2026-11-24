import { classifyTopic, detectMegaRefactor, extractDirectoryPrefix } from './triage-rules';
import type {
  ConflictGroup,
  MegaRefactorAlert,
  PullRequestRecord,
  TopicBatchGroup,
  TopicClusterId,
} from './types';

export interface ConflictAnalysis {
  megaRefactors: MegaRefactorAlert[];
  hasGlobalConflictRisk: boolean;
  conflictGroups: ConflictGroup[];
  topicGroups: TopicBatchGroup[];
  hotspotPrefixes: Record<string, number[]>;
}

const TOPIC_ORDER: TopicClusterId[] = [
  'performance-imports',
  'dead-code-dedup',
  'tactic-modernization',
  'docs-infra',
  'math-refactor',
];

const dominantTopicFor = (prs: PullRequestRecord[]): TopicClusterId => {
  const counts = new Map<TopicClusterId, number>();
  for (const pr of prs) {
    const topic = classifyTopic(pr);
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  let best: TopicClusterId = 'math-refactor';
  let bestCount = -1;
  for (const topic of TOPIC_ORDER) {
    const count = counts.get(topic) ?? 0;
    if (count > bestCount) {
      best = topic;
      bestCount = count;
    }
  }
  return best;
};

const buildSuggestedBatchName = (
  topic: TopicClusterId,
  sharedPrefixes: string[],
  prNumbers: number[],
): string => {
  const anchor = sharedPrefixes[0]?.split('/').slice(-1)[0] ?? topic;
  return `batch/${anchor.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}-${prNumbers[0] ?? 'group'}`;
};

/**
 * 冲突雷达与主题聚类分析：
 * 1. 先提取 Mega-Refactor / Diff 溢出 PR，标记全局冲突风险；
 * 2. 将 Mega-Refactor PR 隔离出常规文件/目录碰撞索引，避免单个全仓 PR 把大量无关 PR 串成巨型簇；
 * 3. 按五大主题聚类全部 Open PR，并区分活跃 PR 与已被 Batch 收编 PR。
 */
export const analyzeConflicts = (
  prs: PullRequestRecord[],
  subsumedBy: Record<number, number[]>,
): ConflictAnalysis => {
  const megaRefactors: MegaRefactorAlert[] = [];
  for (const pr of prs) {
    const alert = detectMegaRefactor(pr);
    if (alert) megaRefactors.push(alert);
  }
  megaRefactors.sort((a, b) => a.prNumber - b.prNumber);
  const megaPrNumbers = new Set(megaRefactors.map((alert) => alert.prNumber));

  const fileOwners = new Map<string, Set<number>>();
  const prefixOwners = new Map<string, Set<number>>();
  const prByNumber = new Map<number, PullRequestRecord>();

  for (const pr of prs) {
    prByNumber.set(pr.number, pr);
    if (megaPrNumbers.has(pr.number)) continue;
    for (const file of pr.files) {
      const fileSet = fileOwners.get(file.filename) ?? new Set<number>();
      fileSet.add(pr.number);
      fileOwners.set(file.filename, fileSet);

      const prefix = extractDirectoryPrefix(file.filename);
      if (prefix) {
        const prefixSet = prefixOwners.get(prefix) ?? new Set<number>();
        prefixSet.add(pr.number);
        prefixOwners.set(prefix, prefixSet);
      }
    }
  }

  const adjacency = new Map<number, Set<number>>();
  const connectPair = (a: number, b: number) => {
    const setA = adjacency.get(a) ?? new Set<number>();
    setA.add(b);
    adjacency.set(a, setA);
    const setB = adjacency.get(b) ?? new Set<number>();
    setB.add(a);
    adjacency.set(b, setB);
  };

  for (const owners of fileOwners.values()) {
    if (owners.size < 2) continue;
    const nums = [...owners];
    for (let i = 0; i < nums.length; i += 1) {
      for (let j = i + 1; j < nums.length; j += 1) {
        connectPair(nums[i]!, nums[j]!);
      }
    }
  }

  const hotspotPrefixes: Record<string, number[]> = {};
  for (const [prefix, owners] of prefixOwners.entries()) {
    if (owners.size < 2) continue;
    const nums = [...owners].sort((a, b) => a - b);
    hotspotPrefixes[prefix] = nums;
    for (let i = 0; i < nums.length; i += 1) {
      for (let j = i + 1; j < nums.length; j += 1) {
        connectPair(nums[i]!, nums[j]!);
      }
    }
  }

  const visited = new Set<number>();
  const conflictGroups: ConflictGroup[] = [];

  for (const startPr of [...adjacency.keys()].sort((a, b) => a - b)) {
    if (visited.has(startPr)) continue;
    const component: number[] = [];
    const stack = [startPr];
    visited.add(startPr);

    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }

    if (component.length < 2) continue;
    component.sort((a, b) => a - b);
    const componentSet = new Set(component);

    const sharedFiles = [...fileOwners.entries()]
      .filter(([, owners]) => [...owners].filter((n) => componentSet.has(n)).length >= 2)
      .map(([file]) => file)
      .sort();

    const sharedPrefixes = [...prefixOwners.entries()]
      .filter(([, owners]) => [...owners].filter((n) => componentSet.has(n)).length >= 2)
      .map(([prefix]) => prefix)
      .sort();

    const componentPrs = component
      .map((num) => prByNumber.get(num))
      .filter((item): item is PullRequestRecord => Boolean(item));
    const dominantTopic = dominantTopicFor(componentPrs);

    conflictGroups.push({
      id: `conflict-${component.join('-')}`,
      severity: sharedFiles.length > 0 ? 'high' : 'medium',
      prNumbers: component,
      sharedFiles,
      sharedPrefixes,
      dominantTopic,
      suggestedBatchName: buildSuggestedBatchName(dominantTopic, sharedPrefixes, component),
    });
  }

  conflictGroups.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    return b.prNumbers.length - a.prNumbers.length || a.prNumbers[0]! - b.prNumbers[0]!;
  });

  const topicMap = new Map<
    TopicClusterId,
    { active: PullRequestRecord[]; subsumed: PullRequestRecord[] }
  >();
  for (const topic of TOPIC_ORDER) {
    topicMap.set(topic, { active: [], subsumed: [] });
  }

  for (const pr of [...prs].sort((a, b) => b.number - a.number)) {
    if (megaPrNumbers.has(pr.number)) continue;
    const topic = classifyTopic(pr);
    const bucket = topicMap.get(topic)!;
    if ((subsumedBy[pr.number]?.length ?? 0) > 0) {
      bucket.subsumed.push(pr);
    } else {
      bucket.active.push(pr);
    }
  }

  const topicGroups: TopicBatchGroup[] = TOPIC_ORDER.map((topic) => {
    const bucket = topicMap.get(topic)!;
    const all = [...bucket.active, ...bucket.subsumed];
    const totalLinesDelta = all.reduce((sum, pr) => sum + pr.additions + pr.deletions, 0);
    return {
      topic,
      activePrs: bucket.active,
      subsumedPrs: bucket.subsumed,
      totalLinesDelta,
    };
  }).filter((group) => group.activePrs.length > 0 || group.subsumedPrs.length > 0);

  return {
    megaRefactors,
    hasGlobalConflictRisk: megaRefactors.length > 0,
    conflictGroups,
    topicGroups,
    hotspotPrefixes,
  };
};

import { isBatchPr } from './triage-rules';
import type { PullRequestRecord, SubsumptionLink } from './types';

const SUBSUMPTION_CONTEXT_KEYWORD =
  /\b(?:batch|rollup|roll-up|subsumes|includes|incorporates|combines|merges|supersedes|closes|replaces|folds in|consolidates)\b/i;

const NEGATIVE_REFERENCE_BEFORE =
  /(?:depends\s+on|follow-?up\s+(?:to|of)|review\s+of|stacked\s+on|blocked\s+by|see\s+also|related\s+to|replaces?\s+nothing|unlike)\s*:?\s*$/i;

const REF_PATTERN = /(?:(?:^|[^A-Za-z0-9_])#(\d{1,6})|\/pull\/(\d{1,6}))/g;

export interface SubsumptionAnalysis {
  subsumptions: SubsumptionLink[];
  subsumedBy: Record<number, number[]>;
}

const isNegativeContext = (text: string, matchIndex: number): boolean => {
  const windowStart = Math.max(0, matchIndex - 32);
  const before = text.slice(windowStart, matchIndex);
  return NEGATIVE_REFERENCE_BEFORE.test(before);
};

const extractReferencedPrNumbers = (
  text: string,
  openPrNumbers: Set<number>,
  selfNumber: number,
) => {
  const refs = new Set<number>();
  for (const match of text.matchAll(REF_PATTERN)) {
    const rawNum = match[1] ?? match[2];
    if (!rawNum) continue;
    const num = Number(rawNum);
    if (!Number.isInteger(num) || num === selfNumber || !openPrNumbers.has(num)) continue;
    const matchIndex = match.index ?? 0;
    if (isNegativeContext(text, matchIndex)) continue;
    refs.add(num);
  }
  return [...refs].sort((a, b) => a - b);
};

/**
 * 识别 Batch / Rollup PR 对碎片 PR 的收编关系。
 * 仅在具备 Batch/Rollup 语义的 PR 中提取被收编的 Open PR，避免误伤 `depends on: #123` 等依赖引用。
 */
export const analyzeBatchSubsumptions = (prs: PullRequestRecord[]): SubsumptionAnalysis => {
  const openPrNumbers = new Set(prs.map((pr) => pr.number));
  const subsumptions: SubsumptionLink[] = [];
  const subsumedByMap = new Map<number, Set<number>>();

  const sortedPrs = [...prs].sort((a, b) => a.number - b.number);
  for (const pr of sortedPrs) {
    const combinedText = `${pr.title}\n${pr.body}`;
    if (!isBatchPr(pr) && !SUBSUMPTION_CONTEXT_KEYWORD.test(combinedText)) {
      continue;
    }

    const referenced = extractReferencedPrNumbers(combinedText, openPrNumbers, pr.number);
    if (referenced.length === 0) continue;

    // 非明确 batch 标签的 PR 需要至少引用 2 个 PR 或标题含收编词，降低单条关联误报。
    const hasExplicitSubsumptionCue =
      isBatchPr(pr) || referenced.length >= 2 || SUBSUMPTION_CONTEXT_KEYWORD.test(pr.title);
    if (!hasExplicitSubsumptionCue) continue;

    for (const fragmentPrNumber of referenced) {
      subsumptions.push({
        fragmentPrNumber,
        batchPrNumber: pr.number,
        batchPrTitle: pr.title,
        batchPrUrl: pr.url,
      });
      const existing = subsumedByMap.get(fragmentPrNumber) ?? new Set<number>();
      existing.add(pr.number);
      subsumedByMap.set(fragmentPrNumber, existing);
    }
  }

  const subsumedBy: Record<number, number[]> = {};
  for (const [fragment, batches] of subsumedByMap.entries()) {
    subsumedBy[fragment] = [...batches].sort((a, b) => a - b);
  }

  return { subsumptions, subsumedBy };
};

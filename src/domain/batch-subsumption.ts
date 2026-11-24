import { detectMegaRefactor, isBatchPr } from './triage-rules';
import type { PullRequestRecord, SubsumptionLink } from './types';

const SUBSUMPTION_CONTEXT_KEYWORD =
  /\b(?:batch|rollup|roll-up|subsumes|includes|incorporates|combines|merges|supersedes|closes|replaces|folds in|consolidates)\b/i;

const NEGATIVE_REFERENCE_BEFORE =
  /(?:depends\s+on|follow-?up\s+(?:to|of)|review\s+of|stacked\s+on|blocked\s+by|see\s+also|related\s+to|replaces?\s+nothing|unlike)\s*:?\s*$/i;

const REF_PATTERN = /(?:(?:^|[^A-Za-z0-9_])#(\d{1,6})|\/pull\/(\d{1,6}))/g;

/** 隐式文件包含收编的最小碎片规模，避免单文件巧合重合导致误收编。 */
const IMPLICIT_MIN_FRAGMENT_FILES = 2;

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

const fileSetOf = (pr: PullRequestRecord): Set<string> =>
  new Set(pr.files.map((file) => file.filename));

const isProperSubset = (fragmentFiles: Set<string>, batchFiles: Set<string>): boolean =>
  fragmentFiles.size > 0 &&
  fragmentFiles.size < batchFiles.size &&
  [...fragmentFiles].every((filename) => batchFiles.has(filename));

/**
 * 识别 Batch / Rollup PR 对碎片 PR 的收编关系。
 * - Mega-Refactor PR 完全隔离：既不被收编，也不参与收编计算；
 * - 显式语义：Batch/Rollup PR 明确 `includes/supersedes #NNN`；
 * - 隐式文件包含：双方均为非 Mega PR，且碎片文件集严格包含于 Batch PR；
 * - 禁止较小或更晚创建的 PR 反向收编较大或更早的 PR，部分文件重合仅视为碰撞。
 */
export const analyzeBatchSubsumptions = (prs: PullRequestRecord[]): SubsumptionAnalysis => {
  const openPrNumbers = new Set(prs.map((pr) => pr.number));
  const megaPrNumbers = new Set(
    prs.filter((pr) => detectMegaRefactor(pr) !== null).map((pr) => pr.number),
  );
  const subsumptions: SubsumptionLink[] = [];
  const subsumedByMap = new Map<number, Set<number>>();
  const seenLinks = new Set<string>();

  const addSubsumption = (fragmentPrNumber: number, batch: PullRequestRecord) => {
    const key = `${fragmentPrNumber}:${batch.number}`;
    if (seenLinks.has(key)) return;
    seenLinks.add(key);
    subsumptions.push({
      fragmentPrNumber,
      batchPrNumber: batch.number,
      batchPrTitle: batch.title,
      batchPrUrl: batch.url,
    });
    const existing = subsumedByMap.get(fragmentPrNumber) ?? new Set<number>();
    existing.add(batch.number);
    subsumedByMap.set(fragmentPrNumber, existing);
  };

  const sortedPrs = [...prs].sort((a, b) => a.number - b.number);
  const eligiblePrs = sortedPrs.filter((pr) => !megaPrNumbers.has(pr.number));

  for (const pr of eligiblePrs) {
    const combinedText = `${pr.title}\n${pr.body}`;
    if (!isBatchPr(pr) && !SUBSUMPTION_CONTEXT_KEYWORD.test(combinedText)) {
      continue;
    }

    const referenced = extractReferencedPrNumbers(combinedText, openPrNumbers, pr.number).filter(
      (num) => !megaPrNumbers.has(num),
    );
    if (referenced.length === 0) continue;

    // 非明确 batch 标签的 PR 需要至少引用 2 个 PR 或标题含收编词，降低单条关联误报。
    const hasExplicitSubsumptionCue =
      isBatchPr(pr) || referenced.length >= 2 || SUBSUMPTION_CONTEXT_KEYWORD.test(pr.title);
    if (!hasExplicitSubsumptionCue) continue;

    for (const fragmentPrNumber of referenced) {
      addSubsumption(fragmentPrNumber, pr);
    }
  }

  for (const batch of eligiblePrs) {
    const batchFiles = fileSetOf(batch);
    if (batchFiles.size === 0) continue;
    for (const fragment of eligiblePrs) {
      if (fragment.number === batch.number) continue;
      const fragmentFiles = fileSetOf(fragment);
      if (fragmentFiles.size < IMPLICIT_MIN_FRAGMENT_FILES) continue;
      if (!isProperSubset(fragmentFiles, batchFiles)) continue;
      // 禁止更晚创建的 PR 反向收编更早的 PR。
      if (batch.createdAt > fragment.createdAt) continue;
      addSubsumption(fragment.number, batch);
    }
  }

  const subsumedBy: Record<number, number[]> = {};
  for (const [fragment, batches] of subsumedByMap.entries()) {
    subsumedBy[fragment] = [...batches].sort((a, b) => a - b);
  }

  return { subsumptions, subsumedBy };
};

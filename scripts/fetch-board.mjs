#!/usr/bin/env node
/**
 * 构建期上游数据采集脚本（Node 24+ 原生 ESM，零外部依赖）：
 * 拉取 leanprover-community/riemann-hypothesis 的：
 * 1. main 分支最新 commit；
 * 2. Open PRs 及其标签、作者、更新时间和改动文件列表（/pulls/{number}/files，显式标注 overflow/truncated）；
 * 3. 跟踪 Issue（#229 及 good first issue / batch 等开放议题）；
 * 生成 public/data/board.json（已加入 .gitignore，严禁入库）。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_REPO = 'leanprover-community/riemann-hypothesis';
const DEFAULT_OUTPUT = 'public/data/board.json';
const MAX_FILE_PAGES = 3;
const FILES_PER_PAGE = 100;

/** 从 GitHub `Link` 响应头提取下一页 URL。 */
export const parseNextLink = (linkHeader) => {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const match = /<([^>]+)>;\s*rel="next"/.exec(part.trim());
    if (match) return match[1];
  }
  return null;
};

/**
 * 判断 PR 的文件列表抓取状态：
 * - GitHub `/files` 返回 422（diff 过大）-> 'overflow'
 * - 达到 300 文件截断或文件列表为空但变更极大 / extra large / clump -> 'overflow' or 'truncated'
 */
export const classifyDiffStatus = ({ pr, files, hitOverflowHttp422, truncatedByCap }) => {
  if (hitOverflowHttp422) return 'overflow';
  const changedFiles = pr.changed_files ?? files.length;
  const labels = (pr.labels ?? []).map((label) => String(label.name ?? label).toLowerCase());
  const text = `${pr.title ?? ''}\n${pr.body ?? ''}`.toLowerCase();
  const totalLines = (pr.additions ?? 0) + (pr.deletions ?? 0);

  if (
    changedFiles === 0 &&
    files.length === 0 &&
    (labels.includes('extra large') ||
      totalLines >= 5000 ||
      /\b(?:clump|clumping|thin wrapper|import-graph)\b/.test(text))
  ) {
    return 'overflow';
  }
  if (
    truncatedByCap ||
    (changedFiles > files.length && files.length >= MAX_FILE_PAGES * FILES_PER_PAGE)
  ) {
    return 'truncated';
  }
  return 'ok';
};

export const normalizePullRequest = ({ pr, files, diffStatus }) => ({
  number: pr.number,
  title: pr.title ?? '',
  body: pr.body ?? '',
  author: pr.user?.login ?? 'unknown',
  url: pr.html_url ?? '',
  createdAt: pr.created_at ?? '',
  updatedAt: pr.updated_at ?? '',
  draft: Boolean(pr.draft),
  labels: (pr.labels ?? []).map((label) => label.name).filter(Boolean),
  baseRef: pr.base?.ref ?? 'main',
  baseSha: pr.base?.sha ?? '',
  headRef: pr.head?.ref ?? '',
  mergeableState: pr.mergeable_state ?? undefined,
  changedFilesCount: pr.changed_files ?? files.length,
  additions: pr.additions ?? files.reduce((sum, file) => sum + (file.additions ?? 0), 0),
  deletions: pr.deletions ?? files.reduce((sum, file) => sum + (file.deletions ?? 0), 0),
  diffStatus,
  files: files.map((file) => ({
    filename: file.filename,
    status: file.status ?? 'modified',
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
    changes: file.changes ?? (file.additions ?? 0) + (file.deletions ?? 0),
  })),
});

export const normalizeIssue = (issue) => ({
  number: issue.number,
  title: issue.title ?? '',
  body: issue.body ?? '',
  author: issue.user?.login ?? 'unknown',
  url: issue.html_url ?? '',
  createdAt: issue.created_at ?? '',
  updatedAt: issue.updated_at ?? '',
  labels: (issue.labels ?? []).map((label) => label.name).filter(Boolean),
  comments: issue.comments ?? 0,
});

export const filterTrackedIssues = (rawIssues, pinnedIssues = []) => {
  const seen = new Set();
  const combined = [];
  for (const issue of [...pinnedIssues, ...rawIssues]) {
    if (!issue || issue.pull_request || seen.has(issue.number)) continue;
    seen.add(issue.number);
    combined.push(normalizeIssue(issue));
  }
  return combined.sort((a, b) => a.number - b.number);
};

const buildHeaders = (token) => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'rh-triage-board-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const fetchJson = async (fetchImpl, url, headers) => {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) {
    const error = new Error(`GitHub API ${response.status} on ${url}`);
    error.status = response.status;
    throw error;
  }
  return {
    data: await response.json(),
    nextUrl: parseNextLink(response.headers.get('link')),
  };
};

const fetchPaginated = async (fetchImpl, initialUrl, headers, maxItems) => {
  const items = [];
  let nextUrl = initialUrl;
  while (nextUrl && items.length < maxItems) {
    const page = await fetchJson(fetchImpl, nextUrl, headers);
    if (!Array.isArray(page.data)) break;
    items.push(...page.data);
    nextUrl = page.nextUrl;
  }
  return items.slice(0, maxItems);
};

const fetchPullFilesAndStatus = async (fetchImpl, repo, prSummary, headers) => {
  const files = [];
  let nextUrl = `https://api.github.com/repos/${repo}/pulls/${prSummary.number}/files?per_page=${FILES_PER_PAGE}`;
  let pageCount = 0;
  let hitOverflowHttp422 = false;
  let truncatedByCap = false;

  while (nextUrl && pageCount < MAX_FILE_PAGES) {
    const response = await fetchImpl(nextUrl, { headers });
    if (response.status === 422) {
      hitOverflowHttp422 = true;
      break;
    }
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status} fetching files for PR #${prSummary.number}`);
    }
    const pageFiles = await response.json();
    if (Array.isArray(pageFiles)) files.push(...pageFiles);
    pageCount += 1;
    const candidateNext = parseNextLink(response.headers.get('link'));
    if (candidateNext && pageCount >= MAX_FILE_PAGES) {
      truncatedByCap = true;
    }
    nextUrl = candidateNext;
  }

  let detailedPr = prSummary;
  const labels = (prSummary.labels ?? []).map((label) => String(label.name ?? '').toLowerCase());
  const needsDetail =
    hitOverflowHttp422 ||
    truncatedByCap ||
    files.length === 0 ||
    labels.includes('extra large') ||
    labels.includes('large') ||
    labels.includes('merge queue') ||
    labels.includes('batch queue');

  if (needsDetail) {
    try {
      const detail = await fetchJson(
        fetchImpl,
        `https://api.github.com/repos/${repo}/pulls/${prSummary.number}`,
        headers,
      );
      detailedPr = detail.data;
    } catch {
      // 保留列表摘要字段，避免单条详情失败阻断全量同步。
    }
  }

  const diffStatus = classifyDiffStatus({
    pr: detailedPr,
    files,
    hitOverflowHttp422,
    truncatedByCap,
  });

  return normalizePullRequest({ pr: detailedPr, files, diffStatus });
};

const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let cursor = 0;
  const runWorker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, runWorker));
  return results;
};

/** 拉取上游仓库最新状态并组装标准 BoardSnapshot。 */
export const collectBoardSnapshot = async ({
  fetchImpl = fetch,
  repo = DEFAULT_REPO,
  token = process.env.GITHUB_TOKEN ?? '',
  maxOpenPrs = Number(process.env.RH_MAX_OPEN_PRS ?? 120),
  fileConcurrency = Number(process.env.RH_FILE_CONCURRENCY ?? 6),
  now = new Date().toISOString(),
} = {}) => {
  const headers = buildHeaders(token);

  const mainCommitRes = await fetchJson(
    fetchImpl,
    `https://api.github.com/repos/${repo}/commits/main`,
    headers,
  );
  const mainCommit = mainCommitRes.data;
  const sha = mainCommit.sha ?? '';

  const openPrSummaries = await fetchPaginated(
    fetchImpl,
    `https://api.github.com/repos/${repo}/pulls?state=open&sort=updated&direction=desc&per_page=100`,
    headers,
    maxOpenPrs,
  );

  const pullRequests = await mapWithConcurrency(openPrSummaries, fileConcurrency, (prSummary) =>
    fetchPullFilesAndStatus(fetchImpl, repo, prSummary, headers),
  );

  const rawIssues = await fetchPaginated(
    fetchImpl,
    `https://api.github.com/repos/${repo}/issues?state=open&sort=updated&direction=desc&per_page=100`,
    headers,
    100,
  );

  const pinnedIssues = [];
  if (!rawIssues.some((item) => item.number === 229)) {
    try {
      const issue229 = await fetchJson(
        fetchImpl,
        `https://api.github.com/repos/${repo}/issues/229`,
        headers,
      );
      if (issue229.data?.state === 'open') pinnedIssues.push(issue229.data);
    } catch {
      // #229 已关闭或不可见时忽略。
    }
  }

  return {
    schemaVersion: 1,
    repo,
    generatedAt: now,
    source: 'github',
    mainBranch: {
      sha,
      shortSha: sha.slice(0, 7),
      message: String(mainCommit.commit?.message ?? '').split('\n')[0],
      committedAt: mainCommit.commit?.committer?.date ?? now,
      url: mainCommit.html_url ?? `https://github.com/${repo}/commit/${sha}`,
    },
    pullRequests,
    issues: filterTrackedIssues(rawIssues, pinnedIssues),
  };
};

const main = async () => {
  const repo = process.env.RH_REPO || DEFAULT_REPO;
  const outputPath = resolve(process.env.RH_OUTPUT_PATH || DEFAULT_OUTPUT);
  const snapshot = await collectBoardSnapshot({ repo });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(
    `[fetch-board] ${repo}: ${snapshot.pullRequests.length} open PRs, ${snapshot.issues.length} open issues -> ${outputPath}`,
  );
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error('[fetch-board] FAILED:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

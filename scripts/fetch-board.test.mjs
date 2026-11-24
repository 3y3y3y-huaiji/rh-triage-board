// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  classifyDiffStatus,
  collectBoardSnapshot,
  filterTrackedIssues,
  normalizeIssue,
  normalizePullRequest,
  parseNextLink,
} from './fetch-board.mjs';

const jsonResponse = (data, { status = 200, link = '' } = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(link ? { Link: link } : {}),
    },
  });

describe('fetch-board', () => {
  it('正确解析 GitHub Link 分页头并过滤 PR 型 Issue', () => {
    expect(
      parseNextLink(
        '<https://api.github.com/items?page=2>; rel="next", <https://api.github.com/items?page=5>; rel="last"',
      ),
    ).toBe('https://api.github.com/items?page=2');
    expect(parseNextLink('')).toBeNull();

    const filtered = filterTrackedIssues(
      [
        { number: 995, title: 'PR masquerading as issue', pull_request: {} },
        {
          number: 410,
          title: 'Cleanup docs',
          labels: [{ name: 'good first issue' }],
          user: { login: 'alice' },
        },
      ],
      [{ number: 229, title: 'Tech debt', labels: [], user: { login: 'thorimur' } }],
    );
    expect(filtered.map((item) => item.number)).toEqual([229, 410]);
  });

  it('准确识别 HTTP 422、300 文件截断与 changed_files === 0 的溢出 PR', () => {
    expect(
      classifyDiffStatus({
        pr: {
          changed_files: 0,
          additions: 10000,
          deletions: 40000,
          labels: [{ name: 'extra large' }],
          title: 'clump',
        },
        files: [],
        hitOverflowHttp422: false,
        truncatedByCap: false,
      }),
    ).toBe('overflow');

    expect(
      classifyDiffStatus({
        pr: { changed_files: 1200, title: 'huge' },
        files: [],
        hitOverflowHttp422: true,
        truncatedByCap: false,
      }),
    ).toBe('overflow');

    expect(
      classifyDiffStatus({
        pr: { changed_files: 450, title: 'many files' },
        files: Array(300).fill({ filename: 'a.lean' }),
        hitOverflowHttp422: false,
        truncatedByCap: true,
      }),
    ).toBe('truncated');
  });

  it('透传上游 official labels、draft 状态与 roadmap Issue 标签', () => {
    const pr = normalizePullRequest({
      pr: {
        number: 1238,
        title: 'feat: streamline proof maintenance',
        body: '',
        user: { login: 'jack' },
        html_url: 'https://github.com/leanprover-community/riemann-hypothesis/pull/1238',
        labels: [{ name: 'building' }, { name: 'inbox' }, { name: 'roadmap' }],
        draft: true,
        changed_files: 2,
        additions: 10,
        deletions: 4,
      },
      files: [],
      diffStatus: 'ok',
    });
    expect(pr.labels).toEqual(['building', 'inbox', 'roadmap']);
    expect(pr.draft).toBe(true);

    const issue = normalizeIssue({
      number: 77,
      title: 'Roadmap: tidy the proof workflow',
      labels: [{ name: 'roadmap' }],
      user: { login: 'maintainer' },
      comments: 4,
    });
    expect(issue.labels).toEqual(['roadmap']);
    expect(issue.comments).toBe(4);
  });

  it('端到端 mock GitHub API 收集 main、溢出 PR、常规 PR 与 #229', async () => {
    const routes = new Map([
      [
        'https://api.github.com/repos/leanprover-community/riemann-hypothesis/commits/main',
        () =>
          jsonResponse({
            sha: 'c9883164b0b3d762cee21f889d03d59a53b3ba3b',
            html_url: 'https://github.com/leanprover-community/riemann-hypothesis/commit/c988316',
            commit: {
              message: 'chore: clean headers\n\nbody',
              committer: { date: '2026-11-24T09:12:19Z' },
            },
          }),
      ],
      [
        'https://api.github.com/repos/leanprover-community/riemann-hypothesis/pulls?state=open&sort=updated&direction=desc&per_page=100',
        () =>
          jsonResponse([
            {
              number: 324,
              title: 'perf: delete thin wrappers and clump modules',
              body: 'mega clump',
              user: { login: 'kim-em' },
              html_url: 'https://github.com/leanprover-community/riemann-hypothesis/pull/324',
              created_at: '2026-11-24T08:00:00Z',
              updated_at: '2026-11-24T09:00:00Z',
              draft: false,
              labels: [{ name: 'extra large' }, { name: 'merge queue' }],
              base: { ref: 'main', sha: 'c9883164b0b3d762cee21f889d03d59a53b3ba3b' },
              head: { ref: 'perf/clump' },
            },
            {
              number: 995,
              title: 'perf: replace nlinarith',
              body: '',
              user: { login: 'drake' },
              html_url: 'https://github.com/leanprover-community/riemann-hypothesis/pull/995',
              created_at: '2026-11-24T09:10:00Z',
              updated_at: '2026-11-24T09:15:00Z',
              draft: false,
              labels: [{ name: 'extra small' }, { name: 'building' }, { name: 'inbox' }],
              base: { ref: 'main', sha: 'c9883164b0b3d762cee21f889d03d59a53b3ba3b' },
              head: { ref: 'perf/nlinarith' },
            },
          ]),
      ],
      [
        'https://api.github.com/repos/leanprover-community/riemann-hypothesis/pulls/324/files?per_page=100',
        () => jsonResponse({ message: 'Diff too large' }, { status: 422 }),
      ],
      [
        'https://api.github.com/repos/leanprover-community/riemann-hypothesis/pulls/324',
        () =>
          jsonResponse({
            number: 324,
            title: 'perf: delete thin wrappers and clump modules',
            body: 'mega clump',
            user: { login: 'kim-em' },
            html_url: 'https://github.com/leanprover-community/riemann-hypothesis/pull/324',
            created_at: '2026-11-24T08:00:00Z',
            updated_at: '2026-11-24T09:00:00Z',
            draft: false,
            labels: [{ name: 'extra large' }, { name: 'merge queue' }],
            base: { ref: 'main', sha: 'c9883164b0b3d762cee21f889d03d59a53b3ba3b' },
            head: { ref: 'perf/clump' },
            changed_files: 0,
            additions: 12000,
            deletions: 48000,
            mergeable_state: 'clean',
          }),
      ],
      [
        'https://api.github.com/repos/leanprover-community/riemann-hypothesis/pulls/995/files?per_page=100',
        () =>
          jsonResponse([
            {
              filename: 'src/Formalism/MainSup.lean',
              status: 'modified',
              additions: 10,
              deletions: 8,
              changes: 18,
            },
          ]),
      ],
      [
        'https://api.github.com/repos/leanprover-community/riemann-hypothesis/issues?state=open&sort=updated&direction=desc&per_page=100',
        () =>
          jsonResponse([
            { number: 995, title: 'PR', pull_request: {} },
            {
              number: 401,
              title: 'Clean docs',
              body: 'docs',
              user: { login: 'bob' },
              labels: [{ name: 'good first issue' }, { name: 'roadmap' }],
              state: 'open',
            },
          ]),
      ],
      [
        'https://api.github.com/repos/leanprover-community/riemann-hypothesis/issues/229',
        () =>
          jsonResponse({
            number: 229,
            title: 'Identify and track technical debt',
            body: 'track debt',
            user: { login: 'thorimur' },
            labels: [],
            state: 'open',
            comments: 2,
          }),
      ],
    ]);

    const snapshot = await collectBoardSnapshot({
      fetchImpl: async (url) => {
        const handler = routes.get(String(url));
        if (!handler) throw new Error(`Unexpected URL: ${url}`);
        return handler();
      },
      token: 'test-token',
      now: '2026-11-24T10:00:00Z',
    });

    expect(snapshot.source).toBe('github');
    expect(snapshot.mainBranch.shortSha).toBe('c988316');
    expect(snapshot.pullRequests).toHaveLength(2);
    expect(snapshot.pullRequests[0]?.diffStatus).toBe('overflow');
    expect(snapshot.pullRequests[1]?.files[0]?.filename).toBe('src/Formalism/MainSup.lean');
    expect(snapshot.pullRequests[1]?.labels).toEqual(['extra small', 'building', 'inbox']);
    expect(snapshot.issues.map((issue) => issue.number)).toEqual([229, 401]);
    expect(snapshot.issues.find((issue) => issue.number === 401)?.labels).toContain('roadmap');
  });
});

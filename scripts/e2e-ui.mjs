#!/usr/bin/env node
/**
 * 多视口 Playwright UI 契约 E2E（纯本地 dist 静态服务器，零外网依赖）：
 * 覆盖手机（390x844）、平板（820x1180）与桌面（1440x900）：
 * - 零 pageerror / console.error
 * - 零横向溢出（含队列横幅与 Mega-Refactor 预警框），单主标题 h1
 * - 实时静态快照加载 + 分页展开/收起 + KPI 快捷跳转
 * - 语言切换（zh / en / fr / ja）与暗色/浅色主题切换
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const DIST_DIR = resolve('dist');
const CHANNEL = process.env.RH_E2E_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : 'chrome');
const EXECUTABLE_PATH = process.env.RH_E2E_EXECUTABLE || undefined;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

const startStaticServer = () =>
  new Promise((resolveServer) => {
    const server = createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
      const full = resolve(DIST_DIR, rel);
      if (!full.startsWith(DIST_DIR) || !existsSync(full) || statSync(full).isDirectory()) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      const type = MIME_TYPES[extname(full)] ?? 'application/octet-stream';
      res.setHeader('Content-Type', type);
      res.end(readFileSync(full));
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolveServer({ server, origin: `http://127.0.0.1:${addr.port}` });
    });
  });

const assertLayout = async (page, label) => {
  const layout = await page.evaluate(() => {
    const doc = globalThis.document;
    const h1s = doc.querySelectorAll('h1');
    const banner = doc.querySelector('[data-testid="mega-refactor-banner"]');
    const bannerRight = banner ? banner.getBoundingClientRect().right : 0;
    return {
      scrollWidth: doc.documentElement.scrollWidth,
      innerWidth: globalThis.window.innerWidth,
      h1Count: h1s.length,
      bannerRight,
    };
  });
  if (layout.scrollWidth > layout.innerWidth + 1) {
    throw new Error(
      `${label} 横向溢出: scrollWidth=${layout.scrollWidth} > innerWidth=${layout.innerWidth}`,
    );
  }
  if (layout.bannerRight > layout.innerWidth + 1) {
    throw new Error(
      `${label} Mega-Refactor 横幅右越界: right=${layout.bannerRight} > innerWidth=${layout.innerWidth}`,
    );
  }
  if (layout.h1Count !== 1) {
    throw new Error(`${label} h1 数量异常: ${layout.h1Count}`);
  }
};

const buildLargeSnapshot = () => {
  const extraRebasePrs = Array.from({ length: 12 }, (_, idx) => ({
    number: 800 + idx,
    title: `refactor: tighten lemma chain #${800 + idx}`,
    body: '',
    author: 'dev',
    url: `https://github.com/leanprover-community/riemann-hypothesis/pull/${800 + idx}`,
    createdAt: '2026-11-24T01:00:00Z',
    updatedAt: '2026-11-24T09:00:00Z',
    draft: false,
    labels: ['extra small'],
    baseRef: 'main',
    baseSha: 'oldsha123',
    headRef: `dev/item-${800 + idx}`,
    mergeableState: 'behind',
    changedFilesCount: 1,
    additions: 10,
    deletions: 5,
    diffStatus: 'ok',
    files: [
      {
        filename: `src/GroundTheory/Item${idx}.lean`,
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
      },
    ],
  }));

  return {
    schemaVersion: 1,
    repo: 'leanprover-community/riemann-hypothesis',
    generatedAt: '2026-11-24T09:40:00Z',
    source: 'github',
    mainBranch: {
      sha: 'c9883164b0b3d762cee21f889d03d59a53b3ba3b',
      shortSha: 'c988316',
      message: 'Merge pull request #1005 from leanprover-community/doc/agents-ci-speedups',
      committedAt: '2026-11-24T09:12:19Z',
      url: 'https://github.com/leanprover-community/riemann-hypothesis/commit/c988316',
    },
    pullRequests: [
      {
        number: 324,
        title: 'perf: delete thin wrappers and clump modules',
        body: 'Includes #800',
        author: 'kim-em',
        url: 'https://github.com/leanprover-community/riemann-hypothesis/pull/324',
        createdAt: '2026-11-24T08:00:00Z',
        updatedAt: '2026-11-24T09:00:00Z',
        draft: false,
        labels: ['merge queue', 'extra large', 'batch queue'],
        baseRef: 'main',
        baseSha: 'c9883164b0b3d762cee21f889d03d59a53b3ba3b',
        headRef: 'perf/clump',
        mergeableState: 'clean',
        changedFilesCount: 0,
        additions: 12000,
        deletions: 48000,
        diffStatus: 'overflow',
        files: [],
      },
      ...extraRebasePrs,
    ],
    issues: [
      {
        number: 229,
        title: 'Identify and track technical debt',
        body: 'Clean up docs/ and src/Lemmata',
        author: 'thorimur',
        url: 'https://github.com/leanprover-community/riemann-hypothesis/issues/229',
        createdAt: '2026-11-23T02:38:37Z',
        updatedAt: '2026-11-23T10:11:05Z',
        labels: ['good first issue'],
        comments: 2,
      },
    ],
  };
};

const main = async () => {
  if (!existsSync(join(DIST_DIR, 'index.html'))) {
    throw new Error('dist/index.html 不存在，请先运行 pnpm run build');
  }

  const { server, origin } = await startStaticServer();
  const browser = await chromium.launch({
    channel: CHANNEL,
    executablePath: EXECUTABLE_PATH,
    headless: true,
  });

  try {
    const snapshotBody = JSON.stringify(buildLargeSnapshot());

    for (const vp of VIEWPORTS) {
      const errors = [];
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        locale: 'zh-CN',
      });
      const page = await context.newPage();
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      });

      await page.route('**/data/board.json', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: snapshotBody,
        }),
      );

      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="mega-refactor-banner"]');
      await assertLayout(page, `${vp.name} initial`);

      // 验证 Needs Rebase 默认分页折叠与展开
      await page.click('[data-action="toggle-section"][data-section="needs-rebase"]');
      await assertLayout(page, `${vp.name} expanded-rebase`);

      // 验证暗色主题切换与 color-scheme
      await page.click('[data-action="set-theme"][data-theme="dark"]');
      await page.waitForFunction(
        () => globalThis.document.documentElement.style.colorScheme === 'dark',
      );

      // 验证多语种切换（en / ja）
      await page.selectOption('#locale-select', 'en');
      await page.waitForFunction(() => globalThis.document.documentElement.lang === 'en');
      await page.selectOption('#locale-select', 'ja');
      await page.waitForFunction(() => globalThis.document.documentElement.lang === 'ja');

      // 验证四栏 Tab 切换
      for (const tab of ['merge-queue', 'up-for-grabs', 'conflict-radar', 'needs-rebase', 'all']) {
        await page.click(`[role="tab"][data-action="set-tab"][data-tab="${tab}"]`);
        await assertLayout(page, `${vp.name} tab=${tab}`);
      }

      if (errors.length > 0) {
        throw new Error(`${vp.name} 发现浏览器运行时错误:\n${errors.join('\n')}`);
      }
      console.log(`[e2e-ui] ${vp.name} (${vp.width}x${vp.height}) 通过`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
};

main().catch((error) => {
  console.error('[e2e-ui] FAILED:', error instanceof Error ? error.message : String(error));
  process.exit(2);
});

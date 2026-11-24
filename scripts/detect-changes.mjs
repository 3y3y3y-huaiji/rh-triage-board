#!/usr/bin/env node
/**
 * CI 变更分类器：按改动路径裁剪流水线任务，同时写到 $GITHUB_OUTPUT。
 *
 * - 纯文档改动：仅触发 `docs-check`，跳过 install / lint / test / build / e2e。
 * - 纯工作流改动：触发 `docs-check` + `actionlint`。
 * - 纯单测改动：触发 `static` + `test`，跳过 `build` / `e2e` / `deployable`。
 * - 源码 / 脚本 / 构建配置改动：触发 `static` + `test` + `build` + `e2e` + `deployable`。
 * - 依赖清单改动：额外触发 `audit`。
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TEST_FILE = /\.test\.(?:ts|mjs)$/;
const DEPS_FILES = new Set(['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']);

const isDocFile = (file) =>
  file.startsWith('docs/') ||
  /^[^/]+\.md$/i.test(file) ||
  file.startsWith('LICENSE') ||
  /(?:^|\/)AGENTS\.md$/i.test(file);

const BUILD_CONFIG_FILES = new Set([
  ...DEPS_FILES,
  'index.html',
  'vite.config.ts',
  'vitest.config.ts',
  'tsconfig.json',
  'eslint.config.js',
  'wrangler.toml',
  '.prettierrc',
  '.prettierignore',
]);

const SHIPPED_SCRIPTS = new Set([
  'scripts/fetch-board.mjs',
  'scripts/verify-build.mjs',
  'scripts/e2e-ui.mjs',
]);

const isDeployableFile = (file) => {
  if (isDocFile(file) || file.startsWith('.github/') || TEST_FILE.test(file)) return false;
  if (file === 'scripts/e2e-ui.mjs' || file === 'scripts/smoke.mjs') return false;
  return (
    file.startsWith('src/') ||
    file.startsWith('public/') ||
    BUILD_CONFIG_FILES.has(file) ||
    file === 'scripts/fetch-board.mjs' ||
    file === 'scripts/verify-build.mjs'
  );
};

/**
 * 纯函数：将改动文件路径列表归类为 CI 各阶段开关。
 * @param {string[]} paths
 */
export const classifyFiles = (paths) => {
  const files = [...new Set(paths.map((p) => p.replace(/\\/g, '/')).filter(Boolean))];
  const hasFiles = files.length > 0;
  const docsOnly = hasFiles && files.every(isDocFile);
  const workflows = files.some((file) => file.startsWith('.github/'));
  const workflowsOnly =
    workflows && files.every((file) => isDocFile(file) || file.startsWith('.github/'));

  let build = false;
  let e2e = false;
  let deps = false;
  let deployable = false;

  for (const file of files) {
    if (isDocFile(file) || file.startsWith('.github/')) continue;
    if (DEPS_FILES.has(file)) deps = true;
    if (isDeployableFile(file)) deployable = true;
    if (TEST_FILE.test(file)) continue;

    if (
      file.startsWith('src/') ||
      file.startsWith('public/') ||
      BUILD_CONFIG_FILES.has(file) ||
      SHIPPED_SCRIPTS.has(file)
    ) {
      build = true;
      e2e = true;
    }
  }

  // 空文件列表（例如手动重跑）按全量处理，宁多不漏。
  if (!hasFiles) {
    build = true;
    e2e = true;
    deps = true;
    deployable = true;
  }

  return {
    docsOnly,
    workflows,
    workflowsOnly,
    static: !docsOnly && !workflowsOnly,
    test: !docsOnly && !workflowsOnly,
    build,
    e2e,
    deps,
    deployable,
  };
};

const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const parseArgs = (argv) => {
  const args = { base: '' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--base') args.base = argv[index + 1] ?? '';
  }
  return args;
};

const main = () => {
  const { base: rawBase } = parseArgs(process.argv.slice(2));
  const head = 'HEAD';
  let base = 'HEAD^';
  if (rawBase && !/^0+$/.test(rawBase)) {
    try {
      base = git(['merge-base', rawBase, head]) || rawBase;
    } catch {
      base = rawBase;
    }
  }

  let files = [];
  try {
    files = git(['diff', '--name-only', '--no-renames', base, head]).split('\n').filter(Boolean);
  } catch {
    // 浅克隆或初次提交时回退全量。
  }

  const result = classifyFiles(files);
  const outputs = {
    docs_only: String(result.docsOnly),
    workflows: String(result.workflows),
    workflows_only: String(result.workflowsOnly),
    static: String(result.static),
    test: String(result.test),
    build: String(result.build),
    e2e: String(result.e2e),
    deps: String(result.deps),
    deployable: String(result.deployable),
  };

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `${Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')}\n`,
    );
  }

  console.log(`变更文件 ${files.length} 个（${base.slice(0, 8)}...${head}）：`);
  for (const file of files) console.log(`  ${file}`);
  console.log('\n分类结果：', JSON.stringify(outputs, null, 2));
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}

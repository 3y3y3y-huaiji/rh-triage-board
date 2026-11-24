#!/usr/bin/env node
/**
 * 零依赖线上只读巡检脚本：校验首页 HTML、安全响应头、/llms.txt 与 /data/board.json 契约。
 */
const DEFAULT_ORIGIN = 'https://rh-triage-board.pages.dev';
const origin = (process.env.RH_BOARD_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');

const assertOk = async (url, label) => {
  const response = await fetch(url, { headers: { Accept: '*/*' } });
  if (!response.ok) {
    throw new Error(`${label} (${url}) 返回 HTTP ${response.status}`);
  }
  return response;
};

const main = async () => {
  const homeRes = await assertOk(`${origin}/`, '首页');
  const csp = homeRes.headers.get('content-security-policy');
  const nosniff = homeRes.headers.get('x-content-type-options');
  if (!csp || !csp.includes("connect-src 'self'")) {
    throw new Error(`首页缺少预期 Content-Security-Policy 头: ${csp ?? '(null)'}`);
  }
  if (nosniff !== 'nosniff') {
    throw new Error(`首页缺少 X-Content-Type-Options: nosniff (实际: ${nosniff ?? '(null)'})`);
  }
  const html = await homeRes.text();
  if (!html.includes('id="app"')) {
    throw new Error('首页 HTML 缺少挂载节点 id="app"');
  }

  await assertOk(`${origin}/favicon.svg`, '站点图标');
  await assertOk(`${origin}/robots.txt`, 'Robots 声明');

  const llmsRes = await assertOk(`${origin}/llms.txt`, 'Agent 说明文件');
  const llmsText = await llmsRes.text();
  if (!llmsText.includes('/data/board.json')) {
    throw new Error('/llms.txt 未包含 /data/board.json 指引');
  }

  await assertOk(`${origin}/skills/lean-proof-golfing.md`, 'Lean Proof Golfing Skill');
  await assertOk(`${origin}/skills/mathlib-pr-conventions.md`, 'Mathlib PR Conventions Skill');

  const dataRes = await assertOk(`${origin}/data/board.json`, '静态数据快照');
  const data = await dataRes.json();
  if (
    data?.schemaVersion !== 1 ||
    typeof data?.mainBranch?.sha !== 'string' ||
    !Array.isArray(data?.pullRequests) ||
    !Array.isArray(data?.issues)
  ) {
    throw new Error('/data/board.json schema 校验失败');
  }

  console.log(
    `[smoke] ${origin} 巡检通过 (main=${data.mainBranch.shortSha}, PRs=${data.pullRequests.length}, issues=${data.issues.length})`,
  );
};

main().catch((error) => {
  console.error('[smoke] FAILED:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});

/**
 * 独立于 Cloudflare Pages 纯静态站点的 Cloudflare Cron Trigger Worker：
 * 定期通过 GitHub REST workflow_dispatch 准点触发 sync-board.yml 与 smoke.yml，
 * 绕开 GitHub Actions 原生 schedule 在高峰期的延迟或丢单问题。
 */
const REPO = '3y3y3y-huaiji/rh-triage-board';

const dispatchWorkflow = async (token, workflowFile, inputs) => {
  const url = `https://api.github.com/repos/${REPO}/actions/workflows/${workflowFile}/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'rh-triage-cron',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main', inputs }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Dispatch ${workflowFile} failed (${response.status}): ${detail}`);
  }
};

export default {
  async scheduled(controller, env) {
    const token = env.GITHUB_DISPATCH_TOKEN;
    if (!token) {
      console.error(
        '[rh-triage-cron] Missing secret GITHUB_DISPATCH_TOKEN; configure a fine-grained PAT with Actions write access.',
      );
      throw new Error('Missing secret GITHUB_DISPATCH_TOKEN');
    }

    const scheduledAt = new Date(controller.scheduledTime);
    await dispatchWorkflow(token, 'sync-board.yml', { source: 'cloudflare-cron' });

    if (scheduledAt.getUTCHours() % 6 === 0 && scheduledAt.getUTCMinutes() < 15) {
      await dispatchWorkflow(token, 'smoke.yml', {});
    }
  },
};

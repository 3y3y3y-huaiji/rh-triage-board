/**
 * 独立于 Cloudflare Pages 纯静态站点的 Cloudflare Cron Trigger Worker：
 * 使用专用单仓 GitHub App（零个人 PAT、最小权限 Actions: write）签发短期 JWT，
 * 换取临时 Installation Token 后经 GitHub REST workflow_dispatch 准点触发同步与巡检。
 */
const OWNER = '3y3y3y-huaiji';
const REPO = 'rh-triage-board';
const FULL_REPO = `${OWNER}/${REPO}`;
const API_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'rh-triage-cron',
};

const PKCS8_PREFIX_BYTES = [
  0x02, 0x01, 0x00, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
  0x05, 0x00,
];

const textEncoder = new TextEncoder();

const base64UrlEncode = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const encodeDerLength = (length) => {
  if (length < 0x80) return [length];
  const lenBytes = [];
  let remaining = length;
  while (remaining > 0) {
    lenBytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return [0x80 | lenBytes.length, ...lenBytes];
};

const wrapPkcs1InPkcs8 = (pkcs1Der) => {
  const octLen = encodeDerLength(pkcs1Der.length);
  const innerLength = PKCS8_PREFIX_BYTES.length + 1 + octLen.length + pkcs1Der.length;
  const seqLen = encodeDerLength(innerLength);
  const out = new Uint8Array(1 + seqLen.length + innerLength);
  let offset = 0;

  out[offset] = 0x30;
  offset += 1;
  out.set(seqLen, offset);
  offset += seqLen.length;
  out.set(PKCS8_PREFIX_BYTES, offset);
  offset += PKCS8_PREFIX_BYTES.length;
  out[offset] = 0x04;
  offset += 1;
  out.set(octLen, offset);
  offset += octLen.length;
  out.set(pkcs1Der, offset);

  return out;
};

/** 将 GitHub App 的 PKCS#1 或 PKCS#8 PEM 私钥标准化为 Web Crypto 可导入的 PKCS#8 DER。 */
export const pemToPkcs8Der = (rawPem) => {
  const normalized = String(rawPem).replace(/\\n/g, '\n').trim();
  const isPkcs1 = normalized.includes('BEGIN RSA PRIVATE KEY');
  const base64Body = normalized.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  if (!base64Body) {
    throw new Error('Invalid GitHub App private key PEM: empty body');
  }
  const binary = atob(base64Body);
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    der[i] = binary.charCodeAt(i);
  }
  return isPkcs1 ? wrapPkcs1InPkcs8(der) : der;
};

/** 使用 Web Crypto（RSASSA-PKCS1-v1_5 + SHA-256）为 GitHub App 签发短期 JWT。 */
export const createAppJwt = async (appId, rawPem, nowSeconds = Math.floor(Date.now() / 1000)) => {
  const iss = String(appId).trim();
  if (!iss) {
    throw new Error('Missing GitHub App ID');
  }
  const pkcs8Der = pemToPkcs8Der(rawPem);
  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const header = base64UrlEncode(textEncoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64UrlEncode(
    textEncoder.encode(
      JSON.stringify({
        iat: nowSeconds - 60,
        exp: nowSeconds + 300,
        iss,
      }),
    ),
  );
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    signingKey,
    textEncoder.encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
};

/** 用 App JWT 向 GitHub 换取仅限目标仓库 Actions 权限的短期 Installation Token。 */
export const requestInstallationToken = async (appJwt, installationId) => {
  const id = String(installationId).trim();
  if (!id) {
    throw new Error('Missing GitHub App Installation ID');
  }
  const url = `https://api.github.com/app/installations/${encodeURIComponent(id)}/access_tokens`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...API_HEADERS,
      Authorization: `Bearer ${appJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repositories: [REPO],
      permissions: { actions: 'write' },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Request installation token failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  if (!data?.token) {
    throw new Error('GitHub installation token response missing token');
  }
  return data.token;
};

/** 使用 Installation Token 触发指定 workflow 的 workflow_dispatch 事件。 */
export const dispatchWorkflow = async (token, workflowFile, inputs) => {
  const url = `https://api.github.com/repos/${FULL_REPO}/actions/workflows/${workflowFile}/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...API_HEADERS,
      Authorization: `Bearer ${token}`,
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
    const appId = env.GITHUB_APP_ID;
    const installationId = env.GITHUB_INSTALLATION_ID;
    const privateKey = env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !installationId || !privateKey) {
      const missing = [
        !appId && 'GITHUB_APP_ID',
        !installationId && 'GITHUB_INSTALLATION_ID',
        !privateKey && 'GITHUB_APP_PRIVATE_KEY',
      ]
        .filter(Boolean)
        .join(', ');
      console.error(`[rh-triage-cron] Missing required GitHub App secret(s): ${missing}`);
      throw new Error(`Missing required GitHub App secret(s): ${missing}`);
    }

    const appJwt = await createAppJwt(appId, privateKey);
    const token = await requestInstallationToken(appJwt, installationId);

    const scheduledAt = new Date(controller.scheduledTime);
    await dispatchWorkflow(token, 'sync-board.yml', { source: 'cloudflare-cron' });

    if (scheduledAt.getUTCHours() % 6 === 0 && scheduledAt.getUTCMinutes() < 15) {
      await dispatchWorkflow(token, 'smoke.yml', {});
    }
  },
};

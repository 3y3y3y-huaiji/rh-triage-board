// @vitest-environment node
import { generateKeyPairSync, webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import worker, { createAppJwt, pemToPkcs8Der } from '../infra/cron-worker/index.mjs';

const base64UrlDecode = (segment) => {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
};

describe('infra/cron-worker GitHub App auth', () => {
  it('支持 PKCS#1（GitHub 原生）与转义单行 PKCS#8 PEM 签发并通过 RS256 验签', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pkcs1Pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    const pkcs8SingleLine = privateKey
      .export({ type: 'pkcs8', format: 'pem' })
      .toString()
      .replace(/\n/g, '\\n');
    const spkiDer = publicKey.export({ type: 'spki', format: 'der' });

    const verifyKey = await webcrypto.subtle.importKey(
      'spki',
      spkiDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    for (const pem of [pkcs1Pem, pkcs8SingleLine]) {
      const jwt = await createAppJwt('123456', pem, 1_700_000_000);
      const parts = jwt.split('.');
      expect(parts).toHaveLength(3);

      const payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8'));
      expect(payload).toEqual({
        iat: 1_699_999_940,
        exp: 1_700_000_300,
        iss: '123456',
      });

      const valid = await webcrypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        verifyKey,
        base64UrlDecode(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
      );
      expect(valid).toBe(true);
    }

    expect(() =>
      pemToPkcs8Der('-----BEGIN RSA PRIVATE KEY-----\n-----END RSA PRIVATE KEY-----'),
    ).toThrow();
  });

  it('scheduled 换取最小权限安装令牌并在整 6 小时窗口联动触发 smoke.yml', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pkcs1Pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();

    const calls = [];
    const fetchMock = vi.fn(async (url, init) => {
      calls.push({ url, method: init.method, body: JSON.parse(init.body) });
      if (url.endsWith('/access_tokens')) {
        return new Response(JSON.stringify({ token: 'ghs_test_token' }), { status: 201 });
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const env = {
      GITHUB_APP_ID: '98765',
      GITHUB_INSTALLATION_ID: '43210',
      GITHUB_APP_PRIVATE_KEY: pkcs1Pem,
    };

    await worker.scheduled({ scheduledTime: Date.UTC(2026, 10, 24, 6, 0, 0) }, env);
    expect(calls).toEqual([
      {
        url: 'https://api.github.com/app/installations/43210/access_tokens',
        method: 'POST',
        body: { repositories: ['rh-triage-board'], permissions: { actions: 'write' } },
      },
      {
        url: 'https://api.github.com/repos/3y3y3y-huaiji/rh-triage-board/actions/workflows/sync-board.yml/dispatches',
        method: 'POST',
        body: { ref: 'main', inputs: { source: 'cloudflare-cron' } },
      },
      {
        url: 'https://api.github.com/repos/3y3y3y-huaiji/rh-triage-board/actions/workflows/smoke.yml/dispatches',
        method: 'POST',
        body: { ref: 'main', inputs: {} },
      },
    ]);

    calls.length = 0;
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 10, 24, 6, 15, 0) }, env);
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toContain('sync-board.yml/dispatches');

    vi.unstubAllGlobals();
  });

  it('缺少 GitHub App 机密配置时明确抛错而不静默跳过', async () => {
    await expect(
      worker.scheduled({ scheduledTime: Date.UTC(2026, 10, 24, 6, 0, 0) }, {}),
    ).rejects.toThrow('GITHUB_APP_ID');
  });
});

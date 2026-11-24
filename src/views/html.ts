const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** 对用户输入或上游 GitHub 标题/正文做严格 HTML 转义，防止 XSS。 */
export const escapeHtml = (input: string): string =>
  input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);

/** 安全链接属性，限制仅允许 http(s) 或同源相对路径。 */
export const safeHref = (url: string): string => {
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/')) {
    return escapeHtml(trimmed);
  }
  return '#';
};

export const formatTimestamp = (iso: string): string => {
  if (!iso) return '—';
  return iso.replace('T', ' ').replace(/\.\d+Z$/, 'Z');
};

export const formatNumber = (value: number): string =>
  Number.isFinite(value) ? value.toLocaleString('en-US') : '0';

export const formatCompactNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${Math.round(value / 1_000)}k`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatNumber(value);
};

export const formatRebaseTarget = (baseRef: string, baseSha: string): string =>
  baseRef === 'main' ? `main (${baseSha})` : baseRef;

export const matchesSearch = (
  query: string,
  fields: Array<string | number | undefined>,
): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) =>
    String(field ?? '')
      .toLowerCase()
      .includes(needle),
  );
};

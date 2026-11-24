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

import { de } from './de';
import { en } from './en';
import { fr } from './fr';
import { ja } from './ja';
import type { Locale, Messages } from './types';
import { zh } from './zh';

export const DEFAULT_LOCALE: Locale = 'en';

export const SUPPORTED_LOCALES: readonly { code: Locale; label: string }[] = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' },
  { code: 'ja', label: '日本語' },
];

export const DICTS: Record<Locale, Messages> = {
  zh,
  en,
  fr,
  de,
  ja,
};

export const normalizeLocale = (value: string | null | undefined): Locale => {
  if (!value) return 'en';
  const lower = value.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('ja')) return 'ja';
  return 'en';
};

/**
 * 解析首次加载语言：仅信任本地已保存偏好，缺失或非法值一律回退英文。
 * 不再跟随 `navigator.language`，避免国际维护者首次访问被浏览器语言带入中文界面。
 */
export const resolveInitialLocale = (stored: string | null | undefined): Locale =>
  stored ? normalizeLocale(stored) : DEFAULT_LOCALE;

export const getMessages = (locale: Locale): Messages => DICTS[locale];

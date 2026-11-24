import { de } from './de';
import { en } from './en';
import { fr } from './fr';
import { ja } from './ja';
import type { Locale, Messages } from './types';
import { zh } from './zh';

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
  if (!value) return 'zh';
  const lower = value.toLowerCase();
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('ja')) return 'ja';
  return 'zh';
};

export const getMessages = (locale: Locale): Messages => DICTS[locale];

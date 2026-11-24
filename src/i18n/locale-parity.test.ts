import { describe, expect, it } from 'vitest';
import { DICTS, SUPPORTED_LOCALES, normalizeLocale } from './index';

const flattenLeafStrings = (obj: unknown, prefix = ''): Array<[string, unknown]> => {
  if (typeof obj !== 'object' || obj === null) {
    return [[prefix, obj]];
  }
  return Object.entries(obj).flatMap(([key, value]) =>
    flattenLeafStrings(value, prefix ? `${prefix}.${key}` : key),
  );
};

describe('i18n locale parity', () => {
  it('所有支持语种（zh/en/fr/de/ja）与主字典键结构 100% 对称且无空字符串', () => {
    const baseEntries = flattenLeafStrings(DICTS.en);
    const baseKeys = baseEntries.map(([key]) => key).sort();

    expect(SUPPORTED_LOCALES.map((item) => item.code)).toEqual(['zh', 'en', 'fr', 'de', 'ja']);

    for (const { code } of SUPPORTED_LOCALES) {
      const entries = flattenLeafStrings(DICTS[code]);
      const keys = entries.map(([key]) => key).sort();
      expect(keys, `locale=${code} keys`).toEqual(baseKeys);
      for (const [key, value] of entries) {
        expect(typeof value, `${code}.${key}`).toBe('string');
        expect(String(value).trim().length, `${code}.${key} empty`).toBeGreaterThan(0);
      }
    }
  });

  it('normalizeLocale 正确识别多语种代码并默认回退到 en', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh');
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBe('fr');
    expect(normalizeLocale('de')).toBe('de');
    expect(normalizeLocale('ja-JP')).toBe('ja');
    expect(normalizeLocale('sv-SE')).toBe('en');
    expect(normalizeLocale('ru')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
  });
});

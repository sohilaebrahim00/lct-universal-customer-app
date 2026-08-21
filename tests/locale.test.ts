import { describe, expect, it } from '@jest/globals';
import { isLocaleRTL, localeFromTag } from '../src/lib/locale';

describe('localeFromTag', () => {
  it('resolves region-qualified Arabic tags to "ar"', () => {
    expect(localeFromTag('ar-SA')).toBe('ar');
    expect(localeFromTag('ar-EG')).toBe('ar');
    expect(localeFromTag('ar')).toBe('ar');
  });

  it('resolves region-qualified English tags to "en"', () => {
    expect(localeFromTag('en-US')).toBe('en');
    expect(localeFromTag('en-GB')).toBe('en');
  });

  it('falls back to "en" for an unsupported language', () => {
    expect(localeFromTag('fr-FR')).toBe('en');
    expect(localeFromTag('de')).toBe('en');
  });
});

describe('isLocaleRTL', () => {
  it('flags Arabic as RTL and English as LTR', () => {
    expect(isLocaleRTL('ar')).toBe(true);
    expect(isLocaleRTL('en')).toBe(false);
  });
});

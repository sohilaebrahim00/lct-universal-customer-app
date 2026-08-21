import { describe, expect, it } from '@jest/globals';
import { formatCurrencyLocalized, formatDateShortLocalized, formatDateTimeLocalized } from '../src/lib/localeFormat';

describe('formatCurrencyLocalized', () => {
  it('formats USD with Western digits in English', () => {
    expect(formatCurrencyLocalized(65, 'usd', 'en')).toBe('$65.00');
  });

  it('formats USD with Western digits in Arabic (never Arabic-Indic digits)', () => {
    const result = formatCurrencyLocalized(65, 'usd', 'ar');
    expect(result).toMatch(/65\.00/);
    expect(result).not.toMatch(/[٠-٩]/); // no Arabic-Indic digit characters
  });
});

describe('formatDateShortLocalized', () => {
  it('formats a valid ISO date in English', () => {
    expect(formatDateShortLocalized('2026-06-15T14:00:00Z', 'en')).toMatch(/Jun 1[45], 2026/);
  });

  it('formats a valid ISO date with Arabic month names', () => {
    const result = formatDateShortLocalized('2026-06-15T14:00:00Z', 'ar');
    expect(result).toContain('يونيو');
  });

  it('falls back to the raw string for an invalid date in either locale', () => {
    expect(formatDateShortLocalized('not-a-date', 'en')).toBe('not-a-date');
    expect(formatDateShortLocalized('not-a-date', 'ar')).toBe('not-a-date');
  });
});

describe('formatDateTimeLocalized', () => {
  it('keeps Western digits for the time portion in Arabic', () => {
    const result = formatDateTimeLocalized('2026-06-15T14:00:00Z', 'ar');
    expect(result).not.toMatch(/[٠-٩]/);
  });
});

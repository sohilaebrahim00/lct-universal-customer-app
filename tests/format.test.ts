import { describe, expect, it } from '@jest/globals';
import { formatCurrency, formatDateShort, formatServiceType } from '../src/lib/format';

describe('formatCurrency', () => {
  it('formats a numeric USD amount', () => {
    expect(formatCurrency(65)).toBe('$65.00');
  });

  it('formats a string amount (as returned by the backend\'s numeric columns)', () => {
    expect(formatCurrency('123.5')).toBe('$123.50');
  });

  it('respects a non-USD currency code', () => {
    expect(formatCurrency(10, 'eur')).toContain('10.00');
  });
});

describe('formatServiceType', () => {
  it('title-cases snake_case service types', () => {
    expect(formatServiceType('point_to_point')).toBe('Point To Point');
    expect(formatServiceType('airport')).toBe('Airport');
  });
});

describe('formatDateShort', () => {
  it('formats a valid ISO date', () => {
    expect(formatDateShort('2026-06-15T14:00:00Z')).toMatch(/Jun 1[45], 2026/);
  });

  it('falls back to the raw string for an invalid date', () => {
    expect(formatDateShort('not-a-date')).toBe('not-a-date');
  });
});

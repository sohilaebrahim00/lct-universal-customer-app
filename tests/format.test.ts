import { describe, expect, it } from '@jest/globals';
import { formatCurrency, formatDateShort, formatServiceType, formatPickupWhen } from '../src/lib/format';

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

describe('formatPickupWhen', () => {
  // Built from local-time parts, not a Z string: the whole point of the helper
  // is which *local* day the pickup falls on.
  const at = (y: number, m: number, d: number, h: number, min: number) =>
    new Date(y, m - 1, d, h, min).toISOString();

  const now = new Date(2026, 7, 22, 9, 0); // 22 Aug 2026, 09:00 local

  it('names today', () => {
    expect(formatPickupWhen(at(2026, 8, 22, 13, 15), now)).toBe('Today, 1:15 PM');
  });

  it('names tomorrow', () => {
    expect(formatPickupWhen(at(2026, 8, 23, 6, 5), now)).toBe('Tomorrow, 6:05 AM');
  });

  it('keeps the weekday and date further out, where the date is the information', () => {
    expect(formatPickupWhen(at(2026, 8, 29, 13, 15), now)).toBe('Sat, Aug 29, 1:15 PM');
  });

  it('treats a pickup earlier today as today, not as a past date', () => {
    expect(formatPickupWhen(at(2026, 8, 22, 7, 30), now)).toBe('Today, 7:30 AM');
  });

  it('falls back to the raw string for an invalid date', () => {
    expect(formatPickupWhen('not-a-date', now)).toBe('not-a-date');
  });
});

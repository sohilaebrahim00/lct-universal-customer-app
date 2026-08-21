import { format, isValid, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { Locale } from './locale';

const DATE_FNS_LOCALES: Record<Locale, typeof enUS> = { en: enUS, ar };

/**
 * `-u-nu-latn` forces Western (0-9) digits — `Intl.NumberFormat('ar-SA', ...)` otherwise
 * renders Arabic-Indic digits (٠١٢…) by default in full-ICU environments, which doesn't
 * match this app's numeral convention (see `src/i18n/rtl.ts`, rule 4).
 */
const INTL_LOCALES: Record<Locale, string> = { en: 'en-US', ar: 'ar-SA-u-nu-latn' };

export function formatCurrencyLocalized(amount: number | string, currency: string, locale: Locale): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat(INTL_LOCALES[locale], { style: 'currency', currency: currency.toUpperCase() }).format(
    value,
  );
}

export function formatDateTimeLocalized(iso: string, locale: Locale): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, 'EEE, MMM d, h:mm a', { locale: DATE_FNS_LOCALES[locale] });
}

export function formatDateShortLocalized(iso: string, locale: Locale): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, 'MMM d, yyyy', { locale: DATE_FNS_LOCALES[locale] });
}

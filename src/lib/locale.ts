import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const RTL_LOCALES: ReadonlySet<Locale> = new Set(['ar']);

export function isLocaleRTL(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

function isSupportedLocale(value: string | null): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value ?? '');
}

const KEY = 'lct-universal:locale';

/** Explicit user/device choice, persisted across app restarts. Null means "never set". */
export async function getStoredLocale(): Promise<Locale | null> {
  const value = await AsyncStorage.getItem(KEY);
  return isSupportedLocale(value) ? value : null;
}

export async function setStoredLocale(locale: Locale): Promise<void> {
  await AsyncStorage.setItem(KEY, locale);
}

/** Pure parsing step, split out from `detectDeviceLocale` below so it's unit-testable without mocking `Intl`. */
export function localeFromTag(tag: string): Locale {
  const primary = tag.split('-')[0]?.toLowerCase() ?? null;
  return isSupportedLocale(primary) ? primary : 'en';
}

/**
 * Reads the OS/device locale via `Intl` — already used elsewhere in this app (see
 * `formatCurrency` in `format.ts`), so detecting the initial language needs no new
 * native dependency (unlike `expo-localization`, which would need a dev-client rebuild
 * to work outside Expo Go). Falls back to English for any locale this app doesn't ship
 * translations for yet.
 */
export function detectDeviceLocale(): Locale {
  try {
    return localeFromTag(Intl.DateTimeFormat().resolvedOptions().locale); // e.g. "ar-SA", "en-US"
  } catch {
    return 'en';
  }
}

import { Alert, I18nManager } from 'react-native';
import { create } from 'zustand';
import { en } from './locales/en';
import { ar } from './locales/ar';
import { detectDeviceLocale, getStoredLocale, isLocaleRTL, setStoredLocale, type Locale } from '../lib/locale';

export type { Locale } from '../lib/locale';
export type Strings = typeof en;

const STRINGS: Record<Locale, Strings> = { en, ar };

interface LocaleState {
  locale: Locale;
  hydrated: boolean;
  initialize: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
}

function applyNativeDirection(locale: Locale) {
  const rtl = isLocaleRTL(locale);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

function promptRestart(strings: Strings) {
  Alert.alert(strings.language.restartTitle, strings.language.restartMessage, [
    { text: strings.language.restartConfirm, style: 'default' },
  ]);
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: 'en',
  hydrated: false,

  initialize: async () => {
    const stored = await getStoredLocale();
    const locale = stored ?? detectDeviceLocale();

    if (!stored) {
      // First launch: persist the detected language and align the native RTL flag for the
      // *next* cold start. I18nManager reads its persisted flag before JS runs, so this
      // session still renders in RN's own default direction (LTR) regardless — expected,
      // not a bug. The very next launch, or an explicit language switch below, is what
      // actually applies the new layout direction.
      await setStoredLocale(locale);
      if (isLocaleRTL(locale) !== I18nManager.isRTL) applyNativeDirection(locale);
    }

    set({ locale, hydrated: true });
  },

  setLocale: async (locale) => {
    if (locale === get().locale) return;

    await setStoredLocale(locale);
    set({ locale });

    if (isLocaleRTL(locale) !== I18nManager.isRTL) {
      applyNativeDirection(locale);
      promptRestart(STRINGS[locale]);
    }
  },
}));

/** Current locale's full string table. Updates immediately on a language switch, even before restart. */
export function useTranslation(): Strings {
  return useLocaleStore((s) => STRINGS[s.locale]);
}

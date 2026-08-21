import { I18nManager } from 'react-native';

/**
 * RTL-safe layout conventions for this codebase:
 *
 * 1. Prefer flexbox (`flexDirection: 'row'`, `gap`, `justifyContent`) over explicit
 *    `left`/`right`/`marginLeft`/`marginRight`. Row layouts and symmetric horizontal
 *    padding already mirror correctly under RTL with zero extra code — most of this
 *    app's existing UI kit (Button, Card, EmptyState, TextField) is RTL-safe for free
 *    because it's already built this way.
 * 2. When a one-sided horizontal value is unavoidable, use `marginStart`/`marginEnd`,
 *    `paddingStart`/`paddingEnd`, or `start`/`end` (React Native's logical properties)
 *    instead of the `Left`/`Right` variants — these flip automatically with
 *    `I18nManager.isRTL`; the `Left`/`Right` variants never do.
 * 3. Directional icons (back/forward chevrons, arrows) must not just sit there —
 *    use `directionalIcon()` below so "back" always points toward the reading
 *    direction's start, matching platform convention on both iOS and Android.
 * 4. Numerals, currency, and dates are NOT mirrored — Arabic UI still reads Western
 *    (0-9) numerals left-to-right inside RTL text, matching real-world MSA app
 *    convention. Never wrap a formatted number/currency/date string in a
 *    `writingDirection: 'rtl'` override. See `src/lib/localeFormat.ts`, which already
 *    forces Western digits for Arabic currency formatting for this reason.
 *
 * IMPORTANT: `I18nManager.isRTL` reflects the layout direction of the *currently
 * running* native session — it only changes after `forceRTL()` + an app restart (see
 * `src/i18n/index.ts`). It intentionally does NOT track the locale a user just picked
 * in Settings before restarting; text (`useTranslation()`) updates immediately on a
 * language switch, but layout mirroring does not until restart. Read `isRTL()` for
 * "what direction is the screen actually laid out in right now", not "what language
 * did the user pick."
 */
export function isRTL(): boolean {
  return I18nManager.isRTL;
}

/** Picks between an LTR and an RTL variant of the same directional icon/value. */
export function directionalIcon<T>(ltrIcon: T, rtlIcon: T): T {
  return isRTL() ? rtlIcon : ltrIcon;
}

/**
 * English-only user-facing copy, centralised so a screen never hardcodes a
 * string a reviewer would have to hunt for in JSX.
 *
 * This used to be one half of an English/Arabic pair (`src/i18n/locales/en.ts`)
 * behind a locale-switching store. Arabic was reversed as a business decision
 * on 2026-08-30 — see DESIGN_CHANGELOG.md — and everything that only existed to
 * support a second locale (the store, translation lookup, RTL direction
 * flipping, the restart prompt, device-locale detection, plural-category
 * handling) came out with it. This file is what's left: a single place for
 * copy, not a translation system with one language in it.
 */
export const copy = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    retry: 'Try Again',
    loading: 'Loading…',
  },
  settings: {
    title: 'Settings',
    pushTitle: 'Push Notifications',
    pushSubtitle: 'Booking updates, driver status, and trip reminders',
    signedInAs: 'Signed in as',
    appVersion: 'App Version',
  },
};

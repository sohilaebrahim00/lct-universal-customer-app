/**
 * Deliberately typed as plain `string` fields (no `as const`) — `ar.ts` is constrained to
 * this same shape via `typeof en`, and only needs matching *keys*, not matching literal
 * values, since every key legitimately holds a different string per locale.
 */
export const en = {
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
    pushSubtitle: 'Booking updates, chauffeur status, and trip reminders',
    signedInAs: 'Signed in as',
    appVersion: 'App Version',
  },
  language: {
    title: 'Language',
    subtitle: 'Choose the language and reading direction for the app',
    english: 'English',
    arabic: 'العربية',
    restartTitle: 'Restart Required',
    restartMessage: 'Close and reopen LCT Universal to apply the new language and layout direction.',
    restartConfirm: 'Got It',
  },
};

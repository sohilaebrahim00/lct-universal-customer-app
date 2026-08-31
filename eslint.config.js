// https://docs.expo.dev/guides/linting/
const expoConfig = require('eslint-config-expo/flat');

/**
 * `src/theme/tokens.ts` is a COMPATIBILITY SHIM, not a design system.
 *
 * It exists so ~30 screens could take the palette lift in one commit while the
 * real three-layer system (`ref` → `sys` → component) was built. Every file
 * still importing from it is a file that has not been migrated, and the shim's
 * flat `colors.gold` says nothing about whether gold is an accent, a border or
 * a fill — which is the entire point of the semantic layer replacing it.
 *
 * ── Why the rule is scoped rather than global ───────────────────────────────
 * Turning it on everywhere today would fail the build for ~30 files. A rule
 * that has to be disabled to commit is a rule that gets deleted, so it is
 * enabled per directory AS EACH IS MIGRATED — which makes "these screens are
 * migrated" a claim the linter enforces rather than a claim someone remembers.
 *
 * ── The rule is now INVERTED ────────────────────────────────────────────────
 * It applies to everything, and names the few exceptions instead. That is the
 * right way round once the migration is essentially done: a new file is covered
 * by default rather than by remembering to add it.
 *
 * To remove an exception, give the three-layer system the symbol it is missing
 * (`shadows`) and migrate the file.
 */
const STILL_ON_THE_SHIM = [
  // Empty. Every file is migrated; the shim itself is the only thing left,
  // and it is now deletable — nothing imports it.
];

const MIGRATED_OFF_THE_SHIM = ['app/**/*.tsx', 'src/**/*.{ts,tsx}'];

/**
 * Logical properties, not physical ones — kept as a standing layout default even with
 * Arabic/RTL support reversed (see DESIGN_CHANGELOG.md, 2026-08-30): `marginStart` costs
 * nothing over `marginLeft` today and is the correct default if direction support is ever
 * revisited, so the discipline stays rather than being unwound along with the feature.
 *
 * ── The exception, and why it is a comment rather than a config option ──────
 * A zero-size box with borders is a TRIANGLE, and its left/right borders describe
 * geometry rather than reading direction. `TrackingMap`'s marker nose is the one
 * instance; it carries an inline disable with the reasoning next to it, which is more
 * useful than a path exclusion nobody can see from the file.
 */
const RTL_PHYSICAL_PROPERTIES = [
  'marginLeft', 'marginRight',
  'paddingLeft', 'paddingRight',
  'borderLeftWidth', 'borderRightWidth',
  'borderLeftColor', 'borderRightColor',
];

const RTL_SYNTAX_RULES = RTL_PHYSICAL_PROPERTIES.map((name) => ({
  selector: `Property[key.name='${name}']`,
  message:
    `Use the logical property instead of ${name} — it flips under RTL and ${name} does not. ` +
    'marginLeft→marginStart, marginRight→marginEnd, paddingLeft→paddingStart, ' +
    'paddingRight→paddingEnd, borderLeftWidth→borderStartWidth, borderRightWidth→borderEndWidth, ' +
    'borderLeftColor→borderStartColor, borderRightColor→borderEndColor. ' +
    'If it is a SHAPE rather than a layout (a border triangle), disable this rule inline and say why.',
}));

/**
 * USER-FACING COPY LIVES IN `src/copy/strings.ts` — enforced screen by screen.
 *
 * This used to be "no hardcoded text on a screen already converted to i18n" —
 * translation-completeness, checking a Latin-or-Arabic-letter JSX text node
 * against a two-locale string table. Arabic was reversed on 2026-08-30 (see
 * DESIGN_CHANGELOG.md); the rule is kept and renamed for what it now does,
 * which has nothing to do with translation: a screen with its copy scattered
 * through JSX is harder to review, harder to keep consistent, and harder to
 * change in one place than a screen that reads its strings from one file.
 *
 * ── Why an allowlist, not a global rule ─────────────────────────────────────
 * Only `app/(app)/account/settings.tsx` reads from `src/copy/strings.ts` so
 * far. Turning this on globally today would fail the build for every other
 * screen, which still render hardcoded English on purpose — this is the same
 * shape as the shim rule before it was inverted: add a screen here as it
 * migrates to the copy file, don't try to convert everything at once.
 *
 * ── What this catches, and what it does not ─────────────────────────────────
 * A JSX text child containing a Latin letter — `<AppText>Settings</AppText>`.
 * It does NOT catch a hardcoded string passed as a prop (`label="Settings"`) —
 * that needs matching against a curated list of "these props render as visible
 * text" per component, which this app's component set has no single source of
 * truth for yet. A real gap, not a rule considered and rejected — recorded so
 * partial coverage is never mistaken for full coverage.
 */
const COPY_FILE_SCREENS = ['app/(app)/account/settings.tsx'];

const HARDCODED_COPY_RULE = {
  selector: 'JSXText[value=/[A-Za-z]/]',
  message:
    'Hardcoded user-facing text on a screen already reading from the copy file. Add a key to ' +
    'src/copy/strings.ts and render it from there instead. See eslint.config.js.',
};

/**
 * OBSERVED RATE CARDS ARE NOT PUBLISHABLE FACTS.
 *
 * `src/config/observedRateCards.ts` holds five metered rate cards read off a
 * phone recording of the client's operations panel. Unconfirmed, not published
 * policy, and materially different from what the marketing site says.
 *
 * ── Why this is a rule and not a comment ────────────────────────────────────
 * The file already carries a very loud comment. So did the two things that
 * shipped anyway:
 *
 *   `From $65.00` on the fleet browser, against a published $95 — a component
 *   of a fare printed as a price.
 *
 *   A live-priced Sprinter and Coach, two classes the website marks "Request
 *   Quote" — the app committing to a price the business does not give.
 *
 * Both were guarded, and both guards were gated on `isDemoMode`, which is inert
 * in exactly the build where it matters. Twice is a pattern. The third time is
 * made structurally impossible instead of remembered.
 *
 * ── Scoped the same way round as the shim rule ──────────────────────────────
 * It applies to everything and names its exceptions, so a NEW screen is covered
 * by default rather than by somebody adding it to a list. The only exception is
 * the demo and preview layer, which is what the panel data may legitimately
 * dress up — `src/dev/` never renders to a paying customer.
 *
 * The lint rule does not see `require()` or dynamic `import()`.
 * `tests/observedRateCardContainment.test.ts` covers those, and asserts the
 * importer set against the whole source tree.
 *
 * If you are here because you need one of these numbers on a real screen: that
 * means the business has confirmed them, and confirmed values go in a file that
 * names them as the source — the way `publishedFleet.ts` names
 * `lctuniversal.com` and the date. Not by widening this rule.
 */
const MAY_IMPORT_OBSERVED_RATE_CARDS = [
  // The demo and preview layer. Nothing here reaches a paying customer.
  'src/dev/**',
  // The file itself, and the shape it implements.
  'src/config/observedRateCards.ts',
];

/**
 * ── A TRAP IN FLAT CONFIG, WORTH KNOWING ABOUT ─────────────────────────────
 * When two config objects both match a file and both set the SAME rule name,
 * the later one REPLACES the earlier one. Rule options are not merged.
 *
 * The first version of the observed-rate-card rule below was written as its own
 * block above the shim block. It parsed, it looked right, and it did NOTHING —
 * the shim block matched the same files, set `no-restricted-imports` again, and
 * silently wiped the patterns. A probe file importing the fenced data linted
 * clean.
 *
 * That is the same failure mode as the `isDemoMode` guards this rule exists to
 * replace: a safeguard that is present, readable, and inert. So the patterns
 * are named once here, and any block that sets `no-restricted-imports` spreads
 * in every pattern that should apply to its files.
 */
const SHIM_IMPORT_PATTERN = {
  group: ['**/theme/tokens', '**/theme/tokens.ts'],
  message:
    'This file is migrated off the token shim. Import from `src/theme` instead — `theme.content.accent`, not `colors.gold`. The shim is compatibility only; see eslint.config.js.',
};

const OBSERVED_RATE_CARD_IMPORT_PATTERN = {
  group: ['**/config/observedRateCards', '**/config/observedRateCards.ts', '**/observedRateCards'],
  message:
    'observedRateCards.ts is UNCONFIRMED data read off a recording of the client operations panel. It must never reach a customer-facing screen as a published figure. Use publishedFleet.ts for what the business publishes, or get the values confirmed and give them their own sourced file. See eslint.config.js and tests/observedRateCardContainment.test.ts.',
};

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'dist-live/*', 'node_modules/*', '.expo/*'],
  },
  {
    // Everything the app ships. `src/dev/` is excluded: the role preview is a
    // preview of two internal tools that don't need reviewing for copy hygiene.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/dev/**', ...COPY_FILE_SCREENS],
    rules: {
      'no-restricted-syntax': ['error', ...RTL_SYNTAX_RULES],
    },
  },
  {
    /*
     * Screens already reading from `src/copy/strings.ts`: BOTH restrictions.
     * The block above excludes these files via `ignores` rather than relying
     * on "last block wins" (see "A TRAP IN FLAT CONFIG" below) — a second
     * block matching the same files and also setting `no-restricted-syntax`
     * would otherwise replace, not merge with, the first one's selectors,
     * silently dropping RTL enforcement on exactly the screens most worth
     * having it on.
     */
    files: COPY_FILE_SCREENS,
    rules: {
      'no-restricted-syntax': ['error', ...RTL_SYNTAX_RULES, HARDCODED_COPY_RULE],
    },
  },
  {
    /*
     * Everything the app ships. Carries BOTH restrictions, because this is the
     * last block to set `no-restricted-imports` for these files and last one
     * wins — see the note at the top.
     */
    files: MIGRATED_OFF_THE_SHIM,
    ignores: [
      ...STILL_ON_THE_SHIM,
      // The shim itself.
      'src/theme/tokens.ts',
      // The demo layer and the fenced file, handled by the block below.
      ...MAY_IMPORT_OBSERVED_RATE_CARDS,
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: [SHIM_IMPORT_PATTERN, OBSERVED_RATE_CARD_IMPORT_PATTERN] }],
    },
  },
  {
    /*
     * The demo and preview layer. Still off the token shim, but ALLOWED to
     * import the observed rate cards — dressing a preview in the client's own
     * class names is what that data is for. Nothing here reaches a paying
     * customer.
     */
    files: ['src/dev/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [SHIM_IMPORT_PATTERN] }],
    },
  },
];

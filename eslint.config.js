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
 * RTL: logical properties, not physical ones.
 *
 * `marginLeft` does not flip when the layout direction does; `marginStart`
 * does. The app declares Arabic support (`src/i18n/`), and a conversion that
 * is done once and not enforced is a conversion that lasts until the next
 * screen is written.
 *
 * ── The exception, and why it is a comment rather than a config option ──────
 * A zero-size box with borders is a TRIANGLE, and its left/right borders
 * describe geometry rather than reading direction. `TrackingMap`'s marker nose
 * is the one instance; it carries an inline disable with the reasoning next to
 * it, which is more useful than a path exclusion nobody can see from the file.
 */
const RTL_PHYSICAL_PROPERTIES = [
  'marginLeft', 'marginRight',
  'paddingLeft', 'paddingRight',
  'borderLeftWidth', 'borderRightWidth',
  'borderLeftColor', 'borderRightColor',
];

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
    // preview of two internal tools, neither of which is localised.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/dev/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...RTL_PHYSICAL_PROPERTIES.map((name) => ({
          selector: `Property[key.name='${name}']`,
          message:
            `Use the logical property instead of ${name} — it flips under RTL and ${name} does not. ` +
            'marginLeft→marginStart, marginRight→marginEnd, paddingLeft→paddingStart, ' +
            'paddingRight→paddingEnd, borderLeftWidth→borderStartWidth, borderRightWidth→borderEndWidth, ' +
            'borderLeftColor→borderStartColor, borderRightColor→borderEndColor. ' +
            'If it is a SHAPE rather than a layout (a border triangle), disable this rule inline and say why.',
        })),
      ],
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

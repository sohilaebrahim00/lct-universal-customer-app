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
    files: MIGRATED_OFF_THE_SHIM,
    // Everything except the handful that still need a shim-only symbol, and
    // the shim itself.
    ignores: [...STILL_ON_THE_SHIM, 'src/theme/tokens.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/theme/tokens', '**/theme/tokens.ts'],
              message:
                'This file is migrated off the token shim. Import from `src/theme` instead — `theme.content.accent`, not `colors.gold`. The shim is compatibility only; see eslint.config.js.',
            },
          ],
        },
      ],
    },
  },
];

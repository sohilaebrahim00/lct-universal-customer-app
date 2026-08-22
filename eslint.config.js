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
 * **Add the next directory here when you migrate it.** The remaining importers
 * are listed in DESIGN_CHANGELOG.md.
 */
const MIGRATED_OFF_THE_SHIM = [
  'app/(app)/account/**/*.tsx',
  'app/(app)/trips/**/*.tsx',
  'app/(app)/concierge.tsx',
  'app/(app)/corporate-info.tsx',
  'app/(app)/index.tsx',
  'src/components/trip/**/*.{ts,tsx}',
  'src/components/concierge/**/*.{ts,tsx}',
  'src/components/home/**/*.{ts,tsx}',
  'src/components/maps/LocationPickerScreen.tsx',
  'src/components/maps/PlacesSheet.tsx',
  'src/components/maps/NativePickerMap.tsx',
  'src/components/ui/**/*.{ts,tsx}',
  'src/config/**/*.ts',
];

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'dist-live/*', 'node_modules/*', '.expo/*'],
  },
  {
    files: MIGRATED_OFF_THE_SHIM,
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

/**
 * @deprecated COMPATIBILITY LAYER — and now DEAD. Zero files import it.
 *
 * ── This file can be deleted ────────────────────────────────────────────────
 * The migration is finished. `git grep "theme/tokens"` returns one hit, in a
 * comment in `app/_layout.tsx`, and nothing else. An ESLint rule in
 * `eslint.config.js` forbids importing it from anywhere under `app/` or `src/`,
 * so it cannot come back by accident.
 *
 * It is left in place rather than deleted because deletion was not in the scope
 * that finished the migration, and a dead file behind a lint rule is harmless
 * where an unasked-for deletion is not. Delete it whenever you like: remove
 * this file, and the `STILL_ON_THE_SHIM` list and its rule in the ESLint config.
 *
 * The last symbol keeping anything here was `shadows.card`, which had no
 * three-layer equivalent. `app/(app)/book/index.tsx` now takes the shadow half
 * of `elevation.card` directly.
 *
 * New and rebuilt code imports from `src/theme` (which resolves to index.ts):
 *
 *   import { theme, space, radius, iconSize, elevation, resolveType } from '../../theme';
 *
 * ── Why this file still exists ──────────────────────────────────────────────
 * 63 files imported `theme/tokens` before the redesign. Deleting it in the token
 * slice would leave the repo non-compiling until every screen had been rebuilt,
 * which is many slices away, and "never leave the repo non-compiling between
 * slices" outranks tidiness. So this became a re-export shim: every old name
 * still resolves, and now resolves to the NEW value.
 *
 * That is deliberate leverage rather than laziness. Remapping `colors.onyx` from
 * `#0b0907` to the new `#221d16` lifts every card, tile and row group in the
 * app — including the ~30 screens not yet rebuilt — in one edit, which is the
 * whole of audit P0-1's fix landing everywhere at once instead of screen by
 * screen. Likewise `shadows.card` stops being a no-op app-wide.
 *
 * Each slice migrates its screens off this file. It is deleted in slice 14, once
 * nothing imports it. Until then, `git grep "theme/tokens"` is the migration
 * backlog.
 *
 * ── What changed underneath the old names ───────────────────────────────────
 *   onyx / surfaceElevated  #0b0907 / #050403 → #221d16  (cards now read raised)
 *   charcoal                #1c1a18           → #2e2820  (sheets, tab bar)
 *   muted                   #13110f           → #1b1712  (skeleton fill)
 *   mutedForeground         #9e978e           → #b3aa9d  (6.88:1 → 7.38:1 on a card)
 *   border                  0.16 alpha        → 0.14     (paired with the new fill)
 *   radius.lg / radius.xl   8 / 12            → 6 / 14
 *   fonts.display           Cormorant 600     → Cormorant 400
 *   shadows.card            black, invisible  → warm #080501, actually renders
 *
 * `semanticColors` is GONE rather than re-exported. It was the semantic half of
 * the old token file and had zero importers — verified by grep — so it was dead
 * code, and `sys.ts` is its real replacement.
 */

import { alpha, fontFamily, gold, neutral, radius as refRadius, shadowColor, space, state } from './ref';
import { elevation } from './elevation';

export const colors = {
  /* — surfaces — */
  surfaceBlack: neutral[0],
  /** @deprecated → `theme.background.secondary` */
  surfaceElevated: neutral[100],
  /** @deprecated → `theme.background.secondary` */
  onyx: neutral[100],
  /** @deprecated → `theme.background.tertiary` */
  charcoal: neutral[200],
  /** @deprecated → `theme.background.skeleton` */
  muted: neutral.skeleton,
  /** @deprecated → `theme.background.inset` */
  surfaceInset: neutral.inset,
  /** @deprecated → `theme.background.skeleton` */
  surfaceSkeleton: neutral.skeleton,

  /* — content — */
  /** @deprecated → `theme.content.secondary`. Lifted #9e978e → #b3aa9d. */
  mutedForeground: neutral[600],
  /** @deprecated → `theme.content.tertiary` */
  subtleForeground: neutral[500],
  /** @deprecated → `theme.content.primary` */
  offWhite: neutral[900],
  /** @deprecated → `theme.content.onSurface` */
  onSurface: neutral[850],
  /** @deprecated → `theme.content.onAccent` */
  onGold: gold.onAccent,

  /* — accent (unchanged brand hexes) — */
  champagne: gold[300],
  gold: gold[500],
  goldSoft: gold[200],
  goldDeep: gold[700],

  /* — state — */
  /** Strokes and fills only. For destructive TEXT use `destructiveText`. */
  destructive: state.danger,
  /** @deprecated → `theme.content.danger`. #e62b34 measured 4.31:1 on its own tint and failed AA. */
  destructiveText: state.dangerText,
  destructiveSoft: alpha.dangerTint,
  success: state.success,
  successSoft: alpha.successTint,
  warning: state.warning,
  warningSoft: 'rgba(224, 161, 61, 0.16)',
  infoSoft: alpha.goldTintStrong,

  /* — lines — */
  /** Decorative: dividers and card edges. NOT a control boundary — see `borderControl`. */
  border: alpha.hairline,
  borderStrong: alpha.hairlineStrong,
  /** WCAG 1.4.11 control boundary, 3.17:1 over the inset fill. */
  borderControl: alpha.control,
  /** Specular top edge. Deliberately exempt from the 3:1 rule — it is an effect, not a boundary. */
  edgeHighlight: alpha.edge,

  overlay: alpha.scrim,
} as const;

/** @deprecated → `radius` from `src/theme`. `lg` 8→6 and `xl` 12→14 per the redesign. */
export const radius = refRadius;

/** @deprecated → `space` from `src/theme`. `smd` (12) and `mdl` (20) are the two steps that were missing. */
export const spacing = space;

/** @deprecated → `resolveType()` from `src/theme`. */
export const fonts = {
  /** Now Cormorant 400 — the weight the redesign specifies at every serif step. */
  display: fontFamily.serif,
  displayMedium: fontFamily.serifMedium,
  /** Kept for callers not yet migrated; the new scale has no 700 serif step. */
  displayBold: 'CormorantGaramond_700Bold',
  sans: fontFamily.sans,
  sansMedium: fontFamily.sansMedium,
  sansSemiBold: fontFamily.sansSemiBold,
  sansBold: fontFamily.sansBold,
} as const;

/** @deprecated → `resolveType()`. Sizes without their paired line-height are exactly the drift this redesign removes. */
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  xxl: 36,
  display: 44,
} as const;

/** @deprecated → `elevation` from `src/theme`. */
export const shadows = {
  gold: elevation.accent,
  /**
   * Was `shadowColor: '#000000'` on a `#020201` page — no luminance change, so
   * invisible everywhere it was used. Now the warm-black cast, which renders.
   * Shadow properties only: callers spread this onto views that set their own
   * background, so a `backgroundColor` here would silently override theirs.
   */
  card: {
    shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

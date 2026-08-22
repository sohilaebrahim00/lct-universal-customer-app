/**
 * REFERENCE TOKENS — raw values only. No semantics, no roles.
 *
 * Nothing in `app/` or `src/components/` may import this file. Components read
 * `sys` (src/theme/sys.ts) and the scales re-exported from src/theme/index.ts.
 * This layer exists so there is exactly one place a literal colour or number is
 * written down.
 *
 * PROVENANCE — every value marked `ported` is an exact sRGB conversion of the
 * LCT Universal website's own OKLCH token (LCT-Universal-Vite-Ready-v2
 * src/styles.css `:root`), computed from the site's L/C/H numbers rather than
 * eyeballed. Those hexes are byte-identical to what shipped before this
 * redesign and must never be changed here — if the palette moves, it moves on
 * the website first and is re-derived.
 *
 * Values marked `derived` are new. They are interpolations *between* existing
 * ported values (surface steps) or contrast-driven lifts of one (foregrounds),
 * and each carries the measurement that justifies it. No new hue was invented.
 */

/* ------------------------------------------------------------------ *
 * Neutral / surface ramp
 * ------------------------------------------------------------------ */

export const neutral = {
  /** ported — `--surface-black`. The page. Never used as a card fill. */
  0: '#020201',
  /**
   * derived — cards, tiles, row groups, the raised ground for almost everything.
   * Replaces the old `onyx` (#0b0907), which sat 1.04:1 from the page and was
   * the single largest cause of the app reading flat (audit P0-4 / P0-1).
   * Measured: 1.23:1 vs page, +10.6 CIE L*.
   *
   * NOTE — this step is deliberately large and is flagged for hardware
   * verification: on a real OLED panel at low brightness a big first step can
   * stop reading as a lit surface and start reading as a grey rectangle on
   * black. `neutral[75]` below is the pre-measured softer alternative (+6.5 L*)
   * if the device says so. Do not change this on taste; change it on a panel.
   */
  100: '#221d16',
  /** derived — the softer first-step alternative, held ready. +6.5 L*, and still holds `#b3aa9d` at 7.92:1. */
  75: '#191510',
  /** derived — sheets, tab bar, segmented thumb, avatars. 1.42:1 vs page. */
  200: '#2e2820',
  /** derived — recessed: text inputs, segmented track. Reads as a well, not a card. */
  inset: '#100d09',
  /** derived — skeleton bars and disabled card fills. */
  skeleton: '#1b1712',
  /** derived — the shimmer's low and high stops, used only by Skeleton. */
  shimmerLow: '#2a251d',
  shimmerHigh: '#3a3428',
  /** derived — the disabled-button fill. */
  disabledFill: '#4a3d26',
  /** derived — the unselected neighbour value in the time wheel. */
  wheelIdle: '#4a443a',

  /**
   * derived — lifted from the ported `--muted-foreground` (#9e978e), which
   * measured 6.88:1 on a card and so failed AAA exactly where most secondary
   * copy actually lives. Measured: 7.38:1 on neutral[100].
   */
  600: '#b3aa9d',
  /**
   * derived — tertiary: labels, placeholders, meta.
   *
   * DEVIATION FROM THE DESIGN REFERENCE, measured. The reference specifies
   * `#8f887d`, which measures 4.155:1 on `neutral[200]` — the sheet and tab-bar
   * fill it sits on throughout the artboards — and so fails WCAG 1.4.3 AA.
   * Lifted to the smallest value that clears 4.5 on the lightest surface in the
   * ladder: 4.55:1 on neutral[200], 5.22:1 on neutral[100], 6.48:1 on the page.
   *
   * The margin on neutral[200] is thin on purpose — lifting further would
   * collapse the visible gap to `neutral[600]` and lose the secondary/tertiary
   * distinction entirely. tests/contrast.test.ts holds the floor if a sheet fill
   * ever moves.
   */
  500: '#968f83',
  /** derived — quaternary, used only for the "optional" qualifier in field labels. */
  400: '#5f594f',
  /** ported — `--off-white`. Headlines and primary content. */
  900: '#f4f2ea',
  /** derived — body copy inside sheets and over photography, one step under offWhite. */
  850: '#cfc7ba',
} as const;

/* ------------------------------------------------------------------ *
 * Accent — champagne gold
 * ------------------------------------------------------------------ */

export const gold = {
  /** ported — `--gold-soft`. Gradient light stop, emphasis text on gold tints. */
  200: '#e9d6a3',
  /** ported — `--champagne`. Inline links, icon-button glyphs, secondary labels. */
  300: '#dac288',
  /** ported — `--gold`. THE accent. Primary action, active tab, selection, focus. */
  500: '#d9b160',
  /** derived — the pressed-state gradient's middle stop, one step under gold[500]. */
  600: '#c99a45',
  /** ported — `--gold-deep`. Gradient dark stop. */
  700: '#a26e22',
  /**
   * derived — the pressed-state gradient's dark stop.
   *
   * DEVIATION FROM THE DESIGN REFERENCE, measured. The reference specifies
   * `#8f5f1c`, against which the button label (`gold.onAccent`) measures 3.37:1
   * — below AA across the corner of the gradient the label overlaps. This is the
   * darkest gold that holds that label at AA: 4.80:1. The value is derived from
   * the contrast requirement, not picked by eye.
   *
   * The ported `gold[700]` (#a26e22) cannot serve here either — it puts the
   * label at 4.23:1. It stays in use for the confirmation seal, whose content is
   * a stroked check icon governed by 1.4.11's 3:1 rather than 1.4.3's 4.5.
   */
  750: '#ad7726',
  /** derived — the label colour that sits ON the gold gradient. 10.3:1 against gold[500]. */
  onAccent: '#1a1206',
} as const;

/* ------------------------------------------------------------------ *
 * State hues
 * ------------------------------------------------------------------ */

export const state = {
  /** ported — promoted from the "completed" trip-status tone. */
  success: '#7fd48a',
  /** ported — `--destructive`. STROKES AND FILLS ONLY, never text on a tint. */
  danger: '#e62b34',
  /**
   * derived — destructive *text*, because the ported `#e62b34` measured 4.31:1
   * on its own soft fill and failed AA (audit P1-6). Measured: 5.44:1.
   */
  dangerText: '#ff6b6b',
  /** ported — amber, deliberately more orange than gold so warnings never read as the accent. */
  warning: '#e0a13d',
} as const;

/* ------------------------------------------------------------------ *
 * Alpha overlays
 *
 * Champagne alphas over a dark ground. Kept as a named ramp so no component
 * ever writes its own rgba() — 14 one-off rgba() literals existed before this.
 * ------------------------------------------------------------------ */

const CHAMPAGNE_RGB = '233, 214, 163';

export const alpha = {
  /** Specular top-edge catch. Deliberately below the 3:1 boundary rule — see sys.border.edgeHighlight. */
  edge: `rgba(${CHAMPAGNE_RGB}, 0.10)`,
  /** Dividers and card edges. Decorative; exempt from WCAG 1.4.11. */
  hairline: `rgba(${CHAMPAGNE_RGB}, 0.14)`,
  /** Hairline over the lighter sheet fill. */
  hairlineStrong: `rgba(${CHAMPAGNE_RGB}, 0.18)`,
  /** Outlined-button and icon-button strokes. */
  outline: `rgba(${CHAMPAGNE_RGB}, 0.22)`,
  /**
   * CONTROL BOUNDARY. The only champagne alpha that clears WCAG 1.4.11's 3:1
   * against its own fill — see sys.border.control for the measurement and the
   * reason a second token exists at all.
   */
  control: `rgba(${CHAMPAGNE_RGB}, 0.42)`,

  /** Gold tints — info notes, selected chips, status pills. */
  goldTintFaint: 'rgba(217, 177, 96, 0.09)',
  goldTint: 'rgba(217, 177, 96, 0.12)',
  goldTintStrong: 'rgba(217, 177, 96, 0.16)',
  goldBorder: 'rgba(217, 177, 96, 0.22)',
  /** The focus halo and the selected-card halo. */
  goldHalo: 'rgba(217, 177, 96, 0.16)',
  goldHaloSoft: 'rgba(217, 177, 96, 0.10)',
  /** The gold button's cast shadow. */
  goldShadow: 'rgba(217, 177, 96, 0.24)',
  /** The 1px lit edge inside the gold gradient. White, not champagne — it is a specular highlight. */
  goldSpecular: 'rgba(255, 255, 255, 0.35)',

  /** State tints. */
  successTint: 'rgba(127, 212, 138, 0.14)',
  dangerTint: 'rgba(230, 43, 52, 0.12)',
  dangerBorder: 'rgba(255, 107, 107, 0.30)',

  /** Neutral overlays — pressed/hover composited over whatever is beneath. */
  pressedOverlay: 'rgba(255, 255, 255, 0.20)',
  hoverOverlay: 'rgba(255, 255, 255, 0.10)',
  /** Modal scrim and the home-indicator pill. */
  scrim: 'rgba(2, 2, 1, 0.72)',
  handle: 'rgba(244, 242, 234, 0.24)',
} as const;

/**
 * Shadows are WARM-BLACK, never #000000.
 *
 * A pure-black shadow cast onto a #020201 ground produces no luminance change,
 * which is why the previous `shadows.card` was a no-op everywhere it was used
 * (audit P0-1). #080501 is dark enough to read as shadow and warm enough to sit
 * in the same light as the champagne palette.
 */
export const shadowColor = '#080501';

/* ------------------------------------------------------------------ *
 * Dimensional scales
 * ------------------------------------------------------------------ */

/**
 * 4pt scale. `smd` (12) and `mdl` (20) are the two steps that were missing and
 * the direct cause of ~145 raw geometry literals — components kept inventing
 * them. Every other value keeps its previous meaning, so nothing shifts.
 */
export const space = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  mdl: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Screen content margin. Off the 4pt grid on purpose: it is the design's optical gutter. */
export const gutter = 22;

/** The brand's deliberately small, sharp 0.2rem intent, preserved. */
export const radius = {
  sm: 3,
  md: 5,
  lg: 6,
  xl: 14,
  full: 999,
} as const;

/** Five sizes. Thirteen ad-hoc icon sizes collapsed into this. */
export const iconSize = {
  xs: 14,
  sm: 16,
  md: 17,
  lg: 20,
  xl: 24,
} as const;

/** 1.5 reads as decorative, 1.6 as interactive. Nothing else. */
export const iconStroke = {
  decorative: 1.5,
  interactive: 1.6,
} as const;

/**
 * Minimum touch target. Apple 44, Material 48, WCAG 2.5.5 AAA 44.
 * Every pressable sets this via size or hitSlop — no exceptions.
 */
export const minTouchTarget = 44;

/** Named control heights, so no screen writes `height: 52`. */
export const controlHeight = {
  /*
   * 44, not 40.
   *
   * The small button is still the SMALLEST button — it is smaller than `md` in
   * horizontal padding and type — but its height was below the 2.5.5 floor, so
   * every `size="sm"` control in the app was an undersized target. Measured at
   * 80x40 on the Account screen's Edit button, which is a real control a real
   * customer taps.
   *
   * "Small" is a visual weight, not a licence to be hard to hit.
   */
  sm: 44,
  md: 46,
  lg: 52,
  field: 54,
  iconButton: 44,
  /** The circular back control on booking steps and map overlays. */
  backButton: 38,
} as const;

export const fontFamily = {
  /**
   * Cormorant Garamond 400 is what the design specifies at every serif step.
   * The app previously loaded only 500/600/700, so this weight is newly
   * registered in app/_layout.tsx — same already-installed package, no new
   * dependency, one extra font file.
   */
  serif: 'CormorantGaramond_400Regular',
  serifMedium: 'CormorantGaramond_500Medium',
  sans: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansSemiBold: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
} as const;

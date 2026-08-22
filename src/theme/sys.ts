/**
 * SYSTEM TOKENS — semantic roles. This is the only file that knows about themes,
 * and the only colour surface components are allowed to import.
 *
 * Naming follows Uber Base's `{category}{Role}{Modifier}` shape, which is the
 * clearest of the systems studied: read `background.primary`, `content.secondary`,
 * `border.control` and you know what it is for without knowing what it is.
 *
 * THEME PARITY IS ENFORCED BY THE COMPILER. `Sys` is `typeof sys.dark`, and
 * `sys.light` is annotated `Sys`, so a key present in one theme and missing from
 * the other is a type error rather than a runtime `undefined` colour.
 *
 * ── On `sys.light` ──────────────────────────────────────────────────────────
 * The app is dark-only (`userInterfaceStyle: 'dark'` in app.config.ts) and no
 * light theme has been designed or contrast-audited. `sys.light` therefore holds
 * the DARK values verbatim. It exists to hold the key set — nothing more, and it
 * is deliberately not a plausible-looking light palette, because a palette that
 * looks finished but has never been measured is worse than an obvious stub. A
 * real light theme needs its own pass through tests/contrast.test.ts.
 *
 * ── Measurements ────────────────────────────────────────────────────────────
 * Every ratio quoted below is WCAG 2.x, computed from the real values with
 * translucent tokens composited over their actual backdrop first (see
 * src/theme/contrast.ts). They are asserted in tests/contrast.test.ts, so a
 * palette edit that breaks one fails the build rather than review.
 */

import { alpha, gold, neutral, state } from './ref';

const dark = {
  background: {
    /** The page. */
    primary: neutral[0],
    /** Cards, tiles, row groups — the default raised surface. 1.23:1 / +10.6 L* vs page. */
    secondary: neutral[100],
    /** Sheets, tab bar, segmented thumb, avatars. 1.42:1 vs page. */
    tertiary: neutral[200],
    /** Recessed: text inputs, segmented track. Reads as something you type into. */
    inset: neutral.inset,
    /** Skeleton bars, disabled card fills. */
    skeleton: neutral.skeleton,
    /** Modal/sheet scrim. */
    scrim: alpha.scrim,
    /** Flat fill for a disabled primary button — never `opacity` on the whole control. */
    disabled: neutral.disabledFill,

    /** Tinted informational surfaces. */
    accentFaint: alpha.goldTintFaint,
    accentTint: alpha.goldTint,
    accentStrong: alpha.goldTintStrong,
    successTint: alpha.successTint,
    dangerTint: alpha.dangerTint,

    /** Composed interaction overlays, laid over whatever is beneath (Uber Base's approach). */
    pressedOverlay: alpha.pressedOverlay,
    hoverOverlay: alpha.hoverOverlay,
  },

  content: {
    /** Headlines and primary content. 18.5:1 on page, 17.0:1 on a card. */
    primary: neutral[900],
    /** Body and secondary copy. 7.38:1 on background.secondary — AAA where the copy actually lives. */
    secondary: neutral[600],
    /** Labels, placeholders, meta. */
    tertiary: neutral[500],
    /** The "— optional" qualifier inside a field label, and nothing else. */
    quaternary: neutral[400],
    /** Body copy inside sheets and over photography. */
    onSurface: neutral[850],
    /** Sits ON the gold gradient. 10.3:1. */
    onAccent: gold.onAccent,

    /**
     * THE ACCENT, RATIONED.
     *
     * Gold is the primary action, the active tab, selection, focus, and
     * typographic eyebrows. It is NEVER a list icon or a row icon — before this
     * redesign 73 of 107 icon colour assignments were gold (68%), which made gold
     * mean "icon" and left it unable to also mean "action" (audit P0-1).
     * Row and list icons use `content.secondary` / `content.tertiary`.
     */
    accent: gold[500],
    /** Inline links, icon-button glyphs, secondary gold labels. */
    accentSoft: gold[300],
    /** Emphasis text on a gold tint — pill labels, info notes. */
    accentEmphasis: gold[200],

    success: state.success,
    /** Destructive TEXT. `state.danger` is strokes and fills only — it measures 4.31:1 on its own tint. */
    danger: state.dangerText,
    warning: state.warning,

    /** Disabled control labels. 5.15:1 on background.disabled — legible, which was the point of not using opacity. */
    disabled: '#c0b49a',
  },

  border: {
    /**
     * Dividers and card edges. 1.42:1 against its own fill.
     *
     * This is DECORATIVE and exempt from WCAG 1.4.11: a card's edge is not
     * required to identify or operate the card. Do not use it as a control's
     * only boundary — that is what `border.control` is for.
     */
    hairline: alpha.hairline,
    /** The same job over the lighter sheet fill. 1.60:1, decorative, same exemption. */
    hairlineStrong: alpha.hairlineStrong,
    /** Outlined buttons and icon buttons — these also carry a label, so the stroke is not load-bearing. */
    outline: alpha.outline,

    /**
     * CONTROL BOUNDARY — text fields, segmented-control tracks, checkboxes:
     * anything whose edge IS its affordance.
     *
     * WCAG 1.4.11 requires 3:1 for those, and the decorative hairline does not
     * reach it (1.42:1). This token does: champagne at 0.42 alpha composited
     * over `background.inset` measures 3.17:1. Two tokens rather than one,
     * because they are answering two different questions.
     */
    control: alpha.control,

    /** Selection and focus. Gold clears 3:1 on every surface in the ladder (8.6–10.3:1). */
    selected: gold[500],
    /** The 2px focus ring, drawn as an inset sibling — see Button. */
    focus: gold[500],
    /** Focus/selection halo behind the ring. */
    focusHalo: alpha.goldHalo,
    selectedHalo: alpha.goldHaloSoft,

    /** Invalid input. */
    danger: state.dangerText,
    dangerTint: alpha.dangerBorder,
    accent: alpha.goldBorder,

    /**
     * The 1px specular top edge on every raised surface — the single most
     * effective "expensive card on dark" technique.
     *
     * DELIBERATELY EXEMPT from the 3:1 rule at 1.28:1. It is a simulated
     * highlight, not a boundary: it conveys nothing, identifies nothing, and
     * removing it changes no information. Above ~10% it stops reading as a
     * light source and starts reading as a 2013 bevel, which is why it is 10%
     * and not more.
     */
    edgeHighlight: alpha.edge,
  },

  accent: {
    /** The primary gradient, 135°: light → gold → deep. */
    gradient: [gold[200], gold[500], gold[600]] as const,
    /** Pressed swaps one stop darker. Scale alone is not enough feedback. */
    gradientPressed: [gold[300], gold[600], gold[750]] as const,
    /** The confirmation seal runs to the ported deep gold. */
    gradientSeal: [gold[200], gold[500], gold[700]] as const,
    /** The 1px lit edge inside the gradient. */
    specular: alpha.goldSpecular,
    shadow: alpha.goldShadow,
    /**
     * The halo under a route polyline.
     *
     * `react-native-maps` cannot put a shadow on a polyline, so the glow is a
     * second, wider stroke drawn beneath the first. Reuses `goldShadow` — the
     * same 0.24 champagne that haloes a raised surface — so a route reads as
     * lit by the same light as everything else.
     */
    routeGlow: alpha.goldShadow,
  },

  skeleton: {
    base: neutral.skeleton,
    shimmerLow: neutral.shimmerLow,
    shimmerHigh: neutral.shimmerHigh,
  },

  /** Non-colour odds and ends that still belong to the theme. */
  misc: {
    /** The unselected neighbour values in the time wheel. */
    wheelIdle: neutral.wheelIdle,
    /** Sheet grabber and the home-indicator pill. */
    handle: alpha.handle,
  },
} as const;

/** The shape every theme must satisfy. A missing or extra key is a compile error. */
export type Sys = typeof dark;

/** See the note at the top of this file — a parity stub, not a designed light theme. */
const light: Sys = dark;

export const sys = { dark, light } as const;

/** The app is dark-only today; this is the single read point if that ever changes. */
export const theme: Sys = sys.dark;

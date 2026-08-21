/**
 * MOTION TOKENS.
 *
 * No screen writes a raw duration, curve or spring config.
 *
 * ── Reanimated 4 changed the withSpring defaults ────────────────────────────
 * v3 defaulted to mass 1 / damping 10 / stiffness 100; 4.5.1 defaults to
 * mass 4 / damping 120 / stiffness 900 / duration 550 / dampingRatio 1. Any
 * spring relying on defaults therefore behaves differently than its author
 * intended. Checked: this repo has no bare `withSpring(value)` call — every one
 * passes an explicit config — so nothing regressed silently. Every preset below
 * is explicit for the same reason.
 *
 * Also note, if the duration-based API is ever used here: `duration` and
 * `dampingRatio` are mutually exclusive with `stiffness` and `damping`, and the
 * documented duration is PERCEPTUAL — the actual animation runs 1.5× longer, so
 * `duration: 550` is really ~825ms. These presets use the physics pair.
 *
 * ── Spatial vs effects ─────────────────────────────────────────────────────
 * The structural distinction worth keeping: anything that MOVES is underdamped
 * (ζ 0.6–0.9) and overshoots slightly; anything where overshoot would be a bug —
 * opacity, colour, elevation — is critically damped (ζ 1.0) at much higher
 * stiffness. Converted with c = 2ζ√(km) at mass 1.
 */

import { Easing, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/* ── Durations (Material 3, exact) ────────────────────────────────────────── */

export const duration = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,
  long1: 450,
  long2: 500,
  long3: 550,
  long4: 600,
  extraLong1: 700,
  extraLong2: 800,
  extraLong3: 900,
  extraLong4: 1000,
} as const;

/* ── Easing (Material 3, exact cubic-béziers) ─────────────────────────────── */

export const easing = {
  linear: Easing.linear,
  standard: Easing.bezier(0.2, 0, 0, 1),
  standardAccelerate: Easing.bezier(0.3, 0, 1, 1),
  standardDecelerate: Easing.bezier(0, 0, 0, 1),
  emphasized: Easing.bezier(0.2, 0, 0, 1),
  emphasizedAccelerate: Easing.bezier(0.3, 0, 0.8, 0.15),
  emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
  /**
   * Uber Base's own `easeDecelerate` quintic — covers ~80% of the distance in
   * the first 30% of the duration. That "arrives already settled" snap is a
   * large part of why their app feels fast; kept for entrances where Material's
   * decelerate reads slack.
   */
  uberDecelerate: Easing.bezier(0.22, 1, 0.36, 1),
  /** The design's own screen-transition curve. */
  screen: Easing.out(Easing.cubic),
} as const;

/* ── Springs ──────────────────────────────────────────────────────────────── */

export const spring = {
  /** Material expressive default spatial (ζ 0.8, k 380). Cards, sheets, anything that moves. */
  spatialDefault: { mass: 1, stiffness: 380, damping: 31.2 } satisfies WithSpringConfig,
  /** Expressive fast spatial (ζ 0.6, k 800). Snappy, visible overshoot. */
  spatialFast: { mass: 1, stiffness: 800, damping: 33.9 } satisfies WithSpringConfig,
  /** Expressive slow spatial (ζ 0.8, k 200). Large surfaces. */
  spatialSlow: { mass: 1, stiffness: 200, damping: 22.6 } satisfies WithSpringConfig,
  /** Default effects (ζ 1.0, k 1600). Opacity, colour, elevation — critically damped, never overshoots. */
  effects: { mass: 1, stiffness: 1600, damping: 80 } satisfies WithSpringConfig,
  /** Slow effects (ζ 1.0, k 800). */
  effectsSlow: { mass: 1, stiffness: 800, damping: 56.6 } satisfies WithSpringConfig,

  /**
   * Button press / release. These are the design's own shipped values, not a
   * Material conversion; ζ works out at ~0.50 and ~0.47, so they sit in the
   * correct (underdamped, spatial) class.
   */
  press: { damping: 16, stiffness: 260 } satisfies WithSpringConfig,
  release: { damping: 14, stiffness: 220 } satisfies WithSpringConfig,

  /** Marker interpolation across a socket interval — heavily damped so a late packet never causes a wobble. */
  marker: { mass: 1, stiffness: 90, damping: 30 } satisfies WithSpringConfig,
} as const;

/* ── Named interaction timings ────────────────────────────────────────────── */

/**
 * Entrances decelerate, exits accelerate, and an exit runs at roughly 0.7× its
 * entrance. Never ease-in-out on an entrance — it starts slow and reads as lag.
 */
export const transition = {
  /** Screen / route change. The booking flow should read as one continuous surface. */
  screen: { duration: 280, easing: easing.screen } satisfies WithTimingConfig,
  /** Element entrance — card, list row, chip. */
  enter: { duration: duration.medium2, easing: easing.emphasizedDecelerate } satisfies WithTimingConfig,
  /** Element exit. 0.7 × enter. */
  exit: { duration: duration.short4, easing: easing.emphasizedAccelerate } satisfies WithTimingConfig,
  /** Selection rail / fill crossfade. */
  selection: { duration: 140, easing: easing.standard } satisfies WithTimingConfig,
  /** Icon state change, small fade. */
  micro: { duration: duration.short3, easing: easing.standard } satisfies WithTimingConfig,
  /** The fare recalculating. Animate the digits, never cut. */
  fare: { duration: 320, easing: easing.standard } satisfies WithTimingConfig,
  /** A status-timeline step advancing: fade + 6pt rise. */
  timelineAdvance: { duration: 240, easing: easing.emphasizedDecelerate } satisfies WithTimingConfig,
  /** Map camera on route resolve. */
  mapCamera: { duration: duration.long4, easing: easing.standard } satisfies WithTimingConfig,
  /** The reduced-motion substitute — a cross-fade in place, never a teleport. */
  reducedFade: { duration: 180, easing: easing.standard } satisfies WithTimingConfig,
} as const;

/** One-off choreography the design specifies by name. */
export const choreography = {
  /** Confirmation seal: two rings, once, second delayed. */
  sealRing: 2600,
  sealRingDelay: 900,
  /** Skeleton shimmer sweep (Uber Base: 1.5s, linear, infinite). */
  shimmer: 1500,
  /** Staggered list entrance, per item. */
  stagger: 60,
} as const;

/**
 * Reanimated's own reduced-motion mode. `System` makes withTiming/withSpring
 * jump straight to the target — correct, but blunt.
 *
 * Prefer `useMotion()` (src/lib/useMotion.ts), which substitutes a short
 * cross-fade instead of a teleport: on iOS `prefersCrossFadeTransitions()`
 * specifically says the user wants motion REPLACED, not removed.
 */
export const reduceMotion = ReduceMotion.System;

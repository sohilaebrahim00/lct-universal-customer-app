/**
 * ELEVATION — replaces `shadows.card`, which was a no-op.
 *
 * The old token was `shadowColor: '#000000', shadowOpacity: 0.4` cast onto a
 * `#020201` page, plus Android `elevation: 6` which also draws black. Black on
 * near-black produces no luminance change, so it contributed nothing anywhere it
 * was used (audit P0-1).
 *
 * Depth on near-black comes from four mechanisms, in this order of effect:
 *
 *   1. LUMINANCE STEP    — the surface is lighter than the page.
 *   2. EDGE HIGHLIGHT    — a 1px specular catch along the top edge, simulating a
 *                          light source above. The single most effective
 *                          "expensive card on dark" technique.
 *   3. HAIRLINE          — a 1px ring separating two surfaces only ~10 L* apart.
 *   4. CONTACT SHADOW    — warm-black, tight. Large diffuse shadows still vanish;
 *                          a close one grounds the card.
 *
 * Mechanisms 1, 3 and 4 are in the style objects below. Mechanism 2 CANNOT be a
 * React Native style: RN has no inset box-shadow on either platform, and no
 * multi-layer shadow. It ships as a real child element — see `edgeHighlight`
 * below and the `<Surface>` primitive that renders it, so no screen has to
 * remember it.
 */

import { StyleSheet, type ViewStyle } from 'react-native';
import { alpha, neutral, radius, shadowColor } from './ref';

/** The specular top edge, as a `LinearGradient` child. A 1px view would be clipped by border radius; a gradient is not. */
export const edgeHighlight = {
  colors: [alpha.edge, 'rgba(233, 214, 163, 0)'] as const,
  height: 1,
} as const;

/**
 * Android note: `elevation` renders a black shadow that the shadowColor above
 * does not tint on older API levels, so it reads as a faint dark halo rather
 * than the warm one iOS gets. Kept anyway — it still separates the surface — but
 * the warm cast is an iOS-only refinement, not a cross-platform guarantee. Not
 * verified on a device.
 */
export const elevation = {
  /** List rows, chips — the lightest raised treatment. */
  row: {
    backgroundColor: neutral[100],
    borderWidth: 1,
    borderColor: alpha.hairline,
    shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 3,
  } satisfies ViewStyle,

  /** The default card: trip cards, vehicle cards, grouped list containers. */
  card: {
    backgroundColor: neutral[100],
    borderWidth: 1,
    borderColor: alpha.hairline,
    shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 6,
  } satisfies ViewStyle,

  /** The one card on a screen that outranks the others — the next-trip card, the reservation card. */
  cardProminent: {
    backgroundColor: neutral[100],
    borderWidth: 1,
    borderColor: alpha.hairline,
    shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.75,
    shadowRadius: 28,
    elevation: 8,
  } satisfies ViewStyle,

  /** Bottom sheets and the tab bar: lighter fill, shadow cast upward. */
  sheet: {
    backgroundColor: neutral[200],
    borderTopWidth: 1,
    borderTopColor: alpha.hairlineStrong,
    shadowColor,
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.72,
    shadowRadius: 46,
    elevation: 12,
  } satisfies ViewStyle,

  /**
   * Recessed — text inputs, segmented tracks.
   *
   * The design specifies `inset 0 1px 3px rgba(0,0,0,.7)`. React Native has no
   * inset shadow, so the recess is carried by the darker-than-page fill plus the
   * control boundary alone. It reads as recessed because it is genuinely darker
   * than everything around it; it just doesn't have the inner shading the HTML
   * reference shows. Flagged rather than faked — an inner shadow could be
   * approximated with a gradient child, but on a 3px blur it would cost a view
   * per input for an effect that isn't visible at this fill contrast.
   */
  inset: {
    backgroundColor: neutral.inset,
    borderWidth: 1,
    borderColor: alpha.control,
  } satisfies ViewStyle,

  /** The floating gold treatment — primary buttons and the concierge FAB. */
  accent: {
    shadowColor: '#d9b160',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 8,
  } satisfies ViewStyle,
} as const;

/** Hairline rules that survive a non-integer pixel ratio. */
export const hairlineWidth = StyleSheet.hairlineWidth;

/** Radii that pair with each elevation level, so a sheet never reuses a card's corner. */
export const elevationRadius = {
  row: radius.md,
  card: radius.lg,
  cardProminent: radius.lg,
  sheet: radius.xl,
  inset: radius.sm,
} as const;

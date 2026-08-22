import { StyleSheet } from 'react-native';
import { fontFamily, radius, space } from '../../theme/ref';
import { roleColor } from './rolePalette';

/**
 * THE ROLE PREVIEW'S OWN VISUAL LANGUAGE.
 *
 * This file exists because the chauffeur and dispatcher views are previews of
 * two SEPARATE PRODUCTS, and dressing them in the client app's clothes would be
 * the single most misleading thing this preview could do. A client seeing
 * Cormorant and champagne-on-charcoal would reasonably conclude the driver app
 * is nearly built. It is not built at all.
 *
 * So both views deliberately break with the client app, in opposite directions,
 * for reasons that come from their conditions rather than from taste:
 *
 * ── Chauffeur ───────────────────────────────────────────────────────────────
 * One hand, a moving vehicle, Texas daylight through a windscreen, and
 * attention that belongs on the road. Therefore:
 *   · Off-white at FULL strength. The client app's body copy sits at a lower
 *     step (`neutral[600]`, 7.38:1) because it is read indoors at rest. Here
 *     every string that matters is `neutral[900]` — 18.5:1 on the page.
 *   · 56pt minimum target, not 44. The primary action is 72.
 *   · No serif. Cormorant is a display face for an unhurried reader; at a kerb
 *     it costs legibility for nothing. Manrope, and heavier than the client app
 *     uses it.
 *   · Gold is a hairline and an accent shape, never text. Low-contrast gold
 *     type is the first thing to disappear in sunlight.
 *   · No motion. Nothing animates in, because an animation is a thing that
 *     asks to be watched.
 *
 * ── Dispatcher ──────────────────────────────────────────────────────────────
 * A desk, a screen, and thirty rides to hold in your head. Therefore density:
 * a 13pt table with tight rows, tabular figures so times and fares align in
 * their columns, and colour reserved entirely for the two rows that need
 * finding — unassigned and late. Editorial typography actively hurts here, so
 * there is none.
 *
 * What both KEEP is the brand: the same champagne gold, the same near-black,
 * the same Manrope. These are LCT products. They are just not this one.
 */

/**
 * Unique string, present only in this module.
 *
 * The fence check greps the built bundle for it: absent from a non-demo
 * production export, present in a demo export. See metro.config.js.
 */
export const ROLE_PREVIEW_MARKER = 'LCT_ROLE_PREVIEW_ONLY_a7f2c1';

export { roleColor } from './rolePalette';

/**
 * 56, not 44.
 *
 * WCAG 2.5.5 (AAA) asks for 44; the client app meets that and it is right for a
 * seated reader. A gloved thumb against a car's vibration is a different target
 * problem, and 48 is the floor the brief set. 56 buys the margin back, and the
 * primary action on the status screen is 72 because getting it wrong there
 * means a client is told the wrong thing about where their car is.
 */
export const roleTarget = { min: 56, primary: 72 } as const;

export const roleText = StyleSheet.create({
  /** Screen title. Sans, not serif — see the file header. */
  title: { fontFamily: fontFamily.sansBold, fontSize: 26, lineHeight: 32, color: roleColor.text },
  /** The one thing on the screen that matters most. */
  hero: { fontFamily: fontFamily.sansBold, fontSize: 32, lineHeight: 38, color: roleColor.text },
  heading: { fontFamily: fontFamily.sansSemiBold, fontSize: 19, lineHeight: 25, color: roleColor.text },
  body: { fontFamily: fontFamily.sans, fontSize: 16, lineHeight: 23, color: roleColor.text },
  /** Supporting copy. Still legible, just not first. */
  bodySoft: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 22, color: roleColor.textSoft },
  /** Field labels. The only role that uses the dimmest step. */
  label: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: roleColor.label,
  },
  /** Times and fares. Tabular so columns line up. */
  mono: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: roleColor.text,
    fontVariant: ['tabular-nums'],
  },
  /** Dispatcher table cell. Deliberately smaller than anything in the client app. */
  cell: { fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 17, color: roleColor.text },
  cellSoft: { fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 17, color: roleColor.textSoft },
  cellNum: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 17,
    color: roleColor.text,
    fontVariant: ['tabular-nums'],
  },
  cellHead: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: roleColor.label,
  },
});

export const roleLayout = StyleSheet.create({
  screen: { flex: 1, backgroundColor: roleColor.page },
  scroll: { padding: space.mdl, paddingBottom: space.xxl },
  card: {
    backgroundColor: roleColor.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: roleColor.hairline,
    padding: space.md,
  },
});

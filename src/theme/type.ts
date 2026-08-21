/**
 * TYPE TOKENS — named by role, never by size.
 *
 * Uber Base's rule, adopted here: "name styles by role, not pixel value." A
 * component containing `fontSize: 18` has failed; it should be asking for
 * `subheading`.
 *
 * ── Two families, never cross-applied ───────────────────────────────────────
 * Cormorant Garamond carries CONTENT — where you're going, what it costs, that
 * it's confirmed. Manrope carries STRUCTURE — section headers, labels, meta,
 * buttons, tabs. `display` is never a screen title again; before this redesign
 * "Account" was set in 44px display serif, which is what stops the serif
 * signifying anything (audit P1-2).
 *
 * `figure` is Manrope, not Cormorant, on purpose: serif tabular figures at 20px
 * on a near-black ground is where halation costs most, and Manrope's tabular
 * figures are better fitted at that size. The large fare numbers stay serif —
 * that is the occasion.
 *
 * ── Line height ────────────────────────────────────────────────────────────
 * EVERY variant ships one. `subheading`, `caption` and `eyebrow` previously
 * shipped none, so they inherited each platform's default leading and vertical
 * rhythm drifted between iOS, Android and web in the components used most
 * (audit P1-1). In React Native `lineHeight` is absolute, not a multiplier, so
 * these are integers — a fractional line height causes sub-pixel baseline drift
 * across list rows.
 *
 * ── Tracking ───────────────────────────────────────────────────────────────
 * The premium inversion, against amateur practice: NEGATIVE on large display,
 * POSITIVE on small uppercase. Cormorant at 39px needs −0.7 or it reads loose
 * and airy rather than authoritative.
 *
 * ── The script axis ────────────────────────────────────────────────────────
 * Every role resolves per script, because Arabic is not a size override on
 * Latin — it is different metrics for the same semantic role:
 *
 *   · NO letter-spacing, ever. Arabic is a connected script; positive tracking
 *     breaks the joins. This is why tracking cannot be a global token.
 *   · NO uppercase. Arabic has no case, so `textTransform` is dropped, not
 *     translated.
 *   · NO italics (none are used here, but the rule belongs with the others).
 *   · Line height +~12%. Deep descenders, tall ascenders and diacritics collide
 *     at Latin leading.
 *   · Optical size +1–2pt at the same hierarchy level, with a 14pt floor for
 *     body — an Arabic "Regular" reads lighter and smaller than a Latin one.
 *   · Figures are NOT adjusted: Arabic UI keeps Western numerals reading
 *     left-to-right, per src/i18n/rtl.ts rule 4.
 *
 * Arabic entries currently name the LATIN families. No Arabic face ships in this
 * pass (decided: RTL-ready only), so this axis carries the metrics and the rules
 * and waits for the font. When one lands — IBM Plex Sans Arabic or Noto Naskh
 * Arabic, loaded through expo-font with the splash gated on it — only the
 * `fontFamily` values below change.
 */

import type { TextStyle } from 'react-native';
import { fontFamily } from './ref';

export type Script = 'latin' | 'arabic';

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform?: TextStyle['textTransform'];
  fontVariant?: TextStyle['fontVariant'];
}

export type TypeRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'headingSm'
  | 'figure'
  | 'section'
  | 'eyebrow'
  | 'subheading'
  | 'body'
  | 'bodyLead'
  | 'bodySm'
  | 'caption'
  | 'captionSm'
  | 'micro'
  | 'label'
  | 'tabLabel';

/** Tabular figures. Every price, distance, duration, time, card number and reservation code sets this; running prose does not. */
const TNUM: TextStyle['fontVariant'] = ['tabular-nums'];

export const type: Record<TypeRole, Record<Script, TypeStyle>> = {
  /* ── Cormorant: content, occasion ─────────────────────────────────────── */

  /** Onboarding headline, confirmation headline, live ETA. */
  display: {
    latin: { fontFamily: fontFamily.serif, fontSize: 39, lineHeight: 41, letterSpacing: -0.7 },
    arabic: { fontFamily: fontFamily.serif, fontSize: 40, lineHeight: 46, letterSpacing: 0 },
  },
  /** Screen titles, step questions. */
  title: {
    latin: { fontFamily: fontFamily.serif, fontSize: 31, lineHeight: 35, letterSpacing: -0.4 },
    arabic: { fontFamily: fontFamily.serif, fontSize: 32, lineHeight: 39, letterSpacing: 0 },
  },
  /** Trip destination, fare total, card headlines. */
  heading: {
    latin: { fontFamily: fontFamily.serif, fontSize: 25, lineHeight: 29, letterSpacing: -0.3 },
    arabic: { fontFamily: fontFamily.serif, fontSize: 26, lineHeight: 33, letterSpacing: 0 },
  },
  /** Trip-card destination in list rows. */
  headingSm: {
    latin: { fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 26, letterSpacing: -0.2 },
    arabic: { fontFamily: fontFamily.serif, fontSize: 23, lineHeight: 29, letterSpacing: 0 },
  },

  /* ── Manrope: structure ───────────────────────────────────────────────── */

  /** Distances, drive times, inline figures. Identical across scripts — Western numerals either way. */
  figure: {
    latin: { fontFamily: fontFamily.sansSemiBold, fontSize: 20, lineHeight: 26, letterSpacing: 0, fontVariant: TNUM },
    arabic: { fontFamily: fontFamily.sansSemiBold, fontSize: 20, lineHeight: 26, letterSpacing: 0, fontVariant: TNUM },
  },
  /** ALL structural section headers. Replaced the 28px serif headings. */
  section: {
    latin: { fontFamily: fontFamily.sansSemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
    arabic: { fontFamily: fontFamily.sansSemiBold, fontSize: 14, lineHeight: 20, letterSpacing: 0, textTransform: 'none' },
  },
  /** Brand eyebrows and step labels. Gold — typographic accent, not chrome. */
  eyebrow: {
    latin: { fontFamily: fontFamily.sansSemiBold, fontSize: 11, lineHeight: 14, letterSpacing: 2.2, textTransform: 'uppercase' },
    arabic: { fontFamily: fontFamily.sansSemiBold, fontSize: 14, lineHeight: 20, letterSpacing: 0, textTransform: 'none' },
  },
  /** Card titles and list-row titles. 16/24 — 16/22 sat at 1.375, below the 1.45–1.50 body band. */
  subheading: {
    latin: { fontFamily: fontFamily.sansSemiBold, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
    arabic: { fontFamily: fontFamily.sansSemiBold, fontSize: 17, lineHeight: 27, letterSpacing: 0 },
  },
  /** Prose. 16/24 = 1.50, which satisfies WCAG 1.4.12 Text Spacing by construction. */
  body: {
    latin: { fontFamily: fontFamily.sans, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
    arabic: { fontFamily: fontFamily.sans, fontSize: 17, lineHeight: 27, letterSpacing: 0 },
  },
  /** Lead paragraphs over photography — onboarding, empty-state copy. */
  bodyLead: {
    latin: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 23, letterSpacing: 0 },
    arabic: { fontFamily: fontFamily.sans, fontSize: 16, lineHeight: 26, letterSpacing: 0 },
  },
  /** Chat bubbles and sheet copy. */
  bodySm: {
    latin: { fontFamily: fontFamily.sans, fontSize: 14.5, lineHeight: 22, letterSpacing: 0 },
    arabic: { fontFamily: fontFamily.sans, fontSize: 15.5, lineHeight: 25, letterSpacing: 0 },
  },
  /** Meta rows. */
  caption: {
    latin: { fontFamily: fontFamily.sansMedium, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
    arabic: { fontFamily: fontFamily.sansMedium, fontSize: 14, lineHeight: 21, letterSpacing: 0 },
  },
  /** Tertiary meta. */
  captionSm: {
    latin: { fontFamily: fontFamily.sansMedium, fontSize: 12, lineHeight: 17, letterSpacing: 0 },
    arabic: { fontFamily: fontFamily.sansMedium, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  },
  /** Pill labels, table column labels. 10.5 is under Apple's 11pt floor by design — it is always uppercase and always short. */
  micro: {
    latin: { fontFamily: fontFamily.sansSemiBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
    arabic: { fontFamily: fontFamily.sansSemiBold, fontSize: 13, lineHeight: 18, letterSpacing: 0, textTransform: 'none' },
  },
  /** Button labels. */
  label: {
    latin: { fontFamily: fontFamily.sansSemiBold, fontSize: 15, lineHeight: 20, letterSpacing: 0.4 },
    arabic: { fontFamily: fontFamily.sansSemiBold, fontSize: 16, lineHeight: 23, letterSpacing: 0 },
  },
  /** Tab bar. */
  tabLabel: {
    latin: { fontFamily: fontFamily.sansSemiBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0 },
    arabic: { fontFamily: fontFamily.sansSemiBold, fontSize: 12, lineHeight: 17, letterSpacing: 0 },
  },
};

/**
 * Resolve a role for the script currently being rendered.
 *
 * `includeFontPadding: false` is applied to every resolved style: Android
 * otherwise adds font-metric padding that iOS does not, so the same text sits on
 * a different baseline per platform. It was set nowhere in the app before this.
 */
export function resolveType(role: TypeRole, script: Script = 'latin'): TextStyle {
  return { ...type[role][script], includeFontPadding: false };
}

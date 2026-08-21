/**
 * WCAG contrast maths. Pure, dependency-free, and importable from Jest without
 * pulling React Native or Reanimated in.
 *
 * This exists so contrast is a BUILD GATE rather than a review comment — see
 * tests/contrast.test.ts. Every ratio quoted in src/theme/sys.ts is asserted
 * there, so a palette edit that drops body text below 4.5:1 or a control
 * boundary below 3:1 fails CI.
 *
 * Two rules that are easy to get wrong and are handled here:
 *
 *  1. A ratio is never rounded before comparison. 4.499 fails 4.5.
 *  2. `contrast()` on a translucent colour is undefined. An rgba() token must be
 *     composited over its ACTUAL backdrop first — which is why `composite()`
 *     exists and why `contrast()` throws rather than guessing if handed alpha.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
  /** 0–1. Absent means opaque. */
  a?: number;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGBA = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

/** Parses `#rgb`, `#rrggbb`, `rgb(r,g,b)` and `rgba(r,g,b,a)`. Throws on anything else. */
export function parseColor(value: string): RGB {
  const input = value.trim();

  const hex = HEX.exec(input);
  if (hex) {
    const digits = hex[1] as string;
    const full =
      digits.length === 3
        ? digits
            .split('')
            .map((c) => c + c)
            .join('')
        : digits;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  const rgba = RGBA.exec(input);
  if (rgba) {
    const [, r, g, b, a] = rgba;
    return {
      r: Number(r),
      g: Number(g),
      b: Number(b),
      ...(a === undefined ? {} : { a: Number(a) }),
    };
  }

  throw new Error(`parseColor: unsupported colour "${value}"`);
}

/** sRGB channel → linear. WCAG G17's exact piecewise transfer function. */
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
export function luminance(color: string | RGB): number {
  const { r, g, b, a } = typeof color === 'string' ? parseColor(color) : color;
  if (a !== undefined && a < 1) {
    throw new Error('luminance: colour is translucent — composite() it over its real backdrop first');
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Flattens a translucent foreground onto an opaque backdrop. Source-over, per-channel. */
export function composite(foreground: string | RGB, backdrop: string | RGB): RGB {
  const fg = typeof foreground === 'string' ? parseColor(foreground) : foreground;
  const bg = typeof backdrop === 'string' ? parseColor(backdrop) : backdrop;
  if (bg.a !== undefined && bg.a < 1) {
    throw new Error('composite: backdrop must be opaque');
  }
  const a = fg.a ?? 1;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  };
}

/**
 * WCAG 2.x contrast ratio, unrounded.
 *
 * Either argument may be translucent, in which case it is composited over the
 * other — which is exactly the case for every alpha token in this palette
 * (borders, tints, overlays) sitting on a known surface.
 */
export function contrast(foreground: string | RGB, background: string | RGB): number {
  const bg = typeof background === 'string' ? parseColor(background) : background;
  const fg = typeof foreground === 'string' ? parseColor(foreground) : foreground;

  const opaqueBg = bg.a !== undefined && bg.a < 1 ? composite(bg, fg) : bg;
  const opaqueFg = fg.a !== undefined && fg.a < 1 ? composite(fg, opaqueBg) : fg;

  const l1 = luminance(opaqueFg);
  const l2 = luminance(opaqueBg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * CIE L* (0–100). Perceptually uniform, and the honest metric for how far apart
 * two near-black SURFACES look — WCAG ratio collapses toward 1.0 down there
 * regardless of how different they read. JND for a large flat field is ~1 L*.
 */
export function lightness(color: string | RGB): number {
  const y = luminance(color);
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}

/** WCAG thresholds, so tests read as intent rather than as magic numbers. */
export const WCAG = {
  /** 1.4.3 normal text, AA. */
  bodyAA: 4.5,
  /** 1.4.6 normal text, AAA. */
  bodyAAA: 7,
  /** 1.4.3 large text (18pt, or 14pt bold), AA. */
  largeAA: 3,
  /** 1.4.11 non-text: the boundary of a user-interface component. */
  nonText: 3,
} as const;

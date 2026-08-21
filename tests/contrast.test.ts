/**
 * Contrast as a build gate.
 *
 * Every ratio documented in src/theme/sys.ts is asserted here, computed from the
 * real token values with translucent tokens composited over their actual
 * backdrop. A palette edit that drops body text below 4.5:1, or a control
 * boundary below 3:1, fails CI rather than review.
 *
 * Deliberate exemptions are listed at the bottom WITH their reason and their
 * measured value, so an exemption is a documented decision rather than a token
 * quietly left out of the test.
 */

import { describe, expect, it } from '@jest/globals';
import { WCAG, composite, contrast, lightness } from '../src/theme/contrast';
import { sys } from '../src/theme/sys';

const t = sys.dark;

/** The opaque surfaces any foreground can legally sit on. */
const SURFACES: [name: string, value: string][] = [
  ['background.primary', t.background.primary],
  ['background.secondary', t.background.secondary],
  ['background.tertiary', t.background.tertiary],
  ['background.inset', t.background.inset],
];

describe('theme parity', () => {
  it('ships an identical key set for every theme', () => {
    const walk = (o: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v !== null && typeof v === 'object' && !Array.isArray(v)
          ? walk(v as Record<string, unknown>, `${prefix}${k}.`)
          : [`${prefix}${k}`],
      );
    expect(walk(sys.light).sort()).toEqual(walk(sys.dark).sort());
  });
});

describe('content on every surface', () => {
  it.each(SURFACES)('content.primary clears AAA on %s', (_name, surface) => {
    expect(contrast(t.content.primary, surface)).toBeGreaterThanOrEqual(WCAG.bodyAAA);
  });

  it.each(SURFACES)('content.secondary — body copy — clears AA on %s', (_name, surface) => {
    expect(contrast(t.content.secondary, surface)).toBeGreaterThanOrEqual(WCAG.bodyAA);
  });

  /**
   * The stronger claim, locked where the design actually makes it.
   *
   * `content.secondary` reaches AAA on the page, on cards and inside inputs —
   * which is where body copy lives, and was the whole point of lifting it from
   * the old #9e978e. On `background.tertiary` (the sheet and tab-bar fill) it
   * measures 6.35:1: AA, not AAA. That is stated rather than asserted away,
   * because sheets carry short labels and figures, not sustained reading.
   */
  it.each([
    ['background.primary', t.background.primary],
    ['background.secondary', t.background.secondary],
    ['background.inset', t.background.inset],
  ] as [string, string][])('content.secondary additionally clears AAA on %s', (_name, surface) => {
    expect(contrast(t.content.secondary, surface)).toBeGreaterThanOrEqual(WCAG.bodyAAA);
  });

  it.each(SURFACES)('content.tertiary clears AA on %s', (_name, surface) => {
    expect(contrast(t.content.tertiary, surface)).toBeGreaterThanOrEqual(WCAG.bodyAA);
  });

  it.each(SURFACES)('content.accent clears AA on %s', (_name, surface) => {
    expect(contrast(t.content.accent, surface)).toBeGreaterThanOrEqual(WCAG.bodyAA);
  });

  it.each(SURFACES)('content.onSurface clears AA on %s', (_name, surface) => {
    expect(contrast(t.content.onSurface, surface)).toBeGreaterThanOrEqual(WCAG.bodyAA);
  });
});

describe('accent and state text', () => {
  it('content.onAccent is legible on the gold gradient at every stop', () => {
    for (const stop of t.accent.gradient) {
      expect(contrast(t.content.onAccent, stop)).toBeGreaterThanOrEqual(WCAG.bodyAA);
    }
  });

  it('content.onAccent is legible on the pressed gradient at every stop', () => {
    for (const stop of t.accent.gradientPressed) {
      expect(contrast(t.content.onAccent, stop)).toBeGreaterThanOrEqual(WCAG.bodyAA);
    }
  });

  it('content.danger clears AA on its own tint — the case the old #e62b34 failed at 4.31:1', () => {
    const tint = composite(t.background.dangerTint, t.background.secondary);
    expect(contrast(t.content.danger, tint)).toBeGreaterThanOrEqual(WCAG.bodyAA);
  });

  it('content.success clears AA on its own tint', () => {
    const tint = composite(t.background.successTint, t.background.secondary);
    expect(contrast(t.content.success, tint)).toBeGreaterThanOrEqual(WCAG.bodyAA);
  });

  it('content.accentEmphasis clears AA on the gold tint it is always used on', () => {
    const tint = composite(t.background.accentStrong, t.background.secondary);
    expect(contrast(t.content.accentEmphasis, tint)).toBeGreaterThanOrEqual(WCAG.bodyAA);
  });

  it('content.disabled is legible on background.disabled — the reason opacity was rejected', () => {
    expect(contrast(t.content.disabled, t.background.disabled)).toBeGreaterThanOrEqual(WCAG.bodyAA);
  });
});

describe('control boundaries — WCAG 1.4.11', () => {
  it('border.control clears 3:1 against the inset fill it bounds', () => {
    expect(contrast(t.border.control, t.background.inset)).toBeGreaterThanOrEqual(WCAG.nonText);
  });

  it('border.control clears 3:1 against the card fill too', () => {
    expect(contrast(t.border.control, t.background.secondary)).toBeGreaterThanOrEqual(WCAG.nonText);
  });

  it.each(SURFACES)('border.selected — focus and selection — clears 3:1 on %s', (_name, surface) => {
    expect(contrast(t.border.selected, surface)).toBeGreaterThanOrEqual(WCAG.nonText);
  });

  it('border.danger clears 3:1 against the inset fill of an invalid field', () => {
    expect(contrast(t.border.danger, t.background.inset)).toBeGreaterThanOrEqual(WCAG.nonText);
  });
});

describe('surface ladder', () => {
  it('steps monotonically upward in perceptual lightness', () => {
    const ladder = [t.background.primary, t.background.secondary, t.background.tertiary].map(lightness);
    expect(ladder[1]).toBeGreaterThan(ladder[0] as number);
    expect(ladder[2]).toBeGreaterThan(ladder[1] as number);
  });

  it('keeps background.inset recessed below the page', () => {
    expect(lightness(t.background.inset)).toBeLessThan(lightness(t.background.secondary));
  });
});

/**
 * Documented exemptions.
 *
 * These are asserted to be BELOW 3:1 on purpose, so that if someone "fixes" one
 * the test fails and they have to come here and read why it is the way it is.
 */
describe('documented exemptions from 1.4.11', () => {
  it('border.hairline is decorative — a card edge identifies nothing', () => {
    const ratio = contrast(t.border.hairline, t.background.secondary);
    expect(ratio).toBeLessThan(WCAG.nonText);
    expect(ratio).toBeGreaterThan(1.3);
  });

  it('border.edgeHighlight is a specular effect, not a boundary', () => {
    expect(contrast(t.border.edgeHighlight, t.background.secondary)).toBeLessThan(WCAG.nonText);
  });

  it('content.quaternary is only ever the "optional" qualifier beside a legible label', () => {
    expect(contrast(t.content.quaternary, t.background.secondary)).toBeLessThan(WCAG.bodyAA);
  });
});

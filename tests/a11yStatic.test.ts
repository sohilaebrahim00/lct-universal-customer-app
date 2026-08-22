import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * STRUCTURAL ACCESSIBILITY ASSERTIONS.
 *
 * ── What this file can and cannot claim ─────────────────────────────────────
 * It asserts things that are TRUE OR FALSE ABOUT THE SOURCE: a role is present,
 * a label is present, font scaling is not capped, a live region is declared.
 * Those are worth pinning down, because they regress silently and a reviewer
 * cannot hold thirty screens in their head.
 *
 * It says **nothing** about whether the focus order makes sense, whether an
 * announcement is coherent when spoken, or whether a screen is navigable by
 * someone who cannot see it. A label being present is not a label being
 * *useful* — `accessibilityLabel="button"` passes every assertion here and
 * helps nobody. Those need a real screen reader on a real device, and this file
 * must never be read as covering them.
 *
 * That distinction is the same one this project keeps running into: a fixture
 * proves a branch renders, not that it is reached.
 */

const ROOTS = ['app', 'src/components'];
const IGNORE = ['src/components/ui/Gallery', 'node_modules'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (IGNORE.some((i) => full.includes(i))) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full.replace(/\\/g, '/'));
  }
  return out;
}

const FILES = ROOTS.flatMap((r) => walk(r));

/**
 * Every `<Pressable …>` opening tag, with all of its attributes.
 *
 * ── Why this is not a regex ─────────────────────────────────────────────────
 * The obvious `/<Pressable\b[\s\S]*?>/` is WRONG, and wrong in the direction
 * that matters: it stops at the first `>`, and these tags are full of arrow
 * functions — `style={({ pressed }) => [...]}`. So it truncated the tag at the
 * arrow and reported every attribute after it as missing.
 *
 * That produced a list of files that "failed" while being perfectly correct.
 * A gate with false positives is a gate somebody switches off, which is the
 * same lesson as a safety check that cries wolf — so it scans properly,
 * tracking brace depth and skipping over strings, and stops at the `>` that
 * actually closes the tag.
 */
function pressableTags(source: string): { tag: string; line: number }[] {
  const out: { tag: string; line: number }[] = [];
  const OPEN = '<Pressable';

  for (let i = source.indexOf(OPEN); i !== -1; i = source.indexOf(OPEN, i + 1)) {
    // `<PressableFoo` is a different component.
    const after = source[i + OPEN.length];
    if (after && /[A-Za-z0-9_]/.test(after)) continue;

    let depth = 0;
    let quote: string | null = null;
    let end = -1;

    for (let j = i + OPEN.length; j < source.length; j += 1) {
      const ch = source[j]!;

      if (quote) {
        if (ch === quote && source[j - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
        continue;
      }
      if (ch === '{' || ch === '(' || ch === '[') depth += 1;
      else if (ch === '}' || ch === ')' || ch === ']') depth -= 1;
      else if (ch === '>' && depth === 0) {
        end = j;
        break;
      }
    }

    if (end === -1) continue;
    out.push({ tag: source.slice(i, end + 1), line: source.slice(0, i).split('\n').length });
  }

  return out;
}

describe('every Pressable declares a role', () => {
  /*
   * A `Pressable` without `accessibilityRole` is announced as a plain view. A
   * screen-reader user can focus it and is told nothing about what it does or
   * that it can be activated at all.
   *
   * `Link asChild` wrappers are included deliberately — those are the auth
   * links, and they were the smallest targets in the app before this slice.
   */
  for (const file of FILES) {
    const source = readFileSync(file, 'utf8');
    const tags = pressableTags(source);
    if (tags.length === 0) continue;

    it(file, () => {
      const missing = tags
        .filter((t) => !t.tag.includes('accessibilityRole'))
        .map((t) => `${file}:${t.line}`);
      expect(missing).toEqual([]);
    });
  }
});

describe('every Pressable is labelled', () => {
  /*
   * A role without a label announces "button" and nothing else.
   *
   * A tag counts as labelled if it declares `accessibilityLabel`, or if it is
   * `accessible` with text children that the platform will read — the second is
   * legitimate and common for a row whose visible text IS its label, so it is
   * not forced into an explicit attribute.
   */
  for (const file of FILES) {
    const source = readFileSync(file, 'utf8');
    const tags = pressableTags(source);
    if (tags.length === 0) continue;

    it(file, () => {
      const unlabelled = tags
        .filter((t) => !t.tag.includes('accessibilityLabel') && !t.tag.includes('accessible'))
        .map((t) => `${file}:${t.line}`);
      expect(unlabelled).toEqual([]);
    });
  }
});

describe('dynamic type is never capped', () => {
  /**
   * `allowFontScaling={false}` and `maxFontSizeMultiplier` both silently
   * override the reader's own system setting.
   *
   * Someone who has set their phone to a large type size has done so because
   * they need it, and an app that decides it knows better has made an
   * accessibility decision on their behalf to protect a layout. If the layout
   * breaks at a large scale, the layout is the defect.
   */
  it('no file disables font scaling', () => {
    const offenders = FILES.filter((f) => readFileSync(f, 'utf8').includes('allowFontScaling={false}'));
    expect(offenders).toEqual([]);
  });

  it('no file caps the font-size multiplier', () => {
    const offenders = FILES.filter((f) => readFileSync(f, 'utf8').includes('maxFontSizeMultiplier'));
    expect(offenders).toEqual([]);
  });
});

describe('safe areas', () => {
  /**
   * `edges` on `maximum`, not the default.
   *
   * The default insets a screen by whatever the device reserves. On a device
   * with a home indicator and a large display zoom, that is not always enough —
   * `SafeAreaView`'s own docs recommend `maximum` for content that must never
   * be occluded, and a pay button occluded by a home indicator is a real
   * failure rather than a cosmetic one.
   */
  it('SafeAreaView usages that set mode use maximum', () => {
    const wrong: string[] = [];
    for (const file of FILES) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('SafeAreaView')) continue;
      // Only flag an explicit non-maximum mode; omitting mode is the default
      // and is handled per screen.
      if (/mode=["'](?!maximum)/.test(source)) wrong.push(file);
    }
    expect(wrong).toEqual([]);
  });
});

describe('state changes are announced', () => {
  /**
   * The screens whose content changes underneath a reader must say so.
   *
   * Not a blanket rule — marking everything live turns an accessibility feature
   * into an accessibility problem, which is why the tracking timeline marks
   * only its ACTIVE row. These are the specific places where something changes
   * without the user acting, or in answer to something they just did.
   */
  const REQUIRED: [file: string, why: string][] = [
    ['src/components/trip/TrackingSheet.tsx', 'the ETA and the advancing stage'],
    ['src/components/ui/ConnectivityBanner.tsx', 'going offline'],
    ['src/components/ui/Toast.tsx', 'transient confirmations'],
    ['src/components/concierge/Bubble.tsx', 'the concierge composing a reply'],
    ['app/(auth)/login.tsx', 'a failed sign-in'],
    ['app/(auth)/signup.tsx', 'a failed sign-up'],
    ['app/(auth)/forgot-password.tsx', 'a failed reset'],
    ['app/(app)/book/payment.tsx', 'the price changing before Stripe'],
  ];

  for (const [file, why] of REQUIRED) {
    it(`${file} — ${why}`, () => {
      expect(readFileSync(file, 'utf8')).toContain('accessibilityLiveRegion');
    });
  }
});

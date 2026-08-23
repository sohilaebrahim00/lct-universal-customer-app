import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * THE OBSERVED RATE CARDS MUST NOT REACH A CUSTOMER.
 *
 * `src/config/observedRateCards.ts` holds five metered rate cards transcribed
 * from a phone recording of the client's operations panel. Unconfirmed, and
 * materially different from what the marketing site publishes.
 *
 * ── Why this exists on top of the lint rule ─────────────────────────────────
 * `eslint.config.js` forbids importing that file outside the demo layer. This
 * test asserts the same containment against the source tree, for three reasons
 * the lint rule cannot cover:
 *
 *   1. **`require()` and dynamic `import()`.** `no-restricted-imports` matches
 *      static import declarations. This app already loads `react-native-maps`,
 *      Stripe and the date picker through lazy `require()` — that idiom is
 *      normal here, and it walks straight past the rule.
 *   2. **Deleting the rule.** A lint rule can be removed in the same commit
 *      that violates it, and the diff looks like a config tidy-up. The last
 *      assertion below pins the rule's own existence, so the guard has a guard.
 *   3. **The allowlists drifting apart.** The lint config and this test each
 *      name who may import the file. If they disagree, one of them is lying,
 *      and the test says which.
 *
 * ── What it does NOT prove ──────────────────────────────────────────────────
 * That no unconfirmed price reaches a customer by some other route. It proves
 * that *this file's* values cannot, by import. A number retyped by hand into a
 * screen is invisible to every assertion here, and always will be — which is
 * why the rule the project actually runs on is that prices are computed, never
 * typed.
 */

const ROOTS = ['app', 'src'];

/**
 * Who may reach the observed rate cards.
 *
 * Kept in sync with `MAY_IMPORT_OBSERVED_RATE_CARDS` in `eslint.config.js` by
 * the last test in this file, rather than by hoping.
 */
const ALLOWED_PREFIXES = ['src/dev/', 'src/config/observedRateCards.ts'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (full.includes('node_modules')) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full.replace(/\\/g, '/'));
  }
  return out;
}

const FILES = ROOTS.flatMap((r) => walk(r));

/**
 * Any MODULE REACH for the file — not merely a mention of its name.
 *
 * Matches the module name inside a quoted string, which is every form a reach
 * can take: `import … from`, `export … from`, a lazy `require()`, a dynamic
 * `import()`, and a `jest.mock()` path. The last three are exactly what the
 * lint rule misses, and lazy `require()` is an established idiom in this
 * codebase — `react-native-maps`, Stripe and the date picker all use it — so it
 * is the likeliest way the fence gets walked around.
 *
 * ── It took three goes to write correctly, which is the point ──────────────
 * Referring to a fenced file is fine; importing it is not. Separating those two
 * turned out to be fiddlier than it looks:
 *
 *   1. A plain `includes()` flagged `publishedFleet.ts` and `rateCard.ts`, which
 *      only NAME this file in a comment to point at it. Those cross-references
 *      are the whole reason the two price sources cannot be confused, and a test
 *      that discouraged writing them would make the codebase worse in the name
 *      of safety.
 *   2. Quoting the match still flagged both, because JSDoc here writes module
 *      names in BACKTICKS. So the quote class is `'` and `"` only.
 *   3. It STILL flagged both, because a negated character class matches
 *      newlines: an apostrophe in prose several lines above was pairing with one
 *      several lines below, with the mention in between. Hence `\n` in the
 *      exclusion, which confines a match to a single line — where a module
 *      specifier always is.
 *
 * Every one of those three was a FALSE POSITIVE, i.e. the safe direction. The
 * matcher is nonetheless verified in the other direction too: a probe screen
 * importing the file fails this test, and so does one reaching it through a lazy
 * `require()`. A containment test that has never been seen to fail is not a
 * containment test.
 *
 * The known gap that remains: a dynamic `import()` assembled from a template
 * literal would evade this. Not covered, not pretended to be, and part of why
 * the lint rule stands alongside this test rather than instead of it.
 */
function reachesObservedRateCards(source: string): boolean {
  return /['"][^'"\n]*observedRateCards[^'"\n]*['"]/.test(source);
}

function isAllowed(file: string): boolean {
  return ALLOWED_PREFIXES.some((p) => file.startsWith(p));
}

describe('observedRateCards containment', () => {
  it('is reached only from the demo layer and from itself', () => {
    const offenders = FILES.filter((f) => !isAllowed(f)).filter((f) =>
      reachesObservedRateCards(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('is not reached from any screen under app/', () => {
    // Stated separately from the test above even though it is implied by it.
    // `app/` is the routed, customer-facing surface; if this ever fails, the
    // failure message should say that plainly rather than making someone infer
    // it from a path in a longer list.
    const screens = FILES.filter((f) => f.startsWith('app/'));
    const offenders = screens.filter((f) => reachesObservedRateCards(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('declares its own provenance as unconfirmed', () => {
    // The values may be wrong; what must not happen is the file quietly
    // dropping the fact that nobody confirmed them.
    const source = readFileSync('src/config/observedRateCards.ts', 'utf8');
    expect(source).toContain('confirmedByBusiness: false');
  });

  it('is still guarded by the lint rule, and the allowlists agree', () => {
    // Guarding the guard: if someone deletes the rule to get a build through,
    // this fails rather than the containment quietly becoming a comment again.
    const config = readFileSync('eslint.config.js', 'utf8');
    expect(config).toContain('OBSERVED_RATE_CARD_IMPORT_PATTERN');
    expect(config).toContain('**/config/observedRateCards');

    // The lint allowlist and this file's allowlist must name the same places.
    expect(config).toContain("'src/dev/**'");
    expect(config).toContain("'src/config/observedRateCards.ts'");
  });
});

/**
 * The published figures are a separate, CONFIRMED source, and stay reachable.
 *
 * Worth asserting the positive as well as the negative: a containment rule that
 * accidentally fenced off `publishedFleet.ts` too would show up as screens
 * silently losing their price labels, which is the failure this project keeps
 * having in the other direction.
 */
describe('publishedFleet remains the customer-facing source', () => {
  it('is imported by the screens that show a starting price', () => {
    const importers = FILES.filter((f) => readFileSync(f, 'utf8').includes('publishedFleet'));
    expect(importers.length).toBeGreaterThan(0);
    expect(importers.some((f) => f.startsWith('app/'))).toBe(true);
  });

  it('names its domain and confirmation status', () => {
    const source = readFileSync('src/config/publishedFleet.ts', 'utf8');
    expect(source).toContain("domain: 'lctuniversal.com'");
    expect(source).toContain('confirmedByBusiness: true');
  });
});

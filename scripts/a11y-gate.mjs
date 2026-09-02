/**
 * LAYOUT AND ACCESSIBILITY GATE — measured in a browser, against the
 * production export.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE CONTRACT
 *  1. Every check runs at every viewport in `VIEWPORTS`.
 *  2. ONE invocation runs everything. There is no partial mode.
 *  3. It REFUSES TO REPORT A RESULT unless every planned unit of work
 *     completed. A gate that can report on half of itself is not a gate.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── Three bugs this file has shipped, and what each one taught ─────────────
 *
 * 1. **It measured 404 pages.** The route list used expo-router GROUP paths —
 *    `/(app)/fleet` — which are stripped from the URL. Fifteen of sixteen
 *    routes served the not-found page and every assertion passed: a 404 page
 *    has text, one link, and fits any viewport. Two slices were reported and
 *    accepted green on that.
 *    → `assertRendered()`.
 *
 * 2. **It only ran at 390×844.** Every gate in this project was a phone, so a
 *    defect triggered by a WIDE viewport could not fail any of them —
 *    `paddingBottom: '58%'` resolved against width, correct at 390 by
 *    coincidence and 835px of padding at 1440.
 *    → `VIEWPORTS`, and `offscreenAbove()`, because adding 1440 alone would
 *    not have caught it: that bug produced no horizontal overflow.
 *
 * 3. **THE REFLOW CHECK TESTED NOTHING.** It set `documentElement.style
 *    .fontSize` to 16/20.8/25.6/32px and re-measured, and reported
 *    "0 reflow overflow at 1.0/1.3/1.6/2.0" for months. **React Native Web
 *    emits absolute `px` font sizes**, so the root font size changes nothing:
 *    measured on `/about`, a rendered heading was `39px` at BOTH 1.0 and 2.0,
 *    the tallest scroller was `1398` at both, and every measured value was
 *    byte-identical. Four scales, one layout, measured four times.
 *    → replaced with WIDTH, below.
 *
 * ── What replaced it, and why width is the honest test ────────────────────
 * WCAG 1.4.10 (Reflow) is specified as **320 CSS pixels** of width without
 * horizontal scrolling — which is also what 400% zoom on a 1280px desktop
 * produces. Width is something this app genuinely responds to, so `320` is now
 * the first entry in the matrix and horizontal overflow is checked at every
 * width rather than at four identical font scales.
 *
 * **OS-level dynamic type is a NATIVE behaviour and cannot be tested here at
 * all.** `AppText` scales its line height by `PixelRatio.getFontScale()`, which
 * returns 1 on web forever. That check moved to `DEVICE_VERIFICATION.md`, where
 * it needs a real phone with the text-size slider moved.
 *
 * ── Serving ────────────────────────────────────────────────────────────────
 * Requires the export served with SPA fallback — `serve dist -l 5055 --single`.
 * `expo export` emits a single index.html, so a plain static server 404s every
 * deep path and this gate will (correctly) fail on all of them.
 *
 * Usage:  node scripts/a11y-gate.mjs
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
function rp() {
  const c = join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
  for (const d of readdirSync(c)) {
    const p = join(c, d, 'node_modules', 'playwright');
    if (existsSync(p)) return p;
  }
  throw new Error('playwright not found');
}
const { chromium } = createRequire(import.meta.url)(rp());

const BASE = 'http://localhost:5055';

/**
 * THE VIEWPORT MATRIX. Each entry says why it is here, so nobody drops one to
 * make a run faster.
 */
const VIEWPORTS = [
  {
    name: 'narrow',
    width: 320,
    height: 800,
    why: 'WCAG 1.4.10 Reflow: content must work at 320 CSS px with no horizontal scrolling. Equivalent to 400% zoom on a 1280px desktop. The width where a fixed-width element shows up first.',
  },
  {
    name: 'phone',
    width: 390,
    height: 844,
    why: 'iPhone 14/15. The design target.',
  },
  {
    name: 'large phone',
    width: 430,
    height: 932,
    why: 'iPhone Pro Max. Catches layouts pinned to the smaller phone width.',
  },
  {
    name: 'tablet',
    width: 834,
    height: 1112,
    why: 'iPad portrait. The first width where a phone-shaped layout stops being plausible and percentage-of-width values diverge visibly.',
  },
  {
    name: 'desktop',
    width: 1440,
    height: 900,
    why: 'The browser demo the client actually walks. WIDE and SHORT — the aspect ratio that exposed the map bug, because height is scarce while width is not.',
  },
];

/**
 * Routes that redirected instead of rendering themselves.
 *
 * NOT a problem — a route can be legitimately unreachable in one build mode.
 * It is an honest subtraction from the coverage count, reported by name so the
 * gate never claims to have measured a screen it did not reach.
 */
const redirected = [];

const ROUTES = [
  '/', '/welcome', '/onboarding', '/book', '/book/vehicle', '/book/details',
  '/book/payment', '/book/confirmed', '/trips', '/account', '/concierge',
  '/fleet', '/about', '/airport', '/corporate-info', '/account/settings',
  '/account/saved-locations', '/account/payment-methods', '/demo-trip', '/login',
  // The live tracking screen. The map bug lived here and no gate route covered
  // it — /demo-trip is a different screen.
  '/trips/demo-booking-upcoming',
  // The admin console. Behind the demo fence, and the gate builds in demo mode.
  '/_role/admin',
];

const problems = [];

/**
 * THE COMPLETION LEDGER.
 *
 * Every unit of work is planned up front and marked done only when it actually
 * finishes. The summary refuses to print a verdict unless `done` covers
 * `planned`.
 *
 * This project has twice found a checker whose OUTPUT DESCRIBED MORE THAN ITS
 * EXECUTION — the gate reporting on 404 pages, and `--pass=targets` printing a
 * reflow result for scales it never loaded. The ledger is the structural fix:
 * it is not possible to report a clean run without having done the work,
 * because the claim is derived from the ledger rather than written next to it.
 */
const planned = new Set(VIEWPORTS.map((v) => v.name));
const done = new Set();

/** Prove the route is the app, not the 404 page and not a blank frame. */
async function assertRendered(page, route, tag) {
  /*
   * Re-checked once before declaring a blank.
   *
   * With several viewports rendering at once, a React Native Web tree can still
   * be empty at the first measurement — CPU contention, not a defect. The first
   * concurrent run reported seven false blanks on screens that render perfectly.
   *
   * ── The repair that was NOT made ─────────────────────────────────────────
   * The tempting fix is to soften this assertion — lower the threshold, or drop
   * the blank check. **That would have quietly reintroduced the 404 problem
   * from the other direction:** a gate that no longer notices an empty screen
   * is a gate that passes one.
   *
   * A single bounded re-check is the honest amount of patience instead. It
   * removes the race without removing the assertion, and a screen that is still
   * empty after four seconds is empty.
   */
  /*
   * ── A REDIRECT IS THE 404 PROBLEM WITH A WORKING PAGE ────────────────────
   *
   * This function caught 404s and blanks, and passed anything that rendered.
   * `/login` renders beautifully — because in a demo build `authStore` signs in
   * as DEMO_PROFILE and `app/(auth)/_layout.tsx` redirects every (auth) route
   * to `/(app)`. `/` is ALSO in ROUTES. So the gate measured the home screen
   * twice and reported the second one as `/login`: five viewports of true
   * assertions, none of them about the route named.
   *
   * Name the failure this function exists to prevent — "measuring a screen
   * that is not the one asked for" — and ask whether the old assertion would
   * be false in that state. It was true. Hence this check.
   *
   * NOT treated as a defect in the app: `/login` is genuinely unreachable in a
   * demo build, by design. It is reported as UNMEASURABLE and excluded from
   * the count, because a truthful 21 beats a false 22.
   */
  const landed = new URL(page.url()).pathname.replace(/\/$/, '') || '/';
  const asked = route.replace(/\/$/, '') || '/';
  if (landed !== asked) {
    redirected.push({ route, landed, tag });
    return false;
  }

  let text = (await page.evaluate(() => document.body.innerText || '')).trim();
  if (text.length < 20) {
    await page.waitForTimeout(2600);
    text = (await page.evaluate(() => document.body.innerText || '')).trim();
  }
  if (/could not be found/i.test(text)) {
    problems.push(`[404] ${tag} ${route} served the not-found page — measurement is meaningless`);
    return false;
  }
  if (text.length < 20) {
    problems.push(`[blank] ${tag} ${route} rendered ${text.length} chars`);
    return false;
  }
  return true;
}

/**
 * Text pushed off the TOP of the screen — fully above it, or clipped by it.
 *
 * Content below the fold is skipped: that is what scrolling is for. Content
 * inside an ancestor that has been scrolled is skipped too — the concierge
 * transcript legitimately scrolls to its latest message.
 *
 * ── The condition is `top < 0`, not `bottom <= 0` ─────────────────────────
 * The first version tested `bottom <= 0` — fully invisible — and WOULD NOT HAVE
 * CAUGHT THE BUG IT WAS WRITTEN FOR. The map placeholder's clipped line
 * measured `top: -27, bottom: +9`: nine pixels on screen, so it would have been
 * skipped while the icon above it was gone entirely.
 *
 * That is a different failure from an inert check. This one was LIVE and
 * calibrated against an ASSUMPTION about the defect rather than the defect.
 * The fix for inertness is a probe; the fix for this is measuring the real case
 * before writing the predicate.
 */
async function offscreenAbove(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length !== 0) continue;
      const text = (el.textContent || '').trim();
      if (!text) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.top >= -1) continue;

      let scrolledAncestor = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (p.scrollTop > 0) { scrolledAncestor = true; break; }
      }
      if (scrolledAncestor) continue;

      const how = r.bottom <= 0 ? 'entirely above the top' : 'clipped by the top edge';
      out.push(`${how} (top ${Math.round(r.top)}px) :: "${text.slice(0, 48)}"`);
    }
    return out.slice(0, 6);
  });
}

async function smallTargets(page) {
  return page.evaluate(() => {
    const out = [];
    for (const n of document.querySelectorAll('[role="button"], [role="link"], button, a, [tabindex="0"]')) {
      const r = n.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 44 || r.height < 44) {
        out.push(`${Math.round(r.width)}x${Math.round(r.height)} :: ${(n.innerText || n.getAttribute('aria-label') || '?').slice(0, 40)}`);
      }
    }
    return out;
  });
}

const browser = await chromium.launch({ channel: 'chrome' });

/**
 * One viewport, every route, every check.
 *
 * Viewports run CONCURRENTLY. The gate used to take longer than a single
 * command would allow, so it was run in halves and each half honestly labelled
 * a partial run — which is the correct handling of a situation that should not
 * exist. A gate that cannot finish in one go gets run half by someone in a
 * hurry.
 */
async function runViewport(vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  let measured = 0;
  let offscreen = 0;
  let overflow = 0;

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(1700);
    if (!(await assertRendered(page, route, vp.name))) continue;
    measured += 1;

    for (const s of await smallTargets(page)) problems.push(`[target ${vp.name}] ${route} :: ${s}`);

    const above = await offscreenAbove(page);
    offscreen += above.length;
    for (const a of above) problems.push(`[offscreen ${vp.name}] ${route} :: ${a}`);

    const bad = await page.evaluate(() => {
      const d = document.documentElement;
      return { over: d.scrollWidth > d.clientWidth + 2, sw: d.scrollWidth, cw: d.clientWidth };
    });
    if (bad.over) {
      overflow += 1;
      problems.push(`[reflow ${vp.name}] ${route} scrollWidth ${bad.sw} > clientWidth ${bad.cw}`);
    }
  }

  await ctx.close();

  /*
   * Reachable = asked for, minus the ones this build mode redirects away.
   * Coverage is judged against THAT, so a redirect is neither a silent pass
   * nor a false failure — it is a named subtraction.
   */
  const skipped = [...new Set(redirected.filter((r) => r.tag === vp.name).map((r) => r.route))];
  const reachable = ROUTES.length - skipped.length;
  if (measured !== reachable) {
    problems.push(`[coverage ${vp.name}] only ${measured}/${reachable} reachable routes measured`);
  } else {
    // Marked done ONLY on full coverage. A viewport that skipped a route has
    // not run, whatever else it reported.
    done.add(vp.name);
  }
  const note = skipped.length ? `  (${skipped.length} redirected: ${skipped.join(', ')})` : '';
  console.log(`${vp.name.padEnd(12)} ${String(vp.width).padStart(4)}x${vp.height}  routes ${measured}/${reachable}  offscreen ${offscreen}  overflow ${overflow}${note}`);
}

/**
 * Viewports run concurrently, but only CONCURRENCY at a time.
 *
 * All five at once starved the render and produced false blanks. Two at a time
 * keeps the whole run inside a single invocation without the contention.
 */
const CONCURRENCY = 2;
const queue = [...VIEWPORTS];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const vp = queue.shift();
      if (!vp) return;
      await runViewport(vp);
    }
  }),
);
await browser.close();

const missing = [...planned].filter((p) => !done.has(p));

console.log('\n=== GATE RESULT ===');
if (missing.length > 0) {
  // The refusal. Not a pass, not a fail — an admission that the run is not a
  // basis for either.
  console.log(`INCOMPLETE — no result reported. ${done.size}/${planned.size} viewports finished; missing: ${missing.join(', ')}`);
  for (const p of problems.slice(0, 20)) console.log('  ' + p);
  process.exit(2);
}
if (problems.length === 0) {
  const widths = VIEWPORTS.map((v) => v.width).join('/');
  /*
   * The count is what was MEASURED, not what was asked for. A route this build
   * mode redirects away is named in the result rather than folded into a total
   * that would imply it was checked.
   */
  const skipped = [...new Set(redirected.map((r) => r.route))];
  const measuredCount = ROUTES.length - skipped.length;
  console.log(
    `clean: ${measuredCount} routes at ${VIEWPORTS.length} viewports (${widths}) — ` +
      '0 targets under 44x44, 0 content above the fold, 0 horizontal overflow (incl. WCAG 1.4.10 at 320px)',
  );
  if (skipped.length) {
    console.log(
      `NOT MEASURED — ${skipped.length} route(s) redirect in this build mode and were excluded rather than counted:`,
    );
    for (const route of skipped) {
      const to = redirected.find((r) => r.route === route)?.landed ?? '?';
      console.log(`  ${route} -> ${to}`);
    }
    console.log(
      '  These are UNMEASURED SURFACES, not passing ones. `/login` is unreachable in a\n' +
        '  demo build by design, but in a production build it is the first screen a real\n' +
        '  user meets — and nothing has ever measured it for targets, reflow or 320px.\n' +
        '  See HANDOFF.md; measuring it needs a non-demo export.',
    );
  }
  process.exit(0);
}
console.log(`${problems.length} problems`);
for (const p of problems.slice(0, 60)) console.log('  ' + p);
process.exit(1);

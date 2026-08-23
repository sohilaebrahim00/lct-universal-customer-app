/**
 * LAYOUT AND ACCESSIBILITY GATE — measured in a browser, against the
 * production export.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE CONTRACT: EVERY CHECK IN THIS FILE MUST HOLD AT EVERY VIEWPORT IN
 *  `VIEWPORTS`. If you add a check, it runs across the whole matrix. If you
 *  cannot make it hold at every width, that is a finding, not a reason to
 *  narrow the matrix.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── Two bugs this file has already shipped, and what each one taught ───────
 *
 * 1. **It measured 404 pages.** The route list used expo-router GROUP paths —
 *    `/(app)/fleet` — and groups are stripped from the URL. Fifteen of sixteen
 *    routes served the not-found page, and every assertion passed: a 404 page
 *    has text, so the blank check passed; it has one link, so the target check
 *    passed; it fits any viewport, so the reflow check passed. Two slices were
 *    reported and accepted green on that.
 *    → `assertRendered()` now makes every route prove it is the app first.
 *
 * 2. **It only ever ran at 390×844.** A phone. So did the sweep, and so did
 *    the reflow checks. A defect whose trigger is a WIDE viewport could not
 *    fail any gate in this project. `TrackingMap.web.tsx` carried
 *    `paddingBottom: '58%'`, a percentage that resolves against WIDTH rather
 *    than height — 226px on a 390px phone (correct by coincidence) and 835px
 *    on a 1440px desktop, which pushed the map's designed state above the fold
 *    and left an empty rectangle on the tracking screen.
 *    → `VIEWPORTS` below, and `offscreenAbove()`.
 *
 * **Adding 1440 alone would NOT have caught bug 2.** The reflow check tests
 * horizontal overflow, and that bug was content positioned above the top of
 * the screen — no overflow at all. A wider viewport plus the same checks would
 * still have passed. That is why the matrix and `offscreenAbove()` land
 * together: the width matrix finds layouts that only work at one size, and the
 * off-screen check finds content that is present, styled, non-erroring and
 * unreachable.
 *
 * Which is the same shape as everything else this project has caught: present,
 * readable, and inert.
 *
 * ── Serving ────────────────────────────────────────────────────────────────
 * Requires the export served with SPA fallback — `serve dist -l 5055 --single`.
 * `expo export` emits a single index.html, so a plain static server 404s every
 * deep path and this gate will (correctly) fail on all of them.
 *
 * Usage:  node scripts/a11y-gate.mjs [--pass=targets|reflow]
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
    name: 'phone',
    width: 390,
    height: 844,
    why: 'iPhone 14/15. The design target, and the tightest width — text wraps and touch targets collide here first.',
  },
  {
    name: 'large phone',
    width: 430,
    height: 932,
    why: 'iPhone Pro Max. Catches layouts pinned to the smaller phone width, and the safe-area differences that come with it.',
  },
  {
    name: 'tablet',
    width: 834,
    height: 1112,
    why: 'iPad portrait. The first width where a phone-shaped layout stops being plausible and percentage-of-width values start to diverge visibly.',
  },
  {
    name: 'desktop',
    width: 1440,
    height: 900,
    why: 'The browser demo the client actually walks. WIDE and SHORT — the aspect ratio that exposed the map bug, because height is scarce while width is not.',
  },
];

const ROUTES = [
  '/', '/welcome', '/onboarding', '/book', '/book/vehicle', '/book/details',
  '/book/payment', '/book/confirmed', '/trips', '/account', '/concierge',
  '/fleet', '/about', '/airport', '/corporate-info', '/account/settings',
  '/account/saved-locations', '/account/payment-methods', '/demo-trip', '/login',
  // The live tracking screen. Added because the map bug lived here and no gate
  // route covered it: /demo-trip is a different screen. Loads standalone from
  // the demo dataset, so it needs no navigation to reach.
  '/trips/demo-booking-upcoming',
  // The admin console. Behind the demo fence, and the gate builds in demo mode,
  // so it is reachable here and must meet the same bars as every other screen.
  '/_role/admin',
];

const SCALES = [1.0, 1.3, 1.6, 2.0];

const only = (process.argv.find((a) => a.startsWith('--pass=')) ?? '').split('=')[1] ?? 'all';
const problems = [];

const browser = await chromium.launch({ channel: 'chrome' });

/** Prove the route is the app, not the 404 page and not a blank frame. */
async function assertRendered(page, route, tag) {
  const text = (await page.evaluate(() => document.body.innerText || '')).trim();
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
 * transcript legitimately scrolls to its latest message, which puts earlier
 * messages above the fold on purpose.
 *
 * ── The condition is `top < 0`, not `bottom <= 0`, and that matters ────────
 * The first version of this check tested `bottom <= 0` — fully invisible — and
 * IT WOULD NOT HAVE CAUGHT THE BUG IT WAS WRITTEN FOR. The map placeholder's
 * clipped line measured `top: -27, bottom: +9`: nine pixels of it were on
 * screen, so `bottom > 0` and the check skipped it, while the icon and the
 * first line above it were gone entirely.
 *
 * Content that is partially clipped by the top edge is still content the
 * reader cannot see and cannot scroll to. Caught before this check ever ran,
 * by measuring the real defect instead of assuming what its signature would
 * be — which is the only reason it is written this way.
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
      if (r.top >= -1) continue; // fully visible, or below the fold

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

// ── Pass 1: routes render, targets are big enough, nothing is off the top ──
if (only === 'all' || only === 'targets') {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      colorScheme: 'dark',
    });
    const page = await ctx.newPage();
    let measured = 0;
    let offscreen = 0;
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 120000 });
      await page.waitForTimeout(1700);
      if (!(await assertRendered(page, route, vp.name))) continue;
      measured += 1;

      for (const s of await smallTargets(page)) problems.push(`[target ${vp.name}] ${route} :: ${s}`);

      const above = await offscreenAbove(page);
      offscreen += above.length;
      for (const a of above) problems.push(`[offscreen ${vp.name}] ${route} :: ${a}`);
    }
    console.log(`${vp.name.padEnd(12)} ${String(vp.width).padStart(4)}x${vp.height}  routes ${measured}/${ROUTES.length}  offscreen-above ${offscreen}`);
    if (measured !== ROUTES.length) {
      problems.push(`[coverage ${vp.name}] only ${measured}/${ROUTES.length} routes measured`);
    }
    await ctx.close();
  }
}

// ── Pass 2: no horizontal overflow, at each font scale, at each width ──────
if (only === 'all' || only === 'reflow') {
  for (const vp of VIEWPORTS) {
    for (const scale of SCALES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        colorScheme: 'dark',
      });
      const page = await ctx.newPage();
      await page.addInitScript((s) => {
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.fontSize = `${16 * s}px`;
        });
      }, scale);
      let horiz = 0;
      let measured = 0;
      for (const route of ROUTES) {
        await page.goto(BASE + route, { waitUntil: 'load', timeout: 120000 });
        await page.waitForTimeout(1400);
        if (!(await assertRendered(page, route, `${vp.name} ${scale}x`))) continue;
        measured += 1;
        const bad = await page.evaluate(() => {
          const d = document.documentElement;
          return { over: d.scrollWidth > d.clientWidth + 2, sw: d.scrollWidth, cw: d.clientWidth };
        });
        if (bad.over) {
          horiz += 1;
          problems.push(`[reflow ${vp.name} ${scale}x] ${route} scrollWidth ${bad.sw} > clientWidth ${bad.cw}`);
        }
      }
      console.log(`${vp.name.padEnd(12)} ${scale}x  overflow ${horiz}  routes ${measured}/${ROUTES.length}`);
      await ctx.close();
    }
  }
}

await browser.close();
console.log('\n=== GATE RESULT ===');
if (problems.length === 0) {
  /*
   * The summary states ONLY what actually ran.
   *
   * The first version printed the full sentence — targets, off-screen AND
   * reflow — unconditionally, so `--pass=targets` reported "0 reflow overflow
   * at 1.0/1.3/1.6/2.0" about four scales it had not loaded. A gate that
   * overstates its own coverage is the same defect as a gate that measures 404
   * pages, one level up: the number is true, and it is not about what the
   * sentence says it is about.
   */
  const widths = VIEWPORTS.map((v) => v.width).join('/');
  const ran = [];
  if (only === 'all' || only === 'targets') ran.push('0 targets under 44x44', '0 content above the fold');
  if (only === 'all' || only === 'reflow') ran.push(`0 reflow overflow at ${SCALES.join('/')}`);
  const skipped = only === 'all' ? '' : `  [PARTIAL RUN: --pass=${only}; the other pass did NOT run]`;
  console.log(`clean: ${ROUTES.length} routes at ${VIEWPORTS.length} viewports (${widths}) — ${ran.join(', ')}${skipped}`);
} else {
  console.log(`${problems.length} problems`);
  for (const p of problems.slice(0, 60)) console.log('  ' + p);
}
process.exit(problems.length ? 1 : 0);

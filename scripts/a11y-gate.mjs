/**
 * Touch targets and reflow, measured in the browser against the production
 * build.
 *
 * ── The bug this script had, and the guard added because of it ─────────────
 * The first version used expo-router GROUP paths — `/(app)/fleet`, and so on.
 * Route groups are not URL segments: they exist to organise files and are
 * stripped from the URL. So 15 of 16 routes served the 404 page, and the gate
 * reported "0 targets under 44x44" about a 404 page, twice.
 *
 * A 404 page has text on it, so a blank-screen check passes. It has one link,
 * so a touch-target check passes. It fits any viewport, so a reflow check
 * passes. Every assertion was true and none of them were about the app.
 *
 * Hence `assertRendered()`: every route must prove it is the app before it is
 * measured, and the run fails if any route 404s. A gate that cannot tell it is
 * pointed at nothing is not a gate.
 *
 * Requires the static export to be served with SPA fallback (`serve --single`);
 * `expo export` emits a single index.html, so a plain static server 404s every
 * deep path.
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
const ROUTES = [
  '/', '/welcome', '/onboarding', '/book', '/book/vehicle', '/book/details',
  '/book/payment', '/book/confirmed', '/trips', '/account', '/concierge',
  '/fleet', '/about', '/airport', '/corporate-info', '/account/settings',
  '/account/saved-locations', '/account/payment-methods', '/demo-trip', '/login',
];
const SCALES = [1.0, 1.3, 1.6, 2.0];

const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];

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

// ── Touch targets ──────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const page = await ctx.newPage();
  let measured = 0;
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(2000);
    if (!(await assertRendered(page, route, 'targets'))) continue;
    const small = await page.evaluate(() => {
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
    measured += 1;
    for (const s of small) problems.push(`[target] ${route} :: ${s}`);
  }
  console.log(`touch targets: measured ${measured}/${ROUTES.length} routes`);
  if (measured !== ROUTES.length) problems.push(`[coverage] only ${measured}/${ROUTES.length} routes measured for touch targets`);
  await ctx.close();
}

// ── Reflow at each font scale ──────────────────────────────────────────────
for (const scale of SCALES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
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
    await page.waitForTimeout(1600);
    if (!(await assertRendered(page, route, `reflow ${scale}x`))) continue;
    measured += 1;
    const bad = await page.evaluate(() => {
      const d = document.documentElement;
      return { over: d.scrollWidth > d.clientWidth + 2, sw: d.scrollWidth, cw: d.clientWidth };
    });
    if (bad.over) {
      horiz += 1;
      problems.push(`[reflow ${scale}x] ${route} scrollWidth ${bad.sw} > clientWidth ${bad.cw}`);
    }
  }
  console.log(`reflow ${scale}x: ${horiz} overflow across ${measured}/${ROUTES.length} routes measured`);
  await ctx.close();
}

await browser.close();
console.log('\n=== A11Y GATE RESULT ===');
if (problems.length === 0) {
  console.log(`clean: ${ROUTES.length} routes, 0 targets under 44x44, 0 reflow overflow at 1.0/1.3/1.6/2.0`);
} else {
  console.log(`${problems.length} problems`);
  for (const p of problems.slice(0, 40)) console.log('  ' + p);
}
process.exit(problems.length ? 1 : 0);

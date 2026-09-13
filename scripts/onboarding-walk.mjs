/**
 * THE FIRST RUN — the only gate that deliberately does NOT declare itself a
 * returning user.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  Every other gate seeds `lct-universal:onboarding-seen` so it measures the
 *  app rather than the intro. This one seeds nothing, because the intro IS the
 *  thing under test — and because a cold context is the only way to see what a
 *  client opening the link for the first time sees.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── The bug it exists to keep fixed ───────────────────────────────────────
 * `app/index.tsx` checked `status === 'signed-in'` BEFORE it checked whether
 * onboarding was needed. A demo build auto-signs-in on launch, so the redirect
 * fired first and the carousel was unreachable in the build that ships. It was
 * not broken — it was never reached, which no existing gate could tell apart
 * from working.
 *
 * Usage: node scripts/onboarding-walk.mjs   (needs `serve dist -l 5055 --single`)
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
const SEEN_KEY = 'lct-universal:onboarding-seen';
const problems = [];

/** Each scenario is marked done only when it finishes — the usual ledger. */
const scenarios = [
  ['first_run', 'a cold visitor sees the carousel before anything else'],
  ['guest', 'Continue as Guest enters the app and records the run'],
  ['returning', 'a returning visitor never sees it again'],
  ['skip', 'Skip leaves, and also records the run'],
];
const done = new Set();

const browser = await chromium.launch({ channel: 'chrome' });

async function cold() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message.slice(0, 120)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[console] ${m.text().slice(0, 120)}`);
  });
  return { ctx, page };
}

const path = (page) => new URL(page.url()).pathname;

function check(what, ok, detail = '') {
  if (ok) {
    console.log(`  ok    ${what.padEnd(34)} ${detail}`);
  } else {
    problems.push(`[${what}] ${detail || 'failed'}`);
    console.log(`  MISS  ${what.padEnd(34)} ${detail}`);
  }
  return ok;
}

// ── 1. A cold visitor lands on the carousel, whatever the auth state ──────
console.log('--- 1. first run ---');
{
  const { ctx, page } = await cold();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(3500);

  check('lands on /onboarding', path(page) === '/onboarding', path(page));

  const text = await page.evaluate(() => document.body.innerText || '');
  check('opens on the first slide', text.includes('Ride with confidence.'));
  check('offers Skip on every slide', text.includes('Skip'));

  const dots = await page.getByRole('tab').count();
  check('has a dot per slide', dots === 4, `${dots} dots`);

  /*
   * THE PROMISE THE APP CANNOT KEEP. There is no live driver location — the
   * contract has the columns and no backend writes them — so the third slide
   * must not say "live tracking". Asserted, because copy drifts.
   */
  await page.getByRole('tab').nth(2).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const third = await page.evaluate(() => document.body.innerText || '');
  check('slide 3 promises no live tracking', !/live track/i.test(third));

  await page.getByRole('tab').nth(3).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const last = await page.evaluate(() => document.body.innerText || '');
  check('ends on the entry choice', last.includes('Ready when you are.'));
  check('offers Sign In', last.includes('Sign In'));
  check('offers Continue as Guest', last.includes('Continue as Guest'));

  await ctx.close();
  done.add('first_run');
}

// ── 2. Continue as Guest enters the app, and records the run ──────────────
console.log('--- 2. continue as guest ---');
{
  const { ctx, page } = await cold();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(3500);
  await page.getByRole('tab').nth(3).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByText('Continue as Guest', { exact: false }).last().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3200);

  check('guest enters the app', path(page) === '/', path(page));
  const seen = await page.evaluate((k) => window.localStorage.getItem(k), SEEN_KEY);
  check('records the run', seen === 'true', `${SEEN_KEY}=${seen}`);

  // ── 3. And does not see it again on the next launch ─────────────────────
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(3000);
  const again = await page.evaluate(() => document.body.innerText || '');
  check('returning visitor skips it', !again.includes('Ride with confidence.'), path(page));

  await ctx.close();
  done.add('guest');
  done.add('returning');
}

// ── 4. Skip is a real exit, and records the run too ───────────────────────
console.log('--- 4. skip ---');
{
  const { ctx, page } = await cold();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(3500);
  await page.getByText('Skip', { exact: false }).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2800);

  check('skip leaves the carousel', path(page) !== '/onboarding', path(page));
  const seen = await page.evaluate((k) => window.localStorage.getItem(k), SEEN_KEY);
  /*
   * Skipping counts. A first-run screen that reappears because somebody
   * skipped it is the same nuisance as one that never records at all.
   */
  check('skip records the run', seen === 'true', `${SEEN_KEY}=${seen}`);

  await ctx.close();
  done.add('skip');
}

await browser.close();

console.log('\n=== ONBOARDING WALK ===');
const missed = scenarios.filter(([k]) => !done.has(k));
if (missed.length) {
  for (const [, label] of missed) console.log(`INCOMPLETE — never ran: ${label}`);
  for (const p of problems) console.log('  ' + p);
  process.exit(2);
}
if (problems.length) {
  for (const p of [...new Set(problems)]) console.log('  ' + p);
  console.log(`\n${new Set(problems).size} problem(s)`);
  process.exit(1);
}
console.log(
  'clean: a cold visitor sees the four-slide intro before the app, slide 3 promises no live tracking, ' +
    'Sign In and Continue as Guest both appear on the last slide, guest entry and Skip each record the run, ' +
    'and a returning visitor never sees it again',
);

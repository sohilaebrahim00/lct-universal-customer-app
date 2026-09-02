/**
 * REACHABILITY — can a person get there without being told the URL?
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  Nothing in this project checked the relationship between the ROUTE TABLE
 *  and the NAVIGATION. Every walk reaches its screen by typing a URL, so no
 *  gate had ever asked whether a person can get there at all.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── The third variant of one gap in a week ────────────────────────────────
 *   `/login`         ships and is measured — but the a11y gate measured a
 *                    DIFFERENT screen through a redirect
 *   `/demo-account`  shipped, and was linked from the login screen's main
 *                    button, while a brief called it orphaned
 *   `/_role/admin`   ships, is fully tested by `verify:admin` on every run,
 *                    and was **linked from nothing**
 *
 * The console's eighteen sections were real, tested, and invisible. Only a
 * person using the app the way a client would could tell — she went looking for
 * the features in the client's own recording, took the only operator-shaped
 * entry the app offered, landed on the order board, and correctly reported that
 * the eighteen sections were not there.
 *
 * **A screen that ships, passes its gates, and is linked from nothing is a
 * screen that does not exist.**
 *
 * ── What this checks, and how ─────────────────────────────────────────────
 * Every route the bundle ships must either
 *   (a) be reachable by INTERACTION from the app's entry point — found by
 *       crawling: load a screen, press things, see where they go; or
 *   (b) appear in `URL_ONLY` below WITH A REASON.
 *
 * The reason is the point. A route may legitimately be URL-only — a deep link,
 * a detail screen keyed by id, a developer surface — but that has to be a
 * decision somebody wrote down, not an omission nobody noticed.
 *
 * ── Why a crawl and not a source grep ─────────────────────────────────────
 * A grep for `router.push('/_role/admin')` would have been satisfied by
 * `landingRouteFor()` in `src/lib/accountRole.ts`, which returns that path for
 * an OPERATOR account — a code path the demo's customer persona never takes.
 * The route was referenced in source and unreachable in the product. Only
 * pressing things can tell those apart.
 *
 * Usage: node scripts/verify-reachable.mjs   (needs `serve dist -l 5055 --single`)
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
const problems = [];

/**
 * ROUTES THAT MAY BE URL-ONLY, EACH WITH THE REASON IT IS ALLOWED TO BE.
 *
 * Adding a route here is a decision. Leaving one out of the navigation without
 * adding it here is the defect this file exists to catch.
 */
const URL_ONLY = {
  '/_role/job': 'A chauffeur job detail, keyed by ride id. Reached from the chauffeur list, never linked directly.',
  '/_role/ride': "A dispatcher's ride detail, keyed by id. Reached from the board.",
  '/_role/status': 'The chauffeur status screen, keyed by ride id. Reached from a job.',
  '/login': 'Unreachable in a demo build by design — demo auto-signs-in and (auth)/_layout redirects. In a production build it is reached from /welcome.',
  '/welcome': 'The signed-out entry screen. A demo build auto-signs-in as DEMO_PROFILE, so no press reaches it here; in a production build it is where a signed-out user starts.',
  '/onboarding': 'First-run only, and a demo build starts already signed in. Reached on a real first launch.',
  '/corporate-info': "Reached from Account for a customer with NO corporate account (account/index.tsx). The demo persona HAS one, so it correctly shows 'Corporate account' instead — persona-conditional, not orphaned.",
  '/demo-trip': "Reached from the GUEST Account view ('Preview live tracking'). The demo persona is signed in, so this crawl never sees that branch — persona-conditional, not orphaned.",
  '/signup': 'Same (auth) group as /login, same redirect in a demo build.',
  '/forgot-password': 'Same (auth) group, and reached from the login screen in a production build.',
  '/book/destination': 'Mid-flow booking step, reached by choosing a pickup. Entering it cold has no draft.',
  '/book/pickup': 'Mid-flow booking step, reached from the home CTA.',
  '/book/details': 'Mid-flow booking step.',
  '/book/vehicle': 'Mid-flow booking step.',
  '/book/payment': 'Mid-flow booking step.',
  '/book/confirmed': 'Terminal booking step, reached by authorising.',
};

/** The routes this build actually ships, as expo-router URL paths. */
const SHIPPED = [
  '/', '/welcome', '/onboarding', '/book', '/trips', '/account', '/concierge',
  '/fleet', '/about', '/airport', '/corporate-info', '/demo-trip',
  '/account/settings', '/account/saved-locations', '/account/payment-methods',
  '/account/saved-passengers', '/account/corporate',
  '/_role/admin', '/_role/dispatcher', '/_role/chauffeur',
  ...Object.keys(URL_ONLY),
];

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 1200 }, colorScheme: 'dark' });
const page = await ctx.newPage();

/** Normalised path, so `/x/` and `/x` are one thing. */
function here() {
  return new URL(page.url()).pathname.replace(/\/$/, '') || '/';
}

/**
 * Press everything pressable on a screen and record where each press lands.
 *
 * Returns the set of paths reached. Restores the starting screen between
 * presses, because a press that navigates changes what the next one would hit.
 */
async function reachableFrom(start, budget = 40) {
  const found = new Set();
  await page.goto(BASE + start, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(3000);

  /*
   * BOTH ROLES. The bottom tab bar renders as `role="tab"` inside a
   * `role="tablist"`, not as buttons — so a crawl that pressed only buttons
   * never used the app's primary navigation, and its first run reported
   * `/account`, `/concierge` and `/trips` unreachable.
   *
   * Eight negatives arriving in a group: this project's signature for a broken
   * matcher rather than a finding. Checked before believing it, and it was the
   * matcher.
   */
  const pressable = page.locator('[role=button], [role=tab], button, a[href]');
  const count = Math.min(await pressable.count(), budget);
  for (let i = 0; i < count; i++) {
    if (here() !== start.replace(/\/$/, '')) {
      await page.goto(BASE + start, { waitUntil: 'load', timeout: 120000 });
      await page.waitForTimeout(2200);
    }
    const btn = pressable.nth(i);
    if ((await btn.count()) === 0) continue;
    await btn.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1100);
    const landed = here();
    if (landed !== start.replace(/\/$/, '')) found.add(landed);
  }
  return found;
}

/*
 * The crawl. Breadth-first from the app's entry point, over the screens a
 * person actually lands on — not over the route table, which is the thing being
 * checked.
 */
const reached = new Set(['/']);
const frontier = ['/', '/account', '/trips', '/fleet', '/about', '/concierge', '/book'];
const visited = new Set();

for (const screen of frontier) {
  if (visited.has(screen)) continue;
  visited.add(screen);
  process.stdout.write(`  crawling ${screen} … `);
  const found = await reachableFrom(screen);
  for (const f of found) reached.add(f);
  console.log(`${found.size} destination(s)`);
}

await browser.close();

/* ── The verdict ────────────────────────────────────────────────────────── */

const unreachable = [];
for (const route of new Set(SHIPPED)) {
  const norm = route.replace(/\/$/, '') || '/';
  if (reached.has(norm)) continue;
  if (route in URL_ONLY) continue;
  unreachable.push(route);
}

console.log('\nreached by interaction:', [...reached].sort().join(', '));

console.log('\n=== REACHABILITY ===');
if (unreachable.length) {
  for (const r of unreachable) {
    problems.push(
      `${r} ships and no press reaches it. Link it from the navigation, or add it to URL_ONLY with the reason it may be URL-only.`,
    );
  }
  for (const p of problems) console.log('  ' + p);
  console.log(`\n${problems.length} unreachable route(s)`);
  process.exit(1);
}
console.log(
  `clean: every shipped route is reachable by interaction, or is listed as deliberately URL-only ` +
    `with a reason (${Object.keys(URL_ONLY).length} of those)`,
);

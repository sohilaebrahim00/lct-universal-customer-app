/**
 * THE CANCEL WALK.
 *
 * `tests/cancelPolicy.test.ts` proves the rule as pure functions and proves the
 * component's source prints no money. Neither of those proves the thing that
 * actually matters: that a customer can reach the control, that pressing it
 * changes the booking, and — the half a unit test cannot see — that the control
 * is GONE once the ride is under way.
 *
 * ── Every negative here has a positive control first ──────────────────────
 * This project has been burned three times by walks reporting present features
 * as absent, always because of a broken matcher and always as a confident
 * negative arriving in a group. So the two absence claims below are only made
 * after the SAME matcher, in the SAME browser context, has found the thing
 * present a moment earlier. A matcher that can never match cannot pass step 1.
 *
 * ── One context per scenario, deliberately ────────────────────────────────
 * The demo store is `localStorage`, so a scenario that cancels a ride has
 * poisoned it for the next. Each scenario opens its own context to get the
 * seeded board back. That is the opposite of `lifecycle-walk.mjs`, which needs
 * ONE context for the whole run because it is proving continuity — different
 * goal, different rule.
 *
 * ── What it cannot prove ──────────────────────────────────────────────────
 * That a real backend accepts a cancel at any of these statuses. This repo does
 * not hold the backend's cancel edges (see `CUSTOMER_CANCELLABLE`), so what is
 * verified is the CLIENT's behaviour against the demo layer, and nothing more.
 *
 * Usage: node scripts/cancel-walk.mjs   (needs `serve dist -l 5055 --single`)
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
const RIDE = 'demo-booking-upcoming';
const problems = [];

/**
 * The dispatch number, READ FROM `servicePolicy.ts` rather than typed here.
 *
 * A walk that hardcodes a figure it is checking for is asserting against its
 * own copy, and stops noticing when the app's changes. Null if the shape moves,
 * and the assertion that uses it is skipped rather than silently passing.
 */
const DISPATCH_PHONE = (() => {
  const src = readFileSync(join(process.cwd(), 'src', 'config', 'servicePolicy.ts'), 'utf8');
  const m = src.match(/dispatchPhone:\s*'([^']+)'/);
  return m ? m[1] : null;
})();

/**
 * THE COMPLETION LEDGER.
 *
 * Same device as the a11y gate. The summary at the bottom is derived from what
 * actually ran, so a walk that dies in the middle cannot print a clean result
 * for the scenarios it never reached.
 */
const scenarios = [
  ['detail', 'cancel from the trip screen'],
  ['list', 'cancel from the upcoming row'],
  ['underway', 'the control is absent once the ride is under way'],
];
const done = new Set();

const browser = await chromium.launch({ channel: 'chrome' });

async function freshPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[pageerror] ${page.url()} :: ${e.message.slice(0, 140)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[console] ${page.url()} :: ${m.text().slice(0, 140)}`);
  });
  return { ctx, page };
}

async function textAt(page, path, settle = 2600) {
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(settle);
  return (await page.evaluate(() => document.body.innerText || '')).trim();
}

function expect(where, haystack, needle) {
  if (haystack.includes(needle)) {
    console.log(`  ok    ${where.padEnd(22)} "${needle}"`);
    return true;
  }
  problems.push(`[${where}] expected "${needle}"; got: ${haystack.slice(0, 220).replace(/\n/g, ' | ')}`);
  console.log(`  MISS  ${where.padEnd(22)} "${needle}"`);
  return false;
}

function expectAbsent(where, haystack, needle) {
  if (!haystack.includes(needle)) {
    console.log(`  ok    ${where.padEnd(22)} no "${needle}"`);
    return true;
  }
  problems.push(`[${where}] "${needle}" should NOT be on screen`);
  console.log(`  BAD   ${where.padEnd(22)} found "${needle}"`);
  return false;
}

/**
 * The confirmation panel's OWN text, not the whole document.
 *
 * The list raises the confirmation in a transparent modal, so `body.innerText`
 * includes the trip rows behind the scrim — and those legitimately show the
 * booked fare. The first run of this walk reported "$199.30 in the list
 * confirmation" for exactly that reason: the matcher was reading the screen,
 * not the panel. The rule being checked is about what the CONFIRMATION says,
 * so the scope has to be the confirmation.
 *
 * Anchored on "Keep it" as well as the heading, so it cannot climb to <body>.
 */
async function panelText(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('*')];
    const head = all.find((el) => (el.textContent || '').trim() === 'Cancel this ride?');
    if (!head) return null;
    let node = head;
    while (node && node !== document.body) {
      const t = node.innerText || '';
      if (t.includes('Cancel this ride?') && t.includes('Keep it')) return t.trim();
      node = node.parentElement;
    }
    return null;
  });
}

/** No price may appear in a cancellation confirmation or on a cancelled record. */
function expectNoMoney(where, text) {
  const money = text.match(/\$\s?[\d,]+(\.\d{2})?/g);
  if (money) {
    problems.push(`[${where}] a figure that reads as money: ${money.join(', ')}`);
    console.log(`  BAD   ${where.padEnd(22)} money on screen: ${money.join(', ')}`);
    return false;
  }
  console.log(`  ok    ${where.padEnd(22)} no figure that reads as money`);
  return true;
}

// ── 1. Cancel from the trip screen ────────────────────────────────────────
console.log('--- 1. cancel from the trip screen ---');
{
  const { ctx, page } = await freshPage();

  const before = await textAt(page, `/trips/${RIDE}`);
  expect('trip screen', before, 'Cancel this ride');

  /*
    POSITIVE CONTROL for the A-2 assertion below. The tracking layout is on
    screen NOW — on web that layer renders this sentence in place of the native
    map. Asserting it present here is what makes its absence after cancelling
    mean something rather than being one more confident negative.
  */
  const MAP_LAYER = 'The live map is available in the iOS and Android app.';
  const mapShown = expect('trip screen', before, MAP_LAYER);

  await page.getByText('Cancel this ride', { exact: false }).first().click({ timeout: 15000 });
  await page.waitForTimeout(900);
  const panel = (await panelText(page)) ?? '';
  if (!panel) problems.push('[confirmation] the confirmation panel was not found in the DOM');

  expect('confirmation', panel, 'Cancel this ride?');
  // The window itself, stated — not a generic "are you sure". Either branch
  // names the window in hours; neither may name a charge.
  if (!/cancellation window|no charge/i.test(panel)) {
    problems.push(`[confirmation] no cancellation window stated; got: ${panel.slice(0, 220).replace(/\n/g, ' | ')}`);
    console.log('  MISS  confirmation          states the window');
  } else {
    console.log('  ok    confirmation          states the window, not a generic prompt');
  }
  if (!/\b\d+\s+hours?\b/i.test(panel)) {
    problems.push('[confirmation] the window was stated without a number of hours');
  }

  /*
    OUTSIDE THE WINDOW: the published tiers are stated, and cited.

    They were withheld at first on the reasoning that a charge on a screen is a
    commitment. That did not survive the file it came from — these are the
    client's own published figures, from the same policy paragraph as the free
    window this app has printed for weeks. Withholding them made the app know
    less than the website a customer could open in the next tab.

    Only asserted on the branch that renders them; inside the window there is
    no charge to state and saying so would be wrong.
  */
  if (/window .* has passed/i.test(panel)) {
    if (!/\d+%/.test(panel)) {
      problems.push('[confirmation] outside the window and no published tier stated');
      console.log('  MISS  confirmation          states the published tier');
    } else {
      console.log('  ok    confirmation          states the published tier');
    }
    expect('confirmation', panel, 'lctuniversal.com/cancellation-policy');
    // The waiver is a discretion. Beside a confirm button it reads as an
    // entitlement, so it stays out.
    expectAbsent('confirmation', panel, 'may be waived');
  }

  // A percentage the business publishes is policy. A dollar amount would be
  // this app computing what THIS customer owes, which nothing authorised.
  expectNoMoney('confirmation', panel);
  expect('confirmation', panel, 'Keep it');

  await page.getByText('Cancel the ride', { exact: false }).first().click({ timeout: 15000 });
  await page.waitForTimeout(1800);
  const after = (await page.evaluate(() => document.body.innerText || '')).trim();

  expect('after cancel', after, 'This ride was cancelled');
  expect('after cancel', after, 'Nothing was charged for this ride.');
  expect('after cancel', after, 'Book this journey again');
  /*
    A-2: THE RECORD REPLACES THE LIVE LAYOUT.

    This is the assertion that matters most now, because the cancel above is
    what produces cancelled bookings in the first place. Before this screen
    existed, a customer who cancelled landed on a full-bleed map tracking a car
    that was not coming — the first place the new feature leads was the least
    finished screen in the app.

    The map layer, the live badge and the route to dispatch all belong to a
    ride in progress and none of them may survive into the record.
  */
  if (mapShown) {
    expectAbsent('after cancel', after, MAP_LAYER);
  } else {
    problems.push('[after cancel] map-layer absence not asserted — the positive control did not find it first');
    console.log('  SKIP  after cancel          map absence not asserted');
  }
  expectAbsent('after cancel', after, 'Live');
  if (DISPATCH_PHONE) expectAbsent('after cancel', after, DISPATCH_PHONE);
  expectNoMoney('after cancel', after);

  await ctx.close();
  done.add('detail');
}

// ── 2. Cancel from the upcoming row ───────────────────────────────────────
console.log('--- 2. cancel from the upcoming row ---');
{
  const { ctx, page } = await freshPage();

  const list = await textAt(page, '/trips');
  expect('trips list', list, 'Cancel this ride');

  await page.getByText('Cancel this ride', { exact: false }).first().click({ timeout: 15000 });
  await page.waitForTimeout(900);
  // Scoped to the panel — the rows behind the scrim carry the booked fare, and
  // that is the list doing its job rather than the confirmation naming a charge.
  const modal = (await panelText(page)) ?? '';
  if (!modal) problems.push('[list confirmation] the confirmation panel was not found in the DOM');
  expect('list confirmation', modal, 'Cancel this ride?');
  expectNoMoney('list confirmation', modal);

  await page.getByText('Cancel the ride', { exact: false }).first().click({ timeout: 15000 });
  await page.waitForTimeout(2000);
  const after = (await page.evaluate(() => document.body.innerText || '')).trim();

  // It leaves Upcoming — the same filter every other tab uses, so this is the
  // list agreeing with the store rather than the row being edited in place.
  if (/Upcoming\s*\n?\s*0/.test(after) || after.includes('No upcoming trips')) {
    console.log('  ok    trips list            the ride left Upcoming');
  } else {
    problems.push(`[trips list] the cancelled ride did not leave Upcoming; got: ${after.slice(0, 220).replace(/\n/g, ' | ')}`);
    console.log('  MISS  trips list            the ride left Upcoming');
  }

  await ctx.close();
  done.add('list');
}

// ── 3. The control is absent once the ride is under way ───────────────────
console.log('--- 3. absent once the ride is under way (positive control first) ---');
{
  const { ctx, page } = await freshPage();

  // POSITIVE CONTROL. The same matcher, the same context, before anything
  // moves. If this misses, the absence below proves nothing and the walk says
  // so rather than passing.
  const pre = await textAt(page, `/trips/${RIDE}`);
  const controlFound = expect('positive control', pre, 'Cancel this ride');

  // Drive the chauffeur forward to passenger_picked_up.
  for (const label of ["I'm on my way", "I've arrived", 'Passenger on board']) {
    const t = await textAt(page, `/_role/status?id=${RIDE}`);
    if (!t.includes(label)) {
      problems.push(`[chauffeur] expected "${label}"; got: ${t.slice(0, 160).replace(/\n/g, ' | ')}`);
      break;
    }
    await page.getByText(label, { exact: false }).first().click({ timeout: 15000 });
    await page.waitForTimeout(900);
    const confirm = (await page.evaluate(() => document.body.innerText || '')).trim();
    if (confirm.includes('Confirm —')) {
      await page.getByText('Confirm —', { exact: false }).first().click({ timeout: 15000 });
      await page.waitForTimeout(900);
    }
  }

  const underway = await textAt(page, `/trips/${RIDE}`);
  expect('under way', underway, 'You are on board');
  if (controlFound) {
    expectAbsent('under way', underway, 'Cancel this ride');
  } else {
    problems.push('[under way] absence not asserted — the positive control did not find the button first');
    console.log('  SKIP  under way             absence not asserted (no positive control)');
  }

  await ctx.close();
  done.add('underway');
}

await browser.close();

// ── The result, derived from what ran ─────────────────────────────────────
console.log('\n=== CANCEL WALK ===');
const missed = scenarios.filter(([k]) => !done.has(k));
if (missed.length) {
  for (const [, label] of missed) console.log(`INCOMPLETE — never ran: ${label}`);
  process.exit(2);
}
if (problems.length) {
  for (const p of problems) console.log(p);
  console.log(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(
  'clean: cancel reachable from the trip screen and the upcoming row; the confirmation states the real window ' +
    'and, outside it, the published tier with its source and no waiver; cancelling replaces the live layout with ' +
    'a record carrying no map, no dispatch bar and no figure; and the control is absent once the ride is under way',
);

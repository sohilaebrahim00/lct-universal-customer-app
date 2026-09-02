/**
 * THE BOOKING WALK — the path that had no automated evidence behind it.
 *
 * ── Why this did not exist, and why that was invisible ────────────────────
 * `sweep.mjs` drove the flow only as far as *Confirm pickup*, then visited
 * `/book/vehicle`, `/book/details`, `/book/payment` and `/book/confirmed`
 * DIRECTLY BY URL. Reached that way they render GUARD states — "We need your
 * pickup time first" — and a guard state has text, no console error and no
 * blank screen. **The sweep's assertions were all true of a screen that was
 * refusing to work.** Four screenshots and four green checks on the most
 * important path in the product, none of which had been through it.
 *
 * Name the failure a booking gate exists to prevent — "the flow does not get
 * from home to a payable fare" — and ask whether the old assertions would be
 * false in that state. They would not. Hence this file.
 *
 * ── Everything here advances by INTERACTION ───────────────────────────────
 * No step is reached by `goto`. If a control does not exist, or does not
 * advance, the walk stops at that step and says which one — because arriving
 * by URL is exactly how the gap stayed hidden.
 *
 * ── Two matcher traps this file was written around ────────────────────────
 * 1. expo-router keeps prior screens MOUNTED, so `body.innerText` contains the
 *    home screen underneath the booking screen. A `.first()` text match on
 *    "DFW Terminal D" hits the home screen's existing ride, not the saved
 *    location row. Both are why this uses `.last()` and matches on ADDRESS
 *    strings that appear only in the picker list.
 * 2. For the same reason, "did the step advance" is judged by URL, never by
 *    reading text off the page.
 *
 * Usage: node scripts/booking-walk.mjs   (needs `serve dist -l 5055 --single`)
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
 * THE COMPLETION LEDGER — same device as the a11y gate.
 * The verdict is derived from what ran, so a walk that dies mid-journey cannot
 * print a clean result for the journey it abandoned.
 */
const journeys = [
  ['point_to_point', 'Point to Point — home to a payable fare, by interaction only'],
  ['hourly_fenced', 'Hourly — fenced at BOTH entry points, not walkable into a dead end'],
];
const done = new Set();

const browser = await chromium.launch({ channel: 'chrome' });

function path(page) {
  return new URL(page.url()).pathname;
}

async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[pageerror] ${path(page)} :: ${e.message.slice(0, 140)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[console] ${path(page)} :: ${m.text().slice(0, 140)}`);
  });
  return { ctx, page };
}

/**
 * Press a control and require the URL to change.
 *
 * `.last()` deliberately: prior screens stay mounted, and the earlier ones
 * carry the same words. Returns false and records the step that stalled.
 */
async function step(page, label, expectPath, what) {
  const before = path(page);
  const el = page.getByText(label, { exact: false }).last();
  if ((await el.count()) === 0) {
    problems.push(`[${what}] no control matching "${label}" at ${before}`);
    console.log(`  MISS  ${what.padEnd(26)} no "${label}" at ${before}`);
    return false;
  }
  await el.click({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(2200);

  /*
   * ONE BOUNDED RE-CHECK, and no more.
   *
   * Run back-to-back with three other Chromium walks, this step once reported
   * `"Reserve Your Ride" left the flow at /about` and passed in isolation
   * seconds later — CPU contention, not a defect. Same race `assertRendered()`
   * met in the a11y gate, and the same repair: a little patience, not a
   * softened assertion. An intermittent gate teaches people to re-run until
   * green, which is worse than no gate.
   *
   * A screen that has not navigated after five seconds has not navigated.
   */
  let after = path(page);
  if (expectPath && after !== expectPath) {
    await page.waitForTimeout(2800);
    after = path(page);
  }
  if (expectPath && after !== expectPath) {
    problems.push(`[${what}] "${label}" left the flow at ${after}, expected ${expectPath}`);
    console.log(`  MISS  ${what.padEnd(26)} ${before} -> ${after} (wanted ${expectPath})`);
    return false;
  }
  console.log(`  ok    ${what.padEnd(26)} ${before} -> ${after}`);
  return true;
}

/** Every currency figure on screen, in order. */
async function figures(page) {
  const t = await page.evaluate(() => document.body.innerText || '');
  return t.match(/\$[\d,]+\.\d{2}/g) ?? [];
}

/**
 * The point-to-point journey, home to a payable fare, by interaction only.
 *
 * Entry is the home CTA, which `HomeView` wires to `startBooking('point_to_point')`
 * and pushes straight to `/book/pickup` — the service picker at `/book` is
 * reached from About, Corporate, Demo-trip and Fleet, not from home.
 */
async function journey(key, hourly) {
  console.log(`\n--- point to point, home to payment ---`);
  const { ctx, page } = await fresh();
  const fail = (why) => {
    problems.push(`[${key}] ${why}`);
    console.log(`  STOP  ${why}`);
  };

  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(3000);

  if (!(await step(page, 'Book a car', '/book/pickup', 'home -> pickup'))) {
    await ctx.close();
    return;
  }

  // Saved locations are matched by ADDRESS — the names appear on the home
  // screen underneath, the addresses do not.
  if (!(await step(page, '4820 Maple Ave, Dallas, TX', '/book/destination', 'pickup -> destination'))) {
    await ctx.close();
    return;
  }

  if (
    !(await step(page, '2337 S International Pkwy, DFW Airport, TX', '/book/details', 'destination -> details'))
  ) {
    await ctx.close();
    return;
  }

  // A date and time are required before the flow will continue at all — the
  // guard that made the URL-visited screenshots meaningless.
  const when = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dateInput = page.locator('input[type=date]').last();
  const timeInput = page.locator('input[type=time]').last();
  if ((await dateInput.count()) === 0 || (await timeInput.count()) === 0) {
    fail('the details step has no date/time input');
    await ctx.close();
    return;
  }
  await dateInput.fill(when.toISOString().slice(0, 10));
  await timeInput.fill('14:30');
  await page.waitForTimeout(1200);

  /*
   * HOURLY CARRIES A DURATION CONTROL AND POINT-TO-POINT DOES NOT.
   * Asserted in both directions: its presence on hourly, its absence on the
   * other. A control that renders everywhere would pass a presence-only check.
   */
  const durationCount = await page.getByText('Duration', { exact: false }).count();
  if (hourly && durationCount === 0) {
    fail('hourly has no Duration control on the details step');
  }
  if (!hourly && durationCount > 0) {
    fail('a Duration control appeared on a point-to-point booking');
  }
  console.log(`  ok    ${'duration control'.padEnd(26)} ${hourly ? 'present on hourly' : 'absent on point-to-point'}`);

  if (!(await step(page, 'Choose your car', '/book/vehicle', 'details -> vehicle'))) {
    await ctx.close();
    return;
  }

  /*
   * THE FARE MUST SURVIVE THE STEP.
   *
   * `quoteIsNotScaled.test.ts` forbids a quoted fare being scaled after the
   * fact as a matter of source. This is the same promise measured on screen:
   * the figure on the card the customer picked is the figure on the payment
   * screen, character for character.
   */
  const onPicker = await figures(page);
  if (onPicker.length === 0) {
    fail('the vehicle picker rendered no fare at all');
    await ctx.close();
    return;
  }
  const picked = onPicker[0];
  console.log(`  ok    ${'picker fare'.padEnd(26)} ${picked}`);

  if (!(await step(page, 'Executive Sedan', '/book/vehicle', 'select a class'))) {
    await ctx.close();
    return;
  }
  if (!(await step(page, 'Review & pay', '/book/payment', 'vehicle -> payment'))) {
    await ctx.close();
    return;
  }

  const onPayment = await figures(page);
  if (!onPayment.includes(picked)) {
    fail(`the picker said ${picked}; the payment screen shows ${onPayment.join(', ') || 'no figure'}`);
  } else {
    console.log(`  ok    ${'fare survived the step'.padEnd(26)} ${picked} on both screens`);
  }

  /*
   * THE TWO POLICY SENTENCES. Both are resolved per service type from
   * `servicePolicy`, so hourly (48 hours) and point-to-point (12 hours) state
   * DIFFERENT windows — the figure is checked for presence, never hardcoded
   * here, because the business owns it and this walk does not.
   */
  const text = await page.evaluate(() => document.body.innerText || '');
  if (!/free cancellation until \d+ hours? before pickup/i.test(text)) {
    fail('the payment screen does not state the free cancellation window');
  } else {
    console.log(`  ok    ${'cancellation window'.padEnd(26)} stated`);
  }
  if (!/\d+ minutes of complimentary wait/i.test(text)) {
    fail('the payment screen does not state the complimentary wait');
  } else {
    console.log(`  ok    ${'complimentary wait'.padEnd(26)} stated`);
  }

  // The estimated drop-off, which Blacklane shows and we already compute.
  if (!/arrives approx/i.test(text)) {
    fail('the payment screen does not state an estimated arrival');
  } else {
    console.log(`  ok    ${'estimated arrival'.padEnd(26)} stated`);
  }

  await ctx.close();
  done.add(key);
}

/**
 * HOURLY IS FENCED IN A DEMO BUILD, AND THE FENCE HAD ONE GAP.
 *
 * Hourly needs a duration the route order does not collect, so it reaches the
 * vehicle screen with both mainstream classes reading "Not available for this
 * trip" — a dead end at step 4 of 5. `HomeView` therefore marks the home tile
 * unavailable.
 *
 * **That fence covered one of five entry points.** `/about`, `/corporate-info`,
 * `/demo-trip` and `/fleet/[id]` all push to the service picker at `/book`,
 * which listed Hourly with no fence at all. Walked from About → "Reserve Your
 * Ride" → Hourly → Continue, a customer landed in the dead end. Found by
 * driving it; no gate could see it, because every screen on the way rendered
 * text and threw no error.
 *
 * So the hourly assertion is not "can I book one" — in this build mode you
 * deliberately cannot. It is "does the fence hold at BOTH doors".
 */
async function hourlyIsFenced() {
  console.log(`
--- hourly, fenced at both doors ---`);

  // ── Door 1: the service picker, reached the way a customer reaches it ────
  {
    const { ctx, page } = await fresh();
    await page.goto(BASE + '/about', { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(3000);
    if (!(await step(page, 'Reserve Your Ride', '/book', 'about -> service picker'))) {
      await ctx.close();
      return;
    }

    /*
     * POSITIVE CONTROL. A live service must select and advance in THIS context
     * with THIS matcher, or the refusal below proves nothing — a picker where
     * nothing at all is clickable would sail through it.
     */
    if (!(await step(page, 'Point to Point', '/book', 'picker: a live service selects'))) {
      await ctx.close();
      return;
    }
    if (!(await step(page, 'Continue', '/book/pickup', 'picker: Continue advances'))) {
      await ctx.close();
      return;
    }
    await ctx.close();
  }

  // ── The fenced one, in a CLEAN context ──────────────────────────────────
  // A fresh draft matters: with point-to-point left selected from the control
  // above, Continue would advance on THAT and this would pass for the wrong
  // reason.
  {
    const { ctx, page } = await fresh();
    await page.goto(BASE + '/book', { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(3000);

    await page.getByText('Hourly Chauffeur', { exact: false }).last().click({ timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1600);

    /*
     * THE ASSERTION THAT ACTUALLY DISCRIMINATES.
     *
     * An earlier version checked that tapping Hourly "stayed on /book".
     * Selecting a service never navigates — it only sets draft state — so that
     * was true with the fence in place AND with it removed. Decorative, by
     * exactly the rule this project now applies to every gate: name the
     * failure, and ask whether the assertion would be false in it.
     *
     * Pressing Continue is the discriminating act. Fenced, nothing is selected
     * and Continue is disabled; unfenced, it advances into the dead end.
     */
    await page.getByText('Continue', { exact: false }).last().click({ timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const after = path(page);
    if (after !== '/book') {
      problems.push(`[hourly_fenced] Hourly + Continue advanced to ${after} — the dead end is reachable again`);
      console.log(`  BAD   ${'hourly cannot advance'.padEnd(26)} reached ${after}`);
    } else {
      console.log(`  ok    ${'hourly cannot advance'.padEnd(26)} Continue stayed on /book`);
    }

    const text = await page.evaluate(() => document.body.innerText || '');
    if (!/not in this preview/i.test(text)) {
      problems.push('[hourly_fenced] the picker does not say why Hourly is unavailable');
      console.log(`  MISS  ${'fence says why'.padEnd(26)} no "not in this preview" copy`);
    } else {
      console.log(`  ok    ${'fence says why'.padEnd(26)} "Not in this preview"`);
    }
    await ctx.close();
  }

  // ── Door 2: the home tile, which carried the fence all along ────────────
  {
    const { ctx, page } = await fresh();
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(3000);
    const tile = page.getByLabel(/Hourly — not in this preview/i);
    if ((await tile.count()) === 0) {
      problems.push('[hourly_fenced] the home tile no longer marks Hourly unavailable');
      console.log(`  MISS  ${'home tile fenced'.padEnd(26)} label not found`);
    } else {
      console.log(`  ok    ${'home tile fenced'.padEnd(26)} "Hourly — not in this preview"`);
    }
    await ctx.close();
  }

  done.add('hourly_fenced');
}
await journey('point_to_point', false);
await hourlyIsFenced();

await browser.close();

console.log('\n=== BOOKING WALK ===');
const missed = journeys.filter(([k]) => !done.has(k));
if (missed.length) {
  for (const [, label] of missed) console.log(`INCOMPLETE — never completed: ${label}`);
  for (const p of problems) console.log('  ' + p);
  process.exit(2);
}
if (problems.length) {
  for (const p of problems) console.log('  ' + p);
  console.log(`\n${problems.length} problem(s)`);
  process.exit(1);
}
/*
 * The summary says what RAN. An earlier draft of this line claimed "both
 * journeys driven home-to-payment" and "the duration control appears on hourly"
 * — neither true, because hourly is fenced in this build mode and is asserted
 * as fenced rather than driven. Output describing more than execution is a
 * category this project has paid for twice.
 */
console.log(
  'clean: point-to-point driven home-to-payment by interaction only — the picker fare reaches ' +
    'the payment screen unchanged ($ for $), no duration control on a point-to-point trip, and the ' +
    'cancellation window, complimentary wait and estimated arrival are all stated; hourly is ' +
    'confirmed fenced at BOTH entry points, after a positive control proved a live service still selects',
);
console.log(
  'NOT COVERED — an hourly booking cannot be completed in a demo build by design (it needs a ' +
    'duration the route order does not collect). Driving one end to end needs a non-demo export.',
);

/**
 * THE LIFECYCLE SEQUENCE WALK.
 *
 * A state machine cannot be verified by a screenshot, for the same reason a
 * layout could not be verified at one width: correctness is a SEQUENCE, and a
 * snapshot is one frame of it. `tests/rideStage.test.ts` proves the transitions
 * as pure functions. This proves the thing no unit test can — that the three
 * views share one store, so an action taken in the chauffeur preview moves the
 * customer's screen and the dispatcher's board.
 *
 * It drives ONE browser context throughout, because the demo store is
 * `localStorage`: a second context is a second store, and a walk that opened a
 * fresh page per step would prove nothing while appearing to pass.
 *
 * ── What it proves, and what it cannot ─────────────────────────────────────
 * Proves: chauffeur action → customer headline and dispatcher status column
 * change, in order, with the arrival overlay producing a stage no backend
 * status can express.
 *
 * Cannot prove: real elapsed time (the waiting countdown is read seconds after
 * arrival, not thirty minutes later); propagation between two DEVICES, which
 * needs the socket in G-3 and does not exist; or that any of this works against
 * a real backend, which has no arrived-at-pickup status at all (C-4).
 *
 * ── Why the dispatcher assertions target the RIDE, not the board ──────────
 * The first version asserted against /_role/dispatcher. That board shows
 * TODAY, and this ride is scheduled for tomorrow, so it was correctly absent
 * and the walk was wrong rather than the app. Same shape as an earlier walk in
 * this project that failed near midnight because a booking landed on the next
 * day. The dispatcher RIDE view is keyed by id and has no date filter, so it
 * asserts what was meant: that dispatch sees the same stage.
 *
 * Usage: node scripts/lifecycle-walk.mjs   (needs `serve dist -l 5055 --single`)
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
const RIDE = 'demo-booking-upcoming';
const problems = [];

const browser = await chromium.launch({ channel: 'chrome' });
// ONE context for the whole walk — see the note above.
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
const page = await ctx.newPage();
page.on('pageerror', (e) => problems.push(`[pageerror] ${page.url()} :: ${e.message.slice(0, 140)}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`[console] ${page.url()} :: ${m.text().slice(0, 140)}`);
});

async function textAt(path, settle = 2600) {
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(settle);
  return (await page.evaluate(() => document.body.innerText || '')).trim();
}

/** Presses the chauffeur's single action, twice if it asks to confirm. */
async function chauffeurPress(expectLabel) {
  const t = await textAt(`/_role/status?id=${RIDE}`);
  if (!t.includes(expectLabel)) {
    problems.push(`[action] expected "${expectLabel}" on the chauffeur screen, got: ${t.slice(0, 160)}`);
    return false;
  }
  await page.getByText(expectLabel, { exact: false }).first().click({ timeout: 15000 });
  await page.waitForTimeout(900);
  const after = (await page.evaluate(() => document.body.innerText || '')).trim();
  if (after.includes('Confirm —')) {
    await page.getByText('Confirm —', { exact: false }).first().click({ timeout: 15000 });
    await page.waitForTimeout(900);
  }
  return true;
}

function expect(where, haystack, needle) {
  if (haystack.includes(needle)) {
    console.log(`  ok    ${where.padEnd(22)} "${needle}"`);
  } else {
    problems.push(`[${where}] expected "${needle}"; got: ${haystack.slice(0, 200).replace(/\n/g, ' | ')}`);
    console.log(`  MISS  ${where.padEnd(22)} "${needle}"`);
  }
}

console.log('--- 1. before any action ---');
expect('customer', await textAt(`/trips/${RIDE}`), 'Chauffeur Assigned');
expect('dispatcher', await textAt(`/_role/ride?id=${RIDE}`), 'Chauffeur Assigned');

console.log("--- 2. chauffeur: I'm on my way ---");
await chauffeurPress("I'm on my way");
expect('customer', await textAt(`/trips/${RIDE}`), 'Chauffeur En Route');
expect('dispatcher', await textAt(`/_role/ride?id=${RIDE}`), 'Chauffeur En Route');

console.log("--- 3. chauffeur: I've arrived  (the stage no backend status can express) ---");
await chauffeurPress("I've arrived");
const arrivedCustomer = await textAt(`/trips/${RIDE}`);
expect('customer', arrivedCustomer, 'Your chauffeur is outside');
expect('customer', arrivedCustomer, 'Complimentary wait');
expect('dispatcher', await textAt(`/_role/ride?id=${RIDE}`), 'Arrived at Pickup');

// The countdown must be a clock, not a price. Asserted on the rendered screen,
// not just in the unit test, because this is where a customer would read it.
if (/\$|\bfee\b|per minute/i.test(arrivedCustomer.split('Complimentary')[1] ?? '')) {
  problems.push('[waiting] the waiting block rendered something that looks like money');
}

console.log('--- 4. chauffeur: passenger on board (irreversible, asks to confirm) ---');
await chauffeurPress('Passenger on board');
expect('customer', await textAt(`/trips/${RIDE}`), 'You are on board');

console.log('--- 5. chauffeur: start the trip ---');
await chauffeurPress('Start the trip');
expect('customer', await textAt(`/trips/${RIDE}`), 'On the way to your destination');

console.log('--- 6. chauffeur: complete the ride (irreversible) ---');
await chauffeurPress('Complete the ride');
const receipt = await textAt(`/trips/${RIDE}`, 3200);
expect('receipt', receipt, 'Thank you for riding with us');
expect('receipt', receipt, 'Fixed when you booked');
expect('receipt', receipt, 'How was your ride?');
expect('dispatcher', await textAt(`/_role/ride?id=${RIDE}`), 'Completed');

await browser.close();
console.log('\n=== LIFECYCLE WALK ===');
if (problems.length === 0) {
  console.log('clean: all seven stages driven from the chauffeur view, reflected in the customer and dispatcher views');
} else {
  console.log(`${problems.length} problems`);
  for (const p of problems.slice(0, 20)) console.log('  ' + p);
}
process.exit(problems.length ? 1 : 0);

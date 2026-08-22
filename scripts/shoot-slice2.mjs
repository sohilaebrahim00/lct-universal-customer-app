/**
 * Slice 2 screenshots: the extended gallery plus the three screens that were
 * rewired onto the shared primitives.
 *
 * Drives the real UI. Guest mode and the onboarding flag are seeded through the
 * two AsyncStorage keys the app itself writes, so the run lands past the welcome
 * gate deterministically instead of depending on click timing. No fixtures.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

function resolvePlaywright() {
  if (process.env.PLAYWRIGHT_PATH) return process.env.PLAYWRIGHT_PATH;
  const cache = join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
  for (const dir of readdirSync(cache)) {
    const candidate = join(cache, dir, 'node_modules', 'playwright');
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('playwright not found; set PLAYWRIGHT_PATH');
}
const { chromium } = createRequire(import.meta.url)(resolvePlaywright());

const BASE = 'http://localhost:8081';
const OUT = 'design/progress';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
await context.addInitScript(() => {
  localStorage.setItem('lct-universal:onboarding-seen', 'true');
  localStorage.setItem('lct-universal:guest-mode', 'true');
});

const page = await context.newPage();
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

async function visit(route, settle = 3500) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 180_000 });
  await page.waitForTimeout(settle);
}
async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  wrote ${OUT}/${name}.png`);
}
async function scrollTo(y) {
  await page.evaluate((top) => {
    const el = document.scrollingElement || document.body;
    el.scrollTop = top;
    document.querySelectorAll('div').forEach((d) => {
      if (d.scrollHeight > d.clientHeight + 50) d.scrollTop = top;
    });
  }, y);
  await page.waitForTimeout(600);
}

await visit('/');
await shot('02-home-tabbar-four-tabs');

await visit('/trips');
await shot('02-trips-guest-authgate');

await visit('/account');
await shot('02-account-guest');
await scrollTo(600);
await shot('02-account-guest-scrolled');

await visit('/_dev/gallery', 4500);
for (const y of [0, 900, 1800, 2700, 3600, 4500, 5400, 6300, 7200]) {
  await scrollTo(y);
  await shot(`02-gallery-${String(y).padStart(4, '0')}`);
}

await browser.close();
if (problems.length) {
  console.error(`\n${problems.length} console problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nzero console errors');

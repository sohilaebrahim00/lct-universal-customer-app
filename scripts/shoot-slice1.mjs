/**
 * Slice 1 screenshots: the design-system gallery and Home.
 *
 * Drives the real UI rather than injecting fixtures. Guest mode and the
 * onboarding flag are seeded through AsyncStorage's own web backing store
 * (localStorage) so the run lands on Home deterministically instead of
 * depending on click timing — the same two keys the app itself writes.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Playwright is NOT a dependency of this project and is not being made one —
 * adding a package needs approval, and this is review tooling rather than app
 * code. It is resolved out of the npx cache where 'npx playwright' already put
 * it, or from PLAYWRIGHT_PATH if that ever stops being true.
 */
function resolvePlaywright() {
  if (process.env.PLAYWRIGHT_PATH) return process.env.PLAYWRIGHT_PATH;
  const cache = join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
  if (!existsSync(cache)) throw new Error('playwright not found; set PLAYWRIGHT_PATH');
  for (const dir of readdirSync(cache)) {
    const candidate = join(cache, dir, 'node_modules', 'playwright');
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('playwright not found in the npx cache; set PLAYWRIGHT_PATH');
}

const { chromium } = createRequire(import.meta.url)(resolvePlaywright());
import { mkdir } from 'node:fs/promises';

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

async function shoot(name, route, { full = false, settle = 3500 } = {}) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 180_000 });
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log(`  wrote ${OUT}/${name}.png`);
}

// Home, guest: no account, so no upcoming trip and no book-again history.
// This is the genuine reachable state in a build with no Supabase and no backend.
await shoot('01-home-guest-no-upcoming', '/');

// The gallery: every primitive in every state.
await shoot('01-gallery-full', '/_dev/gallery', { full: true, settle: 4500 });
// Viewport-sized slices, so the states are readable at 1x in review.
for (const y of [0, 900, 1800, 2700, 3600, 4500]) {
  await page.evaluate((top) => {
    const el = document.scrollingElement || document.body;
    el.scrollTop = top;
    document.querySelectorAll('div').forEach((d) => { if (d.scrollHeight > d.clientHeight + 50) d.scrollTop = top; });
  }, y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/01-gallery-${String(y).padStart(4, '0')}.png` });
  console.log(`  wrote ${OUT}/01-gallery-${String(y).padStart(4, '0')}.png`);
}

await browser.close();
if (problems.length) {
  console.error(`\n${problems.length} console problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nzero console errors');

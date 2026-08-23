/**
 * Screenshot harness for the slice loop.
 *
 * Drives the running Expo web dev server with headless Chromium at a 390x844
 * phone viewport in dark mode, and writes one PNG per named state.
 *
 * Dev server, not the exported build, on purpose: the design-system gallery is
 * guarded by `__DEV__` (see app/_dev/gallery.tsx), so it does not exist in a
 * production export.
 *
 * Usage: node scripts/shoot.mjs <outDir> <name>=<path> [<name>=<path> ...]
 */

import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

/**
 * Playwright comes from the npx cache, not from `node_modules`.
 *
 * It is deliberately NOT a project dependency — it is a ~300 MB browser
 * harness used only by these scripts, and adding it to `package.json` would put
 * it in every install of an app that never runs it.
 *
 * ── This file used to say `import { chromium } from 'playwright'` ───────────
 * Which meant it could not run AT ALL: `Cannot find package 'playwright'`. The
 * lint rule reporting it was telling the truth, and `scripts/` was excluded
 * from the lint target *because of that error* — so the exclusion existed to
 * silence a real defect, and then hid it for the rest of the project. The five
 * sibling scripts had always resolved it this way; only this one had not.
 *
 * `PLAYWRIGHT_PATH` overrides, for a machine where the cache is elsewhere.
 */
function playwrightPath() {
  if (process.env.PLAYWRIGHT_PATH) return process.env.PLAYWRIGHT_PATH;
  const cache = join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
  if (!existsSync(cache)) throw new Error('playwright not found; set PLAYWRIGHT_PATH');
  for (const dir of readdirSync(cache)) {
    const candidate = join(cache, dir, 'node_modules', 'playwright');
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('playwright not found in the npx cache; set PLAYWRIGHT_PATH');
}

const { chromium } = createRequire(import.meta.url)(playwrightPath());

const BASE = process.env.SHOOT_BASE ?? 'http://localhost:8081';
const [outDir, ...targets] = process.argv.slice(2);

if (!outDir || targets.length === 0) {
  console.error('usage: node scripts/shoot.mjs <outDir> <name>=<path> ...');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
});

const page = await context.newPage();

/** Console errors are a gate, not decoration — a slice with any is not green. */
const problems = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`);
});
page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));

for (const target of targets) {
  const eq = target.indexOf('=');
  const name = target.slice(0, eq);
  const path = target.slice(eq + 1);
  const [route, modifier] = path.split('#');

  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 120_000 });
  // Expo Router hydrates after load; fonts settle a beat later.
  await page.waitForTimeout(2500);

  const fullPage = modifier === 'full';
  if (fullPage) {
    // A full-page shot of a flex-height app needs the scroll container's real height.
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage });
  console.log(`  wrote ${outDir}/${name}.png`);
}

await browser.close();

if (problems.length > 0) {
  console.error(`\n${problems.length} console problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nzero console errors');

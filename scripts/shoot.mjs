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

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

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

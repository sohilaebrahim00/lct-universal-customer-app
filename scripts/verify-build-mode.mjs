#!/usr/bin/env node
/**
 * BUILD-MODE VERIFICATION. Runs after every export and fails the build.
 *
 * ── The defect this exists to make impossible ───────────────────────────────
 * Metro's transform cache DOES NOT KEY ON `EXPO_PUBLIC_*` VALUES. Those
 * variables are inlined into modules at transform time, and a cached transform
 * is reused across builds even when the value has changed. So:
 *
 *   EXPO_PUBLIC_DEMO_MODE=true  npx expo export   # demo build, fine
 *   EXPO_PUBLIC_DEMO_MODE=false npx expo export   # STILL SAYS "true" INSIDE
 *
 * Observed, not theorised. It produced a bundle where `metro.config.js` had
 * read `false` — so `app/_role/` was correctly stripped — while the runtime
 * constant was inlined as `"true"`, so the Account screen still rendered the
 * role-preview switcher and pushed to routes that were not in the bundle.
 * `metro.config.js` reads `process.env` fresh on every run; the inlined
 * constant does not.
 *
 * The consequence at release: building the shipping app straight after a demo
 * build ships seeded fake customers, fake trips and a "Reset demo" button to
 * real users, and `expo export` exits 0 the whole way.
 *
 * ── Why a script and not a note in the README ───────────────────────────────
 * A defect whose fix is "remember to pass --clear" is not fixed. `--clear` is
 * now the default in the export scripts, which is hygiene; THIS is the fix. A
 * build that can lie about its own mode must not be able to complete.
 *
 * ── What it checks ──────────────────────────────────────────────────────────
 * The emitted bundle's inlined `EXPO_PUBLIC_DEMO_MODE` against the value the
 * environment actually asked for. It reads the bundle, not the config, because
 * the bundle is the artefact that ships.
 *
 * ── Generalising ────────────────────────────────────────────────────────────
 * This is a CLASS of bug, not one incident. Any `EXPO_PUBLIC_*` constant can go
 * stale the same way. Anyone adding a flag that changes what ships should add
 * it to CHECKS below.
 *
 * Usage:  node scripts/verify-build-mode.mjs <outputDir>
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] ?? 'dist';
const bundleDir = join(outDir, '_expo', 'static', 'js', 'web');

/**
 * Resolves a variable the way the Expo CLI does, so "what was requested" means
 * the same thing here as it does at transform time.
 *
 * A value already present in the environment wins; otherwise `.env` supplies
 * it. That is dotenv's own rule — it never overwrites an existing variable —
 * and getting it wrong here would make this script fail correct builds, which
 * is the fastest way to get a safety check deleted.
 *
 * Deliberately a small hand-rolled parser rather than a dependency: this runs
 * before anything else is trusted, and it only needs `KEY=value` lines.
 */
function requestedEnv(name) {
  if (process.env[name] !== undefined) return process.env[name];
  if (!existsSync('.env')) return undefined;
  for (const raw of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() !== name) continue;
    return line
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
  return undefined;
}

function fail(lines) {
  console.error('\n[31m✖ BUILD MODE VERIFICATION FAILED[0m\n');
  for (const line of lines) console.error('  ' + line);
  console.error('');
  process.exit(1);
}

if (!existsSync(bundleDir)) {
  fail([
    `No web bundle found at ${bundleDir}.`,
    'Expected an `expo export --platform web` to have just run.',
    `If you exported somewhere else, pass the directory: node scripts/verify-build-mode.mjs <dir>`,
  ]);
}

const bundles = readdirSync(bundleDir).filter((f) => f.endsWith('.js'));
if (bundles.length === 0) fail([`No .js bundle in ${bundleDir}.`]);

const source = bundles.map((f) => readFileSync(join(bundleDir, f), 'utf8')).join('\n');

/**
 * Each check pairs an environment flag with a marker that must be present when
 * it is on and absent when it is off.
 */
const CHECKS = [
  {
    env: 'EXPO_PUBLIC_DEMO_MODE',
    // How Metro inlines it. Matching the assignment rather than the bare word
    // avoids colliding with the variable's own name elsewhere in the bundle.
    marker: /EXPO_PUBLIC_DEMO_MODE\s*:\s*"(true|false)"/,
    describe: 'demo mode',
  },
];

const problems = [];

for (const check of CHECKS) {
  const requested = requestedEnv(check.env) === 'true';
  const match = source.match(check.marker);

  if (!match) {
    problems.push(
      `${check.env}: no inlined value found in the bundle.`,
      `  The constant may have been renamed, or the app no longer reads it.`,
      `  This check cannot verify ${check.describe}, so the build is stopped rather than trusted.`,
    );
    continue;
  }

  const inlined = match[1] === 'true';
  if (inlined !== requested) {
    problems.push(
      `${check.env}: the environment asked for ${String(requested)}, the bundle says ${String(inlined)}.`,
      '',
      '  CAUSE: Metro reused a cached transform. Its cache does not key on',
      '  EXPO_PUBLIC_* values, so the previous build\'s value is baked in.',
      '',
      '  FIX:   re-run the export with --clear.',
      '',
      inlined
        ? '  RISK:  this bundle is IN DEMO MODE. Shipping it would put seeded'
        : '  RISK:  this bundle is NOT in demo mode, but was meant to be. The',
      inlined
        ? '         customers, seeded trips and a "Reset demo" button in front of'
        : '         demo would show empty screens and unreachable routes.',
      inlined ? '         real users.' : '',
    );
  }
}

const demo = requestedEnv('EXPO_PUBLIC_DEMO_MODE') === 'true';

/**
 * THE ROLE FENCE, CHECKED AS STRINGS AND NOT ONLY AS SCREENS.
 *
 * `app/_role/` is stripped from a non-demo build by `resolver.blockList`, and
 * grepping for the screens' own copy confirmed they were gone. **That was true
 * and it was not the whole claim.**
 *
 * `landingRouteFor()` in `src/lib/accountRole.ts` contained the paths as string
 * literals, and `src/lib` is not fenced. So a customer build shipped the route
 * NAMES without the routes, and a chauffeur or operator signing in would have
 * been redirected to the not-found screen. That is now handled in code — but a
 * comment is not a check, and the next person to write a `_role` path into a
 * shared module would reintroduce it silently.
 *
 * This is the same shape as everything else in the "present, readable, inert"
 * family: **a claim verified in one representation and untrue in another.**
 * Screens absent is not the same as nothing referencing them.
 */
if (!demo) {
  /*
   * The SCREENS must be gone. `ROLE_PREVIEW_MARKER` is a unique string exported
   * by `src/dev/role/roleTheme.ts` and reachable only from the role screens, so
   * its absence is a real assertion about the shipped bytes rather than about
   * what imports what.
   */
  if (source.includes('LCT_ROLE_PREVIEW_ONLY_a7f2c1')) {
    problems.push(
      'Role preview SCREENS present in a non-demo bundle.',
      '',
      '  ROLE_PREVIEW_MARKER was found. `app/_role/` should have been stripped',
      '  by resolver.blockList in metro.config.js.',
      '',
      '  RISK:  the chauffeur and operator previews ship to real customers.',
    );
  }
}

/*
 * THE GALLERY/FIXTURE FENCE, CHECKED THE SAME WAY — AND UNTIL NOW, NOT AT ALL.
 *
 * `metro.config.js`'s own comment on `app/_dev/` promised: "Verified rather
 * than assumed: `src/dev/fixtures.ts` exports a unique `EXCLUSION_MARKER`;
 * `npm run export:web` followed by a grep of `dist/` for it must return
 * nothing." No script ever did that grep — the promise was real, the check
 * was not. Found while sweeping for invented content the night before a
 * handover: `FIXTURE_DRIVER.rating = '4.98'` sits behind exactly this fence,
 * an invented number one blockList regression away from a production bundle.
 * Manually confirmed absent before adding this (`grep -c EXCLUSION_MARKER
 * dist/**\/*.js` → 0), so this codifies a true claim rather than asserting an
 * untested one. Unlike the role fence, this runs in EVERY build, demo or not
 * — `app/_dev/` is blocked unconditionally in metro.config.js.
 */
if (source.includes('LCT_FIXTURE_MARKER_MUST_NOT_SHIP_7f3a91')) {
  problems.push(
    'Gallery/fixture-harness SCREENS present in a production bundle.',
    '',
    '  EXCLUSION_MARKER was found. `app/_dev/` should have been stripped',
    '  by resolver.blockList in metro.config.js — unconditionally, demo or not.',
    '',
    '  RISK:  invented preview data (e.g. FIXTURE_DRIVER\'s rating) ships to',
    '         real customers.',
  );
}

if (problems.length > 0) fail(problems.filter((l) => l !== undefined));

console.log(
  `[32m✓[0m build mode verified: EXPO_PUBLIC_DEMO_MODE=${String(demo)} matches the emitted bundle (${outDir}).`,
);

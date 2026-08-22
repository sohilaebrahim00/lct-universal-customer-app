#!/usr/bin/env node
/**
 * NATIVE MAPS KEY VERIFICATION. Scoped to the platform being built.
 *
 * ── The failure this exists to make impossible ──────────────────────────────
 * The app now selects `provider={PROVIDER_GOOGLE}` on both map surfaces, so the
 * custom style applies on iOS as it does on Android. The cost of that choice is
 * that **Google Maps with no key renders a blank grey view rather than falling
 * back to Apple Maps.**
 *
 * And "the map is broken" and "the key isn't set" look **identical on screen**.
 * That is precisely the class of failure this project has removed everywhere
 * else — a screen that cannot tell you why it is empty — so it does not get to
 * survive here.
 *
 * ── Why a build-time check and not a runtime one ────────────────────────────
 * There are TWO keys and they can diverge:
 *
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY   runtime, read by `isMapsConfigured`,
 *                                     gates the Places/geocoding calls and the
 *                                     manual-entry fallback
 *   GOOGLE_MAPS_API_KEY_IOS           build-time, baked into the native
 *                                     manifest by app.config.ts, used by the
 *                                     Google Maps SDK to render tiles
 *   GOOGLE_MAPS_API_KEY_ANDROID       the same, for Android
 *
 * With the runtime key set and the native key missing, `isMapsConfigured` is
 * true, the app takes the map path rather than the manual fallback, and renders
 * a blank map — on one platform only, discovered on a device, long after the
 * build. No runtime check can catch that, because at runtime the app cannot see
 * whether the native manifest got a key.
 *
 * ── Scope, and why this warns for web ───────────────────────────────────────
 * `react-native-maps` has no web implementation, so a web export never renders
 * a native map and a missing native key cannot hurt it. Failing a web build on
 * an iOS key would be a checker crying wolf, and a checker that cries wolf gets
 * deleted. So: **fail for the platform being built, stay quiet for the ones
 * that are not.**
 *
 * Usage:
 *   node scripts/verify-maps-keys.mjs ios
 *   node scripts/verify-maps-keys.mjs android
 *   node scripts/verify-maps-keys.mjs ios,android
 *   node scripts/verify-maps-keys.mjs web        → nothing to check, exits 0
 */

import { existsSync, readFileSync } from 'node:fs';

/**
 * Resolves a variable the way the Expo CLI does — environment first, then
 * `.env`. Duplicated from verify-build-mode.mjs rather than shared: these two
 * scripts run before anything else is trusted, and a shared helper is one more
 * thing that can be wrong when they are the thing checking for wrongness.
 */
function requestedEnv(name) {
  if (process.env[name] !== undefined && process.env[name] !== '') return process.env[name];
  if (!existsSync('.env')) return undefined;
  for (const raw of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() !== name) continue;
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    return value === '' ? undefined : value;
  }
  return undefined;
}

const platforms = (process.argv[2] ?? 'ios,android')
  .split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean);

const NATIVE = {
  ios: { env: 'GOOGLE_MAPS_API_KEY_IOS', label: 'iOS' },
  android: { env: 'GOOGLE_MAPS_API_KEY_ANDROID', label: 'Android' },
};

const problems = [];

for (const platform of platforms) {
  const native = NATIVE[platform];
  // Web has no native map. Nothing to check, and nothing to warn about.
  if (!native) continue;

  if (!requestedEnv(native.env)) {
    problems.push(
      `${native.env} is not set, but this build targets ${native.label}.`,
      '',
      `  CAUSE: the app selects provider={PROVIDER_GOOGLE} on both map surfaces`,
      `         (TrackingMap, NativePickerMap) so the custom style applies on`,
      `         iOS as well as Android. Google Maps needs a native key to draw`,
      `         tiles, and app.config.ts reads it from ${native.env}.`,
      '',
      `  FIX:   set ${native.env} in .env (or in the EAS build environment),`,
      `         restricted by platform + bundle ID + fingerprint in the Google`,
      `         Cloud Console.`,
      '',
      `  RISK:  the map renders BLANK on ${native.label} — not an error, not a`,
      `         fallback to Apple Maps, just an empty grey view. "The map is`,
      `         broken" and "the key isn't set" look identical on screen, which`,
      `         is the exact failure mode this app removes everywhere else.`,
    );
  }
}

/*
 * The divergence warning.
 *
 * The runtime key gates whether the app takes the map path at all. If it is
 * MISSING while a native key is present, the app falls back to manual entry on
 * a build that could have rendered a map — wasteful rather than broken, so a
 * warning rather than a failure.
 */
const runtimeKey = requestedEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
if (!runtimeKey && problems.length === 0 && platforms.some((p) => NATIVE[p])) {
  console.warn(
    '\n[33m! EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set.[0m\n' +
      '  The native key is present, so the map COULD render — but isMapsConfigured\n' +
      '  is false at runtime, so the app will take the manual-entry fallback and\n' +
      '  never show it. Not a failure; the fallback is a supported path.\n',
  );
}

if (problems.length > 0) {
  console.error('\n[31m✖ NATIVE MAPS KEY VERIFICATION FAILED[0m\n');
  for (const line of problems) console.error('  ' + line);
  console.error('');
  process.exit(1);
}

const checked = platforms.filter((p) => NATIVE[p]);
console.log(
  checked.length > 0
    ? `[32m✓[0m native maps keys present for: ${checked.join(', ')}`
    : `[32m✓[0m no native map on ${platforms.join(', ')} — nothing to verify`,
);

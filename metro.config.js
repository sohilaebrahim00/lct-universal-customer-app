// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Keep the dev-only routes out of production bundles.
 *
 * `app/_dev/fixtures.tsx` and `app/_dev/gallery.tsx` ARE routes. Expo Router
 * excludes only `_layout` files and `+`-prefixed files from routing — verified
 * in the installed expo-router's own matcher — so a `_dev/` DIRECTORY is a real
 * route in every build. The `__DEV__` guard inside each one makes it render a
 * redirect in production, but it does not remove the module from the bundle:
 * Metro collects `require`/`import` statically, whether or not the code path is
 * reachable.
 *
 * `blockList` is what actually removes them. Metro refuses to resolve anything
 * matching, so the fixture data and the gallery are ABSENT from a production
 * build rather than merely unreachable — the difference between a fence and a
 * sign.
 *
 * Production only: NODE_ENV is 'development' under `expo start` and 'production'
 * under `expo export`, so the dev server still serves both routes.
 *
 * Verified rather than assumed — `src/dev/fixtures.ts` exports a unique
 * `EXCLUSION_MARKER`, and the check is `npm run export:ios` followed by a grep
 * of `dist/` for it. It must return nothing.
 */
const isDemoBuild = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

/*
 * The demo build is the deliberate exception: EXPO_PUBLIC_DEMO_MODE=true means
 * the seeded dataset in src/dev/ IS the app's data source, so it has to be
 * bundled. The fixture harness and the gallery are still guarded by __DEV__ at
 * their routes, so neither is reachable in a deployed demo — but the seed data
 * is present, which is the point, and is named as demo data in DEMO_GUIDE.md.
 */
if (process.env.NODE_ENV === 'production' && !isDemoBuild) {
  const devOnly = [/[/\\]src[/\\]dev[/\\]/, /[/\\]app[/\\]_dev[/\\]/];
  const existing = config.resolver.blockList;
  config.resolver.blockList = Array.isArray(existing)
    ? [...existing, ...devOnly]
    : existing
      ? [existing, ...devOnly]
      : devOnly;
}

module.exports = config;

// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Keep the dev-only ROUTES out of production bundles.
 *
 * `app/_dev/gallery.tsx` and `app/_dev/fixtures.tsx` are real routes — Expo
 * Router excludes only `_layout` files and `+`-prefixed files, so a `_dev/`
 * directory is routable in every build. The `__DEV__` guard inside each makes it
 * render a redirect in production, but does not remove the module: Metro
 * collects `require`/`import` statically, whether or not the code path is
 * reachable.
 *
 * Blocking the routes drops them AND everything only they import — the fixture
 * harness and its data — so they are absent rather than merely unreachable.
 *
 * ── Why `src/dev/` is NOT blocked ───────────────────────────────────────────
 * It was, and that broke the non-demo production build outright.
 *
 * `src/dev/demoData` and `demoApi` are reached through `require()` calls sitting
 * inside `if (isDemoMode)` branches in authStore, apiClient, publishedRates,
 * quoteOnly and demoReset. Metro resolves those statically for exactly the
 * reason described above, so blocking the directory produced
 * "Unable to resolve module ../dev/demoData" and `expo export` failed — every
 * route 404'd because there was no valid bundle at all.
 *
 * So the demo modules always resolve, and demo behaviour is gated at RUNTIME by
 * `isDemoMode`, which is false unless EXPO_PUBLIC_DEMO_MODE=true at build time.
 * The cost is a few KB of unreached seed data in a non-demo bundle. The benefit
 * is a build that works, and the fixture-harness fence is unaffected because it
 * hangs off the blocked routes.
 *
 * Verified rather than assumed: `src/dev/fixtures.ts` exports a unique
 * `EXCLUSION_MARKER`; `npm run export:web` followed by a grep of `dist/` for it
 * must return nothing.
 */
if (process.env.NODE_ENV === 'production') {
  const devOnlyRoutes = [/[/\\]app[/\\]_dev[/\\]/];
  const existing = config.resolver.blockList;
  config.resolver.blockList = Array.isArray(existing)
    ? [...existing, ...devOnlyRoutes]
    : existing
      ? [existing, ...devOnlyRoutes]
      : devOnlyRoutes;
}

module.exports = config;

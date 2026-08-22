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
/**
 * ── Why the role preview gets its OWN directory and its own fence ───────────
 * `app/_role/` is the chauffeur and dispatcher preview. It has to be absent
 * from the shipping app and PRESENT in the deployed demo — and the deployed
 * demo is itself a production export (`expo export` sets NODE_ENV=production).
 * Fencing it like the gallery would have put it in neither: a client opening
 * the Netlify link would get a 404 straight from the Account switcher.
 *
 * So the two fences have different conditions:
 *
 *   dev server              everything present
 *   production, demo on     role preview present, gallery + fixtures blocked
 *   production, demo off    both blocked  ← the shipping app
 *
 * ── Why it is not a subdirectory of app/_dev/ ───────────────────────────────
 * It was, as `app/_dev/role/`, exempted with a negative lookahead. That does
 * not work, and the failure was silent: METRO APPLIES blockList WHILE CRAWLING,
 * TO DIRECTORIES AS WELL AS FILES. The pattern matched the bare `…/app/_dev/`
 * directory, Metro pruned the whole subtree, and `role/` never got a chance to
 * be exempted. `expo export` succeeded, the routes were simply absent, and the
 * switcher pushed to paths that did not exist.
 *
 * Two directories with two flat rules cannot fail that way. Found by building
 * with the blockList disabled and diffing what appeared — the regex itself
 * tested correctly in isolation, which is exactly why it was believable.
 *
 * Verified rather than assumed: `src/dev/role/roleTheme.ts` exports a unique
 * `ROLE_PREVIEW_MARKER`; a non-demo `expo export` followed by a grep of `dist/`
 * for it must return nothing, and a demo export must find it.
 */
if (process.env.NODE_ENV === 'production') {
  const isDemoBuild = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
  const blocked = [
    // Gallery and fixture harness: out of EVERY production build, demo or not.
    /[/\\]app[/\\]_dev[/\\]/,
  ];
  // Role preview: out of the shipping app, in the demo.
  if (!isDemoBuild) blocked.push(/[/\\]app[/\\]_role[/\\]/);
  const devOnlyRoutes = blocked;
  const existing = config.resolver.blockList;
  config.resolver.blockList = Array.isArray(existing)
    ? [...existing, ...devOnlyRoutes]
    : existing
      ? [existing, ...devOnlyRoutes]
      : devOnlyRoutes;
}

module.exports = config;

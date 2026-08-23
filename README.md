# LCT Universal Customer App

The customer-facing mobile app for LCT Universal Executive Transports — React Native (Expo, TypeScript), talking to the [lct-universal-backend](../lct-universal-backend) API. Real authentication, a map-driven 6-screen booking flow, live Uber-style trip tracking, Stripe payments, corporate accounts, and an AI concierge, in the same dark + champagne-gold design language as the LCT Universal website.

## Deployment

| | |
|---|---|
| **Live URL** | **https://lctapp.netlify.app/** |
| **Host** | Netlify |
| **Production branch** | `main` |
| **Build command** | `npm run export:web` — see `netlify.toml` |
| **Publish directory** | `dist` |
| **Environment variables** | **Netlify dashboard → Site configuration → Environment variables.** They are not in this repo: `.env` is gitignored and never committed |

Two things that will cost an afternoon if they are not known:

- **`expo export` emits a single `index.html`.** Every deep path needs an SPA
  fallback or it 404s. `netlify.toml` has `/* → /index.html 200`; a local static
  server does not, so serve `dist` with `serve dist -l 5055 --single`.
- **Metro's transform cache does not key on `EXPO_PUBLIC_*` values.** Always
  redeploy with **Clear cache and deploy site**, and note that
  `scripts/verify-build-mode.mjs` runs inside the build and fails it if the
  emitted bundle disagrees with the environment. If the deployed `/fleet` is
  empty, check `EXPO_PUBLIC_DEMO_MODE` before anything else.

**Start here:** [`HANDOFF.md`](HANDOFF.md) — what is verified, what is not, and
what is blocked on whom.

## Stack

**Expo SDK 57** (React Native 0.86.2, React 19.2.3) with **Expo Router**, **TypeScript** (strict), **Supabase Auth** (encrypted session storage — see below), **Zustand**, **Stripe** (`@stripe/stripe-react-native`), **Google Maps / Places / Directions** (`react-native-maps` + a direct REST integration, no third-party autocomplete wrapper), **react-native-reanimated** for motion, **expo-notifications** for push, **expo-image-picker** + **Supabase Storage** for profile photos, and Jest (`ts-jest`) for pure-logic unit tests.

Expo — not the bare React Native CLI — is a deliberate choice, not just a default: this environment has no Xcode (impossible on Windows regardless) and no Android SDK/emulator, so a bare RN project would be unbuildable here. Expo's managed workflow lets every screen be written, type-checked, linted, unit-tested, and bundled (`expo export`) without either toolchain; actual native compilation happens later via `eas build` in the cloud (see [What hasn't been verified](#what-hasnt-been-verified)).

## Project structure

```
app/
  _layout.tsx                  Root: fonts, Stripe provider, auth bootstrap, branded loading screen
  index.tsx                    Routes to onboarding (first launch) / (auth) / (app) based on state
  onboarding.tsx                3-slide luxury intro carousel, shown once
  (auth)/                       login, signup, forgot-password
  (app)/                        Tab navigator: Book, Trips, Concierge, Account
    index.tsx                    Home / service picker
    book/                        6-screen booking flow:
                                  pickup (map) → destination (map) → vehicle (images + live
                                  route/fare) → details (date/time/passengers/notes) →
                                  payment (fare breakdown + Stripe PaymentSheet) → confirmed
    trips/                       Upcoming/past list + live trip tracking (map + status timeline)
    concierge.tsx                 AI concierge chat
    account/                      Profile (+ photo upload), saved passengers/locations, payment
                                  methods, notifications, corporate account, settings
src/
  theme/tokens.ts               Brand colors/fonts/spacing — see below
  components/ui/                Button, TextField, Card, StatusPill, FadeSlideIn, Typography, ...
  components/maps/               PlacesAutocomplete, LocationPickerScreen, RoutePreviewCard
  lib/                          env, secureStorage, supabase client, googlePlaces, API client,
                                 WebSocket hook, pricing preview, push notifications, avatar upload
  api/                          One typed module per backend resource
  store/                        Zustand: auth session, booking-draft form state
  types/api.ts                  Types mirrored from the backend (see note below)
tests/                          Jest unit tests for pure logic only
```

## Design system — ported from the website, not reinvented

- Colors and typography are exact conversions of the website's own OKLCH tokens (`LCT-Universal-Vite-Ready-v2/src/styles.css` `:root`) — `src/theme/tokens.ts` documents the sRGB math, not an eyeballed approximation.
- **Cormorant Garamond** (display) + **Manrope** (sans), matching the site's pairing exactly.
- Vehicle cards use **real LCT Universal fleet photography** (`assets/vehicles/*.jpg`), copied from the website's own asset library — not stock images. Onboarding slides use the same source (`assets/onboarding/*.jpg`).
- The site's deliberately small, sharp 0.2rem border radius is mirrored in the `radius` token scale.

**Known gap, called out rather than hidden:** the app icon and Android adaptive-icon layers are still Expo's default template placeholders — the logo asset isn't square, and producing a proper padded 1024×1024 icon needs image-editing tooling this environment doesn't have. Commission a real icon before store submission.

## What's new in this pass (Phase 3)

- **Encrypted session storage** (`src/lib/secureStorage.ts`): Supabase's session is AES-encrypted before it touches disk, with the encryption key held in `expo-secure-store`'s hardware-backed Keychain/Keystore — not plain AsyncStorage. This is Supabase's own documented pattern for Expo, needed because a full session payload routinely exceeds SecureStore's ~2KB size cap on Android.
- **Real Google Maps/Places integration** (`src/lib/googlePlaces.ts`, `src/components/maps/*`): pickup and destination are now full-screen map pickers with live Places Autocomplete, a "use current location" button (`expo-location`), reverse geocoding of the map center, and a driving-route lookup (distance, ETA, and a decoded polyline drawn on a route-preview map on the vehicle screen) — all via direct REST calls to Google's Places/Directions/Geocoding APIs, not a third-party wrapper. Every one of these gracefully falls back to manual text entry when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` isn't set, exactly like the backend's own Maps integration.
- **Restructured booking flow** to the 6 screens: pickup → destination → vehicle (with real photos and a live route preview) → trip details (date/time/passengers/notes) → payment (final fare + Stripe PaymentSheet) → confirmation. Payment now happens *before* confirmation, not after.
- **Two small backend additions** (already committed to `lct-universal-backend`): `GET /bookings/:id/trip` (resolve a trip from a booking ID) and driver/vehicle display fields joined onto trip responses — the mobile app genuinely needed both and they didn't exist yet.
- **Luxury onboarding** (`app/onboarding.tsx`) — a 3-slide swipeable intro shown once on first launch, and a branded animated loading screen (logo fade + breathing scale via Reanimated) replacing the blank screen that used to show while fonts/session were resolving.
- **Motion**: buttons now use a spring press animation (Reanimated `withSpring`) instead of a static opacity change; service tiles and vehicle cards stagger in with `FadeSlideIn` on mount.
- **Profile photo upload** (`src/lib/avatarUpload.ts`): `expo-image-picker` + direct upload to Supabase Storage, with the resulting public URL saved via the existing `PATCH /profiles/me`. **Requires a public `avatars` bucket to exist in the Supabase project** — a one-time dashboard/SQL setup step this code can't perform itself without a live project; see below.
- **Settings screen** (push-notification toggle, account email, app version) and a **Trip History** shortcut added to the Account tab.
- **Push notification deep-linking** (`src/lib/useNotificationRouter.ts`): tapping a trip-related push (driver assigned, driver arriving, etc.) now opens that trip's live-tracking screen directly, using the `bookingId` the backend already includes in every notification's data payload.

## Web preview mode

`npx expo export --platform web` (or `npm run export:web`) now produces a real, deployable web build of this app — for **UI/UX preview only**, not a third mobile platform. The mobile architecture is unchanged: every native-only module still ships exactly as before on iOS/Android; web gets its own explicit fallback at each of the few places a native-only view would otherwise crash the bundle or fail to render:

| Native feature | iOS/Android | Web preview |
|---|---|---|
| Stripe (`CardField`, PaymentSheet) | Full native SDK (`StripeAppProvider`/`StripePayment`/`useStripeCheckout` — no `.web.` suffix) | `.web.tsx`/`.web.ts` counterparts: a "preview mode" card instead of `CardField`, `payWithStripe()` returns a clear "not available in this web preview" result instead of opening a sheet |
| `react-native-maps` (pickup/destination pickers, route preview, live trip map) | Real interactive map | The same manual-address-entry fallback already used when Maps isn't configured or when running in Expo Go, now also triggered by `Platform.OS === 'web'` |
| `@react-native-community/datetimepicker` | Real native date/time picker | Plain date/time text fields (`YYYY-MM-DD` / `HH:MM`) parsed into the same `scheduledAt` the rest of the booking flow already expects |
| Push notifications | Real APNs/FCM registration | `registerForPushNotifications()` returns a clear demo-state result; the Settings toggle shows it as an informational note, not an error |
| Secure token storage, location, image picker | Native APIs | Unchanged — these already have real web implementations upstream (browser Geolocation, File input, localStorage-backed SecureStore), so no fallback was needed |

Every fallback reuses UI that already existed for the "not configured" / "Expo Go" cases (see `src/lib/expoEnvironment.ts` and each fallback's own comments) — nothing net-new was invented just for web, and nothing was removed from the native paths. Navigation, all screens, the booking flow, vehicle selection with real fleet photography, account screens, trip screens, and the full dark/gold design system all render as-is on web.

**Deploying the preview to Netlify:**
- `netlify.toml` is already configured: build command `npm run export:web`, publish directory `dist`, with a catch-all redirect to `index.html` (required for expo-router's client-side routing — without it, refreshing any non-root URL 404s).
- Connect the GitHub repo in the Netlify dashboard and it will build automatically on every push using that config — no manual steps beyond the initial "New site from Git" connection.
- Or deploy the `dist/` folder directly: `npx expo export --platform web && npx netlify deploy --prod --dir=dist` (requires `netlify-cli` and being logged into a Netlify account — this session doesn't have Netlify credentials, so the actual deploy has to happen from your machine/account).

**Environment variables on Netlify** (Site configuration → Environment variables in the Netlify dashboard — this is a dashboard step, not something a code change can do): set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon key only, never the service-role key) there. The code already reads them correctly — `EXPO_PUBLIC_*` variables are inlined by Metro from `process.env` at *build* time, and Netlify's build command (`npm run export:web`) runs with whatever's set in that dashboard, no different from `EXPO_PUBLIC_API_URL` or any other var already working this way. Nothing else needs to change for that to take effect; it wasn't broken, it was just never set on Netlify's side.

**Without those two variables set** (e.g. this repo's own default Netlify deploy, or anyone previewing before wiring up a Supabase project), the app deliberately still boots and every screen — including the three auth screens — stays fully interactive. See [What was actually broken](#what-was-actually-broken-not-configured-supabase-disabled-form-inputs) below for why that wasn't always true.

## What was actually broken (not-configured Supabase disabled form inputs)

A real bug, found and fixed: `login.tsx` and `signup.tsx` passed `editable={configured}` (`configured = Boolean(supabase)`) to every `TextField`, and `disabled={!configured}` to their submit buttons. On a build with no Supabase env vars — which is exactly the state of a Netlify deploy before those two variables are set in its dashboard — `configured` is `false`, so every input rendered as non-editable and the button as disabled. On React Native Web, `editable={false}` doesn't set the HTML `disabled` attribute; it renders the underlying `<input>` as non-editable instead, which is why the fields *looked* normal but silently refused to accept focus or typed text — a real, confirmed-with-Playwright root cause (see below), not a CSS overlay or z-index issue.

Fixed by removing the `editable`/`disabled` gating entirely — inputs and buttons are now always interactive — and moving the "not configured" handling into each screen's submit handler (`handleLogin`/`handleSignup`/`handleReset`), which now shows a clear, non-blocking message ("this preview build has no backend connected") only if someone actually tries to submit, instead of disabling the form pre-emptively. `forgot-password.tsx` had a related but different bug — it hid the entire form behind the "not configured" message rather than disabling fields — fixed the same way, for consistency across all three screens.

**Verified, not assumed**: this was reproduced and then confirmed fixed with a real headless-Chromium (Playwright) session against the actual exported `dist/` build — before the fix, `input.isEditable()` was `false` on both fields and typed text never reached the value; after the fix, mouse click+type, keyboard-only typing, Tab flow, button clicks (surfacing the new non-blocking message), and `<Link>` navigation between all three auth screens all work, with zero console/page errors. Ruled out, with the same tooling: absolute overlays, `pointer-events`, z-index stacking, and `Pressable`-over-input issues — none were present; a screen's inputs staying mounted-but-hidden underneath the next screen after client-side navigation (normal Stack-navigator back-navigation behavior, not a bug) was double-checked and confirmed inert/non-interactive, exactly as it should be.

## Backend integration

Every screen calls `lct-universal-backend`'s REST API (`src/api/*.ts`) or its WebSocket layer (`src/lib/useTripSocket.ts`, `wss://<host>/ws/trips/:bookingId`) — no mock data anywhere in `app/` or `src/`. **Types are duplicated, not shared** (`src/types/api.ts`, documented there as intentional — separate repos, separate deploy pipelines; promote to a shared `@lct-universal/api-types` package if that ever changes).

## Honest functionality notes (not hidden, not silently skipped)

- **Places/Directions/Maps need a real `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to do anything.** Without one, `isMapsConfigured` is `false` and the pickup/destination screens fall back to a plain manual-address text field (still fully functional for creating a booking — just without autocomplete, current-location detection, or a route preview). None of this has been exercised against a real Google Cloud project or billing account in this environment.
- **The fare shown during the booking flow is a client-side preview** (`src/lib/pricingPreview.ts`, a line-for-line port of the backend's `pricing.ts`). The vehicle-selection screen's estimate uses a placeholder "now" timestamp for the late-night-surcharge check (the real date isn't collected until the next screen) — the Payment screen recomputes the exact figure once the real date/time is known, and the backend recomputes it again, authoritatively, on `POST /bookings`.
- **Saved-card selection inside the booking's Stripe PaymentSheet isn't wired up.** The Account tab's Payment Methods screen can save a card to the customer's Stripe record today, but `PaymentSheet` only shows a customer's saved cards automatically when initialized with a customer ID + ephemeral key, which requires a small backend endpoint that doesn't exist yet. Documented here as a follow-up, not silently attempted.
- **Avatar upload needs a Supabase Storage bucket that hasn't been created.** The code (`src/lib/avatarUpload.ts`) uploads to a bucket named `avatars` and expects it to be public (or covered by an appropriate RLS policy) — that bucket has to be created once in the Supabase dashboard/SQL editor before photo upload will actually succeed; there's no live Supabase project in this environment to create it in.
- **AI concierge date parsing is still not silently faked.** A phrase like "tomorrow at 8am" is shown in chat, not auto-converted into an exact `Date` — the user confirms the exact date/time on the Details screen instead of trusting a silent parse.

## What has and hasn't been verified

**Actually run and passing in this session:**
- `npm run typecheck` (`tsc --noEmit`) — clean, zero errors.
- `npx eslint app src` — clean, zero errors/warnings.
- `npx jest` — 16/16 unit tests passing (pure logic only — `pricingPreview.ts`, `tripStatus.ts`, `format.ts`; see the `ts-jest` note below for why RN component tests aren't in this suite).
- `npx expo export --platform ios` — Metro resolved and bundled all 2,352 modules (the entire app plus Stripe, react-native-maps, Reanimated/worklets, expo-location, expo-image-picker, expo-secure-store, every font/icon) into a real 6MB Hermes bundle with zero errors, including the new onboarding/vehicle image assets. This is strong evidence the app is structurally sound for its real target platform — not the same claim as "runs correctly on a device," since `expo export` only bundles JS/assets and doesn't invoke Xcode or a simulator.
- `npx expo export --platform web` — 1,987 modules bundled into a real 3.9MB web bundle with zero errors, producing a genuine `dist/` static site (`index.html`, `_expo/`, `assets/`) ready for Netlify. This is a real, working build — but see [Web preview mode](#web-preview-mode) for exactly which native features are mocked there and why; it's explicitly a UI/UX preview, not a claim that Stripe/Maps/push work in a browser.
- Manual code-level checks (no device available, so this substitutes for a click-through smoke test): every route referenced by a `router.push`/`router.replace` call resolves to an actual file under `app/`; no leftover references to the screens removed/renamed in this pass (`pickup-dropoff`, `datetime`, `review`); the booking draft store's field set matches what every screen in the new flow reads and writes.

**Not verified — and specifically why:**
- **No iOS or Android build.** No Xcode (impossible on Windows), no Android SDK/emulator in this environment (checked directly). Real builds happen via `eas build` or on a Mac/with Android Studio installed.
- **No physical-device testing.** Push notification delivery and tap-to-deep-link, the Stripe PaymentSheet's actual card entry, `react-native-maps`/Places/Directions against a real Google Maps key, Supabase auth's real sign-in/sign-up round trip, and the Supabase Storage avatar upload have not been exercised against real devices or live accounts. All of it is structurally correct against each SDK's documented API and degrades gracefully when unconfigured — not the same claim as "confirmed working."
- **No React Native component rendering tests** — see the `ts-jest` note below.

### A version-mismatch note worth keeping (Expo SDK 57 is very new)

`jest-expo`'s bundled RN Jest preset (`@react-native/jest-preset`) is incompatible with the exact `react-native@0.86.2` this SDK 57 scaffold installs — it expects a `react-native/src/setup-env.js` file that doesn't exist in this RN version. This pass uses a minimal, scoped `ts-jest` config instead (see `package.json`'s `"jest"` block), which covers pure TypeScript logic only — no `@testing-library/react-native` component tests. If `jest-expo` is fixed upstream, switching back would unlock proper component-level testing.

## Environment configuration

Copy `.env.example` to `.env`. Only `EXPO_PUBLIC_API_URL` is required to boot — Supabase, Stripe, and Maps each degrade to a clear "not configured" state (never a crash) when their keys are absent. See `.env.example` for the full list, including which variables are build-time-only (read by `app.config.ts`, baked into the native manifest — e.g. the platform-specific Google Maps keys) versus runtime (`EXPO_PUBLIC_*`, inlined into the JS bundle).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Expo dev server (scan the QR code with Expo Go, or run on a connected device/emulator) |
| `npm run android` / `npm run ios` / `npm run web` | Platform-specific dev launch |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `app` and `src` |
| `npm test` | Jest unit tests (pure logic) |
| `npm run export:web` | Web preview build (see [Web preview mode](#web-preview-mode)) — outputs to `dist/`, Netlify-ready |
| `npm run export:ios` | Production iOS JS bundle export — the meaningful build check for the real target platform |

## What this is not

This is the **customer app only** — the driver app and the admin web dashboard are separate, unstarted phases, per the project's own phased scope. Corporate account management here is customer-facing (viewing the account, approving/rejecting rides as a manager); a full admin dashboard doesn't exist yet.

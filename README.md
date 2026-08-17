# LCT Universal Customer App

The customer-facing mobile app for LCT Universal Executive Transports — React Native (Expo, TypeScript), talking to the [lct-universal-backend](../lct-universal-backend) API. Authentication, the multi-step booking flow, live Uber-style trip tracking, payments, corporate accounts, and an AI concierge, in the same dark + champagne-gold design language as the LCT Universal website.

## Stack

**Expo SDK 57** (React Native 0.86.2, React 19.2.3) with **Expo Router** (file-based navigation), **TypeScript** (strict), **Supabase Auth** (`@supabase/supabase-js`), **Zustand** for client state, **Stripe** (`@stripe/stripe-react-native`), **react-native-maps** for live tracking, **expo-notifications** for push, and Jest (`ts-jest`) for pure-logic unit tests.

Expo — not the bare React Native CLI — is a deliberate choice, not just a default: this environment has no Xcode (impossible on Windows regardless) and no Android SDK/emulator, so a bare RN project would be unbuildable here. Expo's managed workflow lets every screen be written, type-checked, linted, unit-tested, and bundled (`expo export`) without either toolchain; actual native compilation happens later via `eas build` in the cloud (see [What hasn't been verified](#what-hasnt-been-verified)).

## Project structure

```
app/                          Expo Router routes (file-based)
  _layout.tsx                  Root: fonts, Stripe provider, auth bootstrap
  index.tsx                    Redirects to (auth) or (app) based on session
  (auth)/                       login, signup, forgot-password
  (app)/                        Tab navigator: Book, Trips, Concierge, Account
    index.tsx                    Home / service picker
    book/                        6-step booking wizard (service → pickup/dropoff →
                                  date/time → details → vehicle → review → confirmed)
    trips/                       Upcoming/past list + live trip tracking detail
    concierge.tsx                 AI concierge chat
    account/                      Profile, saved passengers/locations, payment
                                  methods, notifications, corporate account
src/
  theme/tokens.ts               Brand colors/fonts/spacing — see below
  components/ui/                Button, TextField, Card, StatusPill, Typography, ...
  lib/                          env, supabase client, API client, WebSocket hook,
                                 pricing preview, trip-status helpers, push notifications
  api/                          One typed module per backend resource
  store/                        Zustand: auth session, booking-draft form state
  types/api.ts                  Types mirrored from the backend (see note below)
tests/                          Jest unit tests for pure logic only
```

## Design system — ported from the website, not reinvented

The color palette and typography are exact conversions of the LCT Universal website's own tokens (`LCT-Universal-Vite-Ready-v2/src/styles.css` `:root`), not an approximation:

- The website defines colors in OKLCH (e.g. `--gold: oklch(0.78 0.11 84)`), which React Native's style engine can't parse. `src/theme/tokens.ts` documents the exact sRGB conversion of every token used (computed directly from the site's L/C/H numbers via the standard OKLab→sRGB matrices, not eyeballed) — `#d9b160` gold, `#020201` near-black background, `#dac288` champagne, etc.
- Typography matches the site's pairing: **Cormorant Garamond** (display/serif headings) + **Manrope** (sans body), loaded via `@expo-google-fonts/*`.
- The site's deliberately small 0.2rem "architectural" border radius is mirrored in `theme/tokens.ts`'s `radius` scale.
- The app's logo asset (`assets/brand/lct-logo.png`) is copied directly from the website's `public/assets/favicon.png` — same brand mark, not a redraw.

**Known gap, called out rather than hidden:** the app icon and Android adaptive-icon layers are still Expo's default template placeholders. The copied logo (477×320, not square) works fine as a splash image but isn't suitable as a 1024×1024 app icon without proper padding/cropping, which requires actual image-editing tooling this environment doesn't have. Commission or produce a proper square icon before any store submission.

## Backend integration

Every screen that touches data calls `lct-universal-backend`'s REST API (`src/api/*.ts`, one typed module per backend resource, paths matching the backend's actual routes exactly) or its WebSocket layer (`src/lib/useTripSocket.ts`, subscribing to `wss://<host>/ws/trips/:bookingId`). Two small additions were made to the backend alongside this app, because the mobile client genuinely needed them and didn't exist yet:

- `GET /bookings/:id/trip` — resolves a trip from a booking ID (the booking list/detail screens only ever have the booking ID, not the trip ID).
- `GET /trips/:id` and the route above now also return `driver` (name, avatar, rating) and `vehicle` (name, type) by joining `drivers`/`profiles`/`vehicles` — the bare `trips` row only had `driver_id`, not anything to actually display for "driver name/photo" as the spec asked for.

Both are typechecked, linted, and covered by the backend's existing test/build pipeline (re-run and passing after these changes).

**Types are duplicated, not shared**, in `src/types/api.ts` — documented there as intentional: the backend and this app are separate repositories with separate deploy pipelines per the project's own scope decisions, so there's no shared package to import from. If that changes, this file is what should become `@lct-universal/api-types`.

## Honest functionality notes (not hidden, not silently skipped)

- **Distance-based pricing has no real geocoding wired up.** There's no Google Places Autocomplete or Directions API integration in this pass (that requires a live Google Maps key this environment doesn't have, and a further native dependency). Pickup/drop-off are plain text address fields, and the booking flow asks for a manually-entered "estimated distance in miles" so distance-based fares aren't silently `$0` — clearly labeled in the UI as an estimate. Wiring real autocomplete + distance lookup (the backend's `src/lib/maps.ts` already has the Distance Matrix/Geocoding calls, just not exposed as a public route yet) is the natural next step once a Maps key exists.
- **The fare shown during the booking flow is a client-side preview** (`src/lib/pricingPreview.ts`), a deliberate line-for-line port of the backend's `pricing.ts`. The backend recomputes the same calculation server-side on `POST /bookings` and that result is authoritative — the preview exists only so the vehicle-selection screen doesn't need a network round-trip per keystroke.
- **AI concierge date parsing is not silently faked.** The concierge extracts a service type, addresses, and passenger count directly into the booking draft, but a natural-language phrase like "tomorrow at 8am" is *not* auto-converted into an exact `Date` (that needs a real NLP date parser this pass doesn't include) — the user is instead taken straight to the date/time picker with the concierge's understanding shown in chat, so they just confirm the exact time rather than trusting a silent, possibly-wrong parse.

## What has and hasn't been verified

Being specific about this, the same way the backend's README is, so nothing here is taken on faith.

**Actually run and passing in this session:**
- `npx tsc --noEmit` — clean, zero errors, across `app/`, `src/`, `tests/`, and `app.config.ts`.
- `npx eslint app src` — clean, zero errors/warnings (using `eslint-config-expo`).
- `npx jest` — 16/16 unit tests passing, covering the three pure-logic modules with zero React Native dependencies: `pricingPreview.ts`, `tripStatus.ts`, `format.ts`. (React Native component tests aren't included in this pass — see below.)
- `npx expo export --platform ios` — a real, meaningful build check: Metro resolved and bundled all 2,310 modules across every screen, the full dependency graph (Stripe, react-native-maps, notifications, gesture-handler + reanimated + worklets, all fonts/icons), and produced an actual 5.6MB Hermes bytecode bundle (`_expo/static/js/ios/entry-*.hbc`) with zero errors. This is strong evidence the app is structurally sound for its real target platform — it's just not the same claim as "runs correctly on an iOS device," since `expo export` only bundles JS/assets and doesn't invoke Xcode or a simulator.
  - `npx expo export --platform web` was tried first and fails, for a legitimate reason unrelated to any bug: `@stripe/stripe-react-native`'s `CardField` component statically imports React Native-only internals (`codegenNativeCommands`) that don't exist under `react-native-web` — that SDK simply doesn't support the web platform at all. Once the export was pointed at `ios` (the app's actual target platform) instead, it succeeded outright. The web attempt also surfaced one real, useful fix along the way: `react-native-worklets` (a `react-native-reanimated` 4.x dependency) was missing from `node_modules` and had to be installed explicitly — a genuine gap, not a false alarm, and it's fixed now.

**Not verified — and specifically why:**
- **No iOS build.** Xcode only runs on macOS; this is a Windows environment, so an iOS build is categorically impossible here regardless of tooling. It has to happen on a Mac or via `eas build --platform ios` (cloud build, needs an Apple Developer account).
- **No Android build.** No Android SDK, no `adb`, no `ANDROID_HOME` configured in this environment (checked directly, not assumed) — so no local Android build or emulator run either. Same path forward: `eas build --platform android`, or install Android Studio locally.
- **No physical-device testing at all**, therefore: push notification delivery (`src/lib/pushNotifications.ts`), the Stripe `PaymentSheet` card-entry flow, `react-native-maps` rendering, and Supabase auth's actual sign-in/sign-up round trip have not been exercised against real devices, a real Supabase project, or a real Stripe account. All of it is structurally correct against each SDK's documented API and degrades gracefully (clear "not configured" states, never a crash) when credentials are missing — matching the backend's own integration pattern — but "compiles and matches the documented API" is not the same claim as "confirmed working on a device."
- **No React Native component rendering tests.** The Jest suite in this pass covers pure TypeScript logic only (deliberately scoped — see the `jest-expo` note below); no screen has been rendered with React Testing Library and asserted against. Manual device/simulator testing would be the way to actually see the dark+gold theme, the multi-step flow, and the live tracking timeline render correctly.
- **The Expo web export is real but partial evidence.** `react-native-web` renders through a different renderer than iOS/Android — useful confirmation that the code bundles and the component tree is structurally sound, not proof that native rendering (especially `react-native-maps` and `@stripe/stripe-react-native`, which don't run on web at all) looks or behaves correctly on a device.

### A version-mismatch note worth keeping (Expo SDK 57 is very new)

`jest-expo`'s bundled RN Jest preset (`@react-native/jest-preset`) turned out to be incompatible with the exact `react-native@0.86.2` this SDK 57 scaffold installs — it expects a `react-native/src/setup-env.js` file that doesn't exist in this RN version, even after installing the SDK-matched preset version via `expo install`. Rather than fight an upstream tooling gap, this pass uses a minimal, scoped `ts-jest` config (see `package.json`'s `"jest"` block) for the pure-logic tests instead of the full `jest-expo` RN test environment. That means the current suite can't render RN components (no `@testing-library/react-native` here) — only pure TypeScript logic is covered. If `jest-expo` is fixed upstream (or a future SDK bump resolves it), switching back would unlock proper component-level testing.

## Environment configuration

Copy `.env.example` to `.env`. Only `EXPO_PUBLIC_API_URL` is required for the app to boot — Supabase, Stripe, and Maps each degrade to a clear "not configured" UI state (never a crash) when their keys are absent, mirroring the backend's own graceful-degradation contract. See `.env.example` for the full list and which are build-time-only (read by `app.config.ts`, baked into the native manifest) versus runtime (`EXPO_PUBLIC_*`, inlined into the JS bundle — see the security note at the top of that file).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Expo dev server (scan the QR code with Expo Go, or run on a connected device/emulator) |
| `npm run android` / `npm run ios` / `npm run web` | Platform-specific dev launch |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `app` and `src` |
| `npm test` | Jest unit tests (pure logic) |
| `npm run export:web` | Production web bundle export |

## What this is not

This is the **customer app only** — the driver app and the admin web dashboard are separate, unstarted phases (matching the project's own phased scope: backend first, then customer app, with driver app and admin dashboard still ahead). Corporate account management here is customer-facing (viewing the account, approving/rejecting rides as a manager); a dedicated admin dashboard for managing customers/drivers/vehicles/reservations/payments/reports across the whole platform doesn't exist yet.

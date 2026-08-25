# Handoff

Four lists. Every item names who can unblock it.

---

## 1 · Done and verified

| what | how it is verified |
|---|---|
| Client fare matches the backend's | `tests/fareParity.test.ts` — 1,611 assertions on identical inputs, three timezones |
| Server figure is authoritative, not the client's | `tests/serverFare.test.ts`; observed by making the demo backend disagree by $19.24 — the interstitial fired, nothing reached Stripe, no second booking |
| The quote is never scaled after it is made | `tests/quoteIsNotScaled.test.ts` — TS AST walk over every post-quote module; proved by injecting a multiplier into `payment.tsx` |
| Unconfirmed panel prices cannot reach a customer | ESLint rule + `tests/observedRateCardContainment.test.ts`; proved by probe, including the lazy `require()` route lint cannot see |
| No class is priced that nobody published | `tests/catalogueIntegrity.test.ts` |
| One name never carries two prices | `tests/publishedNameConflicts.test.ts`; proved by injecting a second conflict |
| Demo payloads match what each API module unwraps | `tests/demoApiShape.test.ts` — proved by reverting the concierge fix and watching it go red |
| Text contrast meets WCAG AA | `tests/contrast.test.ts` |
| Roles and labels are present app-wide | `tests/a11yStatic.test.ts` (presence only — see list 2) |
| Error and offline states are reached, not just rendered | a real CORS failure produced them during slice 1 |
| No blank screens, no `NaN`/`undefined`, no console errors | 20-screen sweep against the production export |
| Every touch target ≥ 44×44 | measured in-browser across 22 routes at 5 widths |
| ~~No horizontal overflow at 1.0/1.3/1.6/2.0~~ | **VOID — that check varied the root font size, which React Native Web ignores. One layout measured four times. Replaced by the 320px row below; see the changelog.** |
| Role preview renders on all five views | driven with real pointer events and a real ride id |
| Build mode matches what shipped | `scripts/verify-build-mode.mjs`, greps the emitted bundle |
| The verification scripts themselves compile and lint | `npm run lint` now covers `scripts/` |
| The ride lifecycle, all seven stages across three roles | `tests/rideStage.test.ts` (21 assertions incl. the transitions that must be REFUSED) plus `npm run verify:lifecycle`, which drives the chauffeur view and reads the customer and dispatcher views back |
| An ETA is never rendered where it cannot be attributed | `etaIsAttributable()`, asserted over the full stage list so a new stage cannot default to showing one |
| The admin console reaches all 16 sections and fabricates nothing | `npm run verify:admin` — asserts the data-less panels render no currency figure |
| Unconfirmed rate cards are absent from a production bundle | built with `EXPO_PUBLIC_DEMO_MODE=false`: no `/_role/*` route, zero occurrences of the rate-card data. Absent from the bytes, not merely unimported |
| Layout holds at 320 CSS px (WCAG 1.4.10 Reflow) | `npm run verify:a11y` at five widths |
| The gate cannot report on a partial run | completion ledger; verified by injecting an unreachable route, which produced `INCOMPLETE — no result reported` and exit 2 |

**Owner:** nobody. These are closed.

---

## 2 · Done and not verified

Every item has a procedure in **`DEVICE_VERIFICATION.md`**.

| what | section |
|---|---|
| Frame rate, map pan and list scroll, mid-range Android | 1 |
| Cold start to first interactive frame | 2 |
| Sheet detents, momentum, scroll-to-drag handoff | 3 |
| Haptics firing on the intended events and no others | 4 |
| Maps rendering with real keys on both platforms | 5 |
| Google Maps iOS SDK binary weight | 5 |
| OLED surface step at low brightness | 6 |
| `expo-blur` cost, if ever installed | 7 |
| Screen-reader traversal of trips and concierge | 8 |
| Whether an Arabic layout reads correctly | 9 |
| OS-level dynamic type (text scaling to AX5) | 10 — moved here from the gate, which could not test it |
| Whether a stage change reaches a second device | 11.1 — expected NO; this is G-3 |
| The waiting countdown across a locked screen and a real 30 minutes | 11.2 |
| The receipt total matching the booked total, twenty minutes apart | 11.3 |
| The chauffeur controls one-handed at a kerb | 11.4 |
| Whether it feels fast | 12 — a judgement call, not a measurement |
| Everything behind authentication | `RUNBOOK_AUTH_VERIFICATION.md` A1–A7 |

**Owner:** whoever holds a device and the credentials. Items 1–8 need an
engineer with a mid-range Android and an iPhone. Item 9 needs a native Arabic
reader. Item 12 is the client's call. A1–A7 need the repository owner, because
credentials never pass through this workspace.

---

## 3 · Blocked on the business

**First, because it has a paying customer attached to it today — the others do
not:**

> **The app describes the Luxury SUV and charges the SUV.**
>
> **The site was re-read from primary source on 2026-08-23, and the fact is now
> established.** `lctuniversal.com/fleet` publishes **seven** classes.
> The two that matter here:
>
> | site class | passengers | published |
> |---|---|---|
> | **Executive SUV** | 6 | **From $110** |
> | **Luxury SUV** | 6 | **From $130** |
>
> This **overturns** the earlier reading, which came from a transcription in
> `BACKEND_FOLLOWUPS.md` §6 and called the first class "SUV". Today's site calls
> it **Executive SUV** — which is exactly what the app's own data already calls
> it. See `PLATFORM_RECONCILIATION.md` §7.
>
> **So this is no longer a pricing judgement. It is a one-line naming bug.**
> The app's `suv` carries From $110, which is the site's Executive SUV, and the
> demo row's `name` is already the literal `'Executive SUV'`. The screens reading
> `vehicle.name` — home, booking picker, `PricingPreview`, `TrackingSheet` — have
> been right all along.
>
> **`VEHICLE_DISPLAY_NAME.suv = 'Luxury SUV'` is the defect.** It overrides a
> correct name with a *different published class's* name, so `/fleet` and
> `/corporate-info` advertise *Luxury SUV — From $110* for a product the business
> publishes at $130.
>
> **What the business must do:** confirm that the app's `suv` is meant to be the
> site's Executive SUV. If yes, the fix is changing one string to
> `'Executive SUV'` — not a price change. If the app is instead meant to sell the
> Luxury SUV, the published figure must become $130 and a new class is needed for
> the Executive SUV. Unchanged here only because a class name is a customer-facing
> value and no slice in this phase changes one.
>
> The site publishes two separate classes at identical capacity (6 pax, 6 bags):
> **SUV — From $110** and **Luxury SUV — From $130**. The app has one entry. Its
> price map is correct (`suv → From $110`, the site's SUV), but
> `VEHICLE_DISPLAY_NAME.suv` labels it **"Luxury SUV"** — the name of the $130
> class that the same file records as having no backend equivalent. Its image is
> `luxury-suv.jpg` and its description is *"Cadillac Escalade or equivalent"*,
> which is the operations panel's vehicle for its $120-minimum Luxury SUV.
>
> So on `/fleet` and `/corporate-info` a customer reads *Luxury SUV — From $110*
> for a product the business publishes at $130. On four other screens the same
> class reads *Executive SUV*, the backend's name. Capacity cannot disambiguate
> the two site classes; price is the only distinguishing published fact, and the
> app carries the lower one under the higher one's name.
>
> **Two readings, each with money attached — only the business can choose.**
> Either the **name** is wrong and $110 stands, or the class is meant to *be* the
> Luxury SUV (the Escalade description and the asset both point that way) and the
> **price** should be $130. Not changed here: both are customer-facing values.
>
> **Owner:** the client. Detail in `DESIGN_CHANGELOG.md` → *The SUV collapse*.
> Pinned by `tests/publishedNameConflicts.test.ts`.

**A product decision, not a defect — the web tracking screen has no map.**

> `react-native-maps` has no web implementation, so on `lctapp.netlify.app` the
> tracking screen shows a designed placeholder: *"The live map is available in
> the iOS and Android app"*, plus the live closing distance, which is real and
> updates. That is honest and it now renders correctly at every width.
>
> It also means **a client walking the demo in a browser never sees a map on the
> screen whose entire purpose is watching a car approach.** Three options, with
> what each costs:
>
> | option | cost |
> |---|---|
> | Keep the honest placeholder | nothing. Ships today. A browser demo with no map. |
> | Static route image | a Google **Maps Static API** key in the Netlify environment, plus a rendered route — so it needs a polyline the app already has (`routePolyline`) and a second key to manage and bill. No live marker: a still image. |
> | A web mapping library | a new dependency, a second map style to keep in sync with `MAP_STYLE_NIGHT`, and web-only code on the screen that matters most. Needs approval before anyone starts. |
>
> **Owner:** the client, or whoever owns the demo. Nothing is built on judgement
> here — the placeholder stays until someone chooses.

| # | question | why it blocks |
|---|---|---|
| Q1 | Is `lctuniversal.us/admin` this app's backend, or a separate product? | everything else hangs from it |
| Q2 | Which catalogue is authoritative for what a customer is charged? | two published sources disagree |
| Q3 | Is the metered rate card the customer quote formula, or an internal cost model? | decides whether the fare preview is rewritten |
| Q4 | Do surge zones affect price? | if yes, "priced at the moment you book" is false as published |
| Q5 | Is `LX-XXXXXX` the reference the customer sees? | a customer phoning dispatch has no shared identifier |
| Q6 | Where do the cancellation and waiting policies live in that system? | the app states 6h/12h and 30/60min and may be promising terms the business will not honour |
| Q7 | Is the per-class ETA hand-entered or computed? | if hand-entered it must never be shown as an arrival estimate |
| Q8 | Does a driver app exist behind the Driver Apps nav item? | decides whether C-4 is a build or a wiring job |
| Q9 | Sandbox credentials and API documentation | without them this app stays on demo data indefinitely |
| B3 | Who owns the rating figure and how often is it refreshed? "4.93 from 55 reviews" is a hand-read snapshot that will silently go stale | `src/config/reputation.ts` |
| B4 | How late is late? Nothing defines a problem row | the dispatcher board invents a five-minute grace |
| B5 | Is meet-and-greet selectable, and does it cost anything? | pricing and packaging before it is a column |
| B6 | Does the late-night surcharge apply by pickup time, or if any part of the journey falls in the window? | `isLateNight()` in both pricing functions |

**Owner:** the client. Q1 first — the other eight are cheaper to answer once it
is settled. Full detail in `PLATFORM_RECONCILIATION.md` and
`BACKEND_FOLLOWUPS.md`.

---

## 4 · Blocked on the backend

| # | what | consequence |
|---|---|---|
| C-4 | **No "arrived at pickup" status.** `TripStatus` goes `driver_arriving → passenger_picked_up`; nothing marks the car being *there* | `waiting_minutes` and `waiting_fare` exist and can never be filled correctly. The business has a waiting policy it cannot bill against, and a customer disputing a wait charge cannot be shown when the car arrived |
| §8 | **Timezone.** Pickup-local time, `America/Chicago` default, zone identifier never an offset | a booking near midnight lands on the wrong day; the late-night surcharge fires on the wrong journeys |
| §1 | **No `fleet_vehicles` table.** `vehicles` is a fare-class table, so there is no physical car — no plate, no colour, no make or model | the app cannot tell a customer which car is coming, and every identity field is null by design rather than by omission |
| G-1 | The trip socket carries no heading | the marker's direction is guessed from consecutive positions |
| G-2 | No update cadence specified, on either side | smoothing is tuned against an assumption |
| G-3 | `driver_locations` is never written during a trip | live tracking has no source of truth |
| G-4 | No route line to draw | the map shows a marker and two pins, not a journey |
| G-5 | ETA is whatever the driver app last said | an unbounded, unverified number shown as a promise |
| §6.1 | The advertised floor is not enforced — backend minimum $83.36 against a published "From $95" | a short trip is quoted under what the site says it starts at. **Deliberately not patched in the client**: clamping in the app would make the screens agree with the website while the invoice did not |
| §6.2 | "First Class Sedan $150/hour" has no backend class; the backend's sedan hourly is $100 | a published service cannot be booked |
| §6.3 | The backend prices Sprinter, Mini Coach and Motor Coach, which the site marks "Request Quote" | the app is fenced off these classes; the backend is not |
| §6.4 | Capacities differ — Sedan 2 bags vs 3, Sprinter 10 vs 14, Coach 56 vs 40 | the app shows one capacity and dispatch plans another |

**Owner:** whoever owns `lct-universal-backend`. C-4 is the highest value —
it unblocks the waiting policy, which is revenue the business currently cannot
collect. §8 is the highest risk, because it is wrong silently.

---

## Where things are

### Deployment

Written down because it was living in a chat log, which is one more single point
of failure than it looks like.

| | |
|---|---|
| **Live URL** | **https://lctapp.netlify.app/** |
| **Host** | Netlify |
| **Production branch** | `main` — repointed from `feat/ui-upgrade` on 2026-08-23 |
| **Build command** | `npm run export:web` (from `netlify.toml`) |
| **Publish directory** | `dist` |
| **SPA fallback** | `netlify.toml` — `/* → /index.html 200`. Required: `expo export` emits a single `index.html`, so without it every deep path 404s |
| **Environment variables** | **Netlify dashboard → Site configuration → Environment variables.** NOT in the repo — `.env` is gitignored and never committed |
| **The one that decides what ships** | `EXPO_PUBLIC_DEMO_MODE`. `scripts/verify-build-mode.mjs` runs inside the build and **fails it** if the emitted bundle disagrees with the environment. If `/fleet` is empty in production, check this before anything else |
| **Redeploy** | Deploys → Trigger deploy → **Clear cache and deploy site**. Clear the cache: Metro's transform cache does not key on `EXPO_PUBLIC_*` values |

### Repository

| | |
|---|---|
| Branches | `main` and `feat/ui-upgrade` are identical at `43facfc`. `feat/ui-upgrade` retained deliberately; delete only after a verified production deploy |
| What changed and why | `DESIGN_CHANGELOG.md` |
| Two price sources, side by side | `PLATFORM_RECONCILIATION.md` |
| Backend gaps, in detail | `BACKEND_FOLLOWUPS.md` |
| Device procedures | `DEVICE_VERIFICATION.md` |
| Authenticated verification | `RUNBOOK_AUTH_VERIFICATION.md` |
| Gates | `npm run typecheck`, `npm run lint`, `npm test`, then against a `serve dist -l 5055 --single`: `node scripts/sweep.mjs`, `npm run verify:a11y`, `npm run verify:lifecycle`, `npm run verify:admin` |

**One trap worth knowing:** `expo export` emits a single `index.html`. Serving
`dist/` without SPA fallback 404s every deep path, and a 404 page passes a
blank-screen check, a touch-target check and a reflow check. Always
`serve dist -l 5055 --single`.

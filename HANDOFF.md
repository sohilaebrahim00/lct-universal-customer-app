# Handoff

**What today (2026-08-31) could not produce, written first because it is more
useful than a document that ends on the word "done":**

| what | owner |
|---|---|
| A connected app — no backend answer, no credentials, no API documentation | The client — answer `OPEN_QUESTIONS.md` #3 (is `lctuniversal.us/admin` the backend) first |
| Anything behind real authentication | The repository owner — credentials never pass through this workspace; see `RUNBOOK_AUTH_VERIFICATION.md` |
| Anything crossing two devices (a chauffeur's stage change reaching a passenger's screen) | Whoever resumes engineering here — no live channel exists to build against yet, not a missing answer |
| Anything verified on hardware | Whoever holds a device — see `DEVICE_VERIFICATION.md`, text scaling first |
| A resolved price or class name | The business — see `OPEN_QUESTIONS.md` #2 and #9 |

**A sixth, and the cause is now known — it was never the deploy.**
`https://lctapp.netlify.app/` could not be loaded from this workspace or from
the project owner's browser: connection-level timeouts, while
`lctuniversal.com` — itself Netlify-hosted — answered fine seconds later on the
same connection.

**It is an ISP-level block on the `netlify.app` domain from this network.** The
site opens normally over a VPN. Every deploy this was raised against was fine;
what failed was reaching it, and only from here.

**Mitigation: put the demo on a custom domain** (e.g. `app.lctuniversal.com`)
pointed at the same Netlify site. Worth doing regardless of the block: a
client-facing demo on a vendor subdomain is fragile in exactly this way — one
network's filtering policy decides whether the product exists — and a custom
domain also stops the demo looking like a staging link.
**Owner:** whoever holds DNS for `lctuniversal.com`.

**What this does not excuse:** every claim in this document that says a build
was not confirmed live still stands as written. Not-confirmed remains
not-confirmed; the reason simply turned out to be the network rather than the
deployment.

Four lists follow. Every item in them names who can unblock it too.

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

**Re-run and reconfirmed 2026-08-31**, one invocation each, all clean:
`tsc --noEmit`, `eslint app src scripts`, `npm test` (1,894/1,894, 18 suites),
`npm run export:web` (build-mode + maps-key checks), the 20-screen sweep,
`verify:a11y` (22 routes × 5 viewports, 0 failures), `verify:lifecycle` (all
seven stages, three roles), `verify:admin` (16/16 sections). The
`EXPO_PUBLIC_DEMO_MODE=false` absence claim in the row above was independently
re-checked too — not just re-trusted — with a second export and a direct
`grep` of the emitted bundle: `ROLE_PREVIEW_MARKER` and every observed
rate-card figure are still absent; the two dead `_role/*` route-string
literals `DESIGN_CHANGELOG.md` already documents as accepted residue are
still exactly that — two, unchanged, not regressed into something worse.

**Owner:** nobody. These are closed.

---

## 2 · Done and not verified

Every item has a procedure in **`DEVICE_VERIFICATION.md`**.

| what | section |
|---|---|
| **OS-level dynamic type (text scaling to AX5)** | **1 — FIRST. `AppText`'s line-height scaling has never run with a value other than 1: shipped code that will execute for the first time on the phone of the user who most needs it working** |
| Frame rate, map pan and list scroll, mid-range Android | 2 |
| Cold start to first interactive frame | 3 |
| Sheet detents, momentum, scroll-to-drag handoff | 4 |
| Haptics firing on the intended events and no others | 5 |
| Maps rendering with real keys on both platforms | 6 |
| Google Maps iOS SDK binary weight | 6 |
| OLED surface step at low brightness | 7 |
| `expo-blur` cost, if ever installed | 8 |
| Screen-reader traversal of trips and concierge | 9 |
| ~~Whether an Arabic layout reads correctly~~ | **VOID — the feature is reversed, not pending. Arabic/RTL support (i18n store, translated strings, RTL layout rules) was built and then removed as a business decision on 2026-08-30. There is no longer an Arabic layout to verify. See DESIGN_CHANGELOG.md.** |
| Whether a stage change reaches a second device | 11.1 — expected NO; this is G-3 |
| The waiting countdown across a locked screen and a real 30 minutes | 11.2 |
| The receipt total matching the booked total, twenty minutes apart | 11.3 |
| The chauffeur controls one-handed at a kerb | 11.4 |
| Whether it feels fast | 12 — a judgement call, not a measurement |
| Everything behind authentication | `RUNBOOK_AUTH_VERIFICATION.md` A1–A7 |

**Owner:** whoever holds a device and the credentials. Items 1–9 need an
engineer with a mid-range Android and an iPhone. Item 10 is void — see above.
Item 12 is the client's call. A1–A7 need the repository owner, because
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

## 5 · Specified by the client, correctly deferred

Requested, scoped, and not built on purpose — a decision or a backend
missing, not an oversight. These stay client requests, not absences.

| what | needs | who unblocks it |
|---|---|---|
| **Book for a guest** — a passenger record separate from the account holder, with notifications going to a number that is not the payer's | A guest-passenger data shape (name, phone, relationship to the booking) and a decision on who the booking confirmation and trip updates are sent to — the payer, the guest, or both. `bookingFormStore`'s `primaryPassengerName`/`primaryPassengerPhone` fields already exist and are never read from any screen — the shape was anticipated, the UI and the notification-routing decision were not | Backend for the notification routing; product/business for who gets notified |
| **Promotion codes** — the client's own panel has a Promotions section, so the concept exists on their side | An endpoint to validate a code and the rules for it, most importantly how a discount interacts with a fare that is fixed and all-inclusive at booking (does it reduce the total shown at quote time, or apply after — the latter would violate "the fare is fixed at booking") | Backend for the endpoint; business for the interaction rule — this is a pricing-model decision, not a wiring one |
| **Apple Pay / Google Pay** | `merchantIdentifier` is already declared in `app.config.ts` (`merchant.com.lctuniversal.customer` — a placeholder, not a registered merchant ID) and `STRIPE_MERCHANT_IDENTIFIER` is documented in `.env.example`. Needs a real Apple Developer merchant ID and Google Pay configuration in the Stripe dashboard, and can only be verified on a physical device — neither wallet renders in a simulator | Whoever holds the Stripe dashboard and an Apple Developer account, then a device for verification |
| **A support conversation with history** — different from the Concierge that exists today (a stateless Gemini-backed assistant with no ticket store, no history across sessions, no human handoff) | A decision on which product this actually is: a persisted ticket/thread system, or Concierge extended with memory and human escalation. Building either without that answer risks building the wrong one | The client — say which of the two is wanted before either is scoped |
| **Chauffeur-to-class attachment** — the client's own panel groups chauffeurs by the vehicle class they drive; found while checking the admin console preview against it (2026-09-01) | A `chauffeur_class` field (or equivalent) on the backend. Today's assign flow correctly shows "class attachment unknown" for every chauffeur rather than guessing or sorting by an invented field | Backend — a schema addition, not a business decision |

**Owner, collectively:** the client for the three that are genuinely product
decisions (guest notification routing, promo/fixed-fare interaction, support
vs. Concierge); the backend for the two that are schema work once a decision
lands (or, for chauffeur-class attachment, with no decision needed at all).

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

---

## 5 · Specified, not built — from the Blacklane comparison

Each of these was asked for after a competitor review. None is implemented, each
names what it needs and who can unblock it.

### 5.1 Book for a guest — **backend field + notification path**

Blacklane: *"arrange their ride in a few taps and we'll keep them informed every
step of the way."* That is not a screen. It is a passenger record separate from
the account holder, and notifications going to a phone number that is not the
payer's.

**Needs:** a passenger name and phone on the booking (`primaryPassengerName` and
`primaryPassengerPhone` already exist in the draft and are already sent), plus a
notification route that targets that number rather than the account. The second
half does not exist.
**Owner:** backend. Related to C-1 (name-sign text) and C-5 (messaging).

### 5.2 Promotion codes — **endpoint + rules, and a sequencing decision**

The client's own operations panel has a Promotions section, so the concept
exists on their side. The backend has a `promo_codes` table and
`discount_amount` arrives on a priced booking.

**Missing:** an endpoint to validate or apply a code, and the rules — who issues
them, what they discount, whether they stack.

**The sequencing matters more than the screen.** A discount applied *after* a
quote is still a change to a number the app promised not to change. Either the
code is entered **before** the fare is shown, so the quoted figure already
includes it, or the app has to explain a total that moved — which is the exact
interstitial `fareDiffers()` exists to raise. Decide the order first.
**Owner:** the business, then the backend.

### 5.3 Apple Pay and Google Pay — **an identifier, a config, and a device**

`app.config.ts` already declares `STRIPE_MERCHANT_IDENTIFIER` and **it is
unset**.

**Needs:** an Apple merchant identifier registered to LCT, the matching Stripe
dashboard configuration, and a physical device — neither wallet can be verified
in a browser, so this cannot be signed off from this workspace at all.
**Owner:** whoever holds the Apple developer and Stripe accounts.
**Verification:** a new section in `DEVICE_VERIFICATION.md` when it is turned on.

### 5.4 A support conversation thread — **decide which product LCT wants**

The app has a **Concierge**: an assistant that answers and can act. Blacklane's
Help tab is a **support conversation with history** — a persistent thread with a
human, plus help topics.

Those are different products with different backends. Extending the Concierge
into a support inbox, or building a support thread beside it, are both real
projects and they do not merge cleanly.
**Owner:** the business. Nothing should be built until it is answered.

### 5.5 Digital pickup sign — **small, visible, and blocked on one field**

The chauffeur's phone displaying the passenger's name at an airport. Genuinely
useful and cheap to build.

**Blocked on:** the passenger name reaching the chauffeur view.
`BACKEND_FOLLOWUPS.md` C-1 records that no such field exists on the trip payload
the driver app would read. Until it does, a pickup sign would either be blank or
show a name the app made up.
**Owner:** backend. One field.

---

## 6 · Asked for, and deliberately refused

Recorded because a refusal that is not written down gets re-litigated.

### 6.1 Blacklane's policy figures

Their app states **15 minutes** of complimentary waiting and free cancellation up
to **one hour** before pickup. LCT's confirmed policy is **30 and 60 minutes** of
waiting and cancellation tiered at **12, 6 and 48 hours**, and those live in
`servicePolicy.ts` with their source.

Copying a competitor's numbers into LCT's screens would be the invented-fact
defect with a contractual consequence attached. **Not done, and not a judgement
call.**

### 6.2 By-the-hour with included mileage — **a business decision, not a UI task**

Blacklane's hourly product states *"40 km per hour included — extra distance or
time incurs extra charges"*, and its chauffeur app advertises that additional
distance and waiting time can be added to a chauffeur's compensation.

**LCT's fare is fixed at booking, all-inclusive, with no post-trip adjustment.**
A screen saying extra distance incurs extra charges would make the app
contradict its own contract, and `tests/quoteIsNotScaled.test.ts` exists
precisely to stop a fare moving after it is quoted.

LCT already sells an hourly service (`ServiceType` includes `hourly`, priced by
`per_hour_rate`). What it does not have is an *included-mileage* model with
overage.

**If the business wants one, that is a change to what LCT sells** — a new
pricing model, a new contract term, and a decision about whether the fixed-fare
promise survives it. It is not a feature to add to a screen.
**Owner:** the business.

### 6.3 The chauffeur offer system — **an operating model, not a feature**

Blacklane's chauffeurs choose rides from offers. The client's own panel
**assigns** chauffeurs from dispatch. Those are different businesses with
different economics, and the app should not acquire an offer system on the
strength of a competitor's screenshot.
**Owner:** the business, if it ever wants to change how it operates.

### 6.4 The visual language

Blacklane is light, blue and sans-serif. LCT is near-black, champagne gold and
Cormorant Garamond. What the recording is worth studying for is **information
architecture** — what appears on which screen, in what order — not the skin.

---

## 7 · The chauffeur and operator roles — what they cannot do yet

One app, one login. `Profile.role` decides where an account lands —
`'driver'` → the chauffeur board, `'admin'` → the operations console,
`'customer'` and `'corporate_admin'` → the customer app.

**The field was already in the contract.** `UserRole` has been in
`src/types/api.ts` since the project started and **no screen had ever read
it**. `src/lib/accountRole.ts` is the first thing that does. Nothing was
invented and nothing in the contract changed.

### C-4 is now the single blocking backend item for the chauffeur role

It used to be one entry on a list. It is not any more.

The chauffeur's most important action is **arrived at pickup** — it is what
tells a waiting customer the car is outside and what starts the complimentary
waiting window. `TripStatus` has no member for it, so the app records a
timestamp beside the booking instead. That worked as a demonstration. **Now a
real chauffeur account is the thing pressing it**, and the datum it produces has
nowhere to go.

Everything else the chauffeur role needs already exists in the schema. **C-4 is
the one thing standing between this feature and being real.**

### Three things it cannot do, each with what would unblock it

| what | why | unblocked by |
|---|---|---|
| **Sign in as a real chauffeur** | Sign-in runs against whatever auth exists today. A real chauffeur account needs a real user carrying `role: 'driver'`, which needs the Supabase auth project that **has never been confirmed to exist** | the repository owner, then the backend. `RUNBOOK_AUTH_VERIFICATION.md` A1–A7 |
| **Show a real schedule** | Jobs are seeded demo bookings. The board is a **shape**, not a schedule — the layout, ordering and controls are real; the contents are a demonstration and are labelled as one | a backend with real bookings |
| **Move a passenger's screen** | A stage marked by a chauffeur on one device does not reach a passenger on another. There is no live channel: `driver_locations` is never written during a trip | **G-3** |

**A role that looks complete and is not connected is the most convincing thing
in this app and the easiest to misread.** All three limits are stated on the
screens themselves as well as here.

### A bug found by measuring the fence, not by reading the code

The `_role` screens are stripped from a build made without
`EXPO_PUBLIC_DEMO_MODE` — verified by grepping the emitted bundle, which
contains no screen strings and no observed rate-card data.

But the route **strings** ship, because `landingRouteFor()` contains them. A
path naming a route that is not in the bundle resolves to the not-found screen,
so **a chauffeur or operator signing into a production build would have landed
on a 404.**

They now land in the customer app instead — the only surface that exists in that
build. That is a routing fallback, not a claim that they are customers;
`hasStaffRole()` still reports the truth.

**A better answer exists** — a designed "not available in this build" screen —
and it needs a decision about what it should say. Recorded here rather than
guessed at.
**Owner:** the business, for the copy. Low urgency: it only fires in a build
that has no staff surfaces at all.

---

## 8 · The operations console, as delivered

**Eighteen sections, matching the client's own panel.** Eight carry real data;
ten are designed empty states naming the missing table, endpoint or question.

| real | source |
|---|---|
| Overview | counted from the same rides Live Dispatch lists — seven order-board counts, no separate figure |
| Live Dispatch | the demo bookings. **The only panel that writes**: chauffeur assignment |
| Fleet | `DEMO_VEHICLES`, with plate and colour absent and saying why (§1) |
| Class Builder | `observedRateCards.ts`, labelled unconfirmed, edits lost on reload |
| Chauffeurs | `DEMO_CHAUFFEURS`, with no rating, tenure or trip count (§2) |
| Bookings | the demo bookings, showing the app's own ids because `LX-XXXXXX` is unconfirmed |
| Notifications | derived from real state — unassigned, late and cancelled rides |
| **Coverage** | **`lctuniversal.com/service-areas`, read 2026-08-26.** 57 communities, sourced and dated. Does not gate booking |
| **Users & Roles** | **the app's own `UserRole` model.** No account list — there are no users to enumerate |
| **Messages / Push Broadcast** | **composes, does not deliver.** No channel exists — C-5 |

| empty, and what would fill it |
|---|
| Ratings — no rating column on a chauffeur (§2), and the site publishes no verified reviews |
| Revenue — no payments or invoices table |
| Promotions — a `promo_codes` table exists server-side; no endpoint, no rules |
| Driver Apps — no auth project, no install telemetry |
| Onboarding — no documents or compliance table; the requirements are a business question |
| Support — support is the dispatch phone number; no ticket store |
| Settings — the policies live in `servicePolicy.ts` with their sources; making them editable would move a confirmed fact into demo memory |

**A revenue chart with no revenue is a fabrication.** So is a ratings panel for a
business whose own site says it publishes none.

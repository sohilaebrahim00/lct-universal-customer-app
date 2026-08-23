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
| Every touch target ≥ 44×44 | measured in-browser across 20 routes |
| No horizontal overflow at 1.0/1.3/1.6/2.0 | measured in-browser across 20 routes |
| Role preview renders on all five views | driven with real pointer events and a real ride id |
| Build mode matches what shipped | `scripts/verify-build-mode.mjs`, greps the emitted bundle |
| The verification scripts themselves compile and lint | `npm run lint` now covers `scripts/` |

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
| Whether it feels fast | 10 — a judgement call, not a measurement |
| Everything behind authentication | `RUNBOOK_AUTH_VERIFICATION.md` A1–A7 |

**Owner:** whoever holds a device and the credentials. Items 1–8 need an
engineer with a mid-range Android and an iPhone. Item 9 needs a native Arabic
reader. Item 10 is the client's call. A1–A7 need the repository owner, because
credentials never pass through this workspace.

---

## 3 · Blocked on the business

**First, because it has a paying customer attached to it today — the others do
not:**

> **The app describes the Luxury SUV and charges the SUV.**
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

| | |
|---|---|
| Branch | `feat/ui-upgrade` — **`main` still holds the pre-redesign app** |
| Netlify production branch | points at `feat/ui-upgrade` |
| What changed and why | `DESIGN_CHANGELOG.md` |
| Two price sources, side by side | `PLATFORM_RECONCILIATION.md` |
| Backend gaps, in detail | `BACKEND_FOLLOWUPS.md` |
| Device procedures | `DEVICE_VERIFICATION.md` |
| Authenticated verification | `RUNBOOK_AUTH_VERIFICATION.md` |
| Gates | `npm run typecheck`, `npm run lint`, `npm test`, then against a `serve dist -l 5055 --single`: `node scripts/sweep.mjs` and `npm run verify:a11y` |

**One trap worth knowing:** `expo export` emits a single `index.html`. Serving
`dist/` without SPA fallback 404s every deep path, and a 404 page passes a
blank-screen check, a touch-target check and a reflow check. Always
`serve dist -l 5055 --single`.

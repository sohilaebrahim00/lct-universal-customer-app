# Design changelog

What changed, why, and what was actually verified rather than assumed.

Started at the backend-integration phase. Completed and reorganised per screen
in the final handover slice; until then this accumulates as work lands, so that
nothing has to be reconstructed from memory at the end.

**The distinction this file exists to keep:** *designed* means the behaviour was
built and reasoned about. **Verified** means it was observed happening. Where a
claim is only the former, it says so.

---

## Verified behaviours

Things that have been observed working, with what produced the observation.

### Error and offline states — verified by a real network failure

The fleet screen and the vehicle-selection step render designed error states
rather than blank screens when the API cannot be reached.

Previously this was **designed only**. During Slice 1 a genuine misconfiguration
verified it: the local API's `CORS_ORIGINS` did not include the origin the built
app was served from, so `GET /vehicles` failed at the browser with
`net::ERR_FAILED` after a blocked preflight. The app responded correctly:

- Fleet → *"Couldn't load the fleet / Could not reach the server."*
- Vehicle step → *"We couldn't load the fleet / This is our end, not yours."*
  with **Try again** and **Call dispatch**.

That is the first time those branches have been exercised by an actual network
failure rather than a fixture that returns an error object. A fixture can prove
the branch renders; only a real failure proves the branch is *reached* — that
the fetch layer, the `AsyncState` transition and the screen agree about what
went wrong.

### Fare parity — verified numerically, both halves executed

See `BACKEND_FOLLOWUPS.md` §8 for the full verdict. 1,611 assertions comparing
the client's `calculateFarePreview()` against the backend's `calculateFare()` on
identical inputs, in one process. Every shared field matches. Run under three
timezones.

### The price-change guard — verified against a built bundle

The payment screen compares the authorised total against the server's before
anything reaches Stripe. Verified by making the demo backend disagree by $19.24
and rebuilding: the interstitial fired, the flow stopped at `/book/payment`,
nothing reached Stripe, and re-authorising created no second booking.

### API contract — verified, with a stated limit

All 24 call sites across the app's eight `src/api/*` modules resolve to a real
backend route with matching response envelope keys. No 404s waiting.

**The limit, stated:** this verifies that the endpoints and their envelope keys
line up. It does **not** verify that the payloads do. Slice 1 found four fields
returned by `GET /vehicles` that the app's `Vehicle` type did not declare, which
is exactly the class of thing an endpoint-level check cannot see.

---

## Classes of bug found, not incidents

Recorded as general hazards, because each will recur if only its instance is
remembered.

### Inlined `EXPO_PUBLIC_*` constants go stale across builds

**Metro's transform cache does not key on `EXPO_PUBLIC_*` values.** These
variables are inlined into modules at transform time, and a cached transform is
reused across builds even after the value has changed.

Observed: `EXPO_PUBLIC_DEMO_MODE=false npx expo export` produced a bundle with
`"true"` still inlined. `metro.config.js` reads `process.env` fresh on every run,
so the *route* fence updated while the *runtime* flag did not — a bundle with
`app/_role/` correctly stripped and an Account screen still advertising it,
pushing to routes that were not there.

At release the same mechanism ships seeded fake customers, fake trips and a
"Reset demo" button to real users, with `expo export` exiting 0 the whole way.

**Anyone adding another flag that changes what ships needs to know this.** A new
`EXPO_PUBLIC_*` constant inherits the hazard automatically and silently.

Mitigations, in order of what actually does the work:

1. `scripts/verify-build-mode.mjs` greps the **emitted bundle** and exits
   non-zero when an inlined flag disagrees with what the environment asked for.
   It runs as part of `npm run export:web`. Add new flags to its `CHECKS` list.
2. `--clear` is the default in `export:web` and `export:ios`. Hygiene, not a fix
   — a defect whose remedy is "remember to type X" is not fixed.

### A safeguard gated on `isDemoMode` is inert exactly where it matters

Two protections were written as `if (!isDemoMode) return null/false`, on the
reasoning that a real build should defer to the live API. Pointing a non-demo
build at a real backend showed what that produced: Fleet advertising a starting
price below any achievable fare, and the booking flow quoting fixed prices for
two classes the business will not price.

**Facts about the business do not belong behind a demo fence.** Published
prices, quote-only classes, service policy, the reputation figures — these are
true in every build and live in `src/config/`, each carrying its source and the
date it was read. The demo dataset is for data that stands in for a backend, not
for things the company has published about itself.

---

## Screens

*(Per-screen entries are compiled in the handover slice. Recorded here as work
lands.)*

### Demo dataset — two defects the tracking rebuild surfaced

Recorded because both were invisible until a screen actually depended on them.

- **The seeded chauffeur was in Los Angeles** (`34.0736, -118.3994`) on a
  Dallas–Fort Worth product. Nothing showed it while the map framed the driver
  alone; a map that frames chauffeur *and* pickup put a Californian marker and a
  Texan one on one screen.
- **Seeded bookings carried no coordinates.** With no pickup or drop-off point
  there is nothing to frame and nothing to measure closing distance against, so
  the demo's most important screen had no content.

Both fixed by resolving coordinates from the address against one table, so an
address and its point cannot drift apart.

### Fleet

- Shows the website's published starting label — "From $95", no cents — in
  **every** build, or **nothing** when no figure is published for that class. It
  no longer falls back to the backend's `base_rate`.
  **Why:** against a live API it printed "From $65.00" for a sedan that cannot
  be booked below $102.60, whose floor including gratuity and tax is $83.38, and
  which the company itself advertises at $95. Four numbers, and the app was
  inventing the only one nobody had published. A base rate is a component of a
  fare, not a price a customer can pay.
  **Note:** this does not reconcile the website/backend price conflict
  (`BACKEND_FOLLOWUPS.md` §6), which stays open. It only stops the app
  publishing a third number that agrees with neither.

### Booking — pickup and destination (artboards 2d, 2e)

One component, two screens; they differ only in copy and whether a route is
drawn, which is not enough to justify two files that drift apart.

- **The app's own map style**, shared with the tracking screen rather than
  duplicated — two map styles in one app drift, and these are the only two
  places a customer sees a map.
- **The centre pin lifts while the map moves**, with its shadow staying on the
  map plane. Not decoration: a pin welded to the centre of a moving map reads as
  part of the map, and the customer cannot tell whether they are dragging the
  pin or the world. Suppressed under reduced motion — the shadow still separates
  the planes.
- **Saved and recent places in the sheet**, and they **commit in one tap**. The
  customer has already named the place; asking them to confirm a map position
  for it is a step that existed only because it was easier to build. Recents are
  derived from `GET /bookings` (`BACKEND_FOLLOWUPS.md` §4 — no recents
  endpoint), both ends of every journey, de-duplicated against saved by address
  **and by proximity**.
- **`fitToCoordinates`** on the destination screen instead of a hand-rolled
  `latitudeDelta: 0.01`, which framed a one-mile hop and a twenty-three-mile
  airport run identically and put the other end off screen on the latter.
- **The route drawn in gold with a glow** — two polylines, wide and faint under
  narrow and solid, because `react-native-maps` cannot put a shadow on a
  polyline. A straight line, not a driven route: this is a picker and the
  customer is still choosing where the line ends. The exact route is computed
  once on confirmation.
- Primary action names what it does — "Confirm pickup" / "Confirm destination"
  rather than a generic "Confirm Location" on both.
- **Every fallback intact.** Manual entry when Maps is unconfigured, in Expo Go,
  and on web — and saved/recent places now work *there too*, where they matter
  most, because that path has no search, no autocomplete and no panning.

**Verified (web, manual fallback):** saved and recent lists render, one tap
commits and advances, the full booking path completes, no console errors.

**Unverified — native only:** the map, the lifting pin, `fitToCoordinates`, the
route polyline and its glow. `react-native-maps` has no web implementation —
the same caveat as the tracking screen, stated up front rather than discovered
at the end. See `RUNBOOK_AUTH_VERIFICATION.md` §7.

### Booking — when & who (artboard 2f)

- Given the **same header as steps 4 and 5** — back control beside the progress
  rail. Steps 4 and 5 had one and this did not, so the only way back out of the
  middle of the flow was the system gesture: a hardware back on Android, and on
  iOS an edge swipe that the map screens either side of it intercept.

### Booking — vehicle selection

- Sprinter and Coach show **Request quote** and a request action in every build,
  not just the demo.
  **Why:** quote-only status came from a demo-gated helper, so in production the
  app quoted `$211.61` and `$532.24` for two classes the website marks "Request
  Quote" — committing LCT to a price they have explicitly said they do not give.

### Live tracking (`trips/[id]`) — artboard 2k

- **Google Maps on iOS as well as Android** (`provider={PROVIDER_GOOGLE}`).
  Apple Maps ignores `customMapStyle` entirely, so without this the iOS
  tracking screen rendered in Apple's default theme — inside a near-black
  champagne-and-gold app, on the one screen where the map *is* the product and
  the customer is watching hardest. The intent was always Google on both:
  `app.config.ts` has declared `ios.config.googleMapsApiKey` since the
  project started; the provider was simply never selected.
  **Two costs, reported rather than assumed:** the Google Maps iOS SDK adds
  binary weight, **not measured** — there has been no EAS build in this
  environment, so measure at the first one. And `GOOGLE_MAPS_API_KEY_IOS` is
  unset, so on iOS this is **inert until a real key exists**: the map renders
  blank rather than falling back to Apple.

- **The map is the screen.** Full bleed, sheet floating over it. It was a 200pt
  map card inside a scroll view, framed at a fixed `latitudeDelta: 0.02` —
  which framed a 23-mile airport run exactly as tightly as a one-mile hop, and
  put the chauffeur off screen on the former.
- The chauffeur marker **interpolates** coordinate and bearing across the update
  interval and never jumps. Bearing takes the short way around the compass, so a
  car crossing north does not pirouette. The interval is *measured* from the gap
  between the last two frames, because no cadence is specified on either side
  (`BACKEND_FOLLOWUPS.md` §9 G-2).
- The camera **eases** rather than snapping, and reframes at
  `passenger_picked_up`: chauffeur + pickup on approach, chauffeur +
  destination in trip. Before it, the customer cares how close the car is to
  them; after it, how close they are to where they are going.
- **Uber's dynamic progress curve**, copied deliberately: the last 20% of the
  bar represents the last 2 minutes. A linear bar moves a few pixels during the
  only two minutes anyone watches it, and stops reading as information. Honest
  because it reallocates *bar* between time intervals — it stays monotonic and
  reaches 1 exactly when the ETA reaches 0. It does not invent progress.
- Chauffeur row shows **tenure, not a rating**. `drivers.hired_at` does not
  exist (§2), so the line renders nothing today and explicitly does **not** fall
  back to `driver.rating`, which is populated and available — falling back
  would quietly restore the thing the design removed.
- Timeline animates as it advances, with `accessibilityLiveRegion="polite"` on
  the **active row only**. Marking the whole list live would re-read seven rows
  on every change.
- **Nothing is sold on this screen**, and one tap reaches dispatch.

**Verified (demo layer, web build):** status changes made in the chauffeur role
preview appear on this screen; the sheet, timeline, chauffeur row, addresses and
dispatch action render; the web placeholder still shows live closing distance;
no console errors.

**Unverified — native only:** map rendering, marker rotation and interpolation,
and camera easing. `react-native-maps` has no web implementation. See
`RUNBOOK_AUTH_VERIFICATION.md` §7.

**Known limitation:** the custom map style applies on Android and not on iOS —
Apple Maps ignores `customMapStyle` and this app does not select the Google
provider on iOS. That is a product decision with licensing attached, not a
styling one.

### Booking — payment

- The total shown before authorising is the carried preview; from the moment
  `POST /bookings` returns, the screen shows the **server's** breakdown. The two
  are compared to the cent before Stripe, with no tolerance band.
  **Why:** the customer authorised a number this app computed while Stripe
  charged a number the backend computed, and nothing compared them. The guard
  that appeared to check this was comparing the client's preview against the
  client's own recomputation.
  **Why no tolerance:** a tolerance is a decision about how much silent
  overcharging is acceptable, which is not a decision to make quietly.

### Booking — confirmation

- The reservation total is fetched from the booking rather than read from the
  client draft.
  **Why:** this screen is the receipt, and the thing a customer screenshots. It
  was showing the client's preview even after the payment screen was corrected.

---

## Still unverified

Stated so it is never implied otherwise.

Everything behind authentication. The local backend runs on placeholder Supabase
values, and the seeded profiles have no Supabase users, so nobody can sign in:
**Trips, Account and all sub-pages, Corporate, Concierge, Notifications, Payment
methods, Saved locations and passengers, booking creation, the payment screen's
fare guard against a genuinely independent server computation, the confirmation
screen, and live trip tracking.**

The fare guard is verified against the demo backend only. Its one real test —
the client's preview against an independent server computation — needs auth.

The route is now written: **RUNBOOK_AUTH_VERIFICATION.md**. It lists the seven
claims that need auth (A1–A7), the exact commands, and how to force the fare
guard to fire so a guard that never fires is not mistaken for a verified one.
Run on the owner's side; credentials never pass through this workspace.

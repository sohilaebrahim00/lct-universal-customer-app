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

## States, connectivity, and the shim

### Connectivity is app-wide, and derived from what the app experiences

The banner existed from an earlier slice and was mounted **nowhere but the dev
gallery**, so offline still rendered as nothing at all on every screen.

It is now mounted once on the app shell — offline is a property of the app, not
of whichever screen is open, and one mount cannot drift out of sync with twelve.

**Not `expo-network`**, and not only because adding a dependency needs asking:
that library reports whether a network interface is up, and this app needs to
know whether it can reach ITS API. A phone on hotel wifi behind a captive portal
reports a perfectly healthy connection and can reach nothing. So connectivity is
inferred at the single fetch boundary — a NETWORK-level failure marks offline, a
successful response marks online, and an HTTP 500 does neither, because the
server answered. On web, `navigator.onLine` supplements it, but only ever to go
offline early: `onLine === true` means "an interface exists", not "the internet
works".

**Verified:** banner absent when online, present after going offline, and still
present after navigating to another tab.

### The demo-payload shape gate

`tests/demoApiShape.test.ts` asserts that for every endpoint the app calls, the
demo layer returns the key `src/api/*` unwraps. **Proven to catch the concierge
bug**: reverting that fix turns the suite red on exactly that endpoint.

### The token shim — three verifiable claims, and the rule caught me

1. **A scoped `no-restricted-imports` rule** in `eslint.config.js` fails the
   build for any migrated directory that imports the shim. It is enabled per
   directory as each is migrated, because a rule that has to be disabled to
   commit is a rule that gets deleted.
   **It immediately caught three files I had listed as migrated and had not
   migrated** — `Divider`, `ScreenContainer` and `AnimatedRoutePreview`. That
   is the difference between a claim and a checked claim.
2. The contrast gate already covers the tokens being migrated to.
3. A screenshot sweep of 16 screens into `design/after/`, with structural
   checks for blank screens, `NaN`/`undefined` leakage and console errors.

**Migrated:** all 7 account sub-pages, plus `corporate-info`, `Divider`,
`ScreenContainer` and `AnimatedRoutePreview`. **Outstanding:** ~25 files, listed
by the lint rule's own inverse — anything not in `MIGRATED_OFF_THE_SHIM`.

## Service policy — all three blocked inputs are answered

`freeCancellationHours`, `dispatchPhone` and now `complimentaryWaitMinutes`
(**30 standard, 60 airport**) are real published policy. Every slot built for
them and left rendering nothing now renders.

The rule that produced those blanks is unchanged and was the right one: a
promise printed above a pay button is a commitment, so it appears only when the
business has actually made it. What changed is that they have.

- The payment and confirmation screens state both windows, **resolved by service
  type** — 60 minutes on an airport transfer, 30 on a point-to-point. The wait
  line sits beside the price because it *is* part of the price: it is the span
  in which waiting costs nothing.
- `airport.tsx` markets "Complimentary Waiting Time". That claim was
  deliberately left unquantified while the figure was unknown — a benefit stated
  without a number is not a fabricated number, and rewriting a client's
  marketing on our own judgement would have been the overreach. The number now
  exists, so the claim is **completed rather than removed**, reads the figure
  from `servicePolicy` so the page cannot drift out of step with the booking
  flow, and names *airport pickups* explicitly so nobody carries 60 minutes away
  as a general promise.

### Displayable is not enforceable

The honest half, and it should not get lost in the good news.

The app can **state** the waiting policy, because it is real. It can never
**enforce** it, because `BACKEND_FOLLOWUPS.md` C-4 still stands: there is no
"arrived at pickup" status, so nothing marks when the clock starts,
`bookings.waiting_minutes` and `waiting_fare` stay unfillable, and no waiting
charge can be computed correctly.

**The business now has a waiting policy it cannot bill against.** Every minute
of paid waiting time is either uncharged or charged outside the system. That is
recorded under C-4 as the strongest argument for building it — a revenue
argument rather than an engineering preference.

## Accessibility — two lists, kept separate

The distinction this whole file is built on, applied to the one pass most
likely to blur it. **An accessibility sweep that reports the first list as
though it covered the second is the same error as a fixture proving a branch
renders and being read as proving it is reached.**

### Structurally verified — assertions, and they stay true

| Claim | How |
|---|---|
| Every `Pressable` declares a role | `tests/a11yStatic.test.ts`, per file |
| Every `Pressable` is labelled | same — `accessibilityLabel`, or `accessible` with text children |
| No touch target under 44×44 | **measured in the built app**, 13 screens, every focusable box |
| Font scaling is never capped | no `allowFontScaling={false}`, no `maxFontSizeMultiplier` |
| No horizontal overflow or clipped text at scale 1.0 / 1.3 / 1.6 / 2.0 | measured in the built app, 9 screens |
| Live regions where content changes unprompted | asserted per file, with the reason named |
| Every colour pair clears its WCAG threshold | `tests/contrast.test.ts`, now covering the role palette and the map |
| Vehicle identity is one utterance and degrades honestly | `tests/vehicleIdentity.test.ts` |

**14 real role/label gaps fixed.** The worst were icon-only *destructive*
buttons — remove-a-saved-card, remove-a-passenger — which announced as nothing
at all.

**Three measured size defects fixed**, none of which a source scan would have
caught:
- Segmented controls were **36pt** tall. The style said
  `minTouchTarget - space.sm` — a deliberate inset that put every segmented
  control in the app under the floor.
- `Button size="sm"` was **40pt**. "Small" is a visual weight, not a licence to
  be hard to hit.
- The remove-icon buttons measured **20×20**. I had "fixed" them with
  `hitSlop={10}` first, which gets to 40 — *still* under the floor, and
  invisible to anything that measures what is rendered. They now have real
  44×44 boxes.

**One contrast failure found by extending the gate**, not by looking: map water
labels at **2.87:1**. `neutral[400]` is documented as being for the "optional"
qualifier in a field label and nothing else; it was reached for so a lake name
would recede, and it receded past legibility. A map label is text, and being
cartographic exempts it from nothing.

### NOT verified here — needs a screen reader on a device

These are not covered by anything above, and no assertion in this repo can
cover them:

- **Focus order.** Whether tabbing or swiping through a screen reaches things in
  an order that makes sense.
- **Whether an announcement is coherent when spoken.** `accessibilityLabel="button"`
  passes every assertion in this repo and helps nobody. The labels added this
  slice read well on the page; none has been heard.
- **Whether the app is navigable by someone who cannot see it.** Completing a
  booking end to end with the screen off is a different question from every
  element having a role.
- **Whether the layout at AX5 is usable rather than merely un-clipped.** The
  reflow check proves nothing is cut off. It says nothing about whether the
  important thing is still reachable, or whether the reading order survives.
- **VoiceOver vs TalkBack differences**, which are real and not simulable here.

`RUNBOOK_AUTH_VERIFICATION.md` is the model for closing these when a device is
available.

## Performance and RTL — two lists, same split

### Structurally verified — measured, not felt

| Claim | Measurement |
|---|---|
| Source images downscaled | **4.60 MB → 2.79 MB** (−39%). The six `assets/services` photos alone: **2.1 MB → 796 KB** |
| Service images no longer load at module scope | `SERVICES[n].image` is a getter — resolved on first read, not on import |
| `expo-image` everywhere, with a placeholder and a reserved box | one `AppImage`; 10 call sites converted; `aspectRatio` or an explicit height required |
| `FlatList` rows memoised | `TripCard` and `Bubble`, each with a stable `useCallback` handler |
| `keyExtractor` on every list | both lists already had one |
| Styles hoisted | **NOT DONE — see the correction below** |
| Physical → logical properties | 33 occurrences across 15 files |
| No physical properties can return | ESLint `no-restricted-syntax`, app-wide |
| `textAlign` stated explicitly | `auto` on every `AppText` |
| Token shim retired | **zero importers**; the rule is now inverted to cover everything by default |

#### Two scope items answered honestly rather than claimed

**`useAnimatedScrollHandler` — nothing to convert.** Measured, not assumed:
`grep` for `onScroll`, `scrollEventThrottle`, `useAnimatedScrollHandler`,
`useScrollViewOffset` and `contentOffset` across `app/` and `src/` returns
**zero hits**. There is no scroll-driven state in this app, so there is nothing
for the hook to replace. Not applicable, rather than skipped.

**Styles hoisted — I claimed this and it was not true.** The first version of
the table above said "no inline style objects remain." Counting them:
**181 remain**, across 30 files, and the top of the list is static spacing —
`marginBottom: space.sm` alone appears 23 times.

What the count does and does not mean:

- **None of them are on a memoised component.** `TripCard` receives only
  primitives plus the stable `onOpen`; `Bubble` the same. So the memoisation
  work above is unaffected — the argument that inline objects defeat `memo`
  does not apply to any of these 181.
- They are static one-liners on plain host `View`/`AppText`. Each allocates
  one small object per render, which is real and is also very small.

**Judgment call, stated so it can be overruled:** I did not sweep them. Hoisting
181 single-property styles would add 100+ one-line `StyleSheet` entries for no
measurable gain, in a codebase whose rule is *fix, do not redesign* — and the
last 30-file mechanical sweep in this project is what produced the
`skeletonForeground` bug. Say the word and I will do it; I am not going to do
it quietly and call it performance work.

**The JS bundle went UP**, and that is the honest number: **5.28 MB → 5.32 MB**,
about 40 KB, which is `expo-image`. The win is in the assets and in the work
avoided, not in the JS. Stated plainly because a performance report that only
lists improvements is not a measurement.

**What the lazy require does and does not buy.** Metro still resolves the paths
statically, so the *assets ship either way*. The getter removes decode work and
memory from the path a customer takes; it does not remove bytes from the
download. The downscale is what removes bytes.

### NOT verified here — needs a device

- **Frame rates.** Nothing in this pass measured a single frame.
- **Scroll smoothness on a mid-range Android device.** The memoisation is
  correct by construction; whether it is *perceptible* is unmeasured.
- **The `expo-blur` cost.** Still unmeasured — and worth noting that
  `expo-blur` is **not installed**, so there is currently nothing to measure.
- **Cold start**, before and after `expo-image`.
- **Whether any of it feels fast.** The only claim that matters to a customer,
  and the one nothing here touches.
- **The Google Maps iOS SDK's binary weight**, still pending a first EAS build.

### RTL — converted and enforced, not validated

**Verified:** every physical property converted, a lint rule that fails the
build if one returns, `textAlign: 'auto'` stated rather than inherited, and one
documented exception — the tracking marker's nose is a **border triangle**,
which is geometry rather than reading direction, and carries an inline disable
saying so. The rule caught that exception itself, which is how it earned its
place.

**Not verified:** whether an Arabic layout actually reads correctly. There are
**no Arabic fonts loaded** and no RTL dev build to run, so nothing here has been
seen in RTL. The conversion is a precondition for correctness, not a
demonstration of it — mirrored icons, bidirectional text runs, and whether a
right-aligned booking flow reads naturally are all open.

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

### Card — a component API that silently discarded layout

`Card` renders `<Surface style={[..., style]}>` with its children inside an
**inner padding `View`**. So `<Card style={{ flexDirection: 'row' }}>` set the
direction on a container holding exactly one element, and did nothing.

**Six screens shipped that way** — `corporate-info`, `airport`,
`demo-account`, and three account sub-pages. Their rows rendered stacked, and
the content sized to itself and clipped against the Surface's
`overflow: hidden`: "A dedicated account for your company, with centralized
billi—".

It typechecked. It linted. It rendered without a single error. It was found by
looking at a screenshot.

Fixed as an API change rather than six patches: `Card` now takes `row` and
`align` props that reach the inner container, so the trap is not available to
the next person.

### corporate-info — no longer deferred

- Four states. It was `.catch(() => setVehicles([]))`, which does not swallow an
  error so much as **convert it into an empty success** — a failed fetch and a
  genuinely empty fleet rendered identically, with no retry, on the screen aimed
  at the customers most likely to notice.
- It also printed `From $65.00` — the same defect fixed on Fleet in the
  backend-integration slice, still live here on the sales screen. Now the
  published label, or nothing.

### Live tracking — a failed detail fetch is no longer silent

`.catch(() => {})` on the trip detail was defensible when the map was a 200pt
card. With the map as the screen it means no marker, no ETA and no chauffeur —
a blank map and a status pill, with nothing explaining why the rest is missing.
A 404 still means "no trip yet" and stays quiet; anything else surfaces with a
retry.

### Concierge

- **One `Bubble`**, shared. There were two implementations — the screen's and
  the removed FAB's — which is how two chat UIs in one app come to disagree
  about who is speaking.
- **A failed send is the customer's own bubble with a retry**, never an
  assistant message. The old code pushed `{ role: 'assistant', content:
  err.message }`, so a dropped connection read as the concierge saying "Network
  request failed". The app's failure wore the concierge's voice.
- **The typing indicator is inside a bubble** in the assistant's position, not a
  detached spinner above the input. A spinner says "the app is busy"; a bubble
  says "the concierge is replying", and it holds the space the reply will fill
  so the list does not jump.
- **`KeyboardAvoidingView` and `maintainVisibleContentPosition`** — new
  content grows below what you are reading instead of shoving it.
- **A structured intent card for anything carrying a date.** `scheduledAtDescription`
  is a *phrase* — "tomorrow at 8am" — and the backend does not resolve it. The
  card shows the phrase back in quotes and the action is **"Set date & time"**,
  which routes to the date step rather than to vehicle selection. A client-side
  guess at "tomorrow", feeding a fare promised as final, is the silent
  substitution this whole redesign exists to remove.

### Auth screens

- Form errors are **announced** (`accessibilityLiveRegion="assertive"`). A
  screen-reader user submitted a form and heard nothing at all. Assertive rather
  than polite: an error answers something the user just did, and waiting for a
  gap risks them having moved on.
- Error text uses `destructiveText`, not `destructive`. The token file's own
  rule is "strokes and fills only" for the latter. **Measured before claiming:
  `destructive` is 4.70:1 on the page and does pass AA** — this is the wrong
  token, not a contrast failure. It would fail on a tint, which is what the rule
  exists to prevent.
- "Forgot password?", "Create an account", "Sign in" and "Back to Sign In" are
  **44pt targets**. They were bare `<Link>`s around text — about 16pt. The
  control a locked-out customer needs most was the smallest thing on the screen.

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

# Design changelog

What changed, why, and what was actually verified rather than assumed.

Started at the backend-integration phase. Completed and reorganised per screen
in the final handover slice; until then this accumulates as work lands, so that
nothing has to be reconstructed from memory at the end.

**The distinction this file exists to keep:** *designed* means the behaviour was
built and reasoned about. **Verified** means it was observed happening. Where a
claim is only the former, it says so.

---

## Read this first: present, readable, and inert

**Five times** in this project, a safeguard was written, reviewed, read correctly
by everyone who looked at it, and did nothing at all. Twice it was a guard, and
twice it was the gate that was supposed to catch the guard failing.

1. **The `isDemoMode` guards.** Two protections written as
   `if (!isDemoMode) return null/false`. They protected the demo and were inert
   in the build that mattered, which is how the app came to advertise
   `From $65.00` against a published $95 and to quote fixed prices for two
   classes the business will not price.
2. **The observed-rate-card lint rule.** It parsed, it read correctly, and ESLint
   flat config silently replaced it — a later block set the same rule name, so
   the patterns were wiped. A probe file importing the fenced data linted clean.
3. **The accessibility gate.** It reported "0 targets under 44×44, no reflow
   problems" across sixteen routes. Fifteen of the sixteen were the 404 page.
4. **The same gate, at one width.** Once it stopped measuring 404 pages it still
   only ever ran at 390×844. A phone — and so did the sweep, and so did the
   reflow checks. **Every gate in this project was a phone.** A defect whose
   trigger is a WIDE viewport could not fail any of them, and one was sitting
   there: `TrackingMap.web.tsx` carried `paddingBottom: '58%'`, a percentage
   that resolves against WIDTH, not height. 226px on a 390px phone — correct by
   coincidence, within six pixels of the flat 220px someone had just rejected as
   too small. 835px on a 1440px desktop, inside an 846px-tall box, which pushed
   the map's designed state above the fold and left an empty rectangle on the
   tracking screen. The first screen of a live-tracking demo, blank in a browser,
   for as long as those gates had been green.

5. **The reflow check tested nothing.** It set the root font size to
   16/20.8/25.6/32px and re-measured, reporting "0 reflow overflow at
   1.0/1.3/1.6/2.0" from Slice 7 onward. **React Native Web emits absolute
   `px` font sizes**, so the root font size changes nothing. Measured on
   `/about`: a rendered heading was `39px` at BOTH 1.0 and 2.0, the tallest
   scroller was `1398` at both, every value byte-identical. Four scales, one
   layout, measured four times.

**A check that cannot tell it is pointed at nothing is not a check.** That is the
one failure mode here which no amount of care at the call site prevents: the call
site was correct every time. Only running the guard against a case it must fail
proves it runs at all.

Every guard added after this was found now has a probe: the containment rule is
proved by a file that imports the fenced data, the surge assertion by a
multiplier injected into `payment.tsx`, the duplicate-name guard by a second
injected conflict, and the accessibility gate by `assertRendered()`, which fails
the run if any route serves the not-found page.

### The correction to the record

**Slice 7 and Slice 8 were both reported green, and accepted, partly on the
strength of "0 touch targets under 44×44, no reflow problems at 1.0/1.3/1.6/2.0".
That claim was measuring a 404 page fifteen times out of sixteen. Those
acceptances are void.**

- **Reported by:** Claude, in the Slice 7 and Slice 8 reports.
- **Accepted by:** the project owner, on the strength of those reports.
- **Cause:** the gate's route list used expo-router *group* paths — `/(app)/fleet`
  and so on. Route groups organise files and are stripped from the URL. Every
  assertion the gate made was true and none were about the app: a 404 page has
  text, so the blank check passed; it has one link, so the target check passed;
  it fits any viewport, so the reflow check passed.
- **Caught by:** loading `/fleet` by hand during Slice 10 while investigating an
  unrelated question about vehicle names, and getting a 404.
- **Cost:** `/onboarding` — the first screen a new customer sees — had been
  scrolling sideways on web for the whole period those greens were reported. It
  was found within a day of the gate starting to work.

**The corrected numbers are now true:** 20 of 20 routes measured, none serving
404, 0 targets under 44×44, 0 reflow overflow at 1.0/1.3/1.6/2.0. They were not
true when they were first claimed, and both facts belong in this file.

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
| Styles hoisted | **decided against — reasoning and reversing condition below** |
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

#### DECISION: the 181 inline styles are not swept. Reviewed and upheld.

Not outstanding work. A decision, with its reasoning, so that nobody does it
mechanically at the worst possible time:

1. **None of them defeat a `React.memo`.** That is the only mechanism by which
   an inline style object causes a re-render, and it does not apply here.
2. **The cost is one small allocation per render on a plain host component**,
   with no reconciliation consequence. React Native diffs styles by value.
3. **Hoisting makes the code worse.** A hundred-odd single-property
   `StyleSheet` entries put every call site's spacing one indirection away from
   the call site, to save nothing measurable.
4. **The precedent is real.** The last thirty-file mechanical sweep in this repo
   is what produced the `skeletonForeground` bug.

**The condition that reverses it:** if one of these host components later
becomes memoised, its styles get hoisted **at that moment, as part of that
change** — because at that moment reason 1 stops being true and the inline
object starts defeating the memo it was just given. Not as a sweep, and not as a
backlog item; as part of the commit that introduces the `memo`.

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

---

## Two published price sources, and a shape adopted without values

The client runs a live operations panel at `lctuniversal.us/admin`. Seen once,
as a phone recording of a laptop screen, sandbox mode, test admin account. It
carries five vehicle classes with full metered rate cards — base, per mile, per
minute, minimum fare, per hour, seats, bags, a configured ETA.

That disagrees with `publishedFleet.ts`, which came from the marketing site at
`lctuniversal.com` and which the business confirmed verbatim. **A different
number of classes with different figures is a different product catalogue, not a
rounding difference.**

**Nobody can say which one wins yet, so nothing chose.** What was done instead is
the one thing that is correct under either answer: **adopt the shape, not the
values.**

A rate card is a superset of a "from" price — a minimum fare yields a starting
figure, and a starting figure yields nothing. So the app's internal price model
is now the rate card (`src/config/rateCard.ts`, **shape only, no numbers in the
file**), and a marketing figure is either derived from one or sourced separately
and reconciled. What must never happen again is a third number invented in a
third place, which is exactly how `From $65.00` came to be printed against a
published $95.

### Zero customer-facing values changed

No price, no class, no label. No class added or deleted — a catalogue is a
business decision. The full comparison is `PLATFORM_RECONCILIATION.md`.

### The containment, and why it is not a comment

`observedRateCards.ts` holds the panel's figures and states in its own header
that they are unconfirmed. That is not sufficient, because this project has now
shipped the same defect twice with a comment already in place — `From $65.00` on
the fleet browser, and a live-priced Sprinter against a published "Request
Quote". Both were guarded; both guards were gated on `isDemoMode`, which is inert
in exactly the build that matters.

So the third instance is made structurally impossible:

| mechanism | covers |
|---|---|
| ESLint `no-restricted-imports` | static imports, everywhere except `src/dev/` |
| `tests/observedRateCardContainment.test.ts` | lazy `require()`, dynamic `import()`, re-exports, and **the continued existence of the lint rule itself** |

Both were proved by probe: a screen importing the fenced file fails lint **and**
the test; reaching it through `require()` passes lint and **fails the test**,
which is the gap the test exists for.

**A bug I introduced and caught while writing that rule.** The first version was
its own config block above the shim block. It parsed, it read correctly, and it
did nothing — ESLint flat config **replaces** a rule when a later block sets the
same rule name, so the shim block's `no-restricted-imports` silently wiped the
patterns. A probe file importing the fenced data linted clean. That is the same
failure mode as the `isDemoMode` guards the rule was written to replace: present,
readable, inert. The patterns are now named once and spread into every block that
sets the rule, with the trap written down next to them.

### The catalogue difference, computed rather than recalled

Both app classes with no counterpart in the panel — **Mercedes Sprinter and
Coach** — are **already quote-only**. The 9B treatment therefore required no code
change: the existing rule already covers exactly the right set. Worth computing
rather than assuming, and worth reporting as "no change needed" rather than
quietly doing nothing.

Computing it also corrected the brief: `publishedFleet.ts` holds **four**
`VehicleType` entries plus two documented site-only classes, not seven classes.

And the two catalogues **disagree in opposite directions** on the two classes
they share — published $95 against a panel minimum of $85, and published $110
against a minimum of $120. Whatever the relationship between these systems is, it
is not a single markup rule, which is why nothing derives one figure from the
other. Pinned in `tests/catalogueIntegrity.test.ts`.

### Surge — one assertion, and what it does not cover

The panel has a surge-zones feature; the business says there is no surge. The
panel's wording reads as dispatch visibility rather than a multiplier — **that
reading is a guess and is filed as a question**, not recorded here as a finding.

What is asserted is the rule the app already holds: the quote is computed once,
fixed at booking, and never adjusted afterwards. `tests/quoteIsNotScaled.test.ts`
walks the TypeScript AST of every module between quote and confirmation and fails
on any `*`, `/`, `*=` or `/=` applied to a money-bearing expression, and on any
surge vocabulary in code anywhere under `app/` or `src/`.

Three honest limits. The one permitted multiplication is by the literal `100`
(dollars to cents in `fareDiffers()`), allowed by the literal rather than by
filename, because a file-level exemption would also permit `total * 100 * 1.5`.
The assertion is **client-side only** — the customer is charged what the server
decides. And it was written on the AST rather than by grep because the first
attempt returned import statements: JSDoc is full of `*` and every import path is
full of `/`.

**Why it was writable at all is the more useful finding.** The quote is a single
named object created in exactly one place — `draft.allInFare`, the structural fix
for audit P0-3. Had the fare still been recomputed per screen, "the quote" would
be a different value in every file and there would be nothing to assert about. A
correctness fix from four slices ago is why a pricing-integrity test can exist
now.

---

## Never verified on a device

The complete list, in one place, so no reader has to assemble it from context.
**Not one of these has been observed on real hardware.** Everything in this
project ran in a browser against a built export, on a Windows workstation.

| | why it cannot be claimed |
|---|---|
| **Frame rates** | nothing measured a single frame |
| **Scroll smoothness on mid-range Android** | memoisation is correct by construction; whether it is perceptible is unmeasured |
| **Cold start**, before and after `expo-image` | never timed |
| **Sheet detents** | the bottom sheet's snap behaviour has never been dragged by a thumb |
| **Haptics** | `expo-haptics` calls are wired and have never been felt. A no-op on web |
| **Maps on hardware** | `PROVIDER_GOOGLE` on iOS is inert without `GOOGLE_MAPS_API_KEY_IOS`; the Google Maps iOS SDK's binary weight is unmeasured pending a first EAS build |
| **The OLED surface step** | the near-black palette's separation between page, card and sheet has only been seen on an LCD monitor, which is the display least able to show it |
| **Screen-reader coherence** | labels and roles are asserted structurally. Whether a screen is *navigable* by someone who cannot see it needs VoiceOver and TalkBack |
| **Whether an Arabic layout reads correctly** | no Arabic fonts are loaded and there is no RTL dev build. The logical-property conversion is a precondition for correctness, not a demonstration of it |
| **`expo-blur` cost** | not installed. There is nothing to measure |
| **Whether any of it feels fast** | the only claim a customer has, and nothing here touches it |

Everything behind authentication remains unverified for a separate reason —
see **Still unverified** above and `RUNBOOK_AUTH_VERIFICATION.md`.

---

## Closing entries

### A test being expressible is evidence about the architecture

The surge assertion in the previous slice was writable at all only because the
quote is a single named object created in exactly one place — `draft.allInFare`,
the structural fix for audit P0-3. Had the fare still been recomputed per screen,
"the quote" would have been a different value in every file and there would have
been nothing to assert *about*. **A test being expressible is evidence about the
architecture, not just about the test.** The corollary is worth keeping: when an
obvious invariant turns out to be unstateable, the finding is usually the shape
of the code, not the difficulty of testing.

### The gate that measured 404 pages

The touch-target and reflow gate reported "0 targets under 44×44, no reflow
problems" across sixteen routes, twice, in two separate slices. **Fifteen of the
sixteen routes were the 404 page.**

The route list used expo-router GROUP paths — `/(app)/fleet` and so on. Route
groups organise files; they are stripped from the URL. Every assertion the gate
made was true and none of them were about the app: a 404 page has text, so the
blank check passes; it has one link, so the target check passes; it fits any
viewport, so the reflow check passes.

Two mechanisms now prevent the repeat. `assertRendered()` requires every route to
prove it is the app before it is measured, and the run fails if any route 404s or
if coverage drops below the full list. And the serving trap is written into
`HANDOFF.md`: `expo export` emits a single `index.html`, so `dist/` must be
served with SPA fallback or every deep path 404s.

**This is the same class as the lint rule that parsed and did nothing.** A check
that cannot tell it is pointed at nothing is not a check. Both were found by
probing rather than by reading.

### What the working gate immediately found

`/onboarding` — the first screen a new customer sees — **scrolled sideways on
web**. `ride.jpg` is 1400×2535, and the document's `scrollWidth` was exactly
1400 against a 390 viewport. React Native Web keeps an `<Image>`'s intrinsic
width, and every ancestor computed `overflow-x: visible`, so the photograph leaked
past its absolutely positioned box. `body` clips, so there was no scrollbar to
notice — but `window.scrollTo(500, 0)` moved, which on a phone is the first
screen sliding under a thumb.

Fixed with `overflow: 'hidden'` on the root view. Native was never affected.

**Why only that screen:** every other full-bleed photograph goes through
`AppImage`, whose frame already sets `overflow: 'hidden'`. `welcome.tsx` uses the
identical `absoluteFill` pattern with a similar asset and never leaked. This was
the last raw `<Image>` used as a background. That is an argument for the wrapper
existing, not for hunting the next instance by hand.

### The Luxury SUV, resolved as far as it can be without the client

The hypothesis was that the app's `suv` might be the panel's **Premium SUV**
wearing the **Luxury SUV**'s name — which would mean a customer booking a Luxury
SUV is dispatched a Suburban. **Checked against the attributes rather than the
label, and it does not hold.** The app's `suv` reads *Cadillac Escalade or
equivalent*, 6 passengers, 6 bags, `luxury-suv.jpg`. The panel's Luxury SUV is
*Cadillac Escalade or equivalent*, 6 and 6; its Premium SUV is *Suburban or
equivalent*. The example-vehicle phrasing matches verbatim.

So the label is right and **the price is what is out of step**: a class whose
attributes are the Luxury SUV is published at *From $110*, against a site figure
of $130 and a panel minimum of $120. The app under-publishes for the class it
actually describes.

**A separate defect found on the way, and not fixed here.** The app calls that
one class by two different names: `/fleet` and `/corporate-info` render *Luxury
SUV*; the home screen's recent trips, the booking picker, `PricingPreview` and
`TrackingSheet` render *Executive SUV*. Both are customer-facing. Observed in the
built export, not inferred. Not changed, because a class name is a
customer-facing value and this slice changes none — pinned in a test instead, so
the fix has to update it deliberately.

### The duplicate-name guard is green by enumeration, and why

`tests/publishedNameConflicts.test.ts` fails when two entries share a display
name and disagree on a figure. It passes today only because the one known
conflict is **enumerated** in `KNOWN_CONFLICTS`.

The alternative was to let it stay red as a standing demand for a decision.
Rejected: the standing rule here is green gates at all times, and a suite that is
red for a reason nobody in this repo can fix — it needs the business to say which
figure is right — teaches everyone to read red as normal, and the next real
failure hides behind it. A red gate nobody can clear also gets skipped within a
week, leaving the conflict invisible AND the test gone.

Enumerating it keeps the gate usable and loses nothing: a **new** conflict turns
it red, and **resolving** the known one turns it red as well, so the exemption has
to be deleted on purpose. Verified in both directions.

### `scripts/` is linted now, and the exclusion was hiding a broken file

`npm run lint` was `eslint app src`. `scripts/` — which holds every verification
harness this project's claims rest on — was excluded because of an unresolved
`playwright` import.

The exclusion was not protecting a false positive. **`scripts/shoot.mjs` could
not run at all**: `import { chromium } from 'playwright'` against a package that
is deliberately not a dependency, failing with `Cannot find package 'playwright'`.
The linter had been reporting a true defect, and the directory was excluded to
silence it.

Fixed at the cause: `shoot.mjs` now resolves Playwright from the npx cache the
way its five siblings always had. Two stale warnings cleared with it — a dead
`clickAndType()` helper left behind when the walk stopped driving the app by
selector, and a misplaced import. **No resolver exemption was needed**, and the
lint target is now `app src scripts`.

### The 181 inline styles: decision restated

Not swept, not outstanding. Reasoning and the condition that reverses it are
recorded above. If one of those host components later becomes memoised, its
styles are hoisted as part of that change.

---

## The end of the redesign

What is finished is finished, and what is not is written down with an owner. The
three documents that carry it forward:

- **`HANDOFF.md`** — four lists: verified, unverified, blocked on the business,
  blocked on the backend.
- **`DEVICE_VERIFICATION.md`** — every unverifiable claim turned into a
  procedure with an observable pass criterion, including the one item that is
  honestly a judgement call and names who makes it.
- **`PLATFORM_RECONCILIATION.md`** — two catalogues, their differences, and the
  nine questions.

What remains needs a device, a client and a backend. None of those are ours to
invent, and the project stops here rather than pretending otherwise.

---

## The SUV collapse — checked in the files, reported only

**The question:** does the app collapse two published classes into one entry, and
if so whose price did it keep?

**Answer to the two specific checks:**

1. **`publishedFleet.ts` contains no Executive SUV entry.** It has exactly one
   SUV entry: `suv: 'From $110'`.
2. **`From $110` does not sit next to the words "Executive SUV" on the site.** It
   sits next to a class the site calls **SUV**. "Executive SUV" is the
   *backend's* name for that class, from `seed.sql`. `BACKEND_FOLLOWUPS.md` §6
   already pairs them: *"Executive SUV … $109.01 minimum against a published
   'From $110'"*.

**So the site's two classes are `SUV` and `Luxury SUV`, not `Executive SUV` and
`Luxury SUV`** — and the price map is **correct**. `suv → From $110` is the
site's SUV. The site's Luxury SUV at From $130 is correctly recorded in
`WEBSITE_CLASSES_WITHOUT_BACKEND_EQUIVALENT` as having no backend equivalent.

Transcribed in `BACKEND_FOLLOWUPS.md` §6 from
`lct_migrate/src/lib/site-data.ts`, read 2026-08-22. **That source is not in this
repository**, so this rests on a transcription, not on a file anyone here can
re-read.

| site | pax | bags | published | backend | app |
|---|---|---|---|---|---|
| Sedan | 3 | 2 | From $95 | Executive Sedan | `executive_sedan` |
| **SUV** | 6 | 6 | **From $110** | **Executive SUV** | **`suv`** |
| **Luxury SUV** | 6 | 6 | **From $130** | *(none)* | *(none)* |
| First Class Sedan | 2 | 2 | $150/hour | *(none)* | *(none)* |
| Executive Sprinter | 14 | 10 | Request Quote | Sprinter Van | `sprinter` |
| Mini Coach | 39 | — | Request Quote | Coach / Custom | `coach` |
| Motor Coach | 56 | — | Request Quote | Coach / Custom | `coach` |

### The defect is one level above the price map

`VEHICLE_DISPLAY_NAME.suv = 'Luxury SUV'`.

The app takes the class the site publishes at **From $110** and labels it with
the name of a **different published class that the same file records as having no
backend equivalent** — the one at From $130. Its image asset is
`luxury-suv.jpg`, and the demo row describes it as *"Cadillac Escalade or
equivalent"*, which is the operations panel's vehicle for its **Luxury SUV**
(minimum $120), not for the SUV class.

So the app **describes the Luxury SUV and charges the SUV.** On `/fleet` and
`/corporate-info` a customer reads *Luxury SUV — From $110* for a product the
business publishes at $130. On the home screen, the booking picker,
`PricingPreview` and `TrackingSheet` the same class reads *Executive SUV*, the
backend's name.

Capacity cannot disambiguate: the site lists SUV and Luxury SUV as **6 pax and 6
bags each**. The only distinguishing published fact is the price, and the app
carries the lower one under the higher one's name.

### Why this is not fixed here

Two readings, each with money attached, and only the business can choose:

- **The name is wrong.** `suv` is the SUV class; it should not be called Luxury
  SUV. The fix is a display name, and the $110 stands.
- **The price is wrong.** `suv` is meant to *be* the Luxury SUV — the Escalade
  description and the `luxury-suv.jpg` asset both point that way. Then the
  published figure should be $130 and the app is under-charging.

Either way the app currently quotes one class and describes another, and it is
doing so for customers today. **Changing a class name or a published price is a
customer-facing value change**, which no slice in this phase makes. It is at the
top of the blocked-on-the-business list in `HANDOFF.md`, above the nine platform
questions, because unlike them it has a paying customer attached to it now.

---

## Postscript: the site, re-read from primary source

The SUV finding above rested on a **transcription** — `BACKEND_FOLLOWUPS.md` §6,
read 2026-08-22 from a file not in this repository. Stating that caveat was
right; acting on it was better. `lctuniversal.com/fleet` was re-read directly on
2026-08-23, and **the transcription was wrong on the one word the whole finding
turned on.**

The site publishes **seven** classes, and calls the $110 one **Executive SUV** —
not "SUV". Full table and method in `PLATFORM_RECONCILIATION.md` §7.

**This overturns the conclusion in the section above.** I wrote that "Executive
SUV" was only the backend's name from `seed.sql` and never appeared beside $110
on the site. It does. The app's demo row already carries the literal string
`'Executive SUV'`, which means **the backend name and the site name agree**, and
have all along.

So the defect narrows to one line: **`VEHICLE_DISPLAY_NAME.suv = 'Luxury SUV'`
overrides a correct name with a different published class's name.** The screens
reading `vehicle.name` were never wrong. The three reading `VEHICLE_DISPLAY_NAME`
are, and they advertise a $130 product's name at a $110 price.

It also surfaced a second, previously undocumented collapse: the site has
**two** coach classes — Executive Mini Coach (39) and Executive Coach (56) — and
the app has one `coach`.

### The pattern this closes on

This is the fourth time in this project that checking the artefact beat
reasoning about it, and the second time it overturned something *I* had just
concluded and reported with confidence:

| claim | what settled it |
|---|---|
| "the gate is green" | loading the route and getting a 404 |
| "the lint rule protects the fenced file" | a probe file that linted clean |
| "the site's class is called SUV" | opening the page |
| "no inline style objects remain" | counting them |

**A caveat is not a substitute for the check it describes.** Writing "this rests
on a transcription nobody here can re-read" was honest and it was still one
command short of the truth. Where the source is reachable, read it.

The corrected fact is in `PLATFORM_RECONCILIATION.md` §7 and at the top of the
blocked-on-the-business list in `HANDOFF.md`. The earlier section is left
standing rather than edited, because the sequence — transcription, conclusion,
caveat, re-read, correction — is the record.

---

## The ride, end to end — and the gate width that hid a blank map

### The blank map: cause named before any fix

Four candidates, three ruled out with evidence rather than by plausibility.
**Not** a missing web Maps key — `verify-maps-keys web` prints *"no native map
on web — nothing to verify"* and the web component uses no key. **Not** a
missing web path — `TrackingMap.web.tsx` exists and renders. **Not** a failing
import — zero console errors, the DOM node present at `opacity: 1`.

It was `paddingBottom: '58%'`, resolving against **width**. Measured across four
viewports, the computed padding was exactly 58% of the width every time —
835.19px at 1440, 226.19px at 390 — and the placeholder's top followed it from
+260px down to **−27px**, above the fold.

Fixed by making the block absolutely positioned with `bottom: '58%'`, which on
an absolutely positioned element resolves against **height**, as intended.
Native was never affected: `absoluteFill` genuinely constrains there.

### The gate now has a viewport matrix, and a check the matrix alone would not have given it

**Adding 1440 would not have caught it.** The reflow check tests horizontal
overflow, and this bug produced none — the content was above the top, not past
the side. So two things landed together:

| | |
|---|---|
| `VIEWPORTS` | phone 390, large phone 430, tablet 834, desktop 1440 — each with a written reason, and the file states that the matrix is the contract |
| `offscreenAbove()` | text positioned off the top of the screen, excluding legitimately-scrolled containers |

**The detector was wrong first, and measuring the real defect is what fixed it.**
It tested `bottom <= 0` — fully invisible. The real clipped line measured
`top: −27, bottom: +9`: nine pixels on screen, so it would have been skipped
while the icon and first line above it were gone. The condition is `top < 0`.

Proved by reverting the fix and re-running: **phone 0, large phone 0, tablet 0,
desktop 1** — `clipped by the top edge (top -27px)`. Restored, all four clean.

The gate also lied about its own coverage: `--pass=targets` printed "0 reflow
overflow at 1.0/1.3/1.6/2.0" about four scales it had not run. The summary now
states only what executed, and says `[PARTIAL RUN]` when it is one.

### The lifecycle: seven stages, three views, one store

`src/lib/rideStage.ts` is the single state machine the customer screen, the
chauffeur preview and the dispatcher board all read. One derivation, so an
action in one view moves the other two by construction rather than by three
components agreeing.

**`arrived_at_pickup` is not a backend status, and none of this fixes C-4.**
`TripStatus` runs `driver_arriving → passenger_picked_up` with no member meaning
*here*, and `Trip` has no `arrived_at` column. So arrival is an **overlay**: a
timestamp carried beside the booking, exactly as `assignments` is, and for the
same reason — the backend has nowhere to put it. `stageFor()` derives the stage
from the pair.

That shape is the argument. It shows what C-4 would enable — a customer told the
car is outside, a waiting window starting at a real moment — while making it
structurally obvious the datum has no home in the API. When `trips.arrived_at`
exists, the overlay is deleted and `stageFor()` reads the column; nothing else
changes.

**The waiting window is policy, never a charge.** 30 minutes standard, 60
airport, from `servicePolicy`. It shows a clock and no money: no fee, no rate,
no running total, and nothing at all about cost once it elapses — because what
happens then is Q6 and nobody has answered it. Asserted twice: in the unit test
against the sentence, and in the walk against the rendered screen.

**On the timezone, precisely.** The brief called this the first thing depending
on a clock. True — but a countdown is *duration* arithmetic, two instants
subtracted, and is timezone-independent. There is a test asserting exactly that.
What needs the pickup's zone is rendering an arrival *time*, and `Booking`
carries no zone column (§8), so the receipt shows device-local time and says so
in a comment rather than inventing `America/Chicago`.

### How a state machine was verified — decided before it was built

A screenshot at one moment cannot verify a sequence, for the same reason a
screenshot at one width could not verify a layout. Three legs:

1. **Transitions as pure functions** — 18 assertions, including the ones that
   must be REFUSED: a stale arrival timestamp must not drag a moving trip back
   to "outside", and a cancelled ride belongs nowhere on the rail.
2. **A full run through the lifecycle** asserting the stage advances in order
   and never skips, repeats or reverses.
3. **`scripts/lifecycle-walk.mjs`** — the chauffeur acts, the customer and
   dispatcher views are read back. One browser context throughout, because the
   store is `localStorage` and a second context is a second store.

**The walk found a real defect on its first run.** After the passenger was
aboard, the customer screen still read *"Arriving in 6 min"* — stale, and worse,
*undefined*: the socket carries one `etaMinutes` with no statement of which leg
it measures (G-5). From arrival onward the stage now owns the headline and no
unjustifiable number is shown.

It also found a defect **in itself**: it asserted against the dispatcher's TODAY
board for a ride scheduled tomorrow, which was correctly absent. The app was
right and the walk was wrong — the same shape as an earlier walk that failed
near midnight. Retargeted at the dispatcher's ride view, which has no date
filter.

### Not verified

Real elapsed time — the countdown is read seconds after arrival, never after
thirty real minutes on a device that slept. Propagation between two **devices**:
the store is one browser's `localStorage`, and a dispatcher moving a real
customer's screen needs the socket in G-3, which does not exist. And none of it
runs against a backend that has an arrived-at-pickup status, because there is
not one.

---

## A fifth failure, and it is a different one

The four in *Read this first* were all **inert**: present, readable, doing
nothing. The fix for inertness is a probe — run the guard against a case it must
fail.

This one was **live, and calibrated against an assumption about the defect
rather than against the defect.**

`offscreenAbove()` was written for one bug: the map placeholder pushed off the
top of the screen. The first version tested `bottom <= 0` — *fully invisible*,
which is what "off the top" means if you reason about it from the phrase. The
actual element measured **top −27, bottom +9**: nine pixels still on screen,
visibly broken, and it would have **passed**. A detector written specifically
for a bug that would have skipped that bug.

It did not ship that way only because the real element was measured before the
check was written. **The fix for inertness is probing; the fix for this is
measuring the actual case.** They are different disciplines and both are now
required of anything added to `scripts/a11y-gate.mjs`.

### A category, not a coincidence: output that describes more than execution

Twice now a checker has reported results for work it did not do.

1. **The gate measuring 404 pages** — every assertion true, none of them about
   the app.
2. **`--pass=targets` printing "0 reflow overflow at 1.0/1.3/1.6/2.0"** about
   four font scales it never loaded.

The second is the first in miniature, and the repair is the same both times:
report only what ran, and say so when the run was partial. The summary now
enumerates the passes that executed and appends `[PARTIAL RUN]` otherwise.

### The environment gap: no gate has ever run where the client is served

Every failure recorded above is the same shape — *the assertion is true in the
failure state*. **This one is not, and it is harder to see:**

> **The assertion was true. In the environment where it ran.**

```
Every gate in this project runs on WINDOWS, against a local `dist/`.
The artifact runs on LINUX, served by Netlify.
No gate has ever executed in the environment that serves the client.
```

That gap has existed since the first slice, invisible because nothing had
depended on it. **Case sensitivity is the first thing through it.** Windows
resolves `Sprinter-Passenger.jpg` to `sprinter-passenger.jpg`; Linux does not.
A mis-cased literal therefore loads locally, verifies in a local `dist/`, passes
every gate honestly, and 404s on the deploy. Path separators, line endings and
case-insensitive route matching all live in the same gap.

**And the symptom is silent in exactly the way this project keeps meeting.** A
missing image is not a blank screen, and on web a failed image request is not a
console error. `sweep.mjs` visits `/fleet`, finds text, finds no console error,
and passes over a hole in the layout.

#### The mitigation, and it is one rule

> **A check that compares a name to a file must compare STRINGS. Never ask the
> filesystem whether a file exists — on Windows, the filesystem is the thing
> that lies.**

Demonstrated rather than asserted, on this machine:

```
existsSync('assets/vehicles/Sprinter-Passenger.jpg')   ->  true
readdirSync('assets/vehicles').includes(...)           ->  false
```

`scripts/verify-assets.mjs` is that rule, and it runs INSIDE `export:web`, so a
build cannot produce an artifact it has not checked. Two halves, both probed red
before being trusted:

1. **Source** — every `require('.../assets/...')` literal matched against a
   directory listing, character for character. Probed by changing one literal's
   case: caught, with the message naming Windows and Linux explicitly.
2. **Artifact** — every asset URL the emitted bundle references must exist in
   the export. Probed by deleting one emitted file: caught.

Its own first run reported **all 31 references missing** — a confident negative
arriving in a group, which is this project's signature for a broken matcher
rather than a finding. It was: the path join prepended `assets/` twice. Its
second run reported two more, `icon.png` and `favicon.png`, which turned out to
be strings inside the serialized app manifest rather than loaded images.

#### What it still does not do

**It does not run on Linux.** It checks names, not the environment, so it closes
the first hole in the gap and not the gap. The gap closes only by running a gate
in the environment that serves the client — a CI step on Linux, or a check
against the deployed URL rather than a local `dist/`.

### Five matcher failures, one tool, and the rule that covers all of them

Not five accidents. **Five instances of string search over rendered text**, which
cannot tell a label from a value or a layer from the layer above it:

| # | what it reported | what was true | sign |
|---|---|---|---|
| 1–3 | swap row, capacity counts, "Arrives approx.", name sign, flight, notes — **absent** | all on screen; matchers were case-sensitive against uppercase labels | false negative |
| 4 | `.last()` on `^Home$` selected the saved location | it selected the bottom tab bar | wrong node |
| 5 | `$199.30` **in the cancellation confirmation** | the fare on a trip row *behind* a transparent modal | false positive |
| 6 | `OPEN present: true` on the dispatcher board | it matched the **caption** of the "0 unassigned" counter, while the value was 0 | label read as value |

`innerText` returns a flattened string with no idea what is on top, what is a
heading, and what is a counter caption. So the rule is not "be careful with
matchers". It is narrower, and it is testable:

> **A check that must distinguish a value from a label, or content from an
> overlay, cannot be a text search.** It needs a scoped selector — the panel, the
> row, the specific node. A text search is safe only where *any* occurrence
> anywhere would be equally wrong.

Applied:

- `cancel-walk.mjs` reads the confirmation through `panelText()`, anchored on two
  of the panel's own strings so it cannot climb to `<body>`. **Rule satisfied.**
- `sweep.mjs`'s blank-screen check reads `body.innerText` and is **correct to** —
  its question is "did anything render at all", where any text anywhere is
  exactly what it wants. The line now says so, so nobody copies it into a check
  where it would be wrong.
- `admin-walk.mjs:88` runs `/\$\d/` over `body.innerText` to prove the data-less
  panels show no money. It is asking *what can a person see*, so it **violates
  the rule** and is clean only because no admin panel opens an overlay today.
  Labelled at the check with its one-line fix.

Written as a rule so the seventh does not have to be found first.

### `innerText` sees through what is on top of it — in both directions

Three matcher failures in this project were **false negatives** — swap rows,
capacity counts, "Arrives approx.", name signs, flight numbers, all reported
absent while on screen, all from case-sensitive or ambiguous matchers. The rule
written from them was *an all-negative result is a signature, not a finding.*

`cancel-walk.mjs` produced the **opposite sign of the same cause** on its first
run. It read `document.body.innerText` while a transparent modal was open and
reported:

> `[list confirmation] a figure that reads as money: $199.30`

There was no money in the confirmation. The `$199.30` was the booked fare on a
trip row **behind the scrim**, which the check read straight through. A
**fabrication reported where there was none** — the mirror image of a feature
reported absent where it was present.

`innerText` has no idea what is visually on top. That makes it the wrong read
for any check asking *what can a person see*, and a perfectly good read for
*did anything render at all*.

**Fixed** in `cancel-walk.mjs` by scoping the read to the confirmation panel,
anchored on two of its own strings so it cannot climb to `<body>`.

**Latent, and now labelled rather than fixed:** `admin-walk.mjs:88` runs
`/\$\d/.test(t)` over `document.body.innerText` to prove the data-less panels
show no money. No admin panel opens an overlay today, so it is clean. The day
one does — a confirm, a sheet, a picker — it reads both layers and either fires
falsely, or worse, a real figure hides behind an overlay and it stays silent.
The note sits at the check, and the fix is one line: scope the read to the
panel. `sweep.mjs` reads the body the same way and is correct to, for the
reason above; that line now says so, so nobody copies it into a check where it
would be wrong.

### The harness was wrong and the app was right

`lifecycle-walk.mjs` asserted against the dispatcher's **today** board for a ride
scheduled tomorrow. The board correctly omitted it; the walk called that a
failure. Same shape as an earlier walk in this project that failed near midnight
because a booking +3h landed on the following day.

**A verification harness that fails correct behaviour is a defect in the same
file as the code it checks**, and it is more dangerous than a missing test,
because the natural response to a red gate is to change the app. Retargeted at
the dispatcher's ride view, which is keyed by id and has no date filter.

### The ETA, closed properly

The walk found that after pickup the customer screen still read "Arriving in
6 min". The first fix gated the **headline** and shipped — and left the progress
bar drawing from the same number, which is the identical claim with the digits
removed.

The rule is now one predicate, `etaIsAttributable()`, living in `rideStage.ts`
because it is a property of the **stage** rather than of a widget:

> The socket carries one `etaMinutes` with no statement of which leg it measures
> (G-5). Before pickup it coincides with the leg the customer is watching —
> **luck, not correctness.** After pickup there is no basis for it at all. So it
> is rendered only while the car is still approaching, and from arrival onwards
> it is not shown in any form.

Both render sites read that one predicate, and a test asserts the full stage list
so a stage added later cannot default to showing an ETA. An absent number beats
an unattributable one, because a customer cannot tell that an unattributable one
is wrong.

#### The same defect again, in a test: a necessary condition asserted as sufficient

`clampToLocalDay()` promises one thing — *the result is on today's local day*.
Its fallback returned `now + 10 minutes` without re-checking the day, so after
23:50 it returned **tomorrow**, and the dispatcher board silently lost both
future fleet rides. Opened cold at 23:51 it read *2 rides · 0 unassigned · 1
late* against four seeded rides.

The unit test covering that branch sampled **23:55 — inside the defect window.
It had the bug in its hands.** It asserted:

```ts
expect(clampToLocalDay(target, now).getTime()).toBeGreaterThan(now.getTime());
```

`out > now` is a *necessary consequence* of staying inside today, and it was
asserted as if it were *equivalent* to it. The buggy return — 00:05 tomorrow —
satisfies it perfectly.

**That is the ETA bug, in a test file.** There, gating the headline was a
necessary part of "no unattributable ETA is rendered", and was treated as the
whole of it while the progress bar drew from the same number. Here, `out > now`
was treated as the whole of "same local day". Both times something true and
insufficient stood in for the actual promise.

**Ranking the two causes matters, because they cost different amounts.** The
grid — 24 hours sampled at one minute, `:38` — is *not* why this was missed. It
explains why the other 23 samples were silent; it is the reason there was no
second chance, not the reason the first one failed. "Sample more finely" is
expensive, permanent, and **would not have caught this**: a finer grid still
passes an assertion the bug satisfies. "Assert the property the function
promises" is free and sufficient on its own.

Both were done — the 23:55 test now asserts `isSameLocalDay` as well, and the
grid was widened to the boundary minutes and to all 1,440 — but they are not
equal, and a reader taking only one lesson from this entry should take the
assertion.

**Where to look next:** anywhere a check asserts a consequence of the rule
instead of the rule. That is now two recurrences, which makes it a habit rather
than an incident.

### The timezone: the instruction was wrong and the file was right

The brief said arrival times should follow the pickup's local time with
`America/Chicago` as the default. That was not done, and the reason is now
`BACKEND_FOLLOWUPS.md` **C-4b**: `bookings` carries no timezone column, so there
is nothing to render in. Defaulting to `America/Chicago` would have been
inventing a fact about the ride out of a fact about the business.

The countdown itself needed no zone at all — it is duration arithmetic, two
instants subtracted, and there is a test asserting exactly that. The receipt
renders device-local time and says so at the render site.

---

## The admin console — a preview, and what it is allowed to touch

`app/_role/admin` — sixteen sections, behind the same demo fence as the other
role previews. **The client already runs an operations panel at
`lctuniversal.us/admin`. This is not it, does not connect to it, and is not a
replacement for it**, and the disclosure line on every screen says so.

### It writes exactly one thing

**Chauffeur assignment**, through `assignChauffeur()` in Live Dispatch — the
function the dispatcher preview has used since the role slice, which already
moves the customer's tracking screen. Everything else **observes**: it reads the
same `rideStage` machine the three role views read.

That boundary is deliberate. A console that can quietly rewrite pricing or fleet
data is a console that can put an unconfirmed figure in front of a customer,
which is the thing a lint rule and two test files exist to prevent.

### Class Builder reads the fenced data and cannot keep an edit

It reads `observedRateCards.ts` and nothing else. The containment rule permits
it because `src/dev/` is the preview layer; the test fails the build if the same
import appears under `app/`. Edits live in component state, are never persisted,
never written to `src/config`, and are lost on reload — and the screen says all
of that in words, because a console that silently discards an operator's edit is
worse than one that cannot edit.

**The fence was verified, not asserted.** A bundle built with
`EXPO_PUBLIC_DEMO_MODE=false` contains **no `/_role/*` route** and **zero
occurrences of the observed rate-card data**. Not merely unimported by a
customer screen — absent from the shipped bytes.

### The class-name conflict is displayed, not resolved

Class Builder shows the panel's five classes beside what this app publishes, and
states plainly that one class carries the $110 SUV price under the $130 Luxury
SUV's name, and is called *Luxury SUV* on some screens and *Executive SUV* on
others. **A console that shows the business its own inconsistency is doing its
job.** Resolving it is a business decision with a paying customer attached, and
it stays first in `HANDOFF.md`.

### Nine panels with no data, and each says which missing thing keeps it empty

Users & Roles, Ratings, Revenue, Promotions, Coverage, Messages, Push Broadcast,
Support, Settings. Not "coming soon" — each names the table, endpoint or open
question that would fill it. *"Would need a payments or invoices table. A booking
records a fare; nothing aggregates one. A chart here would be a number nobody
computed."*

`scripts/admin-walk.mjs` reaches all sixteen sections and asserts that the
data-less panels render **no currency figure**. Every invented thing this project
has deleted — a chauffeur, testimonials, a rating, a plate — would have looked at
home on a dashboard.

### A guard pushed back on my own addition, and the addition yielded

I wrote a "Surge zones" empty state into Live Dispatch — a panel nobody asked
for, saying the feature exists upstream and that its pricing effect is
unanswered. It **failed `tests/quoteIsNotScaled.test.ts`**, which forbids that
vocabulary anywhere in `app/` or `src/` outside comments.

The guard was right and the panel was wrong. That test exists so a price
multiplier cannot arrive quietly, and the correct response to it firing is not a
narrow exemption for a decorative empty state. The information already lives in
`PLATFORM_RECONCILIATION.md` Q4 and `HANDOFF.md`. **A guard that pushes back on a
cosmetic addition is doing exactly what it was built for**, and the reason is
recorded at the site where the panel used to be.

---

## Two rules, and a second correction to the record

### Any visual encoding of a number is that number

The ETA fix gated the headline and left the progress bar drawing from the same
unattributable figure. **A progress bar drawn from an unattributable number is
not a softer version of the claim — it is the same assertion with the audit
trail taken off.** A customer reading a bar at four fifths believes the journey
is four fifths done exactly as firmly as they would believe "6 min", and now
cannot check it. Removing the digits removed the evidence, not the claim.

Bars, dots, arcs, a marker's position on a route — all of them assert, and all
of them must satisfy the same predicate the text would. `etaIsAttributable()`
gates both render sites for that reason, and it lives in `rideStage.ts` rather
than in the sheet so a third render site cannot re-decide it.

### Two failure categories, now requirements for anything added to the gate

| category | what it looks like | the fix |
|---|---|---|
| **Inert** | present, readable, doing nothing — the `isDemoMode` guards, the wiped lint rule, the gate on 404 pages, the reflow check on identical layouts | **probe it**: run the guard against a case it must fail |
| **Calibrated against an assumption** | live, running, tuned to what you *think* the defect looks like — `offscreenAbove()` testing `bottom <= 0` when the real element was `top −27, bottom +9` | **measure the real case** before writing the predicate |

Both are now stated in `scripts/a11y-gate.mjs` as conditions on anything added
to it. They are different disciplines and neither substitutes for the other: a
probe proves a check runs, and only a measurement proves it is looking at the
right thing.

### The reflow claim was never true

**Every report from Slice 7 onward stated "0 reflow overflow at
1.0/1.3/1.6/2.0". That was measuring one layout four times, and those claims are
void.**

- **Reported by:** Claude, in every slice report that quoted the gate.
- **Accepted by:** the project owner, on the strength of those reports.
- **Cause:** the check varied `documentElement.style.fontSize`. React Native Web
  emits absolute `px`, so nothing downstream responds to it.
- **Caught by:** measuring a rendered heading at 1.0 and at 2.0 before
  parallelising the pass, and finding both `39px`.
- **What is true instead:** horizontal overflow is now checked at five widths
  including **320 CSS px**, which is WCAG 1.4.10's actual criterion and
  equivalent to 400% zoom on a 1280px desktop. The app holds at all five.
- **What moved:** OS-level dynamic type is a native behaviour —
  `PixelRatio.getFontScale()` returns 1 on web forever — so it is now a device
  procedure rather than a browser check.

### The gate completes in one invocation, or reports nothing

It ran in two halves before, each honestly labelled `[PARTIAL RUN]`. That
handling was right and the situation was not: a gate that cannot finish in one
go gets run half by somebody in a hurry, and the honest label is what makes that
comfortable.

Now: five viewports run concurrently, two at a time, and the whole matrix
finishes in about two minutes. More importantly it keeps a **completion
ledger** — every viewport is planned up front and marked done only on full route
coverage — and if the ledger is short it prints

> `INCOMPLETE — no result reported. 0/5 viewports finished`

and exits 2. Not a pass, not a fail: an admission that the run is not a basis for
either. **Verified by injecting an unreachable route**, which produced exactly
that line and exit code 2, with no verdict printed.

This project has now found three checkers whose output described more than their
execution. The ledger is the structural answer: the claim is *derived from* the
record of work done, rather than written next to it.

---

## What review missed

Three claims in this project were reported, accepted, and void:

1. **The 404 routes** — fifteen of sixteen, across two accepted slices.
2. **`--pass=targets`** printing a reflow result for four font scales it never
   loaded.
3. **The reflow pass itself**, which varied a root font size nothing downstream
   reads. Every reflow number from Slice 7 onward.

**Each was found by measuring, not by reviewing.** The reports were read and
agreed with; the errors were of a kind only the person who wrote the check could
find, and each surfaced when somebody loaded the page, injected the probe, or
compared the two numbers.

So the honest record is that **acceptance has never been evidence.** A project
that writes down what its checks missed but not what its review missed is doing
the same thing the gates were doing — reporting on work it did not perform. That
sentence belongs here next to the corrections, not as modesty but as the same
correction applied one level up.

### The reflow check was aimed at the wrong thing, not merely broken

Worth separating, because "we fixed the reflow check" understates it. Varying
`documentElement.style.fontSize` was **never** what WCAG 1.4.10 asks for. The
criterion is content at **320 CSS pixels** without horizontal scrolling —
equivalent to 400% zoom on a 1280px desktop — which is a **width** test, not a
font test.

The old check was therefore broken *and* pointed at the wrong criterion, and
only measuring it surfaced both. A repair that had kept the font-scale approach
working would have produced a check that ran correctly and still tested nothing
anybody had asked for.

### The false blanks, and the repair that was not made

Running five viewports at once starved the render, and the gate reported seven
blanks on screens that render perfectly.

**The tempting repair is to soften the blank assertion** — lower the threshold,
or drop it. That would have quietly reintroduced the 404 problem from the other
direction: a gate that no longer notices an empty screen is a gate that passes
one. What landed instead is a single bounded re-check, which removes the race
without removing the assertion. A screen still empty after four seconds is
empty, and the gate still says so.

---

## The rule this project ends on

Five safeguards here were present, readable, and inert, or live and calibrated
against an assumption. Individually each had its own fix — a probe, a
measurement, a wider matrix, one predicate instead of two. But there is one
property underneath all of them, and it is the thing worth carrying to the next
project:

> **The claim is now derived from the record of work done rather than written
> beside it.**

A gate that computes its verdict from a completion ledger cannot report on work
it did not do, in the way that a gate printing a verdict next to its assertions
always can. `INCOMPLETE — 0/5 viewports finished`, exit 2, neither a pass nor a
fail, proved by injecting an unreachable route.

That is the shape every checker in this repository should have, and the one that
would have prevented all three void claims without anybody having to remember
why.

---

## The Blacklane comparison — three tiers, and what the codebase already had

A competitor recording arrived with "add all of these features". Split three
ways before anything was built: what must not be copied, what is buildable with
data the app already has, and what needs a decision or a backend field.

### Four of the seven Tier 1 items were already built

Checking before building is the whole finding here.

| asked for | what was actually there |
|---|---|
| Seats and bags on class cards | **already rendered as text** — `3 guests · 3 bags`. The change is icons, so the two facts are scannable rather than read last. Much smaller than "highest value per line of code" implied |
| Recent and suggested locations | **already there** — `LocationPickerScreen` loads saved locations and `recentPlacesFrom(bookings)` |
| Ride type surfaced as a step | **already there**, and broader: the booking entry is a six-service picker, a superset of Blacklane's one-way/by-the-hour sheet |
| Journeys: Upcoming / Past | **already there** as a `SegmentedControl`; Book again already existed on Home |

Genuinely missing: **Cancelled as its own tab**, **Book again on the Journeys
rows**, a **fourth journey tile**, an **estimated drop-off time**, and the
**swap**.

### The swap control: the premise did not fit the flow

Blacklane puts a swap between two address fields on one screen. **This app has
no two-field screen** — pickup and drop-off are two sequential full-screen
pickers, so there was nowhere to put it. Building one would be a redesign of the
booking flow, not "one control".

It went on the **details step** instead, and the placement is the reasoning:
that is the only screen where both addresses are known and **no price exists
yet**. Swapping a journey changes its route, and a route change must produce a
**new quote** rather than move an existing one. On the vehicle or review screen
a swap would invalidate a fare the customer had already been shown.

So it clears `distanceMiles`, `durationMinutes`, `routePolyline`, the chosen
`vehicle` and `allInFare`, then re-routes. **A→B and B→A are not the same
drive** — one-way streets and turn restrictions differ — so reusing the old
distance would price the new journey with the old journey's number. If the
re-route fails the fields stay null and the vehicle screen says what is missing,
rather than quoting against a stale figure.

### The fourth tile is point_to_point, because city-to-city does not exist

Blacklane's grid is Airport, Hourly, City-to-City, Corporate. `ServiceType` is
airport, corporate, events, point_to_point, hourly, custom — **there is no
intercity service**, and a tile for one would be a tile for something LCT does
not sell. `point_to_point` takes the slot: the site's own "single private pickup
and drop-off, door to door".

Events and Custom Request are real and deliberately left off. Four is the grid;
both stay one tap away in the picker, and six tiles at 320px is a menu.

### rebookDraftFrom, and what it refuses to carry

Home and Journeys now share one mapping, so they cannot drift when a field is
added to the booking form. It carries the route, service type and party size. It
**does not** carry the date, the vehicle or the fare: a repeated journey is the
same route, not the same ride, and the old fare was computed for a different day
— the late-night surcharge alone can move it.

### What was refused

Blacklane's **15-minute wait** and **one-hour cancellation** are Blacklane's
policy. LCT's are 30/60 and 12/6/48, confirmed, in `servicePolicy.ts`.

**By-the-hour with included mileage contradicts the fare rule.** Their hourly
product charges for extra distance and time; LCT's fare is fixed at booking and
`quoteIsNotScaled` exists to keep it that way. An included-mileage model is a
change to what the business sells — `HANDOFF.md` §6.2, a business decision.

The chauffeur **offer system** is an operating model, not a feature.

### Verified, and not

**Verified:** typecheck, lint, 1,894 tests, the sweep, 22 routes at 5 viewports,
the lifecycle walk and the admin walk. The four journey tiles and the three
Journeys tabs were **observed rendering**.

**NOT observed rendering:** the swap row, the arrival estimate and the capacity
icons. All three need a booking draft in memory, and the walker could not reach
those screens reliably — expo-router keeps prior screens mounted, so text
queries match the screen underneath and the URL lags the visible view. The gates
load `/book/details` and `/book/vehicle` directly, where both correctly render
their *no-draft* guard states, so **the gates do not cover these three**.

Proved: they compile, they lint, the strings ship in the bundle. Not proved:
that they appear when a customer walks the flow. Stated rather than implied.

---

## The Luxury SUV label, and three notes from the role work

### The label was changed. It was wrong under either of the site's namings

`VEHICLE_DISPLAY_NAME.suv` was **"Luxury SUV"** on a class published at
**From $110**. Both `lctuniversal.com/fleet` and `/rates`, read 2026-08-26,
reserve that name for the **$130** class.

Leaving a known-wrong customer-facing label in production is itself a decision,
and the worse one. It now reads **"Executive SUV"** — `/fleet`'s name, the
catalogue page, as against `/rates` which is a pricing page that happens to list
classes. The price did not move. Reversible in one line, and
`OPEN_QUESTIONS.md` 2 now asks *which of two published names*, not *is this one
right*.

**It also made the app internally consistent**, which nobody had noticed was
broken: `DEMO_VEHICLES` already carried the literal `'Executive SUV'`, so Home,
the booking picker, `PricingPreview` and `TrackingSheet` had been showing that
while Fleet and Corporate showed "Luxury SUV". One class, two names, one app.

**The duplicate-name guard went red on the fix**, exactly as its comment
promised, and the exemption was deleted deliberately rather than quietly
starting to pass. That is why it was written to fail in both directions.

**And a second test was found passing against a stale copy.**
`catalogueIntegrity` carried its own hardcoded map of the four display names.
After the rename it kept passing — asserting about a value the app no longer
held, and saying nothing while that was true. It now parses the names from
source. *A test that duplicates the thing it checks stops checking it the moment
the thing changes.*

### Provenance is per PAGE, not per site

`PUBLISHED_FLEET_SOURCE.domain` said `lctuniversal.com`. There is no such single
thing: two pages publish the same prices under different names for four of seven
classes. `PUBLISHED_NAMES_BY_PAGE` now records both names with both source pages
and the date.

**Second time in this project a source turned out to be less solid than the
field describing it.** The first was a transcription that was accurate about a
page nobody had recorded — and the Slice 10 "correction" that overturned it was
page-blind in exactly the same way. The old note said "SUV", `/fleet` says
"Executive SUV", and **both were right about different pages**. A correction can
be as page-blind as the thing it corrects.

### SECURITY: `corporate_admin` maps to customer, and that is not a naming choice

A corporate booker books for colleagues. They do not dispatch. Matching a role
on the substring **"admin"** would have put them in an operations console —
**privilege escalation by string similarity**, arriving through a field nobody
wrote for that purpose.

`accountKindFor()` matches exact role values with an exhaustive switch, and the
mapping is pinned by its own test. **The next role name somebody adds is the
moment that mistake becomes available again**, which is why this is recorded as
a security note rather than a mapping detail.

### The fence was right about screens and wrong about strings — and only half fixable

`app/_role/` is stripped from a customer build. The **screens** are provably
gone: `ROLE_PREVIEW_MARKER` is unique to them and absent from the bytes, and
`verify-build-mode.mjs` now asserts that on every non-demo export.

The **route strings** are not gone, and could not be made to go. They live in
`landingRouteFor()` and in the Account screen's preview links, both outside the
fence and both behind runtime guards.

**I tried to remove them and it made the code worse.** Moving the paths behind a
constant condition — `process.env.EXPO_PUBLIC_DEMO_MODE === 'true' ? {…} : {}`,
which Metro inlines and a minifier can fold — did not fold, broke a unit test
that could no longer see the mapping, and would not have covered the Account
screen's copies anyway. Reverted.

So the check asserts what is true and valuable — the screens are absent — and
the residue is recorded rather than asserted away: **dead string literals naming
routes that do not exist.** The runtime is guarded and tested; a staff account in
a customer build lands in the customer app, not on a 404.

That is the honest end of it: *screens absent* is checkable and checked;
*nothing references them* is neither, and claiming it would have been the
fourth instance of a claim true in one representation and untrue in another.

---

## 2026-08-30 — Arabic/RTL, reversed

**English only.** Arabic and RTL support — a locale store, translated strings
for Settings, RTL layout conventions enforced by lint, a plural-handling
module, and direction-aware back chevrons across four booking/trip screens and
two shared components — was built, then reversed as a business decision, not a
technical one. This entry exists so the two earlier notes describing it as
future work (`type.ts`'s script axis, `HANDOFF.md` item 10) are not read as a
plan still waiting; they are a decision that was tried and undone.

**What came out:** `src/i18n/` in full (locale store, `en`/`ar` string tables,
the plural module), `src/lib/locale.ts` and `src/lib/localeFormat.ts`, their
five tests, the Settings language switcher, the `no-restricted-syntax`
untranslated-text lint rule and its `TRANSLATED_SCREENS` allowlist, and every
`isRTL()` call site — the back-chevron direction branch in `book/details.tsx`,
`book/payment.tsx`, `book/vehicle.tsx`, `trips/[id].tsx`, `ListRow`'s trailing
chevron, and `AppText`'s script selection. All six now resolve to a fixed
LTR/English behaviour with no branch.

**What stayed:** `type.ts`'s per-script metrics (the `arabic` entries in the
`type` table) are kept, unused, rather than deleted — they were carefully
derived (no letter-spacing on a connected script, no uppercase, +~12% line
height, +1–2pt optical size) and re-deriving them from scratch would cost more
than leaving inert, clearly-commented data in a token file. **The general
logical-properties lint rule also stayed** — `marginStart`/`marginEnd` cost
nothing over `marginLeft`/`marginRight` today, and it's the correct default if
direction support is ever revisited. Both are recorded here specifically so
neither reads as an oversight in a later audit.

**Verified after the reversal, not just asserted:** `tsc --noEmit`, `eslint app
src scripts`, and the full test suite (1,894 tests across 18 suites, down from
1,910 across 21 — the five i18n-specific suites removed, everything else
unaffected) all pass clean. A repo-wide grep for
`i18n|useTranslation|useLocaleStore|isRTL` returns matches only in this entry,
`HANDOFF.md`'s voided item 10, and `type.ts`'s own reversal note above — no
runnable code anywhere still calls or imports any of it.

---

## 2026-08-31 — the trim yesterday's removal missed, and the honest close

**Yesterday's Arabic/RTL removal went further than asked.** Today's brief drew
the actual line: trim the locale-specific machinery (second language, RTL
direction flipping, the restart prompt, device-locale detection, plural
handling) but *keep* a single-language copy file and the lint rule requiring
user-facing text to live in it, renamed for what that combination now does —
centralising copy, not switching languages. Rebuilt as `src/copy/strings.ts`
(a plain object, no store, no hook — there's nothing left to switch between)
and `HARDCODED_COPY_RULE`/`COPY_FILE_SCREENS` in `eslint.config.js`, same
allowlist shape as before, different job.

**Yesterday's repo-wide sweep also missed six live call sites.** `isRTL()`
from the deleted `src/i18n/rtl.ts` was still imported into `ListRow.tsx`,
`Typography.tsx`, and four booking/trip screens — none of them touched during
the initial removal, all of them driving real back-chevron and
script-selection logic. Found by re-sweeping the whole repo rather than
trusting yesterday's file list was complete. All six now resolve to a fixed
LTR behaviour with no branch. A comment in `PlacesAutocomplete.tsx` claiming,
present tense, that Arabic rows "now get Arabic metrics" was also false by
this point and is corrected.

**The class label fix (`VEHICLE_DISPLAY_NAME.suv = 'Executive SUV'`,
2026-08-28) needed no code change today** — checked against `/fleet` and
`/rates` read directly from `lct_migrate`'s own source (its rendered site is
pure client-side JS; no tool in this session executes it, so the primary
source read went one layer down, to the components that render those pages)
and confirmed unchanged since the last read. `BACKEND_FOLLOWUPS.md` §6's class
table, which had never been updated past the original mis-transcription, now
is.

**Every gate — typecheck, lint (incl. `scripts/`), the full test suite, the
production web export, the 20-screen sweep, the 5-viewport accessibility
gate, the 7-stage lifecycle walk, the 16-section admin walk — run in one
invocation each today and reconfirmed clean, including an independent second
check (a fresh `EXPO_PUBLIC_DEMO_MODE=false` export, grepped by hand rather
than trusting the checker's own report) of the claim that unconfirmed rate
cards and role-preview screens are absent from a production bundle. Full
numbers and the exact commands are in `SLICE_REPORTS.md`, Part D — not
duplicated here to avoid two places drifting out of sync with each other.

---

## Two rules from the last night, both about the instrument rather than the thing

### When several tools fail the same way, suspect what they share

`lctapp.netlify.app` could not be loaded by `curl`, by a headless browser, or by
a browser pane on the same machine. Three independent tools, one symptom, and
the conclusion drawn was *"the deploy is unconfirmed"* — which sat in the
handoff overnight and shaped two reports.

The cause was an **ISP-level block on the `netlify.app` domain from that
network**. The site opens over a VPN. Every deploy was fine the whole time.

> **When three different tools fail the same way, suspect what they share before
> suspecting what they test.**

What they shared was the network path. Nothing about the deployment was ever in
question, and one traceroute-shaped thought would have found it faster than
three careful confirmations of the same negative.

The mitigation is recorded in `HANDOFF.md`: a custom domain on the client's own
DNS. Worth doing for its own sake — a client-facing demo on a vendor subdomain
lets one network's filtering policy decide whether the product exists.

### An all-negative result is a signature, not a finding

Three times in one session **the harness was wrong and the app was right**:

| what the harness said | what was true |
|---|---|
| swap row, capacity counts and "Arrives approx." all absent | all three present; the checks were case-sensitive against uppercase labels |
| name sign, flight and notes all absent on the chauffeur job | all three present; same cause |
| `.last()` on `^Home$` selected the saved location | it selected the bottom tab bar's Home |

That is a category, not a run of bad luck, and the shape is always the same: **a
confident negative, arriving in a group.** Real defects rarely make three
unrelated features vanish at once; a broken matcher always does.

> **When a presence check returns nothing found, suspect the matcher before
> believing the answer.** An all-negative result is a signature.

Written into both walk scripts, next to the matchers it applies to.

### And the quiet twin of a check nobody ran

The `storage` event has fired on every `persist()` since demo persistence was
built. Nothing listened. **A signal nobody consumes is the same defect as a
check nobody runs** — present, correct, and doing nothing — and it is the sixth
member of the family this file opens with.

The cross-tab work did not add that signal. It subscribed to one that had been
there all along.

---

## An explanation is not a verification

> **Not-confirmed remains not-confirmed. Knowing why a check failed does not
> make the check pass.**

`lctapp.netlify.app` was unreachable from three tools, and the cause turned out
to be an ISP-level block on the `netlify.app` domain — nothing to do with the
deployment. That was a satisfying answer, and the pull it exerts is to go back
and mark the earlier "deploy not confirmed" claims as resolved.

They are not resolved. They are **explained**. The build still has not been
opened from a machine that can reach it, and every claim in `HANDOFF.md` that
says so stands exactly as written.

The temptation to upgrade an explanation into a verification is strongest
precisely when the explanation is good, because a good explanation feels like a
conclusion. It is the fifth thing this project has learned about its own claims,
and it belongs beside the other four:

| category | the failure |
|---|---|
| Inert | present, readable, doing nothing |
| Calibrated against an assumption | live, tuned to what you think the defect looks like |
| Output describing more than execution | a verdict written beside the work rather than derived from it |
| An all-negative result | a broken matcher, not a set of missing features |
| **An explanation mistaken for a verification** | **the reason a check failed, banked as though the check had passed** |

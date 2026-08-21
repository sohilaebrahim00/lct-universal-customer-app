# LCT Universal — Design Audit

Audited against the doctrine in the master brief: **Uber as the benchmark for mechanics, Blacklane
and Wheely for feel, Airbnb / Revolut / Bugatti / Monzo for system craft.**

**Verdict.** The app is structurally sound and honestly built, and it currently reads as a
dark-themed ride-hailing app rather than a private-chauffeur product. Three things cause most of it:

1. **Gold is not an accent here, it is the default icon colour.** 73 of 107 icon colour assignments
   are gold — 68 %. The doctrine caps the accent at ~10 % of surface area. Gold currently means
   "icon", so it cannot also mean "action".
2. **The booking flow costs ~16 taps.** Uber's own published budget is 2 best-case, 4–6 typical.
   The first question is an address, not a journey type — which is the one structural difference
   between a ride-hailing product and a chauffeur product.
3. **The fare shown at vehicle selection is not the fare charged.** Gratuity, tax and a possible
   late-night surcharge appear for the first time on the payment screen. That is the exact Uber
   weakness the brief says to attack, reproduced.

Everything below is measured or quoted from the code. Nothing is impression.

---

## Method, and what is actually verified

**Read in full.** `README.md`, `AGENTS.md`, `app.config.ts`, `package.json`, `tsconfig.json`,
`src/theme/tokens.ts`, all 15 files in `src/components/ui/`, all of `src/components/maps/`,
`trip/`, `booking/`, `payment/`, the shared components, both Zustand stores, `src/lib/env.ts`,
`expoEnvironment.ts`, `pricingPreview.ts`, `locale.ts`, `localeFormat.ts`, `src/i18n/*`, and every
screen under `app/` bar four marketing pages, which were skimmed.

**Docs read before writing this.** Expo SDK 57 index plus the v57 pages for `expo-image`,
`expo-haptics`, `expo-blur`, `expo-network` and `reanimated`; the Reanimated `withSpring` reference
on docs.swmansion.com.

**Verified directly against the installed packages, not from memory:**

| Claim | How it was checked | Result |
|---|---|---|
| Reanimated 4 changed `withSpring` defaults | swmansion docs | Confirmed: mass 4, damping 120, stiffness 900, duration 550, dampingRatio 1. `duration`+`dampingRatio` and `stiffness`+`damping` are mutually exclusive; documented duration is perceptual, **actual is 1.5×** |
| …and whether this repo is affected | grep for `withSpring(x)` with no config | **Clean.** Every spring in the repo passes an explicit config. No silent regression. |
| Reanimated CSS animations API available | `node_modules/react-native-reanimated/lib/typescript/css/` | Present in 4.5.1, exports `cubicBezier`, `linear`, `steps` — Material curves expressible literally, **no new dependency** |
| `useReducedMotion`, `ReduceMotion`, `useAnimatedScrollHandler`, entering/exiting builders | reanimated type surface | All present in 4.5.1 |
| Native sheet detents without a new dependency | `react-native-screens@4.26.0` types | `sheetAllowedDetents`, `sheetInitialDetentIndex`, `sheetLargestUndimmedDetentIndex`, `sheetGrabberVisible` **all available already** |
| `prefersCrossFadeTransitions`, `isReduceMotionEnabled`, `reduceMotionChanged`, `dynamicTypeRamp` | RN 0.86.2 typings | All present |
| Which candidate deps are installed | `node_modules` | `expo-image`, `expo-haptics`, `expo-blur`, `expo-network`, `expo-localization` — **none installed** |

**Gates run, green at the time of writing:** `typecheck` ✅ · `lint` ✅ · `test` 26/26 across 5 suites
✅ · `export:ios` ✅ (7.8 MB Hermes) · `export:web` ✅ (5.4 MB JS).

**Not done, so not claimed.** No device, no simulator, no live backend, no Google Maps key, no
Stripe account, no Playwright run, no screenshots in this pass. Anything about how motion *feels* is
read from source and labelled as such.

---

## Correction to my first pass

My earlier draft said cards were "essentially invisible" at 1.044 : 1 against the page. That number
is right but it is the wrong metric — WCAG contrast ratio is built for text, and it collapses toward
1.0 for any two near-black surfaces regardless of how different they look. Measured in **CIE L\***,
which is perceptually uniform and the correct tool here:

| Ladder | Steps in L\* |
|---|---|
| Bugatti `#000 → #0d0d0d → #141414 → #1f1f1f` | +3.6 → +2.7 → +5.4 |
| Revolut `#0a0a0a → #16181a` | +5.4 |
| **LCT today** `surfaceBlack → onyx → charcoal` | **+2.0 → +6.9** |

So the card step is small-but-perceptible (JND for a large flat field is roughly 1 L\*), not
invisible. **The real defect is the distribution and the accessories**: one usable step, then a 6.9
gap to `charcoal` with nothing in between, a border that measures 1.34 : 1, and a shadow that does
not render at all. The fix is the same; the diagnosis is more precise.

---

## Scorecard 1 — the strategic inversion (brief §1.1)

| Dimension | Chauffeur standard | LCT today | |
|---|---|---|---|
| First question | Journey type | **Address.** `startBooking()` pushes to a service picker where the service is already selected, then straight to a pickup map | ❌ |
| Default tense | Scheduled; "Now" an equal option | Scheduled-only. `MIN_LEAD_TIME_MS` is 1 hour; there is no "Now" | ⚠️ |
| Price | Fixed, all-inclusive, stated as final | Labelled `Est.` at selection, recomputed at payment, never stated as final | ❌ |
| Driver presentation | Portrait, name, credentials; ratings de-emphasised | `DriverCard` renders `★ {rating}` directly under the name | ❌ |
| Wait policy | Stated generously | Not stated anywhere in the app | ❌ |
| Airport meet & greet | Name-sign text you type | `airport.tsx` *markets* "waits inside arrivals with a name sign"; there is no field to enter the name | ❌ |
| Cancellation policy | Visible before payment | Not shown anywhere. `handleCancel` exists; the policy does not | ❌ |
| Home surface | One action | Seven sibling `variant="heading"` sections below a 380 px hero | ❌ |
| Booking for others | Surfaced early | `primaryPassengerName` / `primaryPassengerPhone` exist in the store and **no screen ever writes them** | ❌ |

That last one is worth its own line: the booking draft already carries the fields for booking on
behalf of a guest, the backend already accepts them, and no UI collects them. It is the cheapest
status signal in the entire product and it is sitting unused.

## Scorecard 2 — the seven premium techniques (brief §1.3)

| # | Technique | LCT today | |
|---|---|---|---|
| 1 | One accent, rationed to ~10 % | **73/107 icon colours are gold (68 %).** `concierge.tsx` renders two primary buttons | ❌ **P0** |
| 2 | Weight restraint; hierarchy from size/tracking/case | 7 weights loaded, hierarchy carried by size alone; tracking used on 4 of 8 variants | ⚠️ |
| 3 | Tracking as the luxury dial | Cormorant Bold at 44 px ships at **0 tracking**; needs negative. Manrope caption at 13 px ships at 0; wants positive | ❌ |
| 4 | Shadows → luminance steps + hairlines | `shadows.card` is `#000000 @ 0.4` on a `#020201` ground — **a no-op**. Border is 1.34 : 1 | ❌ **P0** |
| 5 | Section rhythm 64–120 against dense zones | Largest spacing token is `xxl: 48`; home sections are separated by 24–32. **No bimodal density anywhere** | ❌ **P1** |
| 6 | Photography as depth layer | Real LCT fleet photography is present and well used — the strongest thing in the app | ✅ |
| 7 | Abstract the literal | `MapPin`, `Car`, `Calendar`, `CreditCard` — every icon is the literal object | ⚠️ |

## Scorecard 3 — attacking Uber's documented weaknesses (brief §1.2)

| Uber weakness | LCT's opportunity | Status |
|---|---|---|
| Fare opacity | Itemised, named, stated as final | ❌ Itemised on payment only, labelled `Est.` earlier, never called final |
| The wait is monetised | Silent, information-dense waiting | ⚠️ Nothing is sold — but there is no designed matching/waiting state at all |
| Cancellation policy hidden at commitment | State it above the pay button | ❌ Absent |
| Scheduling undiscoverable | A named, visible control | ⚠️ Named ("Date & Time") but buried on step 4 of 6 |
| No human escalation | A visible route to a person | ❌ No phone, chat-to-human, or support affordance on the trip screen |
| Accessibility unpublished and weak | Full VoiceOver; vehicle ID in one utterance | ❌ 0 `accessibilityRole` across 31 pressables |
| Multi-vertical clutter | Open straight into a ride | ⚠️ 5 tabs; home is a marketing page |

Six of seven are open. This is the most valuable column in the audit: these are wins available for
presentation-layer work alone.

---

# P0 — breaks the first sixty seconds

### P0-1 · Gold is the default icon colour, so it cannot be the accent

Measured across `app/` and `src/`:

| Icon colour | Usages | Share |
|---|---|---|
| **`colors.gold`** | **73** | **68 %** |
| `colors.destructive` | 16 | 15 % |
| `colors.mutedForeground` | 15 | 14 % |
| `colors.offWhite` | 3 | 3 % |

Every `NavRow` icon on Account, every feature row on Airport, every spec on the fleet detail, every
`QuickBookingRow`, every checkmark, every stepper `+`/`−`. `concierge.tsx` renders **two primary
gold buttons** simultaneously (Send, and "Continue to Vehicle Selection").

Against the doctrine — Bugatti ships exactly one chromatic token, Uber ships zero secondary accent,
Monzo spends most of an 82-slide brand book on restraint — this is the single loudest signal that
the app is not a premium system. It is also the cheapest to fix: most of those 73 should be
`contentSecondary`, and gold should survive on the primary action, the fare, the active tab and the
focus ring. **P0.**

### P0-2 · ~16 taps to book, against Uber's 4–6

Happy path, point-to-point, signed in, Maps configured. Discrete taps, excluding text entry and the
native picker's internal interactions:

| # | Screen | Tap |
|---|---|---|
| 1 | Home | "Book a Ride" |
| 2 | `book/index` | **"Continue"** — the service is *already selected* by `startBooking()`. A dead tap. |
| 3–5 | `book/pickup` | focus search · select suggestion · "Confirm Location" |
| 6–8 | `book/destination` | focus search · select suggestion · "Confirm Location" |
| 9–10 | `book/vehicle` | select vehicle · "Continue" |
| 11–14 | `book/details` | date field · confirm date · time field · confirm time |
| 15 | `book/details` | "Continue" |
| 16 | `book/payment` | "Pay & Confirm Booking" (then the Stripe sheet) |

**16, plus Stripe.** Uber's Accelerator gets a repeat rider to *requested* in two. LCT has no
equivalent: there is no rebook affordance anywhere in the app, and the home screen's "Quick Booking"
card has three rows (Pickup, Drop-off, Date) that **all call the same handler and all land on the
pickup map** — tapping "Date" opens a map. Three affordances, one destination, zero deep-linking.

The brief's own caveat applies: Uber accepted a slower first step to buy correctness, and so should
we. But four of these sixteen are pure waste. **P0.**

### P0-3 · The fare is an estimate that becomes a different number

`book/vehicle.tsx:44` computes each estimate with `previewDate = useMemo(() => new Date(), [])` — a
placeholder "now", because the real date is not collected until the *next* screen. The card reads
`Est. $X`. Two screens later `book/payment.tsx:105-114` recomputes against the real `scheduledAt`
and renders `Gratuity (20%)`, `Tax`, and possibly `Late-night surcharge` — three lines the customer
has never seen. On a $145 base that is roughly 30 %.

The code is honest about this and the backend recomputes authoritatively. That is not the issue. The
issue is that the brief's §1.1 says a chauffeur product's price is *fixed at booking and
all-inclusive*, and §1.2 says fare opacity is Uber's most-complained-about failure (18.47 % of a
590-review sample). The app currently reproduces it. **Nowhere in the app does the word "estimate"
get replaced by a statement that this is the price.** **P0.**

### P0-4 · Depth: a no-op shadow, an invisible border, one usable surface step

`shadows.card` = `shadowColor '#000000', shadowOpacity 0.4` over a `#020201` page, plus Android
`elevation: 6` which also draws black. It contributes nothing, everywhere it is used. The only other
separator is `colors.border` = `rgba(233,214,163,0.16)` → **1.34 : 1 on the page, 1.39 : 1 on a
card**. WCAG 1.4.11 requires **3 : 1** for the boundary of a user-interface component; an input's
border here is its only boundary, so this is a hard failure, not a preference.

None of the four dark-depth mechanisms in the brief are present: there is no inner top-edge
highlight anywhere in the codebase, no zero-blur ring, no tight contact shadow, and no
theme-specific shadow token. **P0.**

### P0-5 · Server errors render as friendly empty states

Fourteen handlers in `app/` swallow the error and substitute an empty value:

```
app/(app)/trips/index.tsx:50        .catch(() => setBookings([]))
app/(app)/index.tsx:70, :77         .catch(() => setNextTrip(null)) / setFleetRates({})
app/(app)/trips/[id].tsx:111, :119  .catch(() => {})
app/(app)/account/*.tsx  (7 sites)  .catch(() => {})
app/(app)/corporate-info.tsx:34     .catch(() => setVehicles([]))
```

If `GET /bookings` 500s, the Trips tab says **"No upcoming trips — When you book a ride, it will
show up here."** A customer whose car arrives in twenty minutes is told they have none. If
`GET /bookings/:id` fails, `trips/[id].tsx:141` returns `<AppText>Loading…</AppText>` **forever** —
no timeout, no retry, no error branch.

`src/components/ui/ErrorState.tsx` exists, is well built, and is imported by **zero** screens.
**P0.**

### P0-6 · Six primitives and the whole semantic token layer have zero call sites

| Primitive | Importers |
|---|---|
| `ScreenHeader` · `SectionHeader` · `TripCard` · `BottomSheet` · `ErrorState` · `PriceBreakdown` | **0 each** |
| `semanticColors` (all of `tokens.ts:36-56`) | **0** |
| `EmptyState` 2 · `StatusPill` 5 · `Divider` 8 · `TextField`/`FadeSlideIn` 11 · `Card` 20 · `ScreenContainer` 27 · `Button` 30 | |

So `trips/index.tsx:21` defines a worse local `TripCard`; `payment.tsx` hand-rolls the breakdown
`PriceBreakdown` already renders; `details.tsx` inlines a `Stepper`; and `concierge.tsx` and
`ConciergeFab.tsx` carry two independent copies of the same `Bubble`, chips and input row. There is
no shared visual language in practice, only in intent. **P0.**

### P0-7 · No progress and no back affordance across the two longest steps

`StepHeader`'s own comment concedes it "is only rendered starting at vehicle selection (step 3)".
The two full-screen map pickers — the longest-dwell screens in the flow — show no progress at all,
and `confirmed.tsx` is a sixth screen off the end of a five-segment tracker. `book/_layout.tsx` sets
`headerShown: false` and no booking screen renders a header, so the only way back is the OS gesture.

`LocationPickerScreen.handleConfirm` also navigates twice: it calls `onConfirm(...)` — which itself
calls `router.push(...)` — and *then* calls `router.back()`. A push followed by a pop, per
confirmation. **P0.**

---

# P1 — competent versus expensive

### P1-1 · Typography: no tracking discipline, three variants with no line-height

Sizes 12/14/16/18/22/28/36/44; successive ratios 1.17, 1.14, 1.13, 1.22, 1.27, 1.29, 1.22 — not a
scale, eight numbers. Against the brief's reference bands:

- `Typography.tsx:14-27` sets `lineHeight` on 5 of 8 variants and **omits it on `subheading` (18),
  `caption` (14) and `eyebrow` (12)** — so those three inherit each platform's default leading and
  vertical rhythm drifts *by platform* in the most-used components.
- Body sits at `16 × 1.5 = 24` ✅ — this one is already right and satisfies WCAG 1.4.12 by
  construction. Keep it.
- Display: Cormorant Bold at **44 px with 0 tracking**. A high-contrast old-style serif at that size
  needs roughly −0.5 to −1 px or it reads loose. `title` (36) and `heading` (28) likewise.
- Small UI: `caption` at 14 and `eyebrow` at 12 want slightly positive tracking; `eyebrow` has +2
  (correct, it is uppercase), `caption` has 0.
- **`includeFontPadding` is set nowhere** (0 occurrences) → Android baselines sit differently from
  iOS across the whole app.
- Names are semantic already (`display`/`title`/`heading`) ✅ — but screens still reach for raw
  `fontSizes.*` in 6 components.

**P1.**

### P1-2 · Body copy is near-white, and section rhythm does not exist

`body` and `bodyMuted` are `#f4f2ea` and `#9e978e` — flat hexes, not alpha over the surface. The
brief's ladder (`#FFFFFF` headlines only, `rgba(255,255,255,0.72)` body, `.48` metadata, `.32`
disabled — the exact values shipping in Revolut and Monzo) is a better fit for a near-black ground
and eliminates halation. Measured, `offWhite` on `onyx` is 17.74 : 1, which is *too much* contrast
for sustained reading on dark.

Separately: the largest spacing token is `xxl: 48`. The brief calls for **64–120 section bands
deliberately contrasted against 16 px card gutters**. Home's sections are separated by 24–32
throughout, so every section reads as equally weighted — which is exactly the "filled, not composed"
failure. **P1.**

### P1-3 · Component states are largely missing

**Button** — 4 variants, **one size**, no icon slot.
- Focus: **nothing**. No ring on web or with a keyboard.
- Disabled: `opacity: 0.45` on the whole element; the primary's `surfaceBlack` label over a 45 %
  gold gradient falls well under 4.5 : 1. `accessibilityState` never set, so a disabled button
  announces as enabled.
- Loading: the label is *replaced* by a spinner — intrinsic width jumps and the accessible name
  disappears mid-action.
- No interaction-overlay model; states are separate colours rather than composed alphas.

**TextField** — **no focus state at all** (border is `colors.border` at rest *and* focused); border
at 1.39 : 1 fails 1.4.11; no helper text, no counter, no floating label; `multiline` handled by
callers passing raw style overrides (`details.tsx:161`); `label=""` passed in four places purely to
satisfy a required prop.

**Card** — `active` changes `borderWidth` 1 → 1.5, shifting content 0.5 px on every side at the
moment of selection.

**StatusPill** — good tone model, but `danger` measures **4.31 : 1** composited. Below AA.

**Missing entirely:** Skeleton, Toast/inline alert, Badge, SegmentedControl, ListRow, Avatar,
IconButton, rolling-number, and shared Stepper / ProgressIndicator.

**P1.**

### P1-4 · Motion: shallow, re-triggering, and one property animated wrong

Animating today: button press scale; `FadeSlideIn` stagger; onboarding dot; loading-logo breathe;
`AnimatedRoutePreview` (demo only); `BottomSheet` (unused). Not animating: screen transitions, tab
switches, the fare, the status timeline, the map camera, the driver marker, selection states, error
appearance, pull-to-refresh, and the confirmation.

Specific defects:

1. **`onboarding.tsx:39` animates `width`** — `width: withTiming(active ? 22 : 8)`. The brief is
   explicit: animate `transform`, never width/height. This is the one place in the repo doing it.
2. **`onboarding.tsx:52-56` drives paging from a JS-thread `onScroll`** calling `setPage` at
   `scrollEventThrottle={16}` — a React state update per frame during a swipe.
   `useAnimatedScrollHandler` is available in the installed 4.5.1.
3. **`FadeSlideIn` re-runs on every mount** and has **no reduced-motion handling** — unlike
   `BottomSheet`, which correctly uses `ReduceMotion.System`. Returning to Home re-staggers all
   seven sections.
4. No transition continuity anywhere: nothing persists across a navigation.
5. No haptics — `expo-haptics` is not installed.
6. No entrance/exit asymmetry; the few timings present are symmetric.

Worth recording as a clean result: **the Reanimated 4 spring-default change does not affect this
repo** — every `withSpring` call passes an explicit config. Checked, not assumed.

**P1.**

### P1-5 · Map UX: none of Uber's published architecture is present

- **Driver marker jumps.** `trips/[id].tsx:23-30` renders `<Marker pinColor={colors.gold}>` — the
  default balloon — inside a `MapView` with a fixed `region` at `0.02` delta. Every socket update
  snaps both marker and camera. No interpolation, no bearing.
- **No Camera Director, no Padding Provider.** The camera never accounts for sheet occlusion, so
  "sheet expands, map recentres" cannot work at any detent.
- **One line style only.** No dashed walking route versus solid vehicle approach.
- **No progress-curve compression.** `StageTimeline` is a linear list of stage dots; there is no
  "last 20 % represents the last 2 minutes" mapping.
- **The picker's sheet is not a sheet** — an absolutely-positioned `View` with no drag, no detents,
  no scrim decision.
- **Search overlay ignores safe area** (`top: spacing.xl` = 32) → it sits under the Dynamic Island.
- Locate button pinned at `bottom: 200`, a magic number that will collide with the sheet.
- **Saved locations are never offered in the picker** even though `account/saved-locations.tsx`
  stores them. No recents either.
- Addresses render as raw `formattedAddress` — no Geotalker-style human phrasing.
- `RoutePreviewCard` uses a hand-rolled `×1.6` delta instead of `fitToCoordinates`, so long routes
  clip.
- The map itself is **stock Google styling** — the single most off-brand surface in a black-and-gold
  product, and a `customMapStyle` JSON costs nothing.

**P1.**

### P1-6 · Accessibility, measured

Contrast (composited where the token is `rgba`):

| Pair | Ratio | Verdict |
|---|---|---|
| `offWhite` / `surfaceBlack` | 18.52 | AAA |
| `gold` / `surfaceBlack` | 10.29 | AAA |
| `mutedForeground` / `surfaceBlack` | 7.19 | AAA, barely |
| `mutedForeground` / `onyx` | 6.88 | AA only |
| `mutedForeground` / `charcoal` | 6.01 | AA only |
| `destructive` / `onyx` | 4.51 | AA by 0.01 |
| **`destructive` on `destructiveSoft` (danger pill)** | **4.31** | ❌ **fails AA** |
| **`border` on `onyx`** | **1.39** | ❌ **fails 1.4.11 (needs 3.0)** |
| `surfaceBlack` on `goldDeep` (gradient's dark corner) | 4.73 | AA, but the label's contrast varies across its own background |

Semantics: **31 `<Pressable>`, 0 `accessibilityRole`, 3 `accessibilityLabel`, 0 `accessibilityHint`,
0 `accessibilityState`, 0 `accessibilityLiveRegion`, 0 `accessibilityViewIsModal`, 3 `hitSlop`.**
The destructive `Trash2` controls in `saved-locations.tsx` and `payment-methods.tsx` are bare
`Pressable`s around a 20 px icon with no label — deleting a saved card is one unlabelled tap. The
trip status timeline changes silently. **Vehicle identification is not readable as one utterance** —
plate, colour, model and chauffeur name are separate unlabelled `AppText` nodes, which is precisely
the documented Uber failure the brief says to beat.

Touch targets: the `details.tsx` stepper buttons are **34 × 34 with no `hitSlop`**; the trash
`Pressable`s have no declared size (~20 × 20). Both are below WCAG 2.5.5's 44 and Apple's 44.

Dynamic type: `allowFontScaling` correctly left default-on, but `dynamicTypeRamp` is never set (so
custom-font text scales on the body ramp), no layout branches on `PixelRatio.getFontScale()`, and
**absolute `lineHeight` is set on 5 text variants — which does not scale with font scale and will
clip at large accessibility sizes.** Fixed-height containers that will clip: service tiles
(`aspectRatio: 1.15`), service cards (148), home hero (380), tab bar (84).

Safe areas: `SafeAreaView` correctly comes from `react-native-safe-area-context` ✅, but
**`initialWindowMetrics` is never passed to the provider** (first-frame flash) and `mode="maximum"`
is not used, so a 24 px design margin becomes ~50 px on a notched device.

**P1.**

### P1-7 · Arabic and RTL: the policy is excellent, the plumbing is not

`src/i18n/rtl.ts` is a better RTL policy document than most shipping apps have. Against it:

- **`useTranslation()` is called in exactly 1 of 36 screens** (`account/settings.tsx`). The other 35
  are hardcoded English.
- **~55 physical-direction style properties**: 23 `marginLeft`, 1 `marginRight`, 2 `paddingLeft`,
  2 `paddingRight`, 27 bare `left:`/`right:`. Against **3** logical properties in total
  (`marginStart` ×1, `marginEnd` ×2).
- **The `textAlign` trap is live.** Expo documents that unset `textAlign` means actual-left, not
  start — so in RTL, unstyled text still aligns left. `textAlign` appears twice in the entire
  codebase, both `'center'`. Every other string is unset.
- **The typography tokens have no script axis.** One `letterSpacing` value per variant, applied to
  both scripts — but Arabic is a connected script and positive tracking breaks the joins. Arabic
  also needs +10–15 % line height and +1–2 pt optical size at the same hierarchy level. None of that
  is expressible in the current token shape.
- `expo-localization` is **not installed**, so the `supportedLocales` / `supportsRTL` config-plugin
  path is unavailable; locale detection currently goes through `Intl` (a sound choice, documented,
  and it stays).

**P1.**

### P1-8 · Perceived performance

- **5 spinners, 0 skeletons.**
- **No image strategy.** Every image is RN's `<Image>`: no placeholder, no thumbhash, no reserved
  aspect ratio, no transition, no cache policy, no `recyclingKey`. 3.9 MB of JPEGs, all `require`d at
  module scope. Layout shift on load is guaranteed.
- **`React.memo` used 0 times.** `getItemLayout` 0. `maintainVisibleContentPosition` 0 — which is
  exactly why the concierge list jumps.
- `keyExtractor` on 2 of 6 `FlatList`s; `trips/index` and `fleet/index` `.map()` inside a
  `ScrollView` with no virtualization.
- No optimistic UI; no caching (Home refetches on every mount).
- Clean results worth recording: **only one `console.*` call in the whole app** (an intentional
  `console.warn` in `env.ts`), so `babel-plugin-transform-remove-console` would buy essentially
  nothing here. And the one width-animation is the onboarding dot, noted above.

**P1.**

### P1-9 · State coverage, by screen

`✅` designed · `⚠️` spinner or bare string · `❌` nothing

| Screen | Loading | Empty | Error | Offline |
|---|---|---|---|---|
| Home | ❌ | ❌ | ❌ ×2 silent | ❌ |
| Trips list | ❌ | ✅ | ❌ **renders as empty** | ❌ |
| Trip detail | ⚠️ `"Loading…"` | ❌ | ❌ **hangs forever** | ⚠️ WS line only |
| Pickup · Destination | ⚠️ | ❌ no-results | ❌ | ❌ |
| Vehicle | ⚠️ | ❌ | ⚠️ raw red string | ❌ |
| Details | n/a | n/a | ❌ bad web date silently disables Continue | ❌ |
| Payment | ⚠️ | n/a | ⚠️ raw red string | ❌ |
| Confirmed | ❌ | n/a | ❌ | ❌ |
| Fleet list | ⚠️ | ✅ | ✅ | ❌ |
| Fleet detail | ⚠️ | ❌ | ⚠️ | ❌ |
| Concierge | ⚠️ no typing indicator | ❌ | ⚠️ error rendered as an assistant message | ❌ |
| Account + 5 sub-screens | ❌ | ❌ | ❌ silent | ❌ |
| 3 auth screens | ⚠️ | n/a | ⚠️ | ❌ |

**Offline is ❌ on every row.** Nothing in the app detects connectivity. **P1.**

### P1-10 · Copy and tone

Against the brief's rules:

| Rule | Violations found |
|---|---|
| **Never say "luxury" in product UI** | `about.tsx:30` "elevate luxury ground transportation"; `onboarding.tsx:30` "luxury SUVs"; `PricingPreview.tsx:10` and `vehicleImages.ts:17` "Luxury SUV" |
| Let others do the praising | 5 self-descriptive uses of "premium": `onboarding.tsx:29` "A Premium Experience, Every Time"; `signup.tsx:84` "premium chauffeured transportation"; `WhyChooseLct` "Premium Fleet"; `fleet/[id]` "Premium Features"; `services.ts:30` |
| Name as service, not SKU | Mixed — "Meet & Greet Service" ✅, "Hourly Chauffeur" ✅, but "Luxury SUV", "Executive Sedan" are SKU-shaped |
| No exclamation marks | ✅ **zero** — clean |
| No percentages | One: `payment.tsx:108` `Gratuity (20%)`. I'd keep this — a fare line naming its own rate is disclosure, not marketing — but flagging it since the rule is absolute as written |
| Two-beat imperatives, quiet confidence | Not attempted; current copy is declarative marketing ("Executive Transportation, Redefined") |
| Hold the voice in low-traffic surfaces | Error strings are raw (`err.message` surfaced directly in 6 places); "Something went wrong — please try again." is the only written one |

**P1.**

### P1-11 · The confirmation is the least designed screen in the product

`book/confirmed.tsx` is 34 lines: a static 72 px `CheckCircle2`, a title, two muted lines, one
button. No animation, no haptic, no chauffeur or vehicle image, no fixed price restated, no
cancellation promise, no calendar add. It is also **the correct and only moment to request push
permission**, and instead push is requested on tab-layout mount for every signed-in user
(`(app)/_layout.tsx:17-19`) — before there is anything worth notifying about. **P1.**

---

# P2

1. **Home is a marketing page.** Seven sibling headings below a 380 px hero; the returning
   customer's job is below the fold. No rebook affordance exists.
2. **Onboarding runs before there is a reason to care** — splash → loading → 3 slides → welcome →
   auth → home. The brief wants a real price for a real journey before an account. `bottom: 220` on
   slide content will crop on a small device.
3. **Push permission at the wrong moment** (see P1-11).
4. **Two divergent concierge implementations** that will drift.
5. **Chat is missing every chat affordance** — no typing indicator, timestamps, grouping, tails,
   `KeyboardAvoidingView` on the input row, or failed-send retry.
6. **Tab bar geometry hardcoded**: `height: 84, paddingTop: 8` with no insets — an
   iPhone-with-home-indicator number, wrong elsewhere. `ConciergeFab` at `bottom: 96` inherits the
   same assumption. The tab bar is an opaque fill where the category standard is a blurred material.
7. **Three-stage splash handoff** — the logo appears at three sizes in under two seconds with no
   shared element.
8. **Radius model is mixed** — sharp `md: 5` cards, `full: 999` pills, `xl: 12` sheets. The brief
   warns this inconsistency is itself the cheap tell.
9. **145 raw geometry literals** and **13 distinct icon sizes** (10–72) across `app/` + `src/`;
   `marginTop: 2` is a de-facto unnamed token. `spacing` is missing 12 and 20, which is *why*.
10. **`ReviewsSection.tsx` ships four invented testimonials** under real-sounding names with 5-star
    ratings, rendered as genuine customer reviews. Flagging, not changing — that is a client call.
    (`demo-account.tsx` is *not* in this category; it is explicitly labelled and says nothing is
    saved.)
11. Smaller: `Divider` has a baked-in 16 px margin; `EmptyState`/`ErrorState` use inline style
    objects; `account/index.tsx` and `demo-account.tsx` export `as const` object literals instead of
    `StyleSheet.create`; `SocialAuthButtons` uses `Alert.alert` where the auth screens use inline
    copy for the same situation; `formatCurrency` is hardcoded `en-US` while
    `formatCurrencyLocalized` sits unused outside tests.

---

## Ranked index

| # | Finding | Priority |
|---|---|---|
| P0-1 | Gold is 68 % of icon colours — the accent is not rationed | **P0** |
| P0-2 | ~16 taps to book vs Uber's 4–6; 4 of them pure waste; no rebook | **P0** |
| P0-3 | `Est.` fare ≠ charged fare; never stated as final | **P0** |
| P0-4 | No-op shadow, 1.34:1 border, one usable surface step | **P0** |
| P0-5 | 14 silent catches render errors as empty states | **P0** |
| P0-6 | 6 primitives + `semanticColors` at zero call sites | **P0** |
| P0-7 | No progress or back on the two map steps; double navigation | **P0** |
| P1-1 | No tracking discipline; 3 variants without line-height; no `includeFontPadding` | **P1** |
| P1-2 | Near-white body copy; no 64–120 section rhythm | **P1** |
| P1-3 | No focus states; disabled/loading broken; 9 primitives missing | **P1** |
| P1-4 | Width animated; per-frame JS scroll; entrances re-fire; no haptics | **P1** |
| P1-5 | No camera director, padding provider, marker interpolation, progress curve, or map style | **P1** |
| P1-6 | 2 measured contrast failures; 0 roles; sub-44 targets; vehicle ID not one utterance | **P1** |
| P1-7 | 55 physical-direction props vs 3 logical; `textAlign` trap live; no script axis; i18n in 1/36 | **P1** |
| P1-8 | No skeletons, no image strategy, `React.memo` ×0, no `maintainVisibleContentPosition` | **P1** |
| P1-9 | Offline absent app-wide; 20 screens with gaps | **P1** |
| P1-10 | "Luxury" ×4 and "premium" ×5 in product UI; raw error strings | **P1** |
| P1-11 | Confirmation undesigned; push asked at the wrong moment | **P1** |
| P2-1…P2-11 | Home, onboarding order, concierge duplication, chat affordances, tab geometry, splash, radius model, 145 literals, invented reviews, misc | **P2** |

---

## What is genuinely good, and stays

- **The brand port is real work** — OKLCH→sRGB with documented provenance, the deliberate 0.2 rem
  radius, the Cormorant/Manrope pairing. Every brand hex survives this upgrade unchanged.
- **The platform-fallback architecture is excellent** — `isExpoGo`, `isMapsConfigured`,
  `isStripeConfigured`, the `.web.tsx` counterparts, the lazy `require` pattern with a reasoning
  comment on each. Untouched.
- **`src/i18n/rtl.ts`** is a better policy document than most shipping apps have. It needs applying,
  not rewriting.
- **`src/lib/env.ts`'s graceful-degradation contract** and the README's documented auth-screen fix
  (inputs stay interactive when Supabase is unconfigured) are correct and stay exactly as they are.
- **Body type at 16/24** already satisfies WCAG 1.4.12 by construction. Keep it.
- **Real LCT fleet photography** is the strongest asset in the product and the plan leans on it
  harder, not less.
- **The comments are unusually honest** about what is a placeholder and why. This document tries to
  match that standard.

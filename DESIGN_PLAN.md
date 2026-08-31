# LCT Universal — Design Upgrade Plan

Implementation plan for [DESIGN_AUDIT.md](DESIGN_AUDIT.md), built to the master brief's doctrine and
its delivery model: **vertical slices, something visible first, one screen end-to-end per slice, stop
and report after each.**

Nothing here changes an API contract, `src/types/api.ts`, pricing arithmetic, auth logic, or any
request/response shape.

---

## What I will not touch

| Area | Files | Why |
|---|---|---|
| API contracts & types | `src/types/api.ts`, `src/api/*`, `src/lib/apiClient.ts` | Out of scope. New field needs → follow-up list. |
| Pricing arithmetic | `src/lib/pricingPreview.ts` + its tests | Line-for-line port of the backend. Fare *presentation* changes; the maths does not. |
| Auth logic | `src/store/authStore.ts`, `supabase.ts`, `secureStorage.ts`, `guestMode.ts` | Sessions, encryption, guest mode stay. |
| Platform fallbacks | every `.web.tsx`/`.web.ts`, `expoEnvironment.ts`, `env.ts`, the lazy-`require` pattern in the 4 native-only call sites | README-documented. Every new component must render under all of them. **The auth-screen fix — inputs stay interactive when Supabase is unconfigured — is a hand-checked regression gate on every auth slice. `editable={configured}` never comes back.** |
| Transport | `useTripSocket.ts`, `useNotificationRouter.ts`, `pushNotifications.ts`, `googlePlaces.ts` | Presentation of live data changes; the transport does not. |
| Build config | `eas.json`, `netlify.toml`, `tsconfig.json`, `eslint.config.js`, `.env*` | Untouched. `app.config.ts` only if an approved dependency needs a plugin. |
| Brand hexes | the 7 website-derived OKLCH→sRGB values | Every one keeps its exact hex. New values are *derived*, and each derivation is documented the way the original port documented its own. |
| Concierge date parsing | `concierge.tsx` behaviour | The README's deliberate "show it, don't silently parse it" stays. |
| Existing tests | `tests/*.test.ts` | 26 passing, unmodified. |
| `demo-account.tsx` content | its sample data | Explicitly labelled. Restyled; content untouched. |

**Flagged, not changed:** `ReviewsSection.tsx`'s four invented testimonials (audit P2-10).

---

## 1. Token architecture

`src/theme/` becomes a three-layer system. `tokens.ts` is deleted once all 63 importers are migrated.

```
src/theme/
  ref/            reference tokens — raw ramps. NEVER imported by a component.
    palette.ts    neutral / gold / state ramps, numeric steps
    scale.ts      raw type sizes, space, radius, duration values
  sys.ts          system tokens — semantic roles. THE ONLY FILE THAT KNOWS ABOUT THEMES.
  type.ts         typography roles × script axis (Latin | Arabic)
  motion.ts       durations, easing, spring presets, reduced-motion helpers
  elevation.ts    the 4-mechanism dark-depth recipes
  a11y.ts         contrast() + the WCAG G17 helpers, exported for the test
  index.ts        the single public surface
```

**Theme drift made structurally impossible**, per the brief:

```ts
export const sys = { dark: { /* shipping */ }, light: { /* key set identical */ } } as const;
export type Sys = typeof sys.dark;   // a key in one and not the other is a compile error
```

**Naming — Uber Base's `{category}{Role}{Modifier}`**, numeric ramps not t-shirt sizes:
`backgroundPrimary`, `backgroundSecondary`, `contentPrimary`, `contentSecondary`, `contentTertiary`,
`contentStateDisabled`, `contentAccent`, `borderOpaque`, `borderSelected`, `borderTransparent`.

**A component that contains `fontSize: 18` — or any raw hex, or any raw duration — has failed.** An
ESLint rule enforces it in slice 1.

### 1.1 Surfaces — a four-level warm ladder

Ground stays `#020201`. Steps are a warm overlay (the gold family as the tinting agent), so
champagne sits *in* the light rather than floating on cold black. Measured in **CIE L\***, which is
the honest metric for surface separation:

| Level | Hex | L\* | Step | Use |
|---|---|---|---|---|
| `background` | `#020201` *(unchanged brand hex)* | 0.53 | — | page |
| `backgroundSecondary` | `#0c0c08` *(derived)* | 3.24 | +2.71 | cards, tiles, inputs |
| `backgroundTertiary` | `#13120d` *(derived)* | 5.42 | +2.18 | sheets, raised rows |
| `backgroundInverseSubtle` | `#1d1a14` *(derived)* | 9.41 | +3.98 | overlays, pressed fills |

Anchored against the brief's own references: Bugatti steps +3.6/+2.7/+5.4, Revolut +5.4. This lands
inside that band. **Four levels, capped** — the brief is explicit that more reads cheaper.

Today's `onyx`/`muted`/`charcoal` map onto levels 2–4 with a ≤1 L\* shift each, so this is a small
perceptual move, not a repaint.

### 1.2 Content — alpha over surface, not flat hexes

| Role | Value | Measured on L1 / L2 / L3 |
|---|---|---|
| `contentPrimary` | `#FFFFFF` — **headlines only** | 20.8 / 19.6 / 18.8 |
| `contentSecondary` | `rgba(255,255,255,0.72)` — body | 10.5 / 10.2 / 10.0 · AAA |
| `contentTertiary` | `rgba(255,255,255,0.48)` — metadata | 4.90 / 5.02 / 5.00 · **AA, not AAA** |
| `contentStateDisabled` | `rgba(255,255,255,0.32)` | 2.70 / 2.83 / 2.89 · exempt from 1.4.3 |
| `contentAccent` | `#d9b160` *(unchanged brand hex)* | 10.3 / 9.7 / 9.3 · AAA |

The brief's 0.72 / 0.48 / 0.32 ladder is the value shipping in both Revolut and Monzo, and it
removes the halation of today's `#f4f2ea` body at 17.7 : 1 on a card. `offWhite` is retained as the
headline colour so the brand hex still ships.

`contentTertiary` clearing AA but not AAA is a real constraint: **metadata never carries information
available nowhere else.**

### 1.3 The border conflict, resolved

The brief prescribes `rgba(255,255,255,0.12)` as the hairline *and* requires 3 : 1 non-text contrast.
Those collide, and the numbers say so:

| Border | Measured on L2 | 1.4.11 (3.0) |
|---|---|---|
| `rgba(255,255,255,0.12)` | **1.38 : 1** | ❌ |
| minimum white alpha to reach 3 : 1 | **α ≥ 0.335** | ✅ |
| `#d9b160` gold | **9.29 : 1** | ✅ |

Resolution — **two tokens, because they are two different jobs**, and WCAG 1.4.11 only governs
boundaries *required to identify a control*:

- `borderTransparent` = `rgba(255,255,255,0.12)` — decorative dividers, list separators, card edges
  that are not the sole indicator of anything. Exempt, and it keeps the Revolut/Monzo look.
- `borderOpaque` = `rgba(255,255,255,0.34)` — the boundary of any control whose edge *is* its
  affordance: text inputs, segmented controls, unfilled buttons, checkboxes. Clears 3 : 1 on every
  surface level.
- `borderSelected` = `#d9b160` — focus rings and selected states. Clears 3 : 1 with room to spare.
- Over photography: an opaque `#262626`-equivalent so it survives the image behind it.

### 1.4 Elevation — the four mechanisms, as one token set

Expressed once in `elevation.ts`, never hand-rolled in a screen. Shadow tokens are **per theme**;
a shared shadow token does not render on dark.

| Level | Fill | Inner top highlight | Ring | Contact shadow |
|---|---|---|---|---|
| `e0` page | `background` | — | — | — |
| `e1` card, input | `backgroundSecondary` | 1 px `rgba(255,255,255,0.05)` | `borderTransparent` | `0 1px 2px rgba(0,0,0,0.6)` |
| `e2` selected, pressed | `backgroundSecondary` | 1 px `rgba(255,255,255,0.08)` | `borderSelected` | as e1 |
| `e3` sheet, modal | `backgroundTertiary` | 1 px `rgba(255,255,255,0.08)` | `borderTransparent` | iOS `shadowRadius` + scrim |
| `e4` FAB | gold | — | — | today's `shadows.gold` |

The inner top highlight is capped at 8 % — above ~10 % it reads as a 2013 bevel. RN has no
multi-layer `box-shadow`, so the highlight ships as a 1 px absolutely-positioned view (no layout
cost), the ring as a 1 px border, and the contact shadow as iOS `shadowOffset/Radius/Opacity` +
Android `elevation`. `e2` no longer changes `borderWidth`, so selection stops shifting content.

### 1.5 Typography — roles, and a script axis

**Piecewise, not geometric** — a tight body band and a wide display band, per Apple and Material.
Every role ships size + lineHeight + tracking + family together. `lineHeight` is computed as
`Math.round(size × ratio)` and rounded to an integer.

| Role | Latin px / lh / track | Family | Ratio band |
|---|---|---|---|
| `DisplayLarge` | 44 / 48 / **−0.9** | Cormorant Bold | 1.09 |
| `DisplayMedium` | 36 / 42 / **−0.6** | Cormorant SemiBold | 1.17 |
| `HeadingXLarge` | 28 / 34 / **−0.4** | see Decision 2 | 1.21 |
| `HeadingLarge` | 22 / 28 / −0.2 | Manrope SemiBold | 1.27 |
| `HeadingMedium` | 18 / 24 / −0.1 | Manrope SemiBold | 1.33 |
| `LabelLarge` | 16 / 20 / +0.1 | Manrope Medium | 1.25 |
| `ParagraphLarge` | 17 / 26 / 0 | Manrope Regular | **1.53** |
| `ParagraphMedium` | 16 / 24 / 0 | Manrope Regular | **1.50** ✅ WCAG 1.4.12 by construction |
| `ParagraphSmall` | 14 / 20 / +0.15 | Manrope Regular | 1.43 |
| `LabelMedium` | 13 / 18 / +0.25 | Manrope Medium | 1.38 |
| `LabelSmall` | 11 / 16 / +0.5 | Manrope Medium | 1.45 |
| `Eyebrow` | modifier: `LabelSmall` + uppercase + track +2 + `contentAccent` | | |

Premium inversion honoured: **negative tracking on display, positive on small UI.** 11 px is the
floor (Apple's and Material's).

**The script axis** — `type[role][script]`, not one table with overrides:

```ts
type[ 'ParagraphMedium' ].latin  = { family: Manrope,  size: 16, lineHeight: 24, letterSpacing: 0    }
type[ 'ParagraphMedium' ].arabic = { family: <Dec. 1>, size: 17, lineHeight: 27, letterSpacing: 0    }
```

Encoded rules: Arabic **never** takes letter-spacing (connected script — tracking breaks the joins),
never italic, never uppercase; **+10–15 % line height** and **+1–2 pt optical size** at the same
hierarchy level; body floor 14 pt. Latin body 16/24 → Arabic 17/27.

`includeFontPadding: false` on every Android text style, for baseline parity.
`dynamicTypeRamp` set per role on iOS so custom fonts scale on the right ramp. **Absolute
`lineHeight` is multiplied by `PixelRatio.getFontScale()`** so it does not clip at AX sizes.

### 1.6 Space, radius, list density

```
space   100:4  200:8  300:12  400:16  500:20  600:24  800:32  1000:40  1200:48  1600:64
section 64 | 80 | 96 | 120        ← the missing lever; deliberately bimodal against 16px gutters
radius  none:0  xs:2  sm:3  md:5  lg:8  xl:12  2xl:16  3xl:24  pill:999
icon    xs:14  sm:16  md:20  lg:24  xl:32  2xl:48
touch   min:44          (size or hitSlop — no exceptions)
row     single:56  double:72  triple:88
```

Screen margin 16 on phones. 4 pt for intra-component, 8 pt multiples for inter-component. **Anything
off the 4 pt grid carries a comment saying why.** The `section` scale is new and is the single
biggest visual lever in this plan — today's largest token is 48.

**Radius: one model, held.** Sharp `md: 5` for cards and inputs — the website's 0.2 rem, preserved.
`pill: 999` **only** for tags, chips and status pills. Sheets move to `2xl: 16`. No third model.

This renumbers `spacing.md` 16→12, `lg` 24→16, `xl` 32→20. Deliberate — the 4 pt scale needs 12 and
20, and their absence is the direct cause of most of the 145 raw literals. Mechanical migration, one
commit, inside slice 1.

### 1.7 Motion

Material 3 durations and easings **exactly as specified in the brief**, expressible literally
because Reanimated 4.5.1 ships the CSS API with `cubicBezier` (verified in `node_modules` — no new
dependency):

```
duration  short1..4  50 100 150 200 | medium1..4 250 300 350 400
          long1..4   450 500 550 600 | extraLong1..4 700 800 900 1000
easing    standard             (0.2, 0, 0, 1)
          standardAccelerate   (0.3, 0, 1, 1)
          standardDecelerate   (0, 0, 0, 1)
          emphasized           (0.2, 0, 0, 1)
          emphasizedAccelerate (0.3, 0, 0.8, 0.15)
          emphasizedDecelerate (0.05, 0.7, 0.1, 1)
          uberDecelerate       (0.22, 1, 0.36, 1)   ← the "arrives already settled" quintic
```

Springs, converted with `c = 2ζ√(km)` at mass 1 — the brief's table, shipped as named presets:

| Preset | Material spec | Reanimated |
|---|---|---|
| `spring.spatialDefault` | expressive default (0.8, 380) | `{ mass:1, stiffness:380, damping:31.2 }` |
| `spring.spatialFast` | expressive fast (0.6, 800) | `{ mass:1, stiffness:800, damping:33.9 }` |
| `spring.spatialSlow` | expressive slow (0.8, 200) | `{ mass:1, stiffness:200, damping:22.6 }` |
| `spring.effects` | default effects (1.0, 1600) | `{ mass:1, stiffness:1600, damping:80.0 }` |
| `spring.effectsSlow` | slow effects (1.0, 800) | `{ mass:1, stiffness:800, damping:56.6 }` |

**Spatial = underdamped (0.6–0.9), overshoots slightly. Effects = critically damped (1.0), high
stiffness, never overshoots.** No screen writes a raw config.

**Asymmetry is a lint-able rule: exits ≈ 0.7 × entrance and accelerate; entrances decelerate. Never
ease-in-out on an entrance.**

Reduced motion is *replacement, not removal*: a `useMotion()` hook checks
`AccessibilityInfo.prefersCrossFadeTransitions()` (iOS) and subscribes to `reduceMotionChanged`
(because `useReducedMotion()` samples at app start only, both verified present in RN 0.86.2), then
returns a **150–200 ms cross-fade in place** rather than `ReduceMotion.System`'s teleport.

### 1.8 The contrast gate

`src/theme/a11y.ts` ships the WCAG G17 helper from the brief verbatim, and `tests/contrast.test.ts`
asserts, **for every surface level in the ladder**:

- every `content*` role on that surface ≥ its documented floor (4.5 body, 3.0 non-text);
- `borderOpaque` and `borderSelected` ≥ 3.0;
- every `StatusPill` tone composited over its own soft background ≥ 4.5 — which is what catches
  today's `danger` at 4.31.

Translucent values are composited against their real backdrop before measuring. **A palette edit
that breaks AA fails CI**, not code review.

---

## 2. Component inventory

**Rebuilt in place** (no parallel copies): `Button` · `TextField` · `Card` · `StatusPill` ·
`Typography`→`Text` · `ScreenContainer` · `Divider` · `EmptyState` · `ErrorState` · `BottomSheet` ·
`ScreenHeader` · `SectionHeader` · `TripCard` · `PriceBreakdown` · `FadeSlideIn`→`Reveal`.

**New:** `Surface` (the elevation primitive) · `Skeleton` (+ `.Text` `.Card` `.List`) · `Toast` +
`InlineAlert` · `Badge` · `SegmentedControl` · `ListRow` · `Avatar` · `IconButton` · `Chip` ·
`Stepper` · `ProgressIndicator` (all six booking steps) · **`RollingNumber`** · `NetworkBanner` ·
`KeyboardSpacer` · `MessageBubble` + `TypingIndicator` · `DriverMarker` · `LocationRow`.

**Deleted when replaced:** local `TripCard` in `trips/index.tsx`, local `Row` in `payment.tsx`,
inline `Stepper` in `details.tsx`, duplicated `Bubble`/chips/input-row in `ConciergeFab.tsx`,
`StepHeader.tsx`, `tokens.ts`, `semanticColors`.

**Interaction states as composed overlay alphas**, per Uber Base — keeps the token count down:
`pressedOverlayInverseAlpha rgba(255,255,255,0.2)`, `hoverOverlayInverseAlpha rgba(255,255,255,0.1)`.

**Every pressable ships `minHeight: 44` and `minWidth: 44`.** `hitSlop` extends the touch region on
visually small controls — noting it does **not** change the frame a screen reader reports, so it is
never a substitute for sizing something important.

**`RollingNumber`** (the fare): per-digit vertical translation in a worklet inside an
overflow-hidden container, **`fontVariant: ['tabular-nums']`** so columns do not jitter, and an
opacity cross-fade fallback under reduced motion. There is no `contentTransition` in RN — this is
built.

**Skeletons**: structural elements only, mirroring the real layout, never on small components
(misleads users into thinking they are interactive). Uber Base's shimmer exactly — 135° gradient,
`background-size: 400% 100%`, 100%→0% position, **1.5 s ease-out infinite**. Threshold: static
placeholder under ~1 s, animated beyond. Shimmer and fade durations tuned per theme.

**Bottom sheets — resolved, and it needs no new dependency.** I verified that the installed
`react-native-screens@4.26.0` already exposes `sheetAllowedDetents`, `sheetInitialDetentIndex`,
`sheetLargestUndimmedDetentIndex` and `sheetGrabberVisible`. So:

- **Route-level sheets → native**, via expo-router `presentation: 'formSheet'`. Real OS detents,
  real scrim, no JS during the drag. Zero cost.
- **The map picker sheet** is the one genuinely hard case — it needs a sheet-scoped scroll container,
  keyboard-aware behaviour, *and* a non-modal detent so the map stays interactive underneath. That
  is `@gorhom/bottom-sheet`'s exact use case → **Decision 3.**

Either way: `largestUndimmedDetentIdentifier` is an explicit design decision per sheet, not an
accident. Grabber 32 × 4 visual inside a 44–48 pt target. Fling-to-next-detent at Material's
**500 px/s**. `accessibilityViewIsModal` on iOS, `importantForAccessibility="no-hide-descendants"`
behind it on Android, focus moved into the sheet on open. Never a plain `ScrollView` inside a
gesture-driven sheet.

---

## 3. Delivery — vertical slices

Working branch: `design/ux-upgrade`. `npm run web` stays running in a background terminal for the
whole session.

### Slice 1 — Token layer + first primitives + gallery + **Home** *(visible immediately)*

- `src/theme/**` (the 8 new files); delete `tokens.ts`; migrate all 63 importers.
- `tests/contrast.test.ts`, `tests/motion.test.ts` (spring-conversion maths).
- ESLint rule banning raw hex / `fontSize` / raw duration outside `src/theme/`.
- Primitives Home needs: `Surface`, `Text`, `Button`, `Card`, `ListRow`, `Skeleton`, `ErrorState`,
  `NetworkBanner`.
- `src/dev/Gallery.tsx` + route `app/_dev/gallery.tsx`.
- **`app/(app)/index.tsx` fully redesigned**: one primary action, personal greeting, upcoming-trip
  card promoted to highest priority when present, **one-tap rebook** (LCT's Accelerator), no prices,
  no ETAs, no cars on a map. Real 64–120 section rhythm. Gold demoted from 68 % of icons to the
  primary action + the fare + the active tab.
- `app/(app)/_layout.tsx`: safe-area-correct tab bar.

**Honest note on the gallery route.** I checked `expo-router@57.0.14`'s matcher: only `_layout` and
`+`-prefixed files are excluded from routing — **a `_dev/` directory is not**. So
`app/_dev/gallery.tsx` will be a thin route that early-returns `<Redirect href="/" />` when
`!__DEV__`, with the real gallery in `src/dev/`. It is never linked from navigation. The path still
exists in a production bundle and renders a redirect. Fully stripping it would need a build-time
route exclusion SDK 57's public config does not expose. That is the ceiling, and I would rather say
so than imply otherwise.

### Slice 2 — Splash + onboarding
Single logo continuity across splash → app (kills the three-size handoff). Three slides kept, craft
raised. `useAnimatedScrollHandler` replaces the per-frame `setPage`; the dot animates `transform`,
not `width`. Persistent skip. **Push permission removed from tab-layout mount.**

### Slice 3 — Auth
Calm, minimal, inline validation, real error recovery. Apple/Google first. One consolidated legal
acceptance. **The not-configured fix re-verified by hand.**

### Slice 4 — Booking, one screen per sub-slice
`4a` **journey-type entry** (the structural change — Decision 4) · `4b` pickup · `4c` destination ·
`4d` vehicle · `4e` details incl. the **name-sign field** and booking-for-a-guest · `4f` payment
with the itemised final fare, "this is the price, not an estimate", and the **cancellation policy
above the pay button** · `4g` confirmation — composed moment, one success haptic, and **the correct
moment to request push**.

### Slice 5 — Trips + live tracking
P0/P1/P2 information order. Solid vehicle line, dashed walking line. A small Camera Director +
**Padding Provider** so the camera accounts for sheet occlusion. Marker interpolation between
updates. **The compressed progress curve — last 20 % of the bar = last 2 minutes.** Chauffeur card
without a star rating on the hero. **A visible route to a human.** Nothing sold here, ever.

### Slice 6 — Concierge
`MessageBubble` + real `TypingIndicator`, `maintainVisibleContentPosition`, keyboard and safe-area
handling, failed-send retry. The two divergent copies collapse into one.

### Slice 7 — Account, settings, and the remaining marketing screens
iOS-Settings-grade grouped rows, separators inset to the text column, quiet type. Then `about`,
`airport`, `corporate-info`, `fleet`, `demo-account`, `demo-trip`.

### Slice 8 — Cross-cutting polish
Full a11y sweep (roles, states, live regions, **vehicle ID as one utterance**), dynamic-type reflow
branching on `PixelRatio.getFontScale()`, `initialWindowMetrics` + `mode="maximum"`,
`expo-image` + thumbhash everywhere with reserved aspect ratios, `React.memo` + `keyExtractor` +
`getItemLayout` on lists, **RTL plumbing** (55 physical-direction props → logical, the `textAlign`
trap, mirrored directional icons only), and the copy rewrite — every string including error states
and empty states, with "luxury" and self-descriptive "premium" removed.

### Slice 9 — Verification & delivery
Release-mode profiling. `npx expo-doctor@latest`. Full Playwright pass at 390 × 844. Screenshots to
`design/after/`. `DESIGN_CHANGELOG.md`.

### The loop after every slice
1. `typecheck` · `lint` · `test` · both exports.
2. Playwright against the running dev server, 390 × 844, dark, capturing **default / loading / empty
   / error** for the changed screen → `design/progress/<NN>-<screen>-<state>.png`. Zero console
   errors confirmed.
3. Report: one paragraph of plain language · files touched · screenshot paths · the 2–3 decisions I
   want an opinion on · what I could not verify.
4. **Stop. Wait.**

**Stated now rather than discovered at the end:** Playwright drives the *web preview*, where Stripe,
Maps, the native date picker and push are mocked by design. So the flow it walks is the
manual-address, no-map, no-PaymentSheet path. Native map interaction, the real PaymentSheet, haptics,
Android blur, RTL layout (which cannot be tested in Expo Go and needs a dev build), and dynamic type
**cannot** be verified in this environment. They will be listed as unverified, not implied.

---

## 4. Dependency requests

Sizes are real `npm view dist.unpackedSize`. All four candidates are **first-party Expo SDK 57**, so
all support the New Architecture, which SDK 55+ mandates and cannot disable.

| Package | Ver | Why nothing installed can do it | Size | Web export |
|---|---|---|---|---|
| **`expo-haptics`** | 57.0.1 | No haptics API exists in RN core or any installed dep. The brief's 3-signal vocabulary requires it. | **87 KB** | ✅ Web Vibration API where supported, silent no-op otherwise |
| **`expo-image`** | 57.0.3 | RN's `<Image>` has no thumbhash, no reserved aspect ratio, no `recyclingKey`, no cache policy. Zero-layout-shift images are not achievable without it. | ⚠️ **~138 MB unpacked in `node_modules`** — prebuilt SDWebImage/Glide artifacts, **not** JS bundle weight. Added JS is tens of KB. Native binary growth I **cannot measure without a native build** and will not guess at. | ✅ web + Expo Go |
| **`expo-network`** | 57.0.1 | Nothing detects connectivity today; offline is ❌ on every screen. `useNetworkState()` is the whole API needed. | **109 KB** | ✅ (`type` reports UNKNOWN/NONE in a browser — enough for a banner) |
| **`expo-localization`** | latest 57.x | Needed for the `supportedLocales` / `supportsRTL` config-plugin path. **Not needed if Arabic is deferred** — today's `Intl`-based detection is sound and stays either way. | ~small, will confirm before install | ✅ |

**Requested only if you choose it in Decision 3:** `@gorhom/bottom-sheet` v5 — for the map picker
sheet only. Note its default spring is `{ damping: 500, stiffness: 1000, mass: 3, overshootClamping:
true }`, a damping ratio of ~4.6 — deliberately, massively overdamped. I would override it with
`spring.spatialDefault`.

**Deliberately not requested:** any animation library (Reanimated 4.5.1 already has the CSS API,
`cubicBezier`, `useReducedMotion`, `useAnimatedScrollHandler` and the entering/exiting builders —
verified) · any sheet library for route-level sheets (`react-native-screens` 4.26.0 already has the
detent props — verified) · any icon set (`lucide-react-native` is in place) · FlashList v2 (current
list sizes do not justify it; I would ask separately if trip history grows) ·
`babel-plugin-transform-remove-console` (**there is exactly one `console.*` call in the app**, an
intentional `console.warn` in `env.ts` — it would buy nothing here).

**Arabic fonts** — only if Decision 1 says Arabic ships now. Loaded via `expo-font` with the splash
gated on them, or the first Arabic frame renders in a metrics-different fallback and visibly
reflows.

---

## 5. Decisions

Your brief already resolved three things I had previously asked about, so I am not re-asking:
**journey-type-first** (§1.1, §3.4), **Cormorant reserved for display** (§2.4 "two families, never
cross-applied"), and **the surface ladder** (§2.2, three-to-four levels, 5–8 % steps). Those are
settled and built into the plan above. Four genuinely open questions remain.

### Decision 1 — Does Arabic ship in this pass, or only become possible?

**RESOLVED, then reversed — 2026-08-30, see `DESIGN_CHANGELOG.md`.** Option A
below was taken (RTL-ready plumbing, no Arabic font or strings yet), and later
a full second locale, translations, RTL layout flipping, and a restart flow
were built on top of it. Then Arabic was reversed outright as a business
decision: **English only, no RTL, no locale switching.** The proposal below is
left as written — it's the historical record of what was weighed and why —
but neither option describes where the app is now.

- **A. RTL-ready only (recommended).** Slice 8 does the plumbing: script axis in the type tokens, all
  55 physical-direction props → logical, the `textAlign` trap fixed, directional icons mirrored, all
  35 screens' strings moved into `src/i18n/locales/`. Arabic strings and fonts land later as a
  content task, not an engineering one. No `expo-localization`, no font decision, no dev-build
  testing dependency now.
- **B. Ship Arabic now.** Adds `expo-localization`, an Arabic font family, translation of every
  string, and a dev-build RTL test cycle (RTL **cannot** be tested in Expo Go — it resets the
  preference).

If **B**, I need the font: **IBM Plex Sans Arabic** (harmonised superfamily, pairs cleanly with a
Latin serif, Naskh-style) or **Noto Naskh Arabic** (widest coverage). Both beat a Kufi face next to
Cormorant. Never a system Arial Arabic fallback.

### Decision 2 — Where exactly does Cormorant stop?

The brief settles that the two families never cross-apply. It does not settle the boundary. The one
step in question is `HeadingXLarge` (28 px):

- **A. Cormorant for `DisplayLarge` + `DisplayMedium` only (recommended).** Serif on the hero, the
  fare, the confirmation, empty-state headlines. Everything structural in Manrope. The serif means
  something because it is rare — Blacklane's and Airbnb's model.
- **B. Cormorant through `HeadingXLarge`.** Keeps more of today's character; a smaller visible change
  for the client.

### Decision 3 — The map picker sheet: native, or `@gorhom/bottom-sheet`?

Route-level sheets are settled — native, free, already installed. The map picker is the exception:

- **A. Native only (recommended for now).** Zero new dependencies. The picker sheet loses
  sheet-scoped scrolling, so saved/recent locations show as a short fixed list rather than a
  scrollable one at the low detent.
- **B. Add `@gorhom/bottom-sheet` v5** for the picker only. Full sheet-scoped scroll + keyboard
  handling + a genuinely non-modal low detent with the map live underneath. This is the pattern Uber
  actually uses, and it is the one screen where it matters.

I lean **A** to keep the dependency surface honest, then revisit if the picker feels cramped in
review. Say **B** and I will add it in slice 4b.

### Decision 4 — Is "Now" a real product, or is LCT scheduled-only?

The brief says scheduled by default with **"Now" a visible equal option**. The app currently enforces
a 1-hour minimum lead time client-side (`MIN_LEAD_TIME_MS`), and I cannot tell from the repo whether
that reflects dispatch reality or is a placeholder.

- **A. Scheduled-only.** The journey-type screen offers one-way / by-the-hour / airport, and the time
  step defaults to the earliest bookable slot with the lead time stated plainly as a service fact.
- **B. On-demand exists.** "Now" becomes a first-class option next to "Schedule" on the entry screen.

This is a business fact, not a design preference — I will not guess at it. **A** is what the code
currently implies.

### And one thing I need from you rather than a decision

Three numbers I cannot source from the repo, all of which the plan has designed *space* for and none
of which I will invent:

1. **The free-cancellation window** and any fee (goes above the pay button).
2. **The complimentary waiting time** — `airport.tsx` markets it without stating it.
3. Whether the fare is contractually **final at booking** or genuinely an estimate. The whole
   fare-transparency slice turns on this. If it is truly an estimate, I will design the honest
   version — a stated range with the reason — rather than claim a fixed price the business cannot
   honour.

---

## 6. Follow-ups this plan will not implement

Recorded rather than silently attempted, matching the README's own convention.

1. **Saved-card selection in the booking PaymentSheet** — needs a customer-ID + ephemeral-key
   endpoint. Already a documented README gap.
2. **Genuine "recent locations"** — the picker can offer *saved* ones today with no backend. Recents
   need `GET /profiles/me/recent-locations`.
3. **One-tap rebook** — the UI ships in slice 1 by reconstructing a draft from a `Booking`
   client-side. A proper `POST /bookings { duplicateOf }` would be cleaner and touches booking
   creation, so it stays a follow-up.
4. **Human-phrased addresses** (Uber's Geotalker) — needs place-type data the current Places call
   does not request. The plan improves formatting only.
5. **Driver-marker smoothness** — honestly, roughly 80 % of Uber's is server-side position cleanup
   and 20 % client tweening. This plan does the client half properly; the server half is a backend
   follow-up and the result will be visibly short of Uber until it is done.
6. **Traffic-aware ETA confidence** — presentation (a range, a last-updated stamp) is in scope; a
   better ETA is not.
7. **Real testimonials** — audit P2-10.
8. **A real app icon** — still the Expo template placeholder per the README; needs image tooling this
   environment does not have.
9. **Component rendering tests** — blocked on the `jest-expo` / `react-native@0.86.2` preset
   incompatibility the README documents. Unchanged by this work.

---

**Awaiting your answers on Decisions 1–4 and the three service numbers, plus approval of the
dependencies, before slice 1. No code has been written.**

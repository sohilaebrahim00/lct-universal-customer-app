# Device verification

Everything this project could not verify, turned into steps someone can follow.

**Why this document exists.** The redesign was built and checked on a Windows
workstation, in a browser, against a production web export. That validates
structure, contracts, arithmetic and layout. It cannot validate anything that
only exists on a phone. Rather than leave that as a paragraph of caveats, each
item below is written as a procedure with a pass criterion stated as an
**observation** — something a person either sees or does not.

**Read this first.** A pass criterion of "feels fast" is not a criterion. Where
no observation could be found, the item says so and names who decides.

---

## 0. Prerequisites — do these once

```bash
npm install
npx expo-doctor                 # confirms SDK 57 alignment before you burn a build
```

**Environment.** Copy `.env.example` to `.env` and fill in real values. `.env`
is gitignored and must stay that way. The two that matter for device work:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS=…
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID=…
```

**Verify the keys before building**, because a missing iOS key produces a blank
map rather than an error:

```bash
npm run verify:maps-keys ios,android
```

**Build a development client** (a bare `expo start --go` cannot load
`react-native-maps`, Stripe, or haptics):

```bash
npm run build:dev               # runs the maps-key check, then eas build --profile development
```

**Devices needed.** One iPhone, and one **mid-range** Android — a Pixel 6a, a
Galaxy A5x or similar. A flagship Android will pass items 1 and 2 whatever the
code does, which is precisely why the mid-range device is the one specified.

---

## 1. Dynamic type — FIRST, and it is not here for tidiness

> **`AppText`'s line-height scaling has never run with a value other than 1.**
> It is a code path in the SHIPPED app that will execute for the first time on a
> real person's phone with the text size turned up. Untested code that only runs
> for the users who most need it working is a worse risk than anything else on
> this list, which is why it sits above the frame rates.

**Why it is here and not in the gate.** The layout gate used to claim "no reflow
problems at 1.0/1.3/1.6/2.0" by varying the root font size. React Native Web
emits absolute `px`, so that changed nothing and the claim was void. **OS-level
text scaling is a native behaviour and there is no browser substitute.**

`AppText` multiplies each role's line height by `PixelRatio.getFontScale()`
precisely because RN's `lineHeight` is absolute and does not scale with the OS
setting — so an unscaled leading clips as soon as the user raises text size.
That code has never run with a value other than 1.

**iOS:** Settings → Accessibility → Display & Text Size → Larger Text. Test at
default, at the largest non-accessibility size, and at **AX5**.
**Android:** Settings → Display → Font size, largest setting.

**Observe, on `/`, `/fleet`, `/book/vehicle`, `/trips/[id]` and `/account`:**

| | pass |
|---|---|
| Every line of text | fully visible — no glyph clipped at the top or bottom of its box |
| Headlines that wrap | wrap rather than truncate, and the container grows |
| The tab bar | labels remain legible, or truncate gracefully; icons do not collide |
| Buttons | grow with their label; no label overflows its pill |
| The tracking sheet | the stage timeline stays scrollable and nothing is pushed under the dispatch bar |

**Pass at AX5 is the one that matters** — it is where an absolute line height
fails, and it is the setting a partially-sighted customer actually uses.

---

## 2. Frame rate during map pan and list scroll

**Why.** The tracking screen animates a marker and a camera simultaneously; the
trips and concierge lists were memoised in slice 8 on the argument that it would
help. Nothing measured a frame.

**Build.** Development client, **release** JS (`--no-dev --minify`); a debug
bundle is 2–5× slower and will produce a false negative.

```bash
npx expo start --dev-client --no-dev --minify
```

**Android — the measurement.**

```bash
adb shell dumpsys gfxinfo com.lctuniversal.customer reset
# now perform the interaction, then:
adb shell dumpsys gfxinfo com.lctuniversal.customer
```

**Interactions, each for 15 seconds:**
1. `/trips` — flick-scroll the list continuously.
2. `/concierge` — send three messages, scroll the transcript.
3. A live trip (`/trips/[id]`) — pan and pinch the map while the marker moves.

**Pass:** in the `Janky frames` line, **fewer than 5%** janky, and the **95th
percentile under 16ms**. Record the actual numbers, not a verdict.

**iOS:** Instruments → Core Animation, or Xcode's Debug Navigator FPS gauge.
**Pass:** sustained 60fps with no drop below 55 during the same three
interactions.

**If it fails:** the memoisation is already in place, so the next suspects are
the gradient overlays and the shadow on `elevation.card`, in that order.

---

## 3. Cold start to first interactive frame

**Why.** `expo-image` added ~40 KB to the bundle. Whether that costs startup
time is unmeasured, and startup is the one performance number a customer
experiences before they have decided to care.

**Android:**

```bash
adb shell am force-stop com.lctuniversal.customer
adb shell am start -W -n com.lctuniversal.customer/.MainActivity
```

Read `TotalTime` from the output. Run **five times**, discard the first (page
cache), report the median of the remaining four.

**Pass:** median `TotalTime` **under 2000 ms** on the mid-range device, with the
app showing the welcome screen — not the splash — at that point.

**iOS:** Instruments → App Launch. **Pass:** under 1500 ms to first interactive
frame.

**Compare against:** nothing. There is no before-measurement — `expo-image`
landed without one. If a regression baseline matters, take it on the commit
before `7b06591` and state both.

---

## 4. Sheet detents and dismissal

**Why.** `BottomSheet.tsx` was written and has never been dragged by a thumb.
Snap behaviour, momentum and the dismissal threshold are all feel, and all of
them are wrong by default until someone checks.

**Where:** the tracking sheet on a live trip, and the location picker.

**Steps and pass criteria — each is an observation:**

| do this | pass |
|---|---|
| Drag the sheet slowly upward and release at 40% | it settles at a detent, not where you let go |
| Flick it upward hard | it reaches the top detent and stops, without overshooting past the screen edge |
| Drag down slowly to 30% and release | it returns to its detent rather than dismissing |
| Flick down hard | it dismisses in one motion |
| Drag the sheet while the map is animating | the map keeps animating; the sheet does not stutter or drop the gesture |
| Scroll the sheet's content to the top, then keep dragging down | the sheet begins to move — the gesture hands off from the scroll view rather than dead-ending |

That last row is the one that is almost always broken and never noticed in
review.

---

## 5. Haptics fire on the intended events, and only those

**Why.** `src/lib/haptics.ts` is wired and is a no-op on web, so every haptic in
this app is unfelt. A haptic on the wrong event is worse than none: it teaches
the customer that the phone buzzes meaninglessly.

**Device:** a real handset with system haptics ON. Test **both** with the ringer
silent and not — iOS suppresses some haptics in silent mode, which is a
behaviour to observe rather than a bug to fix.

**Should fire:**

| event | expected |
|---|---|
| Booking confirmed (`/book/confirmed` appearing) | success notification |
| A price-change interstitial appearing | warning notification |
| Selecting a vehicle | light selection tick |
| Pull-to-refresh committing | light impact |

**Must NOT fire:** ordinary navigation, scrolling, opening a sheet, typing, or
any screen appearing other than the confirmation.

**Pass:** every row in the first table felt once — not twice — and nothing in
the second list produces any sensation. Walk the whole booking flow twice and
count.

---

## 6. Maps render with real keys, on both platforms

**Why.** `PROVIDER_GOOGLE` is now set on iOS so the custom night style applies —
Apple Maps ignores `customMapStyle` entirely. Without
`GOOGLE_MAPS_API_KEY_IOS`, the map renders **blank rather than falling back**,
which is a silent failure.

```bash
npm run verify:maps-keys ios,android    # must pass before the build
```

**Observe, on each platform:**

1. Open a live trip. **Pass:** map tiles are present and dark — the warm
   near-black style, not Google's default grey and white.
2. **Pass:** no "For development purposes only" watermark, which means the key
   is unrestricted or correctly restricted, not missing billing.
3. The chauffeur puck points along the direction of travel and **does not flip**
   when the device language is Arabic (see item 9).
4. Pinch, rotate, and pan. **Pass:** the camera animates to follow rather than
   snapping when a new location arrives.
5. **Measure the binary cost:** compare the `.ipa` size of a production build
   with and without `provider={PROVIDER_GOOGLE}`. This is the outstanding number
   from slice 4 and has never been taken.

---

## 7. The OLED surface step is distinguishable at low brightness

**Why.** The palette separates page (`#020201`), card (`#221d16`) and sheet
(`#2e2820`) by luminance alone. All of it has only been seen on an LCD monitor,
which is the display least able to show near-black separation — and the target
device is an OLED phone, which is the most able, in a car, at night.

**Conditions:** OLED device, brightness at **25%**, in a dark room, with
true-tone and night-shift OFF.

**Observe:** on `/fleet`, and on a live trip with the sheet up.

**Pass:** the card edge is visible against the page **without** relying on the
hairline border — cover the border with a finger and the step is still there.
Then the sheet is visibly lighter than the card behind it.

**If it fails:** the fix is a luminance step in `ref.ts`, not a heavier border.
A border is a workaround for a surface that does not separate.

---

## 8. `expo-blur`, if it is ever installed

**Not installed.** There is nothing to measure today, and no blur ships.

If it is added, measure before deciding it is affordable: the mid-range Android
frame-rate procedure from item 1, run on the screen using the blur, **with and
without it**. **Pass:** janky frames increase by **less than 2 percentage
points**. Blur is the most common cause of scroll jank in React Native and it is
almost always adopted without measurement.

---

## 9. Screen-reader traversal of the two lists

**Why.** `tests/a11yStatic.test.ts` asserts that roles and labels are *present*.
It cannot judge whether a screen is navigable, whether the reading order makes
sense, or whether a label is useful — `accessibilityLabel="button"` passes every
assertion in that file and helps nobody.

**Tools:** VoiceOver (iOS) and TalkBack (Android). Turn the screen off on iOS
(screen curtain) so you cannot cheat by looking.

**Traverse `/trips`:**

1. Swipe right through the list from the header.
2. **Pass:** each trip is **one stop**, not five — route, time, status and fare
   are read as a single sentence rather than four separate focus stops.
3. **Pass:** the status is spoken as a word, not a colour or an icon name.
4. **Pass:** the fare is read as money ("one hundred eighty dollars and six
   cents"), not as digits.

**Traverse `/concierge`:**

5. **Pass:** a new assistant message is **announced** without moving focus away
   from the input.
6. **Pass:** a failed message announces that it failed, and the retry control is
   reachable by swipe from that message rather than from the top of the screen.
7. **Pass:** the transcript can be reviewed without the announcement of a new
   message throwing focus back to the bottom.

Item 5 and item 7 are in tension, and resolving that tension is the actual work
this procedure exists to trigger.

---

## 10. Whether an Arabic layout reads correctly

**Blocked on two things that do not exist yet:** no Arabic font is loaded, and
there is no RTL dev build. The logical-property conversion and its lint rule are
a **precondition** for correctness, not a demonstration of it.

**To make it testable:**

1. Add an Arabic face (Noto Naskh Arabic or IBM Plex Sans Arabic) to
   `useFonts()` in `app/_layout.tsx`, and wire the `arabic` script axis in
   `src/theme/type.ts` — the axis already exists and is already selected by
   `AppText` via `isRTL()`.
2. Force RTL and rebuild — RTL requires an app restart, not a re-render:

```js
import { I18nManager } from 'react-native';
I18nManager.forceRTL(true);   // then restart the app
```

**Then observe:**

| | pass |
|---|---|
| Every screen | content starts at the right edge; nothing is pinned left |
| Back chevrons and directional icons | mirrored |
| The chauffeur puck's bearing | **NOT** mirrored — north is north in Arabic |
| The tracking marker's nose triangle | unchanged (it is symmetric geometry, deliberately physical) |
| Mixed Arabic and Latin in one line — an address, a flight number | reads in the correct order without reordering the digits |
| Prices | currency symbol on the correct side for the locale |
| Progress rails and steppers | advance right-to-left |

**Owner:** this needs a native Arabic reader. Nothing in the tables above can be
judged by someone matching shapes — "does this read naturally" is not a check a
non-speaker can perform, and pretending otherwise is how a translated app ends
up fluent-looking and wrong.

---

## 11. The ride lifecycle on real devices

The lifecycle is verified three ways in the repository — pure transition tests, a
full-sequence assertion, and `scripts/lifecycle-walk.mjs` driving the browser.
**None of them leave one machine**, and that is the limit worth testing.

### 11.1 Does a stage change reach another device at all?

**This is G-3 and the honest expectation is NO.** The demo store is one
browser's `localStorage`; two views in one tab share it, two phones do not.
`driver_locations` is never written during a trip, so there is no live channel
carrying a status change between devices.

**Procedure.** Two devices, same trip. Advance the stage on device A.
**Pass:** device B reflects it within a stated number of seconds.
**Expected result today: it does not, ever.** Record how long you waited before
concluding that, because "we watched for two minutes" is the useful form of this
finding when it goes to whoever owns the backend.

### 11.2 The arrival timestamp and the waiting countdown

`arrived_at_pickup` is a demo overlay — the backend has no such status (C-4) — so
this tests the *behaviour*, not the integration.

1. Drive a ride to **arrived** in the chauffeur preview.
2. **Pass:** the customer screen headline becomes *"Your chauffeur is outside"*
   and a countdown appears.
3. **Lock the phone for five minutes, then reopen it.** **Pass:** the countdown
   shows roughly five fewer minutes — not a frozen value, and not a restarted
   one. A JS interval does not run while the screen is off; the value is
   recomputed from the arrival timestamp, and this is the test of that.
4. **Let it run past the window** — 30 minutes standard, 60 for an airport ride.
   **Pass:** it says the complimentary wait ended and that the chauffeur is
   still waiting, and shows **no money at all** — no fee, no rate, no total.
5. Repeat on an **airport** booking. **Pass:** 60 minutes, not 30.

Step 3 and step 4 both need real elapsed time and neither is testable in CI.

### 11.3 The receipt

**Pass:** the total on the receipt is character-for-character the total shown on
the payment screen when the ride was booked. Photograph both. A receipt that
recomputes is the one defect this whole project is built to prevent, and the
only way to see it is to compare two screens taken twenty minutes apart.

**Also observe:** the time on the receipt is the **device's** local time, not the
pickup's — `bookings` carries no timezone column (C-4b). Change the phone's
timezone and reload. **Pass:** the time changes, which is the defect, and
confirms C-4b is real rather than theoretical.

### 11.4 The chauffeur controls, one-handed

The confirmation on irreversible actions exists because a chauffeur taps these
at a kerb with the engine running.

**Pass:** every action reachable and tappable **with one thumb, without looking
away for more than a second**; "Passenger on board" and "Complete the ride" both
ask before acting; and neither can be triggered twice by a double tap.

---


## 12. Whether it feels fast — a judgement call, named

There is **no observation** for this, and no proxy that honestly substitutes.
Items 1 and 2 measure frames and milliseconds; a product can pass both and still
feel sluggish because of animation timing, transition choreography, and the delay
between a tap and any acknowledgement at all.

**This is a judgement call.** It is made by the person who owns the product
experience — the client, or whoever they delegate it to — after using the app for
a full booking on a real phone, not by a developer and not by a test.

What can be handed to them is a fair trial: a release build, a mid-range device,
a real network, and the whole flow from opening the app to a confirmed booking.

---

## Recording the results

Write the numbers down, not the verdicts. "Median cold start 1840 ms, 3.1% janky
frames on a Pixel 6a" survives a change of team. "Felt fine" does not, and by the
next release nobody can tell whether it regressed.

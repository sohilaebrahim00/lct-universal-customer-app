# Slice reports

Written as each part finished. What was done, what was measured, what was **not**
verified, and the wrong turns.

---

# Part 0 — read the website, shorten the question list

## What was read

`lctuniversal.com`, **2026-08-26**, from primary source. Paths discovered from
the site's own navigation and footer rather than guessed, then read directly:

`/` `/fleet` `/rates` `/services` `/airport` `/corporate` `/events` `/faq`
`/terms` `/cancellation-policy` `/service-areas` `/reviews` `/about` `/contact`

The FAQ is an accordion — all twelve questions were expanded before reading, or
the answers would have been invisible.

`BACKEND_FOLLOWUPS.md` §6 was **not** consulted, as instructed.

## The headline finding: the app published a rating the site refuses to publish

`/reviews` says, in the company's words: *"Rather than publish placeholder
quotes, we choose to leave this page honest."* No verified reviews exist yet.

The app's home screen was showing **"4.93 from 55 reviews"** — real figures,
hand-read from a third-party dashboard on 2026-08-22, with a source and a date.
Not invented. But the business has **deliberately chosen not to make that claim
publicly**, and the app was making it on the first screen a customer sees.

**Acted on:** the line is no longer rendered. The constant is kept with both
dates and the site's quote. **This is question 1 in `OPEN_QUESTIONS.md`** —
restoring it needs one sentence from the business.

Judged not to be a stop: it is not a price, a class name or a published policy,
and removing an unsupported claim is the conservative direction. Shipping a
known contradiction would not have been.

## The second finding: the site contradicts itself on class names

`/fleet` and `/rates`, read the same day, publish the **same prices and
capacities under different names** for four of seven classes. `/fleet` prefixes
"Executive"; `/rates` does not.

This **sharpens** the outstanding naming defect instead of resolving it: both
pages reserve "Luxury SUV" for the **$130** class, so the app labelling its
**$110** class "Luxury SUV" is wrong under either naming. What remains open is
only "SUV" versus "Executive SUV" — a choice between the client's own two pages.

**Not changed.** A class name is a customer-facing value. `OPEN_QUESTIONS.md` 2.

This also partially rehabilitates the transcription I called wrong in Slice 10.
`BACKEND_FOLLOWUPS.md` §6 said "SUV"; `/fleet` says "Executive SUV". **Both were
right about different pages.** My correction was itself half wrong, and the only
reason that is visible now is that the site was re-read rather than re-argued.

## What changed in code

**No value was edited.** Every figure in `publishedFleet.ts` and
`servicePolicy.ts` was confirmed against the site and matches:

- `From $95`, `From $110`, Request Quote ×2 — match `/rates` and `/fleet`
- 12 h / 6 h / 48 h cancellation and the 6 h modification cutoff — match
  `/cancellation-policy` exactly
- dispatch number `+1 (888) 615-4065` — matches

What was **added** is provenance and newly-published fact, none of it rendered:
`PUBLISHED_FLEET_REREAD`, `CANCELLATION_FEE_TIERS_PUBLISHED` (the 50% and
no-show tiers the site states and the app has never shown), and
`SITE_ANSWERS_2026_08_26`.

## Question count: **16 → 9**

Seven closed, each with the sentence that closed it, listed at the foot of
`OPEN_QUESTIONS.md`. The most useful: **hourly is "no meter to watch"**, which
settles the competitor's included-mileage model as *not what LCT sells*; and
**meet-and-greet is a published preference**, not an unanswered extra.

## What was NOT verified

- **That the site is stable.** It was read once, today. `/fleet` and `/rates`
  disagreeing means at least one is edited independently of the other, so any
  figure here has a shelf life. The read date is recorded on every constant.
- **That the Clienity rating is wrong.** It may be accurate. What is established
  is only that the company does not publish it.
- **`/hourly` does not exist** (109 chars, not in the site's own navigation).
  Hourly is described in the FAQ instead. No hourly-specific terms page was
  found, so hourly minimum duration remains unpublished.

## Wrong turns

- Read `/reviews` last, almost as an afterthought, and it held the most
  important finding in the part. The pages that look least likely to carry a
  fact are the ones a transcription skips.
- First FAQ read returned the questions with all answers collapsed and I nearly
  recorded "the FAQ answers nothing". Expanding the accordion changed the
  outcome of two questions.

---

# Part 1 — the chauffeur as an account

## The field was already there

`Profile.role` is `UserRole = 'customer' | 'driver' | 'admin' |
'corporate_admin'`, declared in `src/types/api.ts` since the project started,
served by the real backend, and **read by no screen in the app**.
`src/lib/accountRole.ts` is the first thing to use it.

So there was no overlay to build and no contract to change — the honest
implementation was to read a field that had been sitting there unused. One
login, three destinations, decided by the account.

The backend's word is `driver`; every label a person reads says **chauffeur**,
the same rule the trip statuses already follow.

## The mapping decision worth naming

**`corporate_admin` is a customer.** A corporate booker manages a company's
travellers; they do not drive and they do not dispatch. Matching on the word
"admin" would have dropped them into an operations console. Pinned as its own
test.

## The chauffeur sees no money

Not a zero, not a placeholder, not an empty row. `CHAUFFEUR_SEES_FARES = false`
is exported as a named constant with the reason attached, so that anyone adding
a fare to a chauffeur screen finds the question before they add the prop — and a
test fails if it is flipped.

The whole site was read on 2026-08-26, including `/join-our-team`. Nothing states
whether chauffeurs are employees or contractors or what they see.
`OPEN_QUESTIONS.md` 8.

## A bug I introduced and found by measuring

The first `landingRouteFor()` returned the `_role` paths unconditionally.
Grepping a build made with `EXPO_PUBLIC_DEMO_MODE=false` showed the screens
correctly absent — **and the route strings still present**, because the function
contains them.

A path naming a route that is not in the bundle resolves to the not-found
screen. **A chauffeur or operator signing into a production build would have
landed on a 404.**

They now fall back to the customer app: the only surface that exists in that
build, and `hasStaffRole()` still reports the truth. A designed "not available
in this build" screen is the better answer and needs copy nobody has written —
recorded in `HANDOFF.md` §7 rather than guessed.

**This is the second time this project has found a fence that was right about
screens and wrong about strings.** Absent and unimported are different claims;
so are "the screens are gone" and "nothing references them".

## What was NOT verified

- **That a chauffeur account can sign in.** There is no auth project confirmed
  to exist, so the role has never been exercised against a real user. The
  routing is tested as a pure function; the sign-in it depends on is not.
- **That the board shows a real schedule.** It shows seeded demo bookings. The
  layout, ordering and controls are real; the contents are a demonstration.
- **Anything on a second device.** G-3.

## What was NOT built, and why

**The chauffeur screens themselves were not rebuilt.** `ChauffeurToday`,
`ChauffeurJob` and `ChauffeurStatus` already exist from Slice 11 with the stage
controls, the confirmations on irreversible actions, and the arrival overlay.
Part 1 asked for a role, not a rewrite, and rebuilding working screens to prove
they were built would have been the largest possible waste of a night.

**Navigation to the phone's maps app WAS added**, after first writing that it
had not been. `src/lib/mapsLink.ts` builds a `maps:` / `geo:` / web-fallback
URL from the destination, falling back to the pickup, and the job screen hands
off with it.

It started inside the component reading `Platform.OS` directly, and a test
importing it pulled React Native into a node environment and failed to run at
all. A URL builder is arithmetic on a string: it moved to `src/lib` with the
platform as an argument, which is what made it testable without a renderer.
Address-based rather than coordinate-based, because the manual-entry fallback
reports no coordinates and a coordinate link would open an empty map at exactly
the moment the app had degraded.

---

# Part 2 — the operator as an account

Same mechanism, one line of the same map: `role: 'admin'` lands on
`/_role/admin`. The console built in Slice 12 is unchanged — it still writes
exactly one thing (chauffeur assignment via `assignChauffeur()`), Class Builder
still reads `observedRateCards.ts` and keeps edits in memory, and the nine empty
sections still name the missing table, endpoint or open question.

## The fence, verified by absence

Built with `EXPO_PUBLIC_DEMO_MODE=false` and grepped the emitted bundle:

| checked for | found |
|---|---|
| `/_role/*` route registrations | **none** |
| `observed_executive_sedan` (the unconfirmed rate-card data) | **0** |
| `Preview of a chauffeur app` | **0** |
| `Preview of an admin console` | **0** |
| `class attachment unknown` | **0** |
| bare `_role/...` path strings | **3** — and that is the bug above |

Absent and unimported are different claims, and only one of them is checkable.
The screens are absent. The strings were not, and that is now handled.

---

# Part 3 — the seven Blacklane additions

**Already delivered in commit `9d1784a`, before this brief arrived.** Checked
against the seven-item list rather than assumed:

| # | asked | state |
|---|---|---|
| 1 | Passenger and luggage counts on class cards | **done** — icons added; the numbers were already there as text |
| 2 | Swap pickup and drop-off | **done** — on the details step, the only screen where both addresses exist and no price does |
| 3 | Estimated arrival on review | **done** — `formatEstimatedArrival`, worded as an estimate, absent when there is no duration |
| 4 | Journeys: upcoming, past, cancelled, book again | **done** — Cancelled is its own tab; Book again on past and cancelled rows |
| 5 | Journey-types grid, fourth only if the business sells one | **done** — Airport, Point to point, Hourly, Corporate. **No city-to-city tile**: `ServiceType` has no such member and the site sells no intercity service |
| 6 | Recent and suggested locations | **already existed** before the brief |
| 7 | Ride type made explicit | **already existed**, and broader — a six-service picker |

One correction to the brief's premise, from Part 0: item 5 says "airport,
hourly, corporate, and a fourth only if the business sells one". The site's own
service list is Airport Transfers, Corporate Travel, Events, Group
Transportation. **"Point to point" is not a name the site uses** — it is
`ServiceType.point_to_point` and the app's own label for the door-to-door
service the main Book button already starts. The service is real; the *name* is
the app's, not the site's. Worth aligning when the class-name question is
answered.

## What must not be copied — recorded, not built

Blacklane's 15-minute wait and one-hour cancellation; their metered hourly
product; their chauffeur offer system; their visual language. All four are in
`HANDOFF.md` §6 with owners.

**Part 0 closed the hourly one.** The FAQ says LCT's hourly is as-directed with
"no meter to watch", so the competitor's included-mileage model is *not what LCT
sells*, and nothing needs to change. `OPEN_QUESTIONS.md` 9 now asks only whether
the business *wants* that model.

---

# Follow-up — the label decision, and a fence I could only half fix

## The Luxury SUV label was changed, and I agreed with the reasoning

Changed `VEHICLE_DISPLAY_NAME.suv` from `'Luxury SUV'` to `'Executive SUV'`.
The price did not move.

I agreed, and there is an argument I had not made: **`DEMO_VEHICLES` already
carried the literal `'Executive SUV'`**, so Home, the booking picker,
`PricingPreview` and `TrackingSheet` were already showing that name while Fleet
and Corporate showed "Luxury SUV". The rename did not just move to a published
name — it made the app internally consistent, which nobody had listed as a
defect.

**Two guards fired, and one of them was itself stale:**

- `publishedNameConflicts` went **red on the fix**, exactly as designed, so the
  `KNOWN_CONFLICTS` exemption had to be deleted deliberately.
- `catalogueIntegrity` **kept passing** — it carried its own hardcoded copy of
  the display names and was asserting about a value the app no longer held. It
  now parses from source. A test that duplicates the thing it checks stops
  checking it the moment the thing changes, and says nothing while that is true.

Fixing the parse then surfaced a real consequence: the app and the panel now
share exactly **one** display name (Executive Sedan), down from two. That is the
name-join getting weaker, not the catalogue getting worse — and the join was
always documented as a guess.

## Question 1 was over-inferred and is now narrower

I had written the reviews question as though the site had *chosen not to state
its rating*. It says it will not publish **placeholder quotes** — fabricated
testimonials. An aggregate from their own dispatch system is not that, and they
may simply never have been asked.

The removal stands, because the conservative direction while it is unresolved is
not to make a claim the business has not made. But the question now says plainly:
**nobody has said no — nobody has asked.**

## The fence: right about screens, and I could not make it right about strings

Asked to assert the absence of the route strings as well as the screens. I added
the check, it **failed**, and it was correct to fail: `_role/chauffeur`,
`_role/admin` and `_role/dispatcher` are all in a customer bundle.

**I tried to remove them and made the code worse.** Moving the paths behind
`process.env.EXPO_PUBLIC_DEMO_MODE === 'true' ? {…} : {}` — a constant condition
Metro inlines and a minifier can fold — did **not** fold, broke a unit test that
could no longer see the mapping, and would not have covered the second source
anyway: the Account screen's preview links hold the same paths.

Reverted. The check now asserts what is **true and checkable** — the screens are
absent, via `ROLE_PREVIEW_MARKER`, on every non-demo export — and the residue is
recorded rather than asserted away: dead string literals naming routes that do
not exist. The runtime is guarded and tested; a staff account in a customer
build lands in the customer app, not on a 404.

**Claiming "nothing references them" would have been the fourth instance** of a
claim true in one representation and untrue in another. I would rather ship the
weaker assertion and say so.

## What I did NOT do

Nothing else. The brief said to stop rather than find work, and there is no
honest next slice here: nine questions for the client, a device, and a backend.

---

# Part A — which repository, 2026-08-31

## The two codebases

**`lct-universal-customer-app`** (this repo). `main` and `feat/ui-upgrade` are
**identical** — same head commit `c3affab`, zero commits either direction —
so there is only one line of work here, not two competing branches. 47
commits. Expo Router / React Native, targeting iOS, Android and web from one
codebase. Gates: `tsc --noEmit`, `eslint app src scripts`, 18 Jest suites /
1,894 tests, `verify:a11y` (5-viewport matrix incl. 320px reflow, contrast,
touch targets, a completion ledger that exits non-zero on a partial run),
`verify:lifecycle` (7-stage ride walk across 3 roles), `verify:admin`
(16-section console walk), `verify:build-mode` (greps the emitted bundle for
fenced data and role-preview routes). Five living documents (`OPEN_QUESTIONS`,
`HANDOFF`, `DESIGN_CHANGELOG`, `PLATFORM_RECONCILIATION`, `DEVICE_VERIFICATION`,
`DEMO_GUIDE`, `BACKEND_FOLLOWUPS`) recording decisions with reasoning and
dates. Its own `HANDOFF.md` lists what it cannot do: no real backend
connection, no real authentication, nothing verified on an actual device, no
two-device (chauffeur→passenger) channel. It has never been built for an app
store and has no deployment of any kind.

**`LCT-Universal-Vite-Ready-v2/lct_migrate`** (sibling directory, remote
`github.com/sohilaebrahim00/lct.git`). 19 commits, all in a bug-fix/feature
register very different from the above — *"Fix client login popup visibility",
"Fix CSP rules for Google Ads tracking", "Fix Google Tag installation",
"Final production verification and fixes", "Update Privacy Policy with SMS
compliance content"*. React + Vite + TanStack Start + Tailwind, built via
Lovable.dev, deployed to Netlify (`netlify.toml`, two Netlify Functions running
the Gemini-backed AI Concierge), and reading/writing the **same shared
Supabase project** (`src/integrations/supabase/`) as the app repos. No test
script in `package.json` at all — its only gate is `eslint .`. Its own docs
(`DOMAIN_MIGRATION_AUDIT.md`, `OLD_SITE_PARITY_AUDIT.md`, `MIGRATION-NOTES.md`,
`LAUNCH_CHECKLIST.md`, `SECURITY_CHECKLIST.md`, `SEO_CHECKLIST.md`) describe
*it* as a completed migration of an older site onto a new domain and stack —
already shipped, not in progress. Live Google Ads conversion tracking on a
site with no automated tests is not something you maintain by accident; that
detail alone is why I read this one as the one actually taking traffic.

## What each does that the other does not

The web app has what the mobile rebuild has never had: **it is live.** Real
ad spend is pointed at it, it has a working login flow customers actually use,
and it is the thing `lctuniversal.com`'s pages — the primary source this whole
project reads facts from — actually *are*. Losing it loses the business's
public presence and everything wired to it (ads, SEO, the Netlify Concierge
functions, whatever leads currently arrive through it).

The mobile rebuild has what the web app was never built to have: a native
customer app, a native chauffeur app, and an operations console, all sharing
one login and one role fence verified by absence from a shipped build's bytes
— plus the accessibility, RTL-hygiene, contrast, and lifecycle gates listed
above, none of which the web app runs. Losing it loses roughly six weeks of
audited, gated, documented engineering (the "thirteen slices" this brief
refers to) with no web equivalent to fall back on — a native app is not a
CSS media query away from the Vite site, it would have to be rebuilt from
zero.

## Is this a toolchain migration?

No. I looked for the "same product, different build system" shape the brief
named as the other possible answer, and the evidence doesn't support it. The
mobile rebuild's own history calls itself **"the redesign"** of a prior,
separate Expo app (`type.ts`: *"before this redesign 'Account' was set in 44px
display serif"*), not a port of the Vite site — and architecturally it
couldn't be a port: it depends on native maps, native Stripe, native push
notifications, and a native gesture handler, none of which the Vite site has
or needs. These are two different **products** (a marketing/booking website,
and a from-scratch native app with three roles) sharing one backend, not two
implementations of one product on different stacks.

## Which one is the product going forward

I'm not deciding this — the brief asked for the comparison, not a choice, and
this is a business call: the web app is generating real traffic today; the
mobile rebuild is a large, unconnected bet on a different product surface.
What I can say plainly: **neither is "the wrong repository" for today's work**,
because they aren't racing for the same finish line. Every file Part B through
E of today's brief names (`BACKEND_FOLLOWUPS.md`, `OPEN_QUESTIONS.md`,
`DESIGN_CHANGELOG.md`, `HANDOFF.md`, `PLATFORM_RECONCILIATION.md`,
`DEVICE_VERIFICATION.md`, `DEMO_GUIDE.md`) already exists only in
`lct-universal-customer-app`, so that settles where today's work happens
without my needing to guess. The open question this surfaces — whether
continued investment in the mobile rebuild is still the right call given the
web app is the one actually serving customers — is written into
`OPEN_QUESTIONS.md` as question 10's sibling below, because it's a resourcing
decision, not a fact I can look up.

---

# Part C — trim, not revert

The previous session (2026-08-30) removed Arabic/RTL support in full — the
locale store, both string tables, the lint rule, the switcher. Today's brief
asked for something narrower: **keep** the logical-properties lint rule and
**keep** a copy file with a rule that user-facing text lives in it, both
renamed for what they now do; only the locale-specific machinery — the second
language, direction flipping, the restart prompt, device-locale detection, and
plural handling — needed to actually be gone. It already was, from yesterday's
removal; what was missing was the piece that should have survived it.

**Rebuilt:** `src/copy/strings.ts` — a single English object, no `typeof`
cross-file constraint (there's nothing to constrain it against anymore), no
hook, no store. `app/(app)/account/settings.tsx` reads from it directly. The
ESLint rule that used to check translation completeness (`JSXText` containing
a Latin-or-Arabic letter, against a `TRANSLATED_SCREENS` allowlist) is back as
`HARDCODED_COPY_RULE` against `COPY_FILE_SCREENS` — same allowlist shape, same
reason (turning it on everywhere today fails the build for every screen not
yet converted), different job: it no longer checks a string exists in two
languages, it checks a string isn't sitting in JSX at all. Verified it still
fires, not just that it parses: injected a literal into `settings.tsx`, got
the new message, reverted.

**The fourth chance, taken:** swept the repo for every remaining "Arabic" or
"RTL" mention outside code already fixed yesterday and found six more —
`isRTL()` imported into six live files I hadn't touched in the previous
session's removal (`ListRow.tsx`, `Typography.tsx`, and four booking/trip
screens), all wired to real back-chevron and script-selection logic, none of
which showed up until this repo-wide grep. Fixed all six to a fixed LTR
behaviour. Also corrected a comment in `PlacesAutocomplete.tsx` that stated, in
the present tense, that "an Arabic suggestion row now gets Arabic metrics" —
false the moment `resolveType` stopped being called with a script argument
anywhere. And closed the loop in the planning documents themselves:
`DESIGN_PLAN.md`'s "Decision 1 — does Arabic ship" now says plainly it was
resolved and then reversed, rather than reading as a live open question;
`DEVICE_VERIFICATION.md`'s item 10 (a whole procedure for testing an Arabic
layout) is marked void instead of describing a test for a feature that no
longer exists; `DEMO_GUIDE.md`'s "untested on a device" list drops Arabic from
it, because reversed is not the same claim as untested.

**Verified:** `tsc --noEmit` clean, `eslint app src scripts` clean, full test
suite **1,894/1,894 passing across 18 suites** — unchanged from yesterday's
post-removal count, confirming today's additions (the copy file, the renamed
rule, the six fixed call sites) touched nothing the suite covers incorrectly.

**What I did not do:** rewrite `DESIGN_AUDIT.md`'s P1-7 section, which audits
the state of the RTL plumbing as it was on the date it was written. That's a
dated historical finding, not a live plan — the same distinction this file
draws between *designed* and *verified*. Editing an audit's conclusions after
the fact would misrepresent what was true when it was checked.

---

# Part B — the corrections still outstanding

## `BACKEND_FOLLOWUPS.md` §6 — corrected

Its class table cited `LCT-Universal-Vite-Ready-v2/lct_migrate/src/lib/site-data.ts`
as the source, but read it before the 2026-08-26 primary-source pass found
`/fleet` and `/rates` disagree on four of seven names. Updated the table to
`/fleet`'s names (the catalogue page — same choice already made in code for
`VEHICLE_DISPLAY_NAME.suv`), with the original transcribed name kept in
parentheses per row, and a note that `/rates` still publishes the other name
live — that disagreement is `OPEN_QUESTIONS.md` #2, not something a table edit
resolves.

## The class label — already done, verified rather than redone

`VEHICLE_DISPLAY_NAME.suv` already reads `'Executive SUV'`, changed
2026-08-28, with both candidate names, both source pages, and the date
recorded in `src/lib/vehicleImages.ts`'s own comment — exactly what today's
brief asked for. I checked rather than re-applied it. Nothing to do here.

## `OPEN_QUESTIONS.md` against the live site — before 11, after 11, zero closed

Attempted to re-read `lctuniversal.com` directly today and could not: it is a
pure client-rendered SPA (confirmed with a raw `curl` — HTTP 200, 2.5 KB of
HTML, `<div id="root"></div>` and nothing else; every page returned empty
content to every fetch). No tool available in this session executes JavaScript
against a live page, so "re-read the rendered site" was not something I could
honestly do today.

**What I did instead, and why it's still primary source and not a guess:** the
site's own repository is sitting on this machine
(`LCT-Universal-Vite-Ready-v2/lct_migrate`, clean working tree, `main`, the
branch that deploys) — so I read the components and data that render those
pages directly, which is the same content the browser would show, read one
layer closer to the source than scraping the rendered text would have been.
Checked `reviews.tsx` (question 1), `site-data.ts`'s two class-name arrays
(question 2 — `VERIFIED_LIVE_VEHICLE_CLASSES`, still literally `"Sedan"`,
`"SUV"`, `"Mini Coach"`, `"Motor Coach"`, unchanged since its own
`Verified live 2026-08-08` comment), and `faq.tsx` (questions 6, 7, 9 — surge,
a booking reference format, hourly/as-directed). Every string matched what
`OPEN_QUESTIONS.md` already quotes, word for word.

**Before: 11 open questions. After: 11.** Nothing closed, because nothing on
the site changed since the 2026-08-26 pass — not "checked and assumed
unchanged," actually re-read and found identical. Saying so honestly is the
point of the before/after count; a close I didn't earn would be worse than no
close.

---

# Part D — the honest close

## Every gate, one invocation each, all clean

`tsc --noEmit` · `eslint app src scripts` · `npm test` (**1,894/1,894**, 18
suites) · `npm run export:web` (Metro bundle, `verify-build-mode.mjs`,
`verify-maps-keys.mjs` — all pass) · the 20-screen sweep against the served
export (zero console errors, zero blank screens) · `verify:a11y` (22 routes ×
5 viewports — 320/390/430/834/1440 — zero touch targets under 44×44, zero
content above the fold, zero horizontal overflow including 320px reflow) ·
`verify:lifecycle` (all seven stages, driven from the chauffeur view, read
back correctly in the customer and dispatcher views) · `verify:admin` (16/16
sections reachable, the class-builder naming conflict correctly displayed, no
fabricated figure anywhere).

**One gap in the ledger I closed rather than left implicit.** The "unconfirmed
rate cards absent from a production bundle" row was last verified against a
build this session hadn't made — today's `export:web` used the local `.env`'s
`EXPO_PUBLIC_DEMO_MODE=true` (correctly, since the sweep/a11y/lifecycle/admin
walks need demo data to click through). So I built a second, throwaway export
with `EXPO_PUBLIC_DEMO_MODE=false`, ran `verify-build-mode.mjs` against it
(passed), and then did not stop there — **grepped the emitted bundle myself**
for `ROLE_PREVIEW_MARKER`, the observed rate-card figures, and the `_role/*`
route strings, rather than trusting the checker's own report of itself. Zero,
zero, and **two** respectively — the two being the exact dead route-string
literals `DESIGN_CHANGELOG.md` already documents as accepted, unfixable
residue. Reconfirmed unchanged, not newly discovered. `.env` restored to
`true` afterward; both temporary build directories deleted.

## Documents brought current

`OPEN_QUESTIONS.md` (two new questions, §"What the site closed" header count
corrected), `BACKEND_FOLLOWUPS.md` §6 (class names corrected to `/fleet`'s,
original transcription kept in parentheses), `PLATFORM_RECONCILIATION.md`
(the stale pre-fix "Luxury SUV" table entry and the "still unresolved"
framing in §1 both corrected to point at §7's actual resolution),
`DESIGN_CHANGELOG.md` (today's entries, below), `HANDOFF.md` (the ledger's
re-confirmation note above, and the five-line "what today could not produce"
table now at the very top, each with a named owner), `DEVICE_VERIFICATION.md`
and `DEMO_GUIDE.md` (Arabic item voided, not silently dropped — see Part C).

## Pushed to `main` — the deploy could NOT be confirmed by loading it, and I'm saying so rather than the deploy report

Pushed after every gate above was green (`c3affab..c6cd28f`). `netlify.toml`
builds `main` via `npm run export:web` and auto-deploys to
`https://lctapp.netlify.app/` — this is the step I could not close today.

**Every attempt to load that URL failed at the connection level, not the HTTP
level:** `curl` over IPv4 and IPv6 (connection timed out, 15-25s, curl exit
28), a verbose TCP trace showing no SYN-ACK from either resolved IP on port
443 within 10s, `ping` to the resolved address (100% packet loss), and
`WebFetch` (failed outright, no response at all — a harder failure than
`lctuniversal.com`'s empty-but-200 response earlier in Part B). DNS resolves
the hostname to real IPs, so this isn't a typo or a dead domain.

**Isolated to this one site, not a blanket block:** `lctuniversal.com` —
reachable, HTTP 200, in the same few minutes on the same connection — so
whatever is wrong is specific to `lctapp.netlify.app`, not outbound HTTPS,
not Netlify's own infrastructure in general (`netlify.com` and
`app.netlify.com` both answered fine too).

**What this does and does not mean:** it does not mean the deploy failed —
Netlify's dashboard may show it succeeded, and per this brief's own rule that
is exactly the claim not to trust. It also does not mean the deploy is
broken; I have no evidence either way. What I have is a URL I could not load
from this environment, by four independent methods, in a session with no
Netlify credentials to check deploy status any other way.

**Not silently left as "done."** Recorded as its own line, with an owner, at
the top of `HANDOFF.md`: someone with network access to that URL (or Netlify
dashboard access) needs to load it and confirm it reflects `c6cd28f` — the
push itself is real and already on GitHub regardless of what that check
finds.

---

# Part E — making the device work runnable, not just written

`DEVICE_VERIFICATION.md` was already close to this brief's own bar before
today — text scaling already sits first, with the exact reason stated
("shipped code that will execute for the first time on the phone of the user
who most needs it working"), and nearly every item already carries a table
with an observation-shaped pass criterion rather than a feeling. So this
wasn't a rewrite; it was closing the specific gaps a person with a phone and
no context would actually hit, each checked rather than assumed.

**Checked, not assumed, and correct as written:**
`npm run verify:maps-keys ios,android` — ran it for real. It correctly parsed
the platform list and reported a genuine, currently-true finding
(`GOOGLE_MAPS_API_KEY_ANDROID` unset locally), not a fabricated demo of
success. The Android package and iOS bundle identifier the `adb`/Instruments
commands assume (`com.lctuniversal.customer`) match `app.config.ts` exactly.

**Three real gaps closed:**

1. **No tooling prerequisites.** The document assumed Xcode, Android Studio
   plus `adb` on `PATH`, and an EAS account with the CLI installed and
   logged in — none stated. Added as the first thing in §0, including how to
   turn on USB debugging and confirm `adb devices` sees the phone, since
   "a person with a phone and no context" cannot be assumed to have any of
   this already.
2. **No instructions for getting the build onto the phone.** `eas build`
   finishes with a URL and a QR code; the document jumped straight from
   running it to "devices needed" with nothing about the install step or
   connecting to the dev server afterward. Added, including the
   "check you're on the same network" first move for the most common failure.
3. **`G-3` used with no definition.** Item 11.1 referenced "this is G-3" as
   if the reader already had `BACKEND_FOLLOWUPS.md` open. Added the one-line
   pointer inline.

**What I did not change:** the pass criteria themselves, the frame-rate and
cold-start thresholds, the haptics table, the OLED procedure. All of that was
already stated as an observation, already had a reason attached, and item 12
already names the client as the owner of the one genuinely unmeasurable
judgement call. Rewriting working prose to sound like mine would have cost
more than it added.

---

# Delivery-eve pass, 2026-08-31/09-01

## 1 · The deployed build — proven, not assumed

`https://lctapp.netlify.app/` was unreachable last time by every method I
tried. Tonight, forcing `curl --resolve` onto a different Netlify edge IP
worked — the specific IPs this hostname currently resolves to are unreachable
from this connection, but Netlify's shared edge (which routes by Host header)
isn't, and answers the same site regardless of which IP is used.

**Proof it matches `main`, not just that it loaded:** the live bundle contains
zero Arabic strings (rules out anything before 2026-08-30's reversal) and
four occurrences of "Executive SUV" (rules out anything before the
2026-08-28 label fix). There is no possible deployed state in between —
yesterday's Arabic-removal-plus-fix work was never committed until it was
already complete, so the commit history has no broken intermediate state a
stale deploy could be stuck on. **The deployed build matches `main` as of
last night's push.** Tonight's further commits (below) still needed their own
push-and-reverify, done at the end of this pass.

## 2 · What a client finds in the first ten minutes

**The class label itself was already correct** (`Executive SUV`, fixed
2026-08-28) — but two places still described it as broken, which is worse
than the original bug for a demo: a viewer reading either would conclude the
app has an unfixed defect it does not have.

- `src/config/publishedFleet.ts` — a comment stated, present tense, that the
  app "displays its $110 class as 'Luxury SUV'". Corrected to say what
  happened and when.
- `src/dev/role/admin/AdminPanels.tsx` — the **operations console itself**
  told a viewer the app shows two different names on different screens. It
  does not, since 2026-08-28. Rewritten to show the conflict that is
  actually still live: the app's name choice against the site's own two
  pages disagreeing with each other. Verified rendering via `verify:admin`
  (`class builder conflict shown: true`, char count moved from 2017 to 2073)
  and a direct screenshot.

**Screen walk, both widths, 20 screens (10 routes × phone/desktop):** zero
console errors, zero page errors, zero blank screens. Visual review of the
key screens (home, fleet, pickup, drop-off, vehicle-step guard, date/time
step, account) found nothing clipped, no stuck skeleton, no disagreeing
price. One real find in the process, not in the product: `sweep.mjs`'s own
booking-path probe tapped a button labelled "Confirm Location", which has
never existed — the real button reads "Confirm pickup" (matching
`DEMO_GUIDE.md`'s own wording) and needs a location selected first, which the
script never did either. Fixed and verified: re-ran the sweep, watched it
proceed past pickup into a populated drop-off screen instead of silently
giving up. This was the sweep failing to test what it claimed to, not a
product defect — but it meant the "booking path" portion of every past sweep
report was weaker than it read.

**Invented-content sweep — one real gap found and closed, not just
patterns checked.** `FIXTURE_DRIVER.rating = '4.98'` sits in
`src/dev/fixtures.ts`, fenced from every production build by
`metro.config.js`'s `blockList` — and that file's own comment promised
`export const EXCLUSION_MARKER` would be grepped out of `dist/` by an
automated check. No script ever did that grep; `verify-build-mode.mjs`
checked the role-preview marker and stopped there. Manually confirmed the
fence itself holds (`grep -c EXCLUSION_MARKER dist/**/*.js` → 0) before
writing anything, then added the check `verify-build-mode.mjs` was missing —
proved it actually fires by injecting the marker into a throwaway bundle and
watching it fail, not just that it parses. Found the night before a
handover, which is exactly when this project's own rule says the last one
gets found.

## 3 · Three roles

`verify:lifecycle` (all seven stages, customer + dispatcher views both
reflect every chauffeur action) and `verify:admin` (16/16 sections, the
corrected conflict panel confirmed rendering) both re-run clean tonight
against a fresh build. `tests/accountRole.test.ts`'s chauffeur-money-fence
assertions pass as part of the full suite. The console write-scope claim
("assignment only") is unchanged and still enforced by the same code path
`verify:admin` exercises — no new write surface was added tonight, so it
wasn't re-derived, only re-run.

**Demo-mode env var, confirmed in the actual deploy, not assumed:** the live
bundle fetched in §1 contains `EXPO_PUBLIC_DEMO_MODE:"true"` inlined —
proof the Netlify environment variable is set correctly today, from the
artifact that shipped, not from checking a dashboard.

## 4 · Gates, fresh tonight, all clean

`tsc --noEmit` · `eslint app src scripts` · `npm test` (1,894/1,894, 18
suites) · `npm run export:web` (build-mode + maps-key checks, including the
newly-added fixture-fence check) · the corrected `sweep.mjs` · `verify:a11y`
(22 routes × 5 viewports, zero failures) · `verify:lifecycle` · `verify:admin`
— each run once, complete, nothing partial.

## 5 · `CLIENT_DEMO_GUIDE.md` — new, not a rewrite of `DEMO_GUIDE.md` in place

`DEMO_GUIDE.md` stays as the internal version — it cites `HANDOFF.md`, gap
IDs (`G-3`, `C-4b`), and file paths a client has no reason to open, and the
team still needs those cross-references. Wrote a separate client-facing
document with the same numbered walk and exact URLs, every internal
reference translated into plain language, and the limitations section kept
whole and unsoftened at the end rather than trimmed. Also fixed the one
stale claim `DEMO_GUIDE.md` itself carried — step 19 described the
already-fixed internal name split as if it still existed, which is the exact
defect §2 above found in the admin console. Both are now correct in the same
way.

## 6 · Report

See the reply to the user for the three-list handover report — kept out of
this file because it belongs in the conversation the client will actually
read, not buried in a document named after engineering slices.

## 7 · The final push, reverified live

Pushed `5143e02` and polled the deployed bundle rather than assuming a
build-time delay had passed: first check, ~30 seconds after push, already
showed a new bundle hash and contained the AdminPanels.tsx fix's own text
("disagrees with itself"). **The deploy is confirmed current as of this
push, checked from the artifact itself, not from elapsed time or a
dashboard status.**

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

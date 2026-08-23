# Platform reconciliation — the customer app against `lctuniversal.us/admin`

**This document changes no runtime configuration.** It records what two systems
each believe, where they disagree, and what a person has to decide before any of
it lands in code. Nothing here has been adopted as a value.

**Status of the panel data:** seen once, as a phone recording of a laptop
screen, in sandbox mode, signed in as a test admin. It is evidence that
something exists. It is not a fact about what a customer is charged, and the
distinction between those two things is the difference between a working app and
one that overcharges somebody.

---

## 1. The two catalogues

| | app / marketing site | operations panel |
|---|---|---|
| **Source** | `lctuniversal.com`, public marketing site | `lctuniversal.us/admin` → Class Builder |
| **In this repo** | `src/config/publishedFleet.ts` | `src/config/observedRateCards.ts` |
| **Confirmed by the business** | **yes**, verbatim | **no** |
| **Read on** | 2026-08-22 | 2026-08-23 |
| **Shape** | "from" figures and quote-only status | full metered rate cards |
| **Classes** | **4** in the app's `VehicleType`, plus 2 site-only classes recorded as having no backend equivalent | **5**, all marked bookable by riders |
| **May be shown to a customer** | yes | **no** — fenced by lint rule and test |

### The app's four classes, as the files actually have them

| `VehicleType` | display name | published label | quote-only |
|---|---|---|---|
| `executive_sedan` | Executive Sedan | From $95 | no |
| `suv` | Luxury SUV | From $110 | no |
| `sprinter` | Mercedes Sprinter | Request Quote | **yes** |
| `coach` | Coach | Request Quote | **yes** |

Plus two classes the site publishes that have no backend equivalent, recorded in
`WEBSITE_CLASSES_WITHOUT_BACKEND_EQUIVALENT` and rendered nowhere:
**Luxury SUV — From $130**, and **First Class Sedan — $150/hour**.

> **Correction to the brief.** The brief described `publishedFleet.ts` as *seven
> classes with "from" prices*. Computed from the file rather than from memory:
> it holds **four** `VehicleType` entries — two priced, two quote-only — plus
> **two** documented site-only classes. That is six named classes, of which four
> are bookable in the app. Not seven. Worth correcting before anything is
> reconciled against a count that is wrong.

### The panel's five classes

| class | tag | example vehicle | base | /mi | /min | min fare | /hr | seats | bags | configured ETA |
|---|---|---|---|---|---|---|---|---|---|---|
| Executive Sedan | POPULAR | Cadillac XT6 or equivalent | $35.00 | $2.80 | $0.55 | $85.00 | $95.00 | 3 | 3 | 30 min |
| Premium SUV | — | Suburban or equivalent | $55.00 | $3.60 | $0.70 | $95.00 | $110.00 | 6 | 6 | 7 min |
| Luxury SUV | VIP | Cadillac Escalade or equivalent | $110.00 | $5.20 | $1.10 | $120.00 | $130.00 | 6 | 6 | — |
| First Class | VIP | Mercedes S-Class or equivalent | $90.00 | $5.00 | $0.50 | $150.00 | $160.00 | 2 | — | — |
| Large Group Transports | GROUP | Freightliner GM40 or equivalent | $190.00 | $5.00 | $1.00 | $350.00 | $190.00 | 40 | — | — |

### Where they overlap, and where they do not

Joined on exact display name — **the only join available**, because the panel
exposes display names rather than identifiers and no mapping has been agreed.
The join is a guess and is labelled as one everywhere it is used.

- **Shared, by name:** Executive Sedan, Luxury SUV.
- **App only:** Mercedes Sprinter, Coach. **Both are already quote-only.**
- **Panel only:** Premium SUV, First Class, Large Group Transports.

**The two shared classes disagree, and not in a consistent direction:**

| class | panel minimum | published "from" | direction |
|---|---|---|---|
| Executive Sedan | $85 | From $95 | published is **$10 above** the panel minimum |
| Luxury SUV | $120 | From $110 | published is **$10 below** the panel minimum |

One published figure sits above its panel minimum and the other below. Whatever
the relationship between these two systems is, **it is not a single markup
rule** — which is precisely why the app must not derive one figure from the
other until somebody answers Q2. Pinned in `tests/catalogueIntegrity.test.ts`.

**A third figure for the same name.** The app's `suv` displays as *Luxury SUV*
and carries *From $110*, while the same file separately records a site class
*Luxury SUV — From $130* as having no backend equivalent, and the panel's
*Luxury SUV* has a $120 minimum. Three different numbers attached to one name,
inside two files and one screen recording. The app may also simply be labelling
its `suv` class with the wrong name. **Not changed** — a catalogue is a business
decision — but it should be the first thing checked when Q2 is answered.

---

## 2. Fields the panel has that this app has no concept of

| field | what the app has instead | consequence |
|---|---|---|
| **per-minute rate** | nothing. `calculateFarePreview()` meters distance **or** hours, never minutes | a fare metered by time cannot be previewed client-side at all |
| **minimum fare** | nothing. No floor anywhere in the client preview | a short journey previews below what the panel would charge |
| **seats / bags** | nothing. No capacity concept in `VehicleType` or the booking flow | the app cannot stop someone booking a 3-seat car for 5 people |
| **per-class configured ETA** | nothing. The app shows no ETA before dispatch assigns a car | see Q7 — and note it is a settings value, not a live estimate |
| **tier tag** (POPULAR / VIP / GROUP) | nothing | no badge concept in the vehicle picker |
| **chauffeur-to-class attachment** | nothing. `Vehicle` has no chauffeur relation | the app cannot say who drives what |
| **booking reference `LX-XXXXXX`** | a UUID `booking.id`, never displayed as a reference | a customer phoning dispatch has no shared identifier — see Q5 |
| **promotions** | `discount_amount` is read off a priced booking; no promo entry exists in the client | a customer with a code cannot enter it |
| **coverage areas** | nothing. `isMapsConfigured()` gates map features, not service area | the app cannot tell a customer they are outside coverage |
| **ratings ownership** | nothing. No rating capture anywhere in the customer app | if the panel expects rider ratings, the app does not collect them |
| **surge zones** | nothing, deliberately — see §4 | |

## 3. Fields this app has that the panel does not obviously carry

"Not obviously" is doing real work: this is one viewing of a recording, and
absence of a field on a screen is not absence from the system.

| field | value in this app | why it matters |
|---|---|---|
| **tiered cancellation windows** | 6 h airport, 12 h point-to-point (`servicePolicy.freeCancellationHours`) | stated to the customer at booking. If the panel enforces a different window, the app is making a promise the business will not keep |
| **complimentary waiting windows** | 30 min standard, 60 min airport | confirmed by the business, and **displayable but not enforceable** — see C-4 |
| **modification cutoff** | 6 h | surfaced on the trip screen before a customer tries |
| **airport as a distinct service type** | drives cancellation window, waiting window and flight-number capture | the panel's classes are vehicle classes; no service-type distinction was visible |
| **"Priced at the moment you book"** | published statement, used verbatim | the whole thesis. It is incompatible with any post-quote adjustment |

### C-4 — still open, and it blocks the waiting policy

There is **no "arrived at pickup" status**. `TripStatus` runs
`pending → confirmed → driver_assigned → driver_arriving → passenger_picked_up →
trip_started → completed | cancelled`. `driver_arriving` means *on the way*, not
*here*.

So nothing marks the moment the waiting clock starts. `bookings.waiting_minutes`
and `waiting_fare` exist in the schema and can never be filled correctly. **The
business has a waiting policy it cannot bill against**, and the panel's existence
does not change that — unless the panel captures an arrival event, which is
Q6/Q8 territory. Full write-up in `BACKEND_FOLLOWUPS.md` C-4.

---

## 4. Surge

The panel has a surge-zones feature. The business has told us there is no surge.
The panel's own wording describes it as flagging busy areas to dispatch and
drivers, **which reads as visibility rather than a multiplier — that reading is a
guess** about someone else's software and is recorded here as Q4, not as a
finding.

What is not a guess is the rule this app already holds, and it is now asserted:

> The quote is computed once, fixed at booking, all-inclusive, and never
> adjusted afterwards.

`tests/quoteIsNotScaled.test.ts` walks the TypeScript AST of every module on the
path from "the quote exists" to "the customer confirms" and fails on any `*`,
`/`, `*=` or `/=` applied to a money-bearing expression. It also fails on any
surge vocabulary appearing in code anywhere under `app/` or `src/`.

**Two things that assertion is honest about.** The one permitted multiplication
is by the literal `100` — dollars to cents, in `fareDiffers()`, so that
`180.06 !== 180.06` cannot fire an interstitial over a float artefact. It is
allowed by the literal rather than by filename, because a file-level exemption
would also permit `total * 100 * 1.5` in the same file. And the assertion is
**client-side only**: the customer is charged what the server decides, and the
server may do anything. What the client guarantees is that it will show both
numbers when they differ rather than silently charging the new one.

**Writing it was easy, and that is itself the finding.** The quote is a single
named object, `draft.allInFare`, created in exactly one place and read in
another. That was the structural fix for audit P0-3 — the vehicle card and the
payment total each recomputing and hoping their inputs matched. Had the fare
still been recomputed per screen, "the quote" would be a different value in every
file and there would be nothing to assert *about*. A correctness fix from four
slices ago is why a pricing-integrity test can exist at all.

---

## 5. Questions, most important first

Nothing below is answerable from this repository. Each one blocks work.

1. **Is `lctuniversal.us/admin` the backend this app is meant to talk to, or a
   separate product the business also runs?** Everything else hangs from this. If
   it is the backend, this app is pointed at the wrong API and the entire data
   model needs reconciling. If it is a separate product, the two catalogues are
   two businesses' worth of pricing and the customer app should keep ignoring it.
2. **Which catalogue is authoritative for what a customer is charged?** The
   marketing site and the panel disagree on both classes they share, in opposite
   directions.
3. **Is the metered rate card the customer quote formula, or an internal cost
   model?** A base + per-mile + per-minute + minimum is a taxi meter. This app
   promises "priced at the moment you book". Those are different products, and
   the answer decides whether the fare preview is rewritten or left alone.
4. **Do surge zones affect price?** If yes, "priced at the moment you book" is
   false as published and the app's central promise has to change. If it is
   dispatch visibility only, nothing changes.
5. **Is `LX-XXXXXX` the reference the customer sees?** If so the app must display
   it — a customer phoning dispatch currently has no shared identifier.
6. **Where do the cancellation and waiting policies live in that system?** The
   app states 6 h / 12 h and 30 min / 60 min. If the panel enforces something
   else, the app is promising terms the business will not honour.
7. **Is the per-class ETA hand-entered or computed?** The panel shows 30 minutes
   for the Executive Sedan and 7 for the larger Premium SUV, which does not look
   computed. If it is a settings field, it must never be shown as an arrival
   estimate.
8. **Does a driver app already exist behind the Driver Apps nav item?** It
   decides whether C-4's "arrived at pickup" is a build or a wiring job — and C-4
   is what makes the waiting policy billable.
9. **Sandbox credentials and API documentation.** Without them this app stays on
   demo data indefinitely, and every answer above stays untestable.

---

## 6. What was done in code, and what was not

**Done**

- `src/config/rateCard.ts` — the rate-card shape, strictly typed, **no values**.
- `src/config/observedRateCards.ts` — the observed table, with its provenance
  stated as unconfirmed in the file itself.
- Containment: an ESLint `no-restricted-imports` rule plus
  `tests/observedRateCardContainment.test.ts`, which also covers lazy
  `require()` and dynamic `import()` that the lint rule cannot see, and pins the
  lint rule's own existence so the guard has a guard.
- `PUBLISHED_FLEET_SOURCE` now names `lctuniversal.com`, the read date, and
  `confirmedByBusiness: true`, so the two files cannot be confused.
- `tests/quoteIsNotScaled.test.ts` — the surge assertion.
- `tests/catalogueIntegrity.test.ts` — the invariant that survives whichever
  catalogue wins, plus the observed comparison as a tripwire.

**Deliberately not done**

- **No class added or deleted.** A catalogue is a business decision.
- **No customer-facing price or class value changed.** Zero.
- **No mapping invented** between the app's four classes and the panel's five.
  Display-name matching is used only inside tests and this document, and is
  labelled a guess at every use.
- **No quote-only change.** The two app classes with no panel counterpart —
  Mercedes Sprinter and Coach — are already quote-only, so the treatment 9B
  called for turned out to require no code at all. Computed, not assumed.

# Open questions

**Sixteen before. Eleven now.** `lctuniversal.com` was re-read from primary
source on **2026-08-26** — every page, directly, not from any transcription —
and it closed seven. Two more were added on **2026-08-30** and **2026-08-31**,
from repository questions rather than site ones.

Each question below says **what was checked** and **why it did not settle it**.
Nothing here can be answered from inside this repository.

---

## 1 · May the app display your aggregate rating? **Nobody has asked you.**

The home screen was showing **"4.93 from 55 reviews"** — real figures, read by
hand from a third-party reputation dashboard on 2026-08-22, with a source and a
date. Not invented.

`lctuniversal.com/reviews`, read 2026-08-26, says:

> "LCT Universal only publishes verified reviews from our own clients. As we
> collect and verify them, they will appear on this page."
> **"Rather than publish placeholder quotes, we choose to leave this page
> honest."**

**What that sentence actually says:** the site declines to publish **fabricated
testimonials**, and no verified reviews are published there yet.

**What it does not say:** that you have decided against stating your rating. An
aggregate from your own dispatch system is not a placeholder quote, and it is
entirely possible you would be happy to publish 4.93 from 55 real rides and
simply have never been asked. Reading "we will not invent testimonials" as "we
have chosen not to state our rating" is a reasonable guess, and it is still a
guess.

**Action taken, pending your answer:** the line is **not currently rendered**.
The app was making a claim about the business that the business had not made
about itself, and while that is unresolved the conservative direction is not to
make it. The constant is kept with both dates in `src/config/reputation.ts`.

**The question:** may the app display the dashboard aggregate? If yes, one
sentence restores it. If you would rather it came from somewhere else, name the
source. **Nobody has said no — nobody has asked.**
**Owner:** the business.

---

## 2 · Which of your two published names should the $110 class use?

**Not** "is the current name wrong" — that part is settled and fixed. The app
called its **$110** class *"Luxury SUV"*, and both your pages reserve that name
for the **$130** class. It was wrong under either naming, so it was changed to
**"Executive SUV"** on 2026-08-28. **The price did not move.**

`/fleet` was chosen because it is the catalogue — the page whose job is naming
the classes — while `/rates` is a pricing page that happens to list them. It is
one line to change and `src/lib/vehicleImages.ts` records both candidates, both
source pages and the date.

**Checked:** `/fleet` and `/rates`, both read 2026-08-26.

They publish the **same prices and capacities under different names** for four
of seven classes:

| price | `/fleet` | `/rates` |
|---|---|---|
| From $95 | Executive Sedan | Sedan |
| **From $110** | **Executive SUV** | **SUV** |
| From $130 | Luxury SUV | Luxury SUV |
| Request Quote | Executive Mini Coach | Mini Coach |
| Request Quote | Executive Coach | Motor Coach |

**Why this does not settle it:** neither page is marked authoritative, and they
disagree.

**The question is one word:** should the $110 class read **"SUV"** or
**"Executive SUV"**? A choice between your own two pages, not a pricing
decision. The app currently shows `/fleet`'s.

**A second, smaller one while you are there:** the same disagreement covers your
two coach classes — `/fleet` calls them *Executive Mini Coach* and *Executive
Coach*, `/rates` calls them *Mini Coach* and *Motor Coach*. The app collapses
both into one quote-only `coach` class, so nothing is mispriced, but whichever
naming you settle on should be the one both pages use.
**Owner:** the business.

---

## 3 · Is `lctuniversal.us/admin` the backend this app should talk to?

**Checked:** the whole public site. It links to a **Client Login** but nothing
describes a reservation system, an API, or a relationship between the two
products.

**Why this does not settle it:** a login link is not an integration contract.
Everything else about connecting this app to real data hangs off the answer.
**Owner:** the client. Answer this one first.

---

## 4 · Which catalogue is authoritative for what a customer is charged?

**Checked:** `/rates` states *"Every class below is confirmed directly from our
live reservation system — not an estimate"* and *"calculated instantly through
our live booking system"*.

**Why this does not settle it:** it says the site's figures come from a live
system, but the operations panel's five metered rate cards do not match the
site's seven "from" prices, and the site never names which system it means.
**Owner:** the business.

---

## 5 · Is the panel's metered rate card the customer quote formula, or an internal cost model?

**Checked:** `/rates` — *"Rates vary by vehicle type, trip distance, and service
type"* and *"Final pricing may vary by service type, route, date, duration and
vehicle availability."*

**Why this does not settle it:** that describes a variable fare, which is
consistent with both a customer-facing meter and an internal cost model. The
base + per-mile + per-minute + minimum structure appears nowhere on the site.
**Owner:** the business.

---

## 6 · Do surge zones affect price?

**Checked:** every page. **Surge is mentioned nowhere on the site**, and
`/rates` says *"Priced at the moment you book."*

**Why this does not settle it:** the panel has a surge-zones feature. Silence on
the site is consistent with "there is no surge" and with "it exists and is not
advertised". The app's fixed-fare promise depends on the answer.
**Owner:** the business.

---

## 7 · Is `LX-XXXXXX` the reference the customer sees?

**Checked:** the whole site. No booking-reference format appears anywhere.

**Why this does not settle it:** the app has UUIDs and the panel shows
`LX-XXXXXX`. A customer phoning dispatch currently has no shared identifier.
**Owner:** the business.

---

## 8 · May a chauffeur see what a job pays?

**Checked:** the whole site, including `/join-our-team`. Nothing states whether
chauffeurs are employees or contractors, or what they see.

**Why this does not settle it:** it is a contracting decision, not a published
fact. The chauffeur view therefore shows **no money at all** — no fare, no
earnings, no per-job total, and no empty space where one would go.
**Owner:** the business.

---

## 9 · Does an hourly product with included mileage exist, or should one?

**Checked:** the FAQ — *"Book any vehicle by the hour with as-directed service:
same driver, multiple stops, **no meter to watch**."*

**Why this half-settles it:** the site's hourly product is explicitly **not**
metered, which is consistent with the app's fixed fare. So nothing needs to
change today, and the competitor's "40 km included, extra distance charged"
model is **not** what LCT sells.

**What remains:** whether the business *wants* that model. It would change the
fixed-fare promise the app is built on, so it is a decision rather than a
feature.
**Owner:** the business.

---

## 10 · Are `lct-universal-driver-app` and `lct-universal-admin-dashboard` live products, or superseded by this repo's role fence?

**Not a site question — a repository one**, added while reconciling this repo
against a consolidated build brief on 2026-08-30.

Three sibling repos sit next to this one: `lct-universal-backend`,
`lct-universal-driver-app`, and `lct-universal-admin-dashboard`. But this repo
already implements the chauffeur and operator roles itself — `app/_role/`
(`chauffeur.tsx`, `dispatcher.tsx`, `admin.tsx`, `job.tsx`, `ride.tsx`,
`status.tsx`), a role fence verified by absence from a customer build's shipped
bytes (`verify-build-mode.mjs`), and an exhaustive role-to-account mapping in
`accountRole.ts` — matching the brief's "three roles, one login" description
almost exactly.

**Checked:** both sibling repos' git history. `lct-universal-driver-app`'s last
commit is 2026-08-19 ("Phase 1: Add client demo mode with full trip
simulation"); `lct-universal-admin-dashboard`'s is 2026-08-20 ("Build Trips,
Drivers, Fleet, Customers, and Support management pages"). This repo's
role-fenced chauffeur/operator work postdates both — the commit introducing it
is titled "Parts 1 and 2: chauffeur and operator are roles on an account."

**Why this does not settle it:** a later commit date is consistent with this
repo's approach having superseded the two standalone ones, and equally
consistent with three separate efforts nobody has reconciled. Building further
role-console features here without knowing which is authoritative risks
duplicating — or contradicting — real work sitting in either sibling repo.
**Owner:** whoever owns the repository layout decision.

---

## 11 · Is continued investment in this mobile rebuild still the priority?

**Not a repository-identity question — a resourcing one**, surfaced while
comparing this repo against `LCT-Universal-Vite-Ready-v2` on 2026-08-31 (see
`SLICE_REPORTS.md`, Part A).

That sibling repo is a **live, deployed website** — real Google Ads spend, a
working customer login, Netlify Functions running an AI concierge — reading
and writing the same shared Supabase project this repo does. This repo is an
extensively audited, gated, and documented **native app rebuild** with no
backend connection, no real authentication, and nothing verified on a device.

**Checked:** both repos' git history and gates (see Part A). Nothing in either
repo states whether the business still wants the native app, wants it on a
different timeline, or has reprioritised toward the site that is actually
serving customers today.

**Why this does not settle it:** effort and audit depth are not the same as
priority. A thorough answer to the wrong question is still the wrong question.
**Owner:** the business.

---

# What the site closed

Seven questions, gone.

| was asked | what the site said |
|---|---|
| Where do the cancellation windows live, and are the app's right? | `/cancellation-policy` publishes 12 h sedans & SUVs, 6 h airport, 48 h hourly & events, 6 h modifications. **Every figure in `servicePolicy.ts` matches.** The fee tiers beyond the free window are now recorded too |
| What are the coverage areas? | `/service-areas` publishes the DFW Metroplex and Grapevine with a named city list |
| Is meet-and-greet a service, and does it cost extra? | Yes, and it is a **preference**: "a uniformed chauffeur meets you curbside or at baggage claim, depending on your preference". No separate charge stated |
| Is flight tracking real? | Yes — "We monitor your inbound flight and adjust pickup accordingly" |
| How is payment handled? | "The total fare must be authorized before the scheduled pickup time" — consistent with the app's fixed, pre-authorised fare |
| Is hourly metered with overage? | No — "no meter to watch" |
| What is the service area? |  publishes 57 communities in three named regions, read in full 2026-08-26 and now shown in the console Coverage panel. It does NOT gate booking — the site says availability is confirmed per trip |
| Is the fleet's luggage capacity published? | Yes, on `/rates`: Sedan 3/2, SUV 6/6, Luxury SUV 6/6, First Class 2/2, Sprinter 14/10 |

**One conflict surfaced by the closure:** the demo Executive Sedan carries
`capacity_luggage: 3` against the site's **2 bags**. Capacity is served by the
API, not by `publishedFleet.ts`, so it is recorded rather than changed —
`BACKEND_FOLLOWUPS.md` §6.4 already tracked the capacity mismatch and now has a
primary source and a date.

**And the waiting policy is still not on the site.** The FAQ says only "we
accommodate reasonable delays without additional charge", with no minutes
anywhere. The 30/60 figures stay business-confirmed rather than site-published —
the site does not contradict them.

---

## 12 · What vehicle IS the Executive SUV? The image on its card is an Escalade

**Found by opening the file rather than reading the filename** — the same way
the class name was found, one layer down.

`VEHICLE_DISPLAY_NAME.suv` was corrected to **Executive SUV** (From $110) on
2026-08-28. It still points at `assets/vehicles/luxury-suv.jpg`, and that file
**is a Cadillac Escalade** — confirmed visually: Cadillac crest, Escalade
proportions.

**Why that is a problem.** The only recorded association of "Escalade" with any
class is the operations panel's **Luxury SUV**, the **$130** class — and the
app's own demo description, *"Cadillac Escalade or equivalent"*, which almost
certainly came from the same place.

**Checked against the site, 2026-08-30:** `/fleet` and `/rates` name **S-Class**
and **Sprinter** and nothing else. **Neither page names a make for either SUV
class.** So there is no published source saying what an Executive SUV is.

So the $110 card may be showing the $130 class's vehicle. Not changed — an
image and a description are customer-facing class values, and there is nothing
published to change them *to*.

**The question:** what make and model is the Executive SUV, and what is the
Luxury SUV? One line each settles the image, the description and the remaining
half of question 2.
**Owner:** the business.

---

## 13 · Are the vehicle images LCT's own cars?

Three of the four are studio renders on a black background. The fourth —
`coach.jpg` — is a real photograph of a chauffeur in front of a black motor
coach, wearing what appears to be an LCT lapel pin. **The set is inconsistent in
provenance**, and two of the renders have specific problems:

- **`executive-sedan.jpg`** — a Mercedes S-Class, correct for the class, but on
  **gold aftermarket wheels**. That reads as a customised car, not discreet
  executive transport, and it is the opposite of the restraint the brand is
  built on.
- **`sprinter.jpg`** — a Mercedes Sprinter, but a **cargo/panel van**: solid
  side panels, one small window strip, steel wheels. The class it illustrates
  is *Executive Sprinter, 14 passengers*. The van in the picture visibly cannot
  carry them.

**The question:** may we use LCT's own photography? The coach image suggests it
exists. If it does not cover every class, that is a conversation about a
photographer — and a better use of the budget than another week of code.
**Owner:** the business.

---

## 14 · Three requests, one rule underneath them

The same collision was found twice from opposite directions — once from a
competitor's calendar control, once from an operator's reschedule button. It is
worth stating once as a rule rather than twice as an observation:

> ### A change to a booking's time is a NEW QUOTE, never an edit to an existing one.

The fare is fixed at booking and all-inclusive. Move the pickup and the
late-night surcharge may apply or stop applying — a Monday 05:00 airport run and
a Monday 14:00 one do not cost the same. So anything that moves a time produces
a different fare, and a different fare is a different quote.

`tests/quoteIsNotScaled.test.ts` already forbids a quoted fare being scaled
after the fact. This rule is the same promise stated forwards: **the app may
issue a new quote, and may never revise an old one.**

That rule settles all three of the following before they are designed.

### 14a · Recurring or repeat booking — a decision

Never raised by anyone in this project; found by comparing against the
competitor's app. Plausible for a corporate chauffeur business — the same
airport run every Monday.

**It is not "repeat this booking".** Under the rule above it is *create N
bookings, each quoted at its own date*, which changes what the customer is
agreeing to and what the confirmation says. A design decision before it is a
feature.
**Owner:** the business.

### 14b · Operator reschedule — a decision, same rule

Their panel does it; ours does not. Changing a ride's time is a re-quote, so a
reschedule is *cancel and rebook at the new price*, not an edit — and somebody
has to decide who absorbs a difference when the new price is higher.
**Owner:** the business.

### 14c · Operator cancel — not a decision, just work

Cancel moves no time and re-quotes nothing, so the rule does not bite. The path
`demoApi` already uses for a customer cancellation is the same one an operator
would use, and `servicePolicy` already carries the published windows and the fee
tiers.

**Roughly an afternoon.** The only open part is whether an operator cancelling
on a customer's behalf should be able to waive a fee — which is a policy
question, not an engineering one.
**Owner:** the business for the waiver; otherwise ready to build.

**Update, 2026-09-01 — the CUSTOMER cancel is now built, and it makes one half
of this question sharper.** `CancelConfirm` states the real free window for
that ride's service type before the customer confirms, and states **no fee
figure at all** when the window has passed — it says the window has passed and
gives the dispatch number. That is deliberate and it is the conservative
choice, but it means a customer cancelling late is told less than
`lctuniversal.com/cancellation-policy` already publishes.

So the open question is now two, not one:

1. **May the app assert a charge?** The tiers are recorded in `servicePolicy.ts`
   as `CANCELLATION_FEE_TIERS_PUBLISHED` and are rendered nowhere. Printing a
   figure above a confirm button is a commitment, and nobody has made it.
2. **Who may waive it?** — the original question above, unchanged.

Until (1) is answered the app under-states rather than over-states, which is
the right way round to be wrong.
**Owner:** the business, for both.

### And create-a-booking stays reported, not built

An operator taking a booking over the phone is as common as assigning one, and
the console has every input it needs. Done properly it calls the same
`POST /bookings` the customer flow calls, so **the fare is quoted from the same
source by construction** rather than reimplemented.

What stops it being a task is not difficulty: it makes the console a **second
writer**, and every write is a place the demo can diverge from what a customer
sees. That is a scope decision.
**Owner:** the business.

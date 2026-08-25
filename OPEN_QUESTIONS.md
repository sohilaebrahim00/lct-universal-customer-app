# Open questions

**Sixteen before. Nine now.** `lctuniversal.com` was re-read from primary source
on **2026-08-26** — every page, directly, not from any transcription — and it
closed seven.

Each question below says **what was checked** and **why it did not settle it**.
Nothing here can be answered from inside this repository.

---

## 1 · The app was publishing a rating the company's own site declines to publish

**This one is new, it is customer-facing, and it has already been acted on.**

The home screen showed **"4.93 from 55 reviews"** — real figures, hand-read from
a third-party reputation dashboard on 2026-08-22, with a source and a date.

`lctuniversal.com/reviews`, read 2026-08-26, says in the company's own words:

> "LCT Universal only publishes verified reviews from our own clients. As we
> collect and verify them, they will appear on this page."
> **"Rather than publish placeholder quotes, we choose to leave this page
> honest."**

So the business has no verified reviews to publish yet and has deliberately
chosen not to imply otherwise, while its app was implying otherwise on the first
screen a customer sees.

**Action taken:** the line is **no longer rendered**. The constant is kept with
both dates in `src/config/reputation.ts`. Removing a claim is the safe
direction; restoring it needs one sentence.

**The question:** may the app publish the dashboard rating, given the site does
not? If yes, say so and it goes back. If the figure should come from somewhere
else, name the source.
**Owner:** the business.

---

## 2 · The $110 SUV class carries the $130 class's name — and the site contradicts itself

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

**But it does sharpen it.** Both pages reserve **"Luxury SUV"** for the **$130**
class. The app displays its **$110** class as "Luxury SUV"
(`VEHICLE_DISPLAY_NAME.suv`), which is wrong under *either* naming. That part is
no longer ambiguous.

**The question is now only:** should the $110 class read **"SUV"** or
**"Executive SUV"**? A choice between your own two pages, not a pricing
decision.
**Not changed here** — a class name is a customer-facing value.
**Owner:** the business. One word.

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

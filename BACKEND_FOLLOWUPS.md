# Backend follow-ups

Changes the customer app needs that cannot be made in the presentation layer.
Each names the exact fields, why they exist, and what the app does in the
meantime. Nothing here is implemented by the redesign; nothing here is faked.

---

## 1. Vehicle identification — plate, colour, make/model

**Priority: high. This is a safety feature, not decoration.**

### What I checked, and how

Not the TypeScript mirror — the backend itself, at
`../lct-universal-backend`. The trip-detail join is explicit
(`src/modules/trips/repository.ts`):

```sql
select p.id, p.full_name, p.avatar_url, d.rating
  from drivers d join profiles p on p.id = d.id

select name, type from vehicles where id = $1
```

So `src/types/api.ts`'s `TripDriverInfo` and `TripVehicleInfo` are **accurate,
not stale**. The API returns exactly what it declares.

### The actual finding is bigger than a missing column

`db/migrations/0002_vehicles.sql` defines `vehicles` as:

```
id · type · name · description · capacity_passengers · capacity_luggage
base_rate · per_mile_rate · per_hour_rate · image_url · is_active
```

That is a **vehicle CLASS table** — a fare tier ("Executive Sedan", "Luxury
SUV", "Sprinter") carrying rates and capacities. It is not a physical car.

A licence plate belongs to a physical car. **There is no fleet-inventory table in
this schema at all**, so a plate cannot simply be added to `vehicles` without
changing what that table means and breaking pricing, which joins on it.

This is therefore not "add three columns". It is one of two decisions:

**Option A — a new `fleet_vehicles` table** (recommended). Physical cars, each
referencing its class:

```sql
create table fleet_vehicles (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references vehicles (id),   -- the fare class
  plate         text not null,
  colour        text not null,
  make          text not null,
  model         text not null,
  year          int,
  is_active     boolean not null default true
);
alter table trips add column fleet_vehicle_id uuid references fleet_vehicles (id);
```

`trips.vehicle_id` keeps its current meaning for pricing; `fleet_vehicle_id` is
what dispatch assigns and what the rider is shown. Then extend the existing join
in `getTripDisplayInfo` to return them.

**Option B — denormalise onto `trips`.** Add `assigned_plate`, `assigned_colour`,
`assigned_make`, `assigned_model` directly to `trips`, set at assignment time.
Cheaper, no new table, no fleet management — but the same car's details are
re-typed on every trip and cannot be corrected centrally.

### Why it matters

Uber's documented accessibility failure is that blind riders avoid rides because
they cannot reliably confirm which car is theirs. The whole point of the trip
screen's chauffeur row is that a rider can match what the app says to the car in
front of them, and that a screen-reader user can hear it as **one utterance**:
"Your chauffeur Daniel A., black Mercedes S-Class, plate 8XKL294."

With `{ name, type }` alone, the best that sentence can be is "Your chauffeur
Daniel A., Executive Sedan" — which identifies a price tier, not a car.

### What the app does until then

- Renders the chauffeur row from what is actually returned: name, avatar,
  vehicle class name. **No placeholder plate is printed**, and the design's
  "Black S-Class · 8XKL294" line is not reproduced with invented values.
- `describeVehicle()` (`src/lib/vehicleIdentity.ts`) assembles the one-utterance
  accessibility label from whatever fields are present, so it becomes correct
  automatically when the fields arrive — no screen changes needed.

---

## 2. Chauffeur tenure

Correction 8 replaced the star rating on the chauffeur hero with tenure — right
call, and rating a chauffeur implies the client might get a bad one, which is
precisely what Blacklane and Wheely remove.

**The field does not exist.** `db/migrations/0005_drivers.sql` has
`license_number`, `license_state`, `status`, `current_vehicle_id`, `rating`,
location columns, and `created_at`.

`created_at` is the row's creation date, not a hire date. A driver added to the
system last month after six years of service would read "0 years with LCT".
Deriving tenure from it would be a fabricated service claim, so the app does not.

**Needed:** `alter table drivers add column hired_at date;`

Exposed on the trip-detail join as `hired_at` (let the client compute years, so
it stays correct without a re-fetch).

**Until then:** the chauffeur row shows name and vehicle only. It does *not* fall
back to the star rating — that decision stands independently of this gap.

---

## 3. Saved-card selection inside the booking PaymentSheet

Already documented in the repo's own `README.md` and still true. Stripe's
`PaymentSheet` only lists a customer's saved cards when initialised with a
customer ID and an ephemeral key, which needs an endpoint that does not exist.

**Needed:** `POST /payments/ephemeral-key` returning `{ customerId, ephemeralKey }`.

**Until then:** the Account tab can save a card; the booking flow's sheet cannot
preselect it.

---

## 4. Recent locations

The pickup sheet can offer **saved** locations today — those already exist via
`GET /profiles/me/saved-locations` and are pure client work.

Genuine recents (the last N distinct pickup/drop-off addresses) have no endpoint.
They can be approximated client-side from `GET /bookings`, which is what slice 4
will do, but that is bounded by whatever page of bookings the client holds.

**Needed (optional):** `GET /profiles/me/recent-locations?limit=5`.

---

## 5. Re-book from a past trip

Home's "Book again" rows reconstruct a booking draft client-side from a past
`Booking`. That works and needs nothing.

A server-side `POST /bookings { duplicateOf }` would be cleaner and would let the
backend re-validate the route and re-price in one call, but it touches booking
creation, which this pass does not.

---

## 6. The website and the backend publish different prices

**Priority: high, and this one is a business problem before it is an engineering
one.**

The website is what the business advertises to customers. The backend is what it
charges. They do not agree.

### Website — `LCT-Universal-Vite-Ready-v2/lct_migrate/src/lib/site-data.ts`, `VERIFIED_LIVE_VEHICLE_CLASSES` (lines 281-289)

| Class | pax | bags | Published |
|---|---|---|---|
| Sedan | 3 | 2 | From $95 |
| SUV | 6 | 6 | From $110 |
| Luxury SUV | 6 | 6 | From $130 |
| First Class Sedan | 2 | 2 | $150/hour |
| Executive Sprinter | 14 | 10 | Request Quote |
| Mini Coach | 39 | — | Request Quote |
| Motor Coach | 56 | — | Request Quote |

### Backend — `lct-universal-backend/db/seed.sql`

(`0002_vehicles.sql` defines only the columns; the rates are in the seed.)

| Class | pax | bags | base | per mile | per hour |
|---|---|---|---|---|---|
| Executive Sedan | 3 | 3 | $65.00 | $3.25 | $100.00 |
| Executive SUV | 6 | 6 | $85.00 | $3.75 | $120.00 |
| Sprinter Van | 14 | 14 | $150.00 | $4.50 | $200.00 |
| Coach / Custom | 40 | 40 | $400.00 | $6.00 | $250.00 |

### The four conflicts

1. **The advertised floor is not enforced.** The site promises "From $95" for a
   Sedan. The backend's minimum possible charge is base $65 plus 20% gratuity and
   8.25% tax = **$83.36** — below the advertised floor. A short trip is quoted
   under what the site says it starts at. (Executive SUV is the same shape:
   $109.01 minimum against a published "From $110".)

   **Deliberately not patched in the app.** A minimum clamped in the client while
   the backend still computes below it would make the screens agree with the
   website while the invoice did not — hiding the gap rather than closing it.
   Whichever number is right, the fix belongs in the rate card or the pricing
   function, not in a display rule.
2. **The one explicit hourly rate on the site exists nowhere in the backend.**
   "First Class Sedan $150/hour" has no backend class at all, and the backend's
   sedan hourly rate is $100.
3. **Quote-only versus computable.** The site marks Executive Sprinter, Mini
   Coach and Motor Coach "Request Quote". The backend prices all of them. The app
   would commit to a fixed number for vehicles the business says it will not
   quote without asking.
4. **Capacities differ**: Sedan 2 bags vs 3; Sprinter 10 bags vs 14; the site's
   Motor Coach carries 56 where the backend's Coach carries 40. The site also
   lists 7 classes to the backend's 4.

### Why it matters

**In one sentence: a customer quoted a price on the website and charged a
different price by the booking system can be given two different numbers for the
same journey, and the fixed-price promise cannot hold until the two agree.**

The entire fixed-price promise this redesign is built on — the number on the
vehicle card is the number charged — cannot hold while a customer quoted from the
website is charged from the database. Whichever source is wrong, they have to be
made one source.

**Not reconciled here.** Picking the more convenient number would hide the
problem rather than solve it.

**What the app does meanwhile:** the Fleet browse screen shows the website's
published starting price, because a floor is the right thing when browsing. The
booking flow shows a computed all-in total from the backend rates, because those
are the only rates that define a computation. No per-mile rate has been derived
backwards from a headline figure.

---

## Business inputs still pending

Not engineering work — questions only LCT can answer. Each renders nothing in the
app until it is answered.

| # | Question | Where it lands |
|---|---|---|
| B1 | **What is the complimentary waiting time**, per service type (standard vs airport)? | `servicePolicy.complimentaryWaitMinutes` — the destination sheet's airport note and the confirmation screen |
| B2 | **Does the Airport page's existing claim match it?** That page markets "Complimentary Waiting Time" with no figure. The copy has been left exactly as written — it is LCT's own marketing, and a benefit stated without a number is not a fabricated number. But it should not stay unquantified once B1 is answered. | `app/(app)/airport.tsx` |
| B3 | **Who owns the rating figure, and how often is it refreshed?** Home shows "4.93 from 55 reviews", read by hand from the Clienity reputation dashboard on 2026-08-22 and frozen in a constant with its source and read-date. It is a SNAPSHOT: there is no reviews endpoint and no integration, so it will silently go stale. Either re-read it before each release, or expose it from the backend and delete the constant. | `src/config/reputation.ts` → `src/components/home/HomeView.tsx` |

Resolved since the first list: the free-cancellation window (published and
tiered — 12h sedans and SUVs, 6h airport, 48h hourly and events) and the
dispatch phone (+1 888 615-4065). Both now render.

---

## Not a backend gap

Recorded so it is not re-litigated: the **fare parity check** in slice 7 has both
halves available locally — `src/lib/pricingPreview.ts` here and
`src/modules/bookings/pricing.ts` in `../lct-universal-backend`, plus that
repo's own `tests/pricing.test.ts`. The comparison can be made line by line
rather than inferred, and does not need a running server.

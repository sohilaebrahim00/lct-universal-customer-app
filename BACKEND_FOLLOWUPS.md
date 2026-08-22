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

## Not a backend gap

Recorded so it is not re-litigated: the **fare parity check** in slice 7 has both
halves available locally — `src/lib/pricingPreview.ts` here and
`src/modules/bookings/pricing.ts` in `../lct-universal-backend`, plus that
repo's own `tests/pricing.test.ts`. The comparison can be made line by line
rather than inferred, and does not need a running server.

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

> **Correction, added while building the role preview.** An earlier version of
> this section said the plate and colour columns did not exist. They do:
> `db/migrations/0022_vehicle_plate_color.sql` adds `license_plate` and `color`
> to `vehicles`, nullable, and `listTripsForDriver` already selects them. Make
> and model still exist nowhere.
>
> This does not weaken the recommendation — it strengthens it. 0022's own
> comment concedes the problem: the columns are nullable because "existing
> seeded rows represent a fleet *class*, not a specific plated vehicle". So the
> plate was bolted onto the class table, every row leaves it null, and a fleet
> with two Escalades cannot represent them. **Option A is now also a cleanup**:
> move `license_plate` and `color` to `fleet_vehicles`, where one row means one
> car, and drop them from `vehicles`.

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

## 7. Role preview — every field the chauffeur and dispatcher views could not get

**This section is the starting specification for two products LCT does not have:
a chauffeur app and a dispatcher tool.** It was produced by building a working
preview of both against the real data model and writing down everything the
screens asked for and could not have.

You do not need to have read anything else in this file, or any conversation, to
act on it. Each entry says what the screen wanted the field for, what exists
today, and what would have to change.

Read alongside §1 (vehicle identification), which the chauffeur view hits again
from the other side.

### Where the preview lives

`app/_role/` (routes) and `src/dev/role/` (screens), reachable only in a demo
build — Account → Role preview. Absent from any non-demo production bundle; see
`metro.config.js`. It reads and writes the same in-memory demo store the client
app uses, which is how a ride booked in the client app appears on the board, and
how a status the chauffeur sets reaches the client's tracking screen.

### What already exists, and is better than expected

Worth stating first, because it changes the size of the job:

| Already built | Where |
|---|---|
| A `driver` role, and a `dispatcher` role | `0012_admin_dispatcher_role.sql` |
| `GET /drivers/me/trips` — a driver's trips with client name, phone, notes, fares, vehicle name, plate, colour | `src/modules/drivers/repository.ts` → `listTripsForDriver` |
| `PATCH /trips/:id/status` — driver-authenticated status transitions, guarded by a real state machine | `src/modules/trips/routes.ts` |
| `POST /admin/trips/:id/assign-driver` — assignment, with the transition to `driver_assigned` applied in the same request, plus notifications to both parties and an audit record | `src/modules/admin/routes.ts` |
| `GET /admin/bookings`, `GET /admin/trips/active`, `GET /admin/drivers/online` | `src/modules/admin/repository.ts` |
| Driver location heartbeat, online/offline status, working hours, break mode, document upload and review | `0017`, `0021`, `0023`, `0024` + `drivers/routes.ts` |
| A trip row is created with every booking, so a booking is assignable from the moment it exists | `bookings/repository.ts` |

Neither product is a greenfield backend project. Both are mostly a client on top
of endpoints that exist. What follows is the remainder.

---

### Chauffeur view

#### C-1 · Name-sign text — **no field exists**

*What the screen wanted it for.* The job-detail screen shows, in the largest type
in the preview, the text the chauffeur holds up at arrivals. It is the field that
makes the screen feel like it was built by someone who understands the business.

*What exists.* `bookings.primary_passenger_name` (nullable) and
`profiles.full_name`. The preview derives the sign from the first, falling back
to the second, and uppercases it. That is a rendering of a real field, not a new
fact — but it is not sufficient.

*Why it is not sufficient.* A client cannot ask for the board to read their
company name instead of a person's, cannot give a different name to the booker's,
and cannot supply a spelling or a script the booking form does not accept. Today
the only way to communicate any of that is free text in `special_requests`, where
the chauffeur has to notice it.

*What would change.* `bookings.name_sign_text text` — nullable, offered in the
booking form for airport and event services, defaulting to the passenger name.
Then a real greeting flag, since a sign is only held when someone is meeting
inside: see C-3.

#### C-2 · Which physical car — **see §1**

*What the screen wanted it for.* The chauffeur is told to drive "Executive SUV",
which is a fare class, not a car. In a fleet with more than one SUV that does not
identify a vehicle.

*What exists.* `vehicles.license_plate` and `vehicles.color` (0022), null on every
row because `vehicles` is a class table. No make, no model, anywhere.

*What would change.* The `fleet_vehicles` table in §1 Option A, and
`trips.fleet_vehicle_id`. `GET /drivers/me/trips` already selects the plate and
colour, so it starts returning real values the day the table is populated.

#### C-3 · Meet-and-greet — **no field exists**

*What the screen wanted it for.* Whether to park and walk into the terminal or
wait at the kerb. It changes when the chauffeur leaves and what they do on
arrival, and it is the difference between a service the client paid for and one
they did not receive.

*What exists.* Nothing. `app/(app)/airport.tsx` markets meet-and-greet, and the
backend FAQ mentions it, but no booking carries it. In the preview it can only
appear because a demo booking happens to mention it in its notes.

*What would change.* `bookings.meet_and_greet boolean not null default false`,
set by the airport booking flow, plus the pricing decision that goes with it
(included, or a surcharge — `surcharges` exists and is unused for this).

#### C-4 · "Arrived at pickup" — **no status exists.** The largest single gap found

*What the screen wanted it for.* The status screen advances a job one legal step
at a time. The four steps the brief asked for were *on the way, arrived,
passenger on board, dropped off*. The second cannot be built.

*What exists.* The `trip_status` enum runs `pending → confirmed →
driver_assigned → driver_arriving → passenger_picked_up → trip_started →
completed`. `driver_arriving` means *en route*. There is no state between
"driving there" and "the passenger is in the car".

*Why it matters more than it looks.* Three things hang off it:

1. **The client's "your car is here" moment.** The tracking screen cannot say the
   car has arrived, because nothing can tell it.
2. **Wait-time billing does not work.** `bookings.waiting_minutes` and
   `waiting_fare` exist (`0015_booking_pricing_extensions.sql`) and default to
   zero. Nothing can start the clock, because the clock starts when the car
   arrives. **These columns are currently unfillable.**
3. **THE BUSINESS HAS A WAITING POLICY IT CANNOT BILL AGAINST.** This is now the
   strongest argument for building C-4, and it changed while this document was
   being written.

   The complimentary wait is no longer an open question. It is confirmed
   published policy — **30 minutes on standard pickups, 60 on airport** — and
   the app states it on the payment screen, the confirmation screen and the
   airport page, resolved per service type.

   So the promise is on screen and the mechanism behind it does not exist. The
   app can **display** the policy because it is real; it can never **enforce**
   it, because nothing marks the moment the clock starts. Concretely:

   - a chauffeur who waits 90 minutes at DFW has 30 chargeable minutes, and
     there is no way to record that a single one of them happened;
   - `waiting_minutes` and `waiting_fare` stay zero on every booking forever;
   - a customer disputing a wait charge cannot be shown when the car arrived,
     because nobody can say.

   Until C-4 lands, every minute of paid waiting time in the business is either
   uncharged or charged outside the system. That is a revenue argument, not an
   engineering preference, and it is a stronger case than the accessibility one
   above.

*What would change.* Add `driver_arrived` to the `trip_status` enum between
`driver_arriving` and `passenger_picked_up`, and the corresponding edge in
`ALLOWED_TRANSITIONS` (`src/modules/trips/state-machine.ts`). Stamp
`trips.arrived_at`. Derive `waiting_minutes` from `arrived_at → picked_up_at`.
This is a small change with a large payoff and should be near the front of the
queue.

#### C-4b · **`bookings` carries no timezone** — so no screen can render the pickup's local time

*What the screen wanted it for.* Every time a customer reads: the receipt's
"completed at", the trip list, the confirmation. §8 below settles what the
**arithmetic** should do — the pickup location's zone governs the late-night
surcharge, as an IANA identifier and never an offset. **This is the other half
of that, and it is a missing column rather than a missing decision.**

*What exists.* `bookings.scheduled_at` is a timestamp and nothing else. There is
no `pickup_timezone`, and `Booking` in `src/types/api.ts` declares none.

*The consequence, which is concrete.* The client has no zone to render in, so it
renders in the **device's**. A traveller landing at DFW with a phone still on
London time reads a 7:40 PM Dallas pickup as 1:40 AM. The number is wrong, it
looks authoritative, and nothing on the screen tells them which clock it is.

*What was NOT done about it, deliberately.* The ride-lifecycle slice needed to
render an arrival time and had two options: default to `America/Chicago` because
the fleet operates in Dallas–Fort Worth, or render device-local and say so. It
renders device-local. **Defaulting would have been inventing a fact about the
ride out of a fact about the business** — the same move that produced
`From $65.00` and an invented cancellation window. The comment in
`src/components/trip/TripReceipt.tsx` records the choice at the render site.

*What would change.* Add `bookings.pickup_timezone TEXT NOT NULL` (IANA
identifier), populate it at booking time from the pickup coordinates, and return
it on the booking. The client already has the formatter — `Intl.DateTimeFormat`
with a `timeZone` option needs no dependency — and it is one field away from
being able to use it.

*Why it is filed beside C-4.* Both are the same shape: a datum the product
needs, with nowhere in the schema to put it, currently worked around in a way
that is honest but visibly a workaround. C-4's workaround is a timestamp map
beside the bookings; this one's is a rendered time that quietly means something
different for every reader.

#### C-5 · Messaging the client — **no system exists**

*What the screen wanted it for.* "I'm in the third lane by column C" is the most
common thing a chauffeur needs to send, and a phone call is the wrong channel for
it while the client is at a baggage carousel.

*What exists.* Phone numbers only. The preview's Message button opens the
device's SMS app via `sms:`, which is honest but sends from the chauffeur's
personal number — a privacy problem in both directions and unlogged.

*What would change.* Either a masked-number relay (Twilio Proxy or equivalent) or
a trip-scoped message thread. This is a product decision with a running cost, not
just a schema change. **Do not build the naive version**: a chauffeur's real
mobile number reaching clients is very hard to walk back.

#### C-6 · "Today" — **no date-scoped query exists**

*What the screen wanted it for.* The chauffeur's list is today's work.

*What exists.* `listTripsForDriver` returns every trip the driver has ever had,
`order by b.scheduled_at desc`, unbounded. The preview filters client-side, in
local time.

*What would change.* `GET /drivers/me/trips?date=YYYY-MM-DD` (or `from`/`to`),
filtered in SQL. Also decide **whose timezone** defines the day — the fleet
operates in one metro area, so America/Chicago is almost certainly the answer,
but it should be written down rather than inherited from whatever device is
asking.

#### C-7 · Fields `GET /drivers/me/trips` omits but `bookings` already has

Not a schema change — a `select` list. Each is on the row the chauffeur reads at
the kerb:

| Missing from the endpoint | Exists on | Wanted for |
|---|---|---|
| `flight_number` | `bookings` | Knowing which flight to track and when to leave |
| `luggage_count` | `bookings` | Whether the boot will hold it; whether to fold a seat |
| `service_type` | `bookings` | An hourly charter and an airport run are different jobs |
| `scheduled_at` timezone handling | — | Currently returned raw |

Note also that `src/types/api.ts`'s `DriverTripRow` in **this** repo is narrower
than what the backend actually returns — it omits `vehicle_name`,
`vehicle_license_plate`, `vehicle_color`, `special_requests`, the lat/lng pairs
and most fare components. It is unused today. Anyone starting the chauffeur app
should regenerate it from the query rather than trusting it.

#### C-8 · Deliberately not built, and why

`GET /drivers/me/earnings` and `/me/today` exist and return real figures, and the
brief excluded earnings — correctly. Showing money to a chauffeur raises
questions this project cannot answer: what the commission split is, whether
gratuity passes through in full, whether the figure is gross or net, and when it
is paid. The endpoint returning a number is not the same as the business having
an answer. Same reasoning for accept/decline (`POST /trips/:id/accept` exists,
but whether LCT chauffeurs may decline an assigned job is a policy question),
navigation, document upload, and shift management.

---

### Dispatcher view

#### D-1 · There is no "today's board" query

*What the screen wanted it for.* One table: time, client, pickup, destination,
class, assigned chauffeur, status, for every ride today.

*What exists.* Two endpoints, neither of which can produce that table:

- `GET /admin/bookings` — has the client name and the times, but **no vehicle
  name and no assigned driver**, and no date filter (`order by scheduled_at desc
  limit 200`).
- `GET /admin/trips/active` — has `driver_name` and `vehicle_name`, but
  `where t.status not in ('completed','cancelled')`, so a completed ride vanishes
  from the board mid-shift, and again no date filter.

*What would change.* `GET /admin/bookings?date=…` with `left join trips t`,
`left join profiles drv on drv.id = t.driver_id` and `join vehicles v`, returning
driver name and vehicle name per row. The two existing queries are 90% of it;
this is one new query, not a new subsystem.

#### D-2 · "Late" is not modelled anywhere — **and needs a business answer**

*What the screen wanted it for.* Finding the problem row is the dispatcher's
actual job. A board that does not surface it is decoration.

*What exists.* Nothing. Not a column, not a flag, not a computed field. The
preview derives it: pickup time has passed and the status has not moved beyond
`driver_assigned`, with a five-minute grace period **that the preview invented
for rendering purposes and that LCT has not agreed to**.

*What would change.* Two things, in this order:

1. **A definition.** How late is late? Is it the same for an airport pickup as
   for a dinner reservation? Does it start from the scheduled time or from the
   chauffeur's ETA? Nobody has been asked.
2. Then a computed field on the board query, so every client agrees, plus a
   threshold for escalation.

Note this depends on C-4: without an "arrived" status, "the car is there but the
passenger has not come out" is indistinguishable from "the car is not there".

#### D-3 · Chauffeur availability at the moment of assigning

*What the screen wanted it for.* The assign control lists three names with
nothing to choose between them. A dispatcher picking a chauffeur needs to know
who is free, who is nearby, and who is already on a job.

*What exists.* More than the app can see. `drivers.status`
(`offline`/`available`/`on_trip`), `current_lat`/`current_lng`,
`location_updated_at`, `working_hours_start`/`_end`, `break_mode`, and
`GET /admin/drivers/online` which returns most of it. **The gap is on the client
side**: `src/types/api.ts` has no driver type beyond `TripDriverInfo`
(`{ id, full_name, avatar_url, rating }`), which is a display shape for the
customer's trip screen.

*What would change.* Mirror the `AdminOnlineDriverRow` shape into
`src/types/api.ts` and call `GET /admin/drivers/online`. Then add the thing that
is genuinely missing: **whether this chauffeur is already assigned to another
ride at this time**. Nothing today answers that; it needs an overlap query
against `trips` joined to `bookings.scheduled_at`, and a decision about how long
a ride is assumed to occupy someone.

#### D-4 · No phone number for a chauffeur

*What the screen wanted it for.* The single most common dispatcher action after
assigning is calling the chauffeur about the job.

*What exists.* `profiles.phone` exists and drivers are profiles — so the data is
there, but no admin endpoint returns it. `TripDriverInfo` does not carry it, and
`listOnlineDrivers` does not select it.

*What would change.* Add `p.phone` to `listOnlineDrivers` and to any
dispatcher-facing driver query. Trivial, and gated on the same access-control
review as any other exposure of staff contact details.

#### D-5 · Assignment is keyed on the trip, not the booking

Not a gap — a note for whoever builds this, because it is the kind of thing that
costs an afternoon. `POST /admin/trips/:id/assign-driver` takes a **trip** id.
The board naturally lists bookings. A trip row is created inside the same
transaction as its booking (`bookings/repository.ts`), so one always exists — but
the board query must carry `trips.id` per row or every assignment costs an extra
lookup. The preview stores assignments keyed by booking id and maps them, which
is a demo shortcut, not a model to copy.

#### D-6 · Deliberately not built, and why

Invoicing, rate management, driver records and reporting were excluded by the
brief, and the exclusions hold up: `corporate_invoices` (`0011`), promo codes
(`0014`), driver documents (`0024`) and `GET /admin/analytics` all exist, and
every one of them is a screen where a wrong number is a commercial problem
rather than a cosmetic one. Cancel, reprice and change-vehicle were also left
out of the ride detail despite having working endpoints, for the same reason: a
preview that can cancel a real customer's car is not a preview.

---

### What the preview shows that is invented, and fenced

For completeness, since the rule elsewhere in this project is that nothing on
screen is invented:

- The three chauffeurs, the four customers, and the four extra rides on today's
  board are seeded demo data in `src/dev/demoData.ts`, in the same fenced file as
  the rest of the demo dataset. They are not claims about real people.
- **No rating, tenure, trip count, earnings figure or performance metric appears
  anywhere in either view**, for anyone, invented or otherwise.
- **No plate, colour, make or model appears anywhere**, per C-2.
- Fares shown to the dispatcher come from the same `calculateFarePreview()` the
  client app uses, on the backend's own seeded rate card.
- Every field is null-guarded: an absent value renders no row at all, never a
  dash and never a placeholder.

---

## 8. Fare parity — the verdict, and the one defect it found

**The arithmetic is clean. The timezone is not.**

Run it yourself: `npx jest tests/fareParity.test.ts`. The suite executes the
client's `calculateFarePreview()` and the backend's `calculateFare()` against
identical inputs, in the same process, in the same millisecond. Both are pure —
no I/O, no database, no server — which is why this is a numeric diff rather than
a code review.

### What was compared

**1,611 assertions across 4 vehicle classes × 6 service types × 8 boundary times
× 9 distances**, plus hourly durations and every error branch.

- Times sit one minute either side of both surcharge edges: 21:59 / 22:00 /
  22:01 and 04:59 / 05:00 / 05:01. The rule is `hour >= 22 || hour < 5`, so 22:00
  is inside and 05:00 is outside, and both directions are pinned.
- Distances include 0 (a real input — manual address entry reports no route),
  0.1 and 7.77 to push `perMileRate * distance` onto a third decimal so any
  difference in *where* each side rounds would surface, and 1000 to catch a
  divergence that only appears at magnitude.
- Rates are copied verbatim from the backend's own `db/seed.sql`. Testing parity
  on invented rates would prove nothing about production.

### Verdict

**Every shared field matches exactly, in every case.** `baseFare`,
`distanceFare`, `timeFare`, `surcharges`, `gratuity`, `tax`, `totalFare` — no
divergence at any boundary, no rounding difference, no drift at magnitude. The
constants agree (0.2, 0.0825, $15). Both reject the same invalid inputs with the
same `RangeError`. The mirror is faithful.

The suite was also run under `TZ=America/Chicago`, `TZ=Asia/Dubai` and `TZ=UTC`.
All 1,611 pass in all three.

### THE DEFECT: the surcharge is decided by the machine, not the journey

Both implementations decide the late-night surcharge with `date.getHours()` —
the local hour of whichever machine is executing. The client runs on the
customer's device; the backend runs on a server. **Neither names a timezone**, so
the same pickup instant is priced differently depending on where the code runs.
No amount of care inside either file can fix this, because the bug is the absence
of a zone, not a mistake in the arithmetic.

Measured, on an Executive Sedan / 23.2 mi / airport booking:

| Pickup instant (UTC) | Zone | Local hour | Surcharge | Total |
|---|---|---|---|---|
| `2026-03-11T00:00:00Z` | America/Chicago | 19:00 | $0 | **$180.06** |
| `2026-03-11T00:00:00Z` | UTC | 00:00 | $15 | **$199.30** |
| `2026-03-11T07:00:00Z` | America/Chicago | 02:00 | $15 | **$199.30** |
| `2026-03-11T07:00:00Z` | UTC | 07:00 | $0 | **$180.06** |

So for a DFW company running its backend in UTC — the default nearly everywhere:

- **An ordinary 19:00 Dallas airport run: the device shows $180.06, the server
  charges $199.30. A $19.24 overcharge, on every evening booking between 18:00
  and 23:00 local.**
- **A genuine 02:00 Dallas pickup: the device shows $199.30, the server charges
  $180.06. A $19.24 undercharge, on every booking in the small hours.**

Both directions are the same broken promise. The undercharge is the one that
reaches the business rather than the customer.

This is not a theoretical edge. It fires on ordinary bookings, every day, and it
is currently invisible because nothing compares the two numbers.

### THE RULING — decided, not open. Build to this.

**The late-night surcharge follows the PICKUP'S local time, never the
machine's.** The published policy says "11 PM–5 AM", and a customer reading that
means eleven at night where the car is coming to. Any other reading makes the
price depend on where a server happens to be hosted, which is not something a
business can defend to a customer.

**Not a presentation-layer fix.** The client must not "correct" for the server's
figure: a client that adjusts the server's price is the same defect wearing a
disguise.

1. **Default to `America/Chicago`**, since LCT operates in Dallas–Fort Worth and
   Grapevine. If a pickup ever resolves outside that zone, **the pickup
   location's timezone governs**.
2. **The zone identifier, never an offset.** `America/Chicago`, not `UTC-6`. A
   hardcoded offset is wrong for half the year and silently wrong across the DST
   boundary — and DFW observes it. `Intl.DateTimeFormat('en-US', { timeZone:
   'America/Chicago', hour: 'numeric', hour12: false })` needs no dependency and
   behaves identically in Hermes and Node.
3. Change `isLateNight()` in **both** `pricing.ts` and `pricingPreview.ts`.
   Neither `getHours()` nor a hardcoded offset.
4. Keep `tests/fareParity.test.ts` green under all three `TZ` values. Once the
   zone is fixed the cross-zone table above collapses to one row per instant —
   and that is the regression test, already written.

The one thing still open is narrower, and is B6 below: does the surcharge apply
by pickup time, or if any part of the journey falls inside the window? A 04:45
pickup running to 05:30 is inside at the kerb and outside at the airport.

---

### The third finding: the breakdown does not always add up

**A customer who adds up the itemised lines can land one cent away from the
"Total" printed above their thumb.** It happens on roughly 14% of the input
matrix, in both directions.

```
Executive Sedan, 0.1 mi, no surcharge
  65.00 + 0.33 + 0.00 + 13.07 + 5.39  =  83.79   <- what the lines say
  total                               =  83.78   <- what the total says
```

Ordinary penny rounding: each component is rounded to two decimals
independently, while the total is computed from the UNROUNDED subtotal and then
rounded. Six roundings of +/-0.005 against one rounding of the true value.

This is **not** a parity failure. Both implementations are wrong in precisely the
same way — asserted directly in the suite — which is why 1,611 comparisons pass
while this does not. That makes it a shared defect belonging to the server,
because the server's stored columns are what the app displays.

It matters more here than it would elsewhere. The payment screen's entire thesis
is that the breakdown is expanded by default and nothing is hidden; a breakdown
that does not reconcile is exactly the kind of surprise that design exists to
remove.

**The fix:** round the components first and derive the total from the rounded
parts, so the arithmetic a customer can do by hand is the arithmetic the system
did. One line in `calculateFare()`, mirrored in `calculateFarePreview()`.

**Not fixed in the app, deliberately.** `PriceBreakdown` renders what the server
sends. Making it reconcile client-side would hide a backend fault behind a
correct-looking total, which is this project's oldest anti-pattern.

`tests/fareParity.test.ts` carries this as a single `it.failing` marker: the gate
stays green today and goes RED the day the rounding is fixed, telling whoever
fixed it to delete `.failing` so exact reconciliation is enforced from then on.
The suite also pins the bound — never more than a cent — so a rounding
discrepancy can never quietly become a pricing one.

---

### The second finding: three fields the client can never compute

`waiting_fare`, `extra_stops_fare` and `discount_amount` are computed
server-side and have no client-side equivalent — waiting time is measured after
the fact, extra stops are added by dispatch, and a promo discount is resolved
against the `promo_codes` table. Asserted in the suite: a 25-minute wait adds
$32.07 to the server's total and $0 to the client's; two extra stops add $25.65;
a 15% promo makes the customer pay *less* than the breakdown they were shown.

None of these fires today, because the app never sends `waitingMinutes`,
`extraStops` or `promoCode` — the backend defaults them to 0 and no promo UI
exists. **They are latent, not active.** They become active the moment anyone
adds a promo-code field, which is exactly when nobody will be looking at this.

### What was fixed in the app, and what was deliberately not

Fixed — all presentation layer:

- `src/lib/serverFare.ts` reads the authoritative fare off a server-priced
  booking. One place converts the `numeric(10,2)` strings.
- `submit()` returns the whole `Booking`, not just its id, so the comparison is
  possible at all.
- The payment screen compares the authorised total against the server's **before
  anything reaches Stripe**, to the cent, with no tolerance band. A difference
  stops the flow, shows the server's breakdown and the two totals, and requires a
  second explicit authorisation. Verified by making the demo backend disagree by
  $19.24 and rebuilding: the interstitial fired, the flow stopped at
  `/book/payment`, and re-authorising created no second booking.
- The confirmation screen — the receipt, the thing a customer screenshots — was
  printing `draft.allInFare`. It now fetches the booking and shows the server's
  total.
- `Booking` declares the three missing fare columns.

**Not fixed, deliberately:** the timezone itself. It requires a change to the
backend's `pricing.ts` and a business answer about which zone governs, and this
phase does not touch backend logic or absorb a divergence into the UI.

---

## 9. Live tracking — what it would take to make it genuinely live

The tracking screen is rebuilt (artboard 2k) and it consumes real data
correctly. Whether that data is real is a backend question, and the answer is
**closer than expected: the plumbing exists, and three specific things stop it
from arriving.**

### What already works, end to end

| Piece | Where | State |
|---|---|---|
| Per-booking WebSocket channel | `src/ws/hub.ts`, `src/ws/server.ts` | Built |
| Driver posts a fix mid-trip | `PATCH /trips/:id/location` | Built, driver-authenticated, ownership-checked |
| That fix relayed to the customer | `publishTripEvent(booking_id, {type:'location'})` | Built |
| Status transitions relayed the same way | `PATCH /trips/:id/status` | Built, guarded by the state machine |
| Client subscribes and reconnects | `src/lib/useTripSocket.ts` | Built |

**So a driver app calling `PATCH /trips/:id/location` on a timer makes this
screen live today, with no backend change.** That is the headline. What follows
is what would make it *good*.

### G-1 · The trip socket carries no heading — **the marker's direction is guessed**

*What the screen needs it for.* The chauffeur marker rotates to the vehicle's
bearing. A pin that does not point anywhere tells a customer nothing about
whether the car is coming towards them or has just passed the turn.

*What exists.* Heading exists in the system and does not reach this screen:

- `driver_locations.heading` and `.speed` — real columns (migration 0021).
- `PATCH /drivers/me/location` accepts `heading` and `speed` and stores them.
- But it publishes a **`FleetEvent`** to the admin channel:
  `{ type: 'driver_location', driverId, lat, lng }` — and even that drops the
  heading it was just given.
- The customer's **`TripEvent`** is `{ type: 'location', lat, lng, etaMinutes }`.
  No heading, no speed.

*What the app does meanwhile.* `src/lib/geo.ts` derives bearing from consecutive
fixes. It works, and it has two honest failure modes that no amount of client
code can fix: a stationary vehicle has no derivable bearing (the app holds the
last one rather than spinning the marker at a red light), and at low speed GPS
jitter dominates the real movement, so the derived bearing wobbles.

*What would change.* Add `heading` to `TripEvent` and to
`PATCH /trips/:id/location`'s schema, and pass it through `publishTripEvent`.
Roughly four lines, no migration — `driver_locations` already has the column,
and the driver app is already being asked for the value by the other endpoint.

### G-2 · No update cadence is specified anywhere — **on either side**

*Why it matters.* Smooth motion needs to know how long to spend walking from one
fix to the next. Too fast and the marker arrives early and freezes; too slow and
it lags behind a car that has already turned.

*What exists.* Nothing. No documented interval, no rate limit on the endpoint,
no `expectedIntervalMs` in the payload. `PATCH /drivers/me/location`'s comment
says drivers call it "on an interval" without saying which.

*What the app does meanwhile.* `useSmoothedLocation` **measures** the gap
between the last two frames and paces itself to that, clamped to 0.9–8s. Self-
correcting and needs no shared constant, but it is inferring a contract rather
than reading one, and it is wrong for exactly one frame after any change in
cadence.

### RECOMMENDED CADENCE — a number to approve, not a question to answer

Proposed default, so the business is signing off a figure rather than inventing
one. **Confirm or change it; do not leave it open.**

| Trip state | Interval | Why |
|---|---|---|
| `passenger_picked_up` / `trip_started` — under way | **5 s** | The marker is being watched continuously and the vehicle is moving fastest |
| `driver_assigned` / `driver_arriving` — assigned, not yet aboard | **15 s** | The customer checks periodically rather than stares; a 15s-stale position is still useful for "is it close" |
| `completed` / `cancelled` | **stop entirely** | A finished trip is a record. Continuing to post is battery and data spent on nothing, and it keeps a driver's location flowing after the job that justified collecting it |

**The trade-off, in one line:** more frequent posts cost the driver's battery and
mobile data and add write load, and buy a marker that is less stale.

**What a faster cadence does NOT buy is smoothness.** `useSmoothedLocation`
already interpolates across whatever gap it measures, and 5s is well inside what
it covers cleanly — the marker moves continuously at 15s too, it is simply
following a position that is up to fifteen seconds old. So the choice is purely
about **accuracy**, which makes it a straightforward business trade rather than
a UX one.

*Implementation.* Write the chosen figures down, then either enforce them with a
rate limit on `PATCH /trips/:id/location` or publish the current expected
interval in the payload so the client can pace exactly rather than by
measurement. Publishing it is better: it survives a future change without a
client release.

### G-3 · `driver_locations` is never written during a trip

*What it means.* The append-only heartbeat log is written **only** by
`PATCH /drivers/me/location`. The trip-scoped `PATCH /trips/:id/location` writes
`trips.driver_current_lat/lng` — a single latest point that each update
overwrites — and publishes to the socket.

*The consequence.* A completed trip has no movement history. "Where was the car
at 18:42?" is unanswerable, which matters for a disputed wait charge, a
complaint about a route, or an insurance question. It also means the tracking
screen cannot draw a travelled path, only a current point.

*What would change.* Have `PATCH /trips/:id/location` also insert into
`driver_locations` (adding a nullable `trip_id` to that table would make the
history queryable per trip). One insert; the table and index already exist.

### G-4 · No route line to draw

*What the screen would do with it.* The camera frames the chauffeur and the
destination. What it cannot show is the road between them, so the customer sees
two points and infers the rest.

*What exists.* `GET /maps/route` returns a route (`src/modules/maps/routes.ts`,
with `src/lib/polyline.ts` for encoding). It is a live Google Directions call
per request, and **nothing persists the result**: `bookings` has no
`route_polyline` column, and neither does `trips`.

*What would change.* Store the encoded polyline on the booking at creation —
the route is already computed then for the distance — and return it on the trip
detail. That also removes a Google Directions call per tracking-screen open,
which is a real cost on a screen that stays open for the length of a journey.

### G-5 · ETA is whatever the driver app last said

`eta_minutes` is an optional field on `PATCH /trips/:id/location`, supplied by
the driver's client. Nothing on the server computes or sanity-checks it, and
nothing prevents it from going up and down between frames.

The progress curve (`src/lib/tripProgress.ts`) is monotonic **given a monotonic
ETA**; it cannot make a jittery input smooth, and it deliberately does not try —
smoothing an ETA on the client would mean showing a customer a number the system
does not actually believe.

*What would change.* Either compute the ETA server-side from the current
position and the route, or clamp it so it can only decrease except on a
recalculated route. This is a product decision about which is more honest when
traffic genuinely worsens.

### Summary for whoever picks this up

| # | Gap | Cost | Blocks |
|---|---|---|---|
| G-1 | No heading on the trip socket | ~4 lines, no migration | Accurate marker direction |
| G-2 | No specified update cadence | A decision, then a line | Exact rather than inferred pacing |
| G-3 | No per-trip location history | One insert + nullable column | Disputes, travelled path |
| G-4 | Route polyline not persisted | One column + one return field | Drawing the route; saves a Maps call per open |
| G-5 | ETA unvalidated, client-supplied | A decision | A progress bar that cannot go backwards |

**None of these blocks shipping the screen.** With a driver app posting
locations it is live today. G-1 is the one worth doing first: it is the smallest
change and it removes a guess from the most-watched element on the screen.

---

## Business inputs still pending

Not engineering work — questions only LCT can answer. Each renders nothing in the
app until it is answered.

| # | Question | Where it lands |
|---|---|---|
| B3 | **Who owns the rating figure, and how often is it refreshed?** Home shows "4.93 from 55 reviews", read by hand from the Clienity reputation dashboard on 2026-08-22 and frozen in a constant with its source and read-date. It is a SNAPSHOT: there is no reviews endpoint and no integration, so it will silently go stale. Either re-read it before each release, or expose it from the backend and delete the constant. | `src/config/reputation.ts` → `src/components/home/HomeView.tsx` |
| B4 | **How late is late?** The dispatcher board must surface the problem row, and nothing defines what one is. Same threshold for an airport pickup as for a dinner reservation? Measured from the scheduled time or from the chauffeur's ETA? At what point does it escalate to a call? Until this is answered the board computes it client-side with a five-minute grace the preview invented. See §7 D-2. | the board query, once §7 D-1 exists |
| B5 | **Is meet-and-greet a service the customer selects, and does it cost anything?** The chauffeur cannot be told to walk into the terminal because no booking says so. This is a pricing and packaging question before it is a column. See §7 C-3. | `bookings.meet_and_greet`, the airport booking flow |
| B6 | **Does the late-night surcharge apply by PICKUP time, or if any part of the journey falls inside the window?** A 04:45 pickup running to 05:30 is inside the window at the kerb and outside it at the airport. This is the only part of the surcharge question still open — the timezone half is answered and specified in §8, not a question. | `isLateNight()` in both `pricing.ts` and `pricingPreview.ts` |

**All three of the originally blocked inputs are now answered**, and every one
of them renders:

- the free-cancellation window — published and tiered: 12h sedans and SUVs,
  6h airport, 48h hourly and events
- the dispatch phone — +1 888 615-4065
- the complimentary wait — **30 minutes standard, 60 minutes airport**

The questions remaining below are ones this project raised later, from the role
preview and the fare-parity work. They are open, not blocked: nothing is waiting
on them to render.

> **The wait time is DISPLAYABLE but not ENFORCEABLE.** The app states the
> policy because it is real; it cannot bill against it, because nothing marks
> when the clock starts. See C-4 — that pairing is now the strongest argument
> for building it.

---

## Not a backend gap

Recorded so it is not re-litigated: the **fare parity check** in slice 7 has both
halves available locally — `src/lib/pricingPreview.ts` here and
`src/modules/bookings/pricing.ts` in `../lct-universal-backend`, plus that
repo's own `tests/pricing.test.ts`. The comparison can be made line by line
rather than inferred, and does not need a running server.

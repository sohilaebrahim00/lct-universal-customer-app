# Runbook — authenticated verification

Everything behind a login is unverified, and this is how to verify it.

**Run this on your side.** It needs a Supabase project's URL, anon key and
service-role key. Those are credentials, they do not pass through the assistant,
and nothing here asks you to share them. Every file they go into is gitignored;
the checks below confirm that before you start.

You need about 20 minutes. Steps 1–3 are one-time.

---

## What this unblocks

These are the specific claims that cannot be tested without it. They are listed
as claims rather than screens because that is what needs verifying.

| # | Claim | Why it needs auth |
|---|---|---|
| A1 | **The fare guard compares against a genuinely independent computation.** Verified so far only against the demo backend, where the two numbers are the same object by construction. This is the one that matters. | `POST /bookings` |
| A2 | Trips list, trip detail and the rebuilt tracking screen render real bookings | `GET /bookings` |
| A3 | Live tracking is live — status and location arrive over the socket | `/ws/trips/:id` authenticates with the Supabase JWT |
| A4 | Account, saved locations, saved passengers, payment methods | `GET /profiles/me/*` |
| A5 | Corporate account, including the unresolved-account branch | `GET /corporate/*` |
| A6 | Notifications | `GET /notifications` |
| A7 | Booking cancellation | `POST /bookings/:id/cancel` |

Concierge (A8) additionally needs an AI provider key and is out of scope here.

---

## 1. A Supabase project

Any free project. From **Project Settings → API** take:

- Project URL
- `anon` / public key
- `service_role` key — **server-side only, never in the app's `.env`**

## 2. Backend environment

In `lct-universal-backend/.env` (gitignored — verify with
`git check-ignore -v .env`):

```
DATABASE_URL=postgres://lct:lct@127.0.0.1:55432/lct_universal
SUPABASE_URL=<your project URL>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
NODE_ENV=development
PORT=4000
CORS_ORIGINS=http://localhost:4179,http://localhost:8081,http://localhost:19006
```

The `DATABASE_URL` above is the portable Postgres from Slice 1. If it is no
longer running:

```powershell
& "<scratchpad>\pg\pgsql\bin\pg_ctl.exe" -D "<scratchpad>\pg\data" `
  -o "-p 55432 -c listen_addresses=127.0.0.1" -l "<scratchpad>\server.log" start
```

## 3. A real user, linked to the seeded data

The seed creates profiles with **fixed UUIDs and no Supabase users**, so nobody
can log in as them. Create one real user, then point a seeded profile at it.

1. In Supabase → **Authentication → Users → Add user**, create
   `m.okafor@northline.co` with a password you choose. Confirm the email.
2. Copy that user's UUID.
3. Re-point the seeded profile — this moves Michael Okafor's bookings, corporate
   membership and saved data onto the account you can actually sign in as:

```powershell
$psql = "<scratchpad>\pg\pgsql\bin\psql.exe"
$new  = "<the Supabase user UUID>"
& $psql -h 127.0.0.1 -p 55432 -U lct -d lct_universal -c @"
update profiles set id = '$new' where id = '22222222-2222-4222-8222-222222222221';
"@
```

`bookings.profile_id` and the saved-data tables cascade on update by foreign
key, so the trips follow the profile.

> If you would rather not touch the seed, sign up through the app instead and
> book a trip as a brand-new customer. That verifies A1 and A2 but not A5, which
> needs the corporate account the seed provides.

## 4. App environment

In `lct-universal-customer-app/.env` (also gitignored):

```
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_WS_URL=ws://localhost:4000
EXPO_PUBLIC_SUPABASE_URL=<your project URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key — NOT the service-role key>
EXPO_PUBLIC_DEMO_MODE=false
```

**`EXPO_PUBLIC_*` values are compiled into the bundle and readable by anyone who
installs the app.** The anon key is designed for that. The service-role key is
not, and must never appear in this file.

## 5. Run

```bash
# backend
cd lct-universal-backend && npm run dev

# app — --clear matters, see DESIGN_CHANGELOG.md on stale inlined flags
cd lct-universal-customer-app && npx expo export --platform web --output-dir dist-live --clear
node scripts/verify-build-mode.mjs dist-live     # must print EXPO_PUBLIC_DEMO_MODE=false
npx serve dist-live -l 4179 --single
```

Native, for the parts web cannot show (see step 7):

```bash
npx expo start --dev-client
```

---

## 6. The checks, in order

Sign in as the user from step 3.

**A1 — the fare guard. Do this one first.**

1. Book any trip. On **Review & pay**, note the total before you authorise.
2. Authorise.
3. **Expected:** if the server agrees, it proceeds to Stripe/confirmation and
   the confirmation total matches. If it disagrees by any amount, the flow
   **stops on the payment screen** and shows "The price changed" with both
   figures.
4. Confirm against the database:

```sql
select total_fare, base_fare, surcharges, gratuity, tax
from bookings order by created_at desc limit 1;
```

   The confirmation screen's total must equal `total_fare` exactly.

5. **Then force a disagreement**, because a guard that never fires is not
   verified. In `lct-universal-backend/src/modules/bookings/routes.ts`, after
   `const fare = calculateFare({...})`, temporarily add:

```ts
fare.totalFare = Math.round((fare.totalFare + 19.24) * 100) / 100; // TEMPORARY
```

   Book again. **Expected:** the interstitial fires, nothing reaches Stripe, and
   re-authorising creates no second booking (`select count(*) from bookings`).
   **Remove the line afterwards.**

**A2** — Trips lists the seeded bookings; opening one shows the tracking screen
with the real chauffeur, addresses and status.

**A3 — live tracking.** There is no driver app, so drive the socket by hand.
Get a driver JWT (sign in as a `role = 'driver'` profile, or use the service
role), then:

```bash
TRIP=$(psql ... -t -c "select t.id from trips t join bookings b on b.id=t.booking_id \
  where b.profile_id='<your uuid>' order by b.scheduled_at desc limit 1")

curl -X PATCH http://localhost:4000/trips/$TRIP/location \
  -H "Authorization: Bearer <driver JWT>" -H 'Content-Type: application/json' \
  -d '{"lat":32.8000,"lng":-96.8000,"etaMinutes":9}'
```

Repeat every ~3s, moving the point towards `32.8121, -96.8175`.

**Expected:** the marker walks — it does not jump — the "Live" label appears,
the ETA counts down, and the progress bar accelerates over the last two minutes.
Then advance the status and watch the timeline announce it:

```bash
curl -X PATCH http://localhost:4000/trips/$TRIP/status \
  -H "Authorization: Bearer <driver JWT>" -H 'Content-Type: application/json' \
  -d '{"status":"driver_arriving"}'
```

**A4–A7** — open each screen; each should render real data or a designed error
state, never a blank. For A5 specifically, check both branches: with the
corporate account present, and with it removed
(`update profiles set corporate_account_id = null where id = '<uuid>'`) — the
second must show the unresolved-account state, not an empty screen.

## 7. What to check on a device rather than the web build

`react-native-maps` has no web implementation, so these are native-only and the
web build shows a documented placeholder instead:

- The map renders full-bleed with the warm near-black style
- The marker **rotates** to the bearing and **interpolates** rather than jumping
- The camera **eases** rather than snapping, and reframes at
  `passenger_picked_up` from chauffeur+pickup to chauffeur+destination
- The custom map style applies **on Android**. On iOS it will not — Apple Maps
  ignores `customMapStyle`, and this app does not select the Google provider on
  iOS. Recorded as a known limitation, not a bug.

## 8. What to report back

For each of A1–A7: pass, or what happened instead. Screenshots of anything that
renders wrong on real data are worth more than a description — the differences
between fixture behaviour and real behaviour have been the most valuable
findings in this project so far.

Afterwards, tear down anything you do not want kept: the Supabase project, and
the local Postgres via
`pg_ctl -D "<scratchpad>\pg\data" stop; Remove-Item "<scratchpad>\pg" -Recurse -Force`.

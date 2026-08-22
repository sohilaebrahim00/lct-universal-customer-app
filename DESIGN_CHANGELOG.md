# Design changelog

What changed, why, and what was actually verified rather than assumed.

Started at the backend-integration phase. Completed and reorganised per screen
in the final handover slice; until then this accumulates as work lands, so that
nothing has to be reconstructed from memory at the end.

**The distinction this file exists to keep:** *designed* means the behaviour was
built and reasoned about. **Verified** means it was observed happening. Where a
claim is only the former, it says so.

---

## Verified behaviours

Things that have been observed working, with what produced the observation.

### Error and offline states — verified by a real network failure

The fleet screen and the vehicle-selection step render designed error states
rather than blank screens when the API cannot be reached.

Previously this was **designed only**. During Slice 1 a genuine misconfiguration
verified it: the local API's `CORS_ORIGINS` did not include the origin the built
app was served from, so `GET /vehicles` failed at the browser with
`net::ERR_FAILED` after a blocked preflight. The app responded correctly:

- Fleet → *"Couldn't load the fleet / Could not reach the server."*
- Vehicle step → *"We couldn't load the fleet / This is our end, not yours."*
  with **Try again** and **Call dispatch**.

That is the first time those branches have been exercised by an actual network
failure rather than a fixture that returns an error object. A fixture can prove
the branch renders; only a real failure proves the branch is *reached* — that
the fetch layer, the `AsyncState` transition and the screen agree about what
went wrong.

### Fare parity — verified numerically, both halves executed

See `BACKEND_FOLLOWUPS.md` §8 for the full verdict. 1,611 assertions comparing
the client's `calculateFarePreview()` against the backend's `calculateFare()` on
identical inputs, in one process. Every shared field matches. Run under three
timezones.

### The price-change guard — verified against a built bundle

The payment screen compares the authorised total against the server's before
anything reaches Stripe. Verified by making the demo backend disagree by $19.24
and rebuilding: the interstitial fired, the flow stopped at `/book/payment`,
nothing reached Stripe, and re-authorising created no second booking.

### API contract — verified, with a stated limit

All 24 call sites across the app's eight `src/api/*` modules resolve to a real
backend route with matching response envelope keys. No 404s waiting.

**The limit, stated:** this verifies that the endpoints and their envelope keys
line up. It does **not** verify that the payloads do. Slice 1 found four fields
returned by `GET /vehicles` that the app's `Vehicle` type did not declare, which
is exactly the class of thing an endpoint-level check cannot see.

---

## Classes of bug found, not incidents

Recorded as general hazards, because each will recur if only its instance is
remembered.

### Inlined `EXPO_PUBLIC_*` constants go stale across builds

**Metro's transform cache does not key on `EXPO_PUBLIC_*` values.** These
variables are inlined into modules at transform time, and a cached transform is
reused across builds even after the value has changed.

Observed: `EXPO_PUBLIC_DEMO_MODE=false npx expo export` produced a bundle with
`"true"` still inlined. `metro.config.js` reads `process.env` fresh on every run,
so the *route* fence updated while the *runtime* flag did not — a bundle with
`app/_role/` correctly stripped and an Account screen still advertising it,
pushing to routes that were not there.

At release the same mechanism ships seeded fake customers, fake trips and a
"Reset demo" button to real users, with `expo export` exiting 0 the whole way.

**Anyone adding another flag that changes what ships needs to know this.** A new
`EXPO_PUBLIC_*` constant inherits the hazard automatically and silently.

Mitigations, in order of what actually does the work:

1. `scripts/verify-build-mode.mjs` greps the **emitted bundle** and exits
   non-zero when an inlined flag disagrees with what the environment asked for.
   It runs as part of `npm run export:web`. Add new flags to its `CHECKS` list.
2. `--clear` is the default in `export:web` and `export:ios`. Hygiene, not a fix
   — a defect whose remedy is "remember to type X" is not fixed.

### A safeguard gated on `isDemoMode` is inert exactly where it matters

Two protections were written as `if (!isDemoMode) return null/false`, on the
reasoning that a real build should defer to the live API. Pointing a non-demo
build at a real backend showed what that produced: Fleet advertising a starting
price below any achievable fare, and the booking flow quoting fixed prices for
two classes the business will not price.

**Facts about the business do not belong behind a demo fence.** Published
prices, quote-only classes, service policy, the reputation figures — these are
true in every build and live in `src/config/`, each carrying its source and the
date it was read. The demo dataset is for data that stands in for a backend, not
for things the company has published about itself.

---

## Screens

*(Per-screen entries are compiled in the handover slice. Recorded here as work
lands.)*

### Fleet

- Shows the website's published starting label — "From $95", no cents — in
  **every** build, or **nothing** when no figure is published for that class. It
  no longer falls back to the backend's `base_rate`.
  **Why:** against a live API it printed "From $65.00" for a sedan that cannot
  be booked below $102.60, whose floor including gratuity and tax is $83.38, and
  which the company itself advertises at $95. Four numbers, and the app was
  inventing the only one nobody had published. A base rate is a component of a
  fare, not a price a customer can pay.
  **Note:** this does not reconcile the website/backend price conflict
  (`BACKEND_FOLLOWUPS.md` §6), which stays open. It only stops the app
  publishing a third number that agrees with neither.

### Booking — vehicle selection

- Sprinter and Coach show **Request quote** and a request action in every build,
  not just the demo.
  **Why:** quote-only status came from a demo-gated helper, so in production the
  app quoted `$211.61` and `$532.24` for two classes the website marks "Request
  Quote" — committing LCT to a price they have explicitly said they do not give.

### Booking — payment

- The total shown before authorising is the carried preview; from the moment
  `POST /bookings` returns, the screen shows the **server's** breakdown. The two
  are compared to the cent before Stripe, with no tolerance band.
  **Why:** the customer authorised a number this app computed while Stripe
  charged a number the backend computed, and nothing compared them. The guard
  that appeared to check this was comparing the client's preview against the
  client's own recomputation.
  **Why no tolerance:** a tolerance is a decision about how much silent
  overcharging is acceptable, which is not a decision to make quietly.

### Booking — confirmation

- The reservation total is fetched from the booking rather than read from the
  client draft.
  **Why:** this screen is the receipt, and the thing a customer screenshots. It
  was showing the client's preview even after the payment screen was corrected.

---

## Still unverified

Stated so it is never implied otherwise.

Everything behind authentication. The local backend runs on placeholder Supabase
values, and the seeded profiles have no Supabase users, so nobody can sign in:
**Trips, Account and all sub-pages, Corporate, Concierge, Notifications, Payment
methods, Saved locations and passengers, booking creation, the payment screen's
fare guard against a genuinely independent server computation, the confirmation
screen, and live trip tracking.**

The fare guard is verified against the demo backend only. Its one real test —
the client's preview against an independent server computation — needs auth.

The agreed route when a named screen requires it: a seed, an env template and an
exact runbook prepared here, run on the owner's side with credentials that never
pass through this workspace.

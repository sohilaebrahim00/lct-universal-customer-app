# Feature gap matrix — audited 2026-09-09, HEAD `fea42f5`

Classification per the delivery brief. **Searched before classifying**; nothing is
called missing because it was not visible on a screen.

| # | Feature | Classification | Evidence |
|---|---|---|---|
| 5 | One-way / hourly / service type / duration | IMPLEMENTED | `book/index.tsx` picker, `details.tsx:216` Duration, `pickup.tsx`+`payment.tsx` branch on `hourly`. Hourly is **fenced in demo builds** (`HomeView`, `book/index.tsx`) because the route order collects no duration before the vehicle step |
| 5 | Pickup/destination with structured coords | IMPLEMENTED | `Booking.pickup_lat/lng`, `dropoff_lat/lng`; `PlacesAutocomplete.tsx` |
| 5 | Date/time validation | IMPLEMENTED | `details.tsx` guards; flow will not advance without both |
| 6 | **Book for someone else — UI** | **MISSING (UI only)** | `SavedPassenger`, `profilesApi.savedPassengers/addSavedPassenger/removeSavedPassenger`, `account/saved-passengers.tsx`, `draft.primaryPassengerName/Phone`, and the booking payload **all exist**. `grep primaryPassenger app/` → **no match**. Nothing writes the fields |
| 7 | Vehicle/class selection | IMPLEMENTED | name, examples, capacities, image, fare or "Request quote" |
| 7 | Vehicle imagery | PARTIAL — 1 held | Sedan + Sprinter are the client's own photographs. **Executive SUV still a studio render**: both official Escalade shots carry LuxLane Transports branding incl. a scannable QR. `OPEN_QUESTIONS.md` #13 |
| 8 | ETA | IMPLEMENTED (honestly) | `etaIsAttributable()` renders an ETA only where the stage can attribute it. Client's own panel confirmed hand-entered per class |
| 9 | `LX-XXXXXX` reference | INTENTIONALLY NOT IMPLEMENTED | Real in the client's panel; this app has no such identifier and must not mint one that matches nothing. `AdminPanels.tsx:437` |
| 10 | Trip status lifecycle | IMPLEMENTED | 7 real stages, `verify:lifecycle`. No time-based progression anywhere |
| 11 | Upcoming / Past / Cancelled | IMPLEMENTED | `trips/index.tsx`, three tabs from real statuses |
| 12 | Book again | IMPLEMENTED | `rebookDraftFrom()` — carries route/service/class, refuses chauffeur, status, fare, id |
| 13 | Cancel | IMPLEMENTED | `CancelBooking`/`CancelConfirm`, pre-pickup only, published tiers cited |
| 13 | Modify booking | BACKEND-BLOCKED | No modify endpoint. A time change is a **new quote** by project rule |
| 13 | `cancelled_by` attribution | MISSING | No column; demo-overlay only, same pattern as `arrived_at` |
| 14 | **Add to calendar** | **MISSING** | No `.ics` anywhere |
| 15 | **Google Maps on web** | **MISSING (placeholder)** | `TrackingMap.web.tsx` renders a designed placeholder + closing distance. Native `TrackingMap.tsx` is real |
| 17 | Route polyline | **BACKEND-BLOCKED** | **No `route_polyline` field exists** anywhere in `src/types/api.ts`. The brief listed it as existing; it does not. Native tracking map is correctly **markers-only** |
| 18 | Live chauffeur location | PARTIAL | `Trip.driver_current_lat/lng/updated_at` exist. No live channel (G-3) |
| 20 | Flight number | IMPLEMENTED | `details.tsx:255`, captioned "not used for live flight tracking" |
| 21 | Special requests | IMPLEMENTED | `details.tsx:271` → payload → chauffeur job "Notes" |
| 22/23 | Profile, saved locations | IMPLEMENTED | `account/*` |
| 25 | Payment | IMPLEMENTED | `isStripeConfigured`; server figure authoritative (`serverFare.test.ts`) |
| 26 | Receipt | IMPLEMENTED | `TripReceipt.tsx` |
| 30 | Class-mismatch warning | BACKEND-BLOCKED (handled honestly) | No `chauffeur_class` field, so every chauffeur is labelled **"class attachment unknown"** rather than sorted by an invented one |
| 31 | **Admin search** | **MISSING** | Only `TextInput` in the console is the broadcast composer |
| 41 | Admin route protection | SEE REPORT | `/_role/*` is stripped from a non-demo bundle by `resolver.blockList` and asserted absent from the bytes |

## Credentials absent in this environment

- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — **not set**. Web maps can be implemented and
  gated, but **cannot be visually verified here**.
- `lctapp.netlify.app` unreachable from this network (ISP-level block on
  `*.netlify.app`; an unrelated netlify.app host times out identically).

## Order of work

1. §6 passenger selector — highest customer value, backend already complete
2. §15/17/19 web maps — markers only, no invented route geometry
3. §14 `.ics` calendar
4. §31 admin search

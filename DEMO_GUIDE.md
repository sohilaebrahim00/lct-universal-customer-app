# LCT Universal — demo walkthrough

A numbered route through the product for somebody who has never seen it.
Roughly **twelve minutes** end to end. Every step says what to look at.

**Where:** <https://lctapp.netlify.app/>
**On what:** a laptop browser. It works on a phone browser too, but the admin
console is easier to read wide.

**Before you start:** open **Account → Reset demo** and confirm. The demo keeps
state between visits, so a fresh start means step 1 looks the way this guide
says it does. Do this between showings, not during one.

> Everything below runs on demo data held in your own browser. Nothing is sent
> anywhere, no real booking is created, and no card is charged. The limits are
> listed at the end — read them before you show this to anyone.

---

## Part 1 · The customer books a car (4 minutes)

**1. Open <https://lctapp.netlify.app/>**

> **Look at:** the home screen. The next ride sits at the top with a live status,
> and the two rides below it are past trips with their final fares. This is a
> returning customer, not a first run.

**2. Tap `Book a car`.**

> **Look at:** the pickup step. The saved locations — Home, Northline HQ, DFW
> Terminal D — are real addresses in Dallas–Fort Worth, not lorem.
>
> On a browser you will see a note where the map picker would be. That is
> deliberate and explained at the end.

**3. Pick `Home` as the pickup, then `Confirm pickup`.**

**4. Pick `DFW Terminal D` as the destination, then confirm.**

> **Look at:** the route and distance appear once both ends are set. The fare
> preview updates from them, not from a fixed number.

**5. On the vehicle step, choose `Executive Sedan`.**

> **Look at:** the price on the card. **That figure is the whole product
> promise** — it is all-in, and it is the number that will appear on the payment
> screen and again on the receipt at the end of the ride. Note it down now; you
> are going to check it twice.
>
> **Also look at:** scroll to `Mercedes Sprinter` or `Coach`. They show
> **Request Quote**, not a price. The business does not quote those without
> being asked, so the app does not either.

**6. Continue through the details step — date, time, passengers — and on to
payment.**

> **Look at:** the fare breakdown is open by default, not hidden behind a
> disclosure. Base, distance, gratuity, tax. The total matches step 5.

**7. Confirm the booking.**

> **Look at:** the confirmation screen, then tap through to the trip.

---

## Part 2 · The chauffeur drives it, and the customer's screen moves (5 minutes)

This is the part worth showing. **Open a second browser tab** and keep the
customer's trip screen in the first one so you can switch between them.

The chauffeur and dispatcher screens are **previews of products LCT does not
have**. Every one of them says so on screen. They exist so you can see the same
data from the other side.

**8. In tab 2, open <https://lctapp.netlify.app/_role/chauffeur>**

> **Look at:** today's jobs for one chauffeur. If it says no jobs, that is
> correct — it means the day's rides belong to other chauffeurs, and it is what
> an empty day honestly looks like.

**9. Go to <https://lctapp.netlify.app/_role/dispatcher> and tap the ride for
`Yolanda Pierce`.**

> **Look at:** the dispatcher's view of one ride — who is driving it, what stage
> it is at, and the assign control.

**10. Now drive a ride through its stages.** Open
<https://lctapp.netlify.app/_role/status?id=demo-booking-upcoming>

> **Look at:** one big button. Never a row of statuses to choose from — at any
> moment exactly one move is legal, so the chauffeur is never asked to decide.

**11. Tap `I'm on my way`. Then switch to tab 1 and reload the customer's trip.**

> **Look at:** the customer's headline and the stage timeline have both moved to
> **Chauffeur En Route**. One action in one view moved another view, because
> both read the same state.

**12. Back in tab 2, tap `I've arrived`. Switch to tab 1 and reload.**

> **Look at — this is the moment to slow down:**
>
> - The headline reads **"Your chauffeur is outside"**.
> - A **countdown** has started: the complimentary waiting window. 30 minutes on
>   a standard ride, 60 on an airport transfer.
> - **There is no money on that countdown.** No fee, no per-minute rate, no
>   running total. It states a policy the business has confirmed; it does not
>   price anything.
> - The **"arriving in N minutes"** line is gone. Once the car is outside, an
>   arrival estimate is answering a question nobody is asking.
>
> **Worth saying out loud:** the backend has no "arrived at pickup" status. This
> stage is demonstrated here to show what it would enable, and the app records
> the arrival beside the booking because there is nowhere in the data model to
> put it. That gap is written up as C-4.

**13. In tab 2, tap `Passenger on board`.** It will ask you to confirm.

> **Look at:** the confirmation names what the customer will see, not just what
> the button does. Two actions ask — this one and completing the ride — because
> neither can be undone.

**14. Tap `Start the trip`, then `Complete the ride`.**

**15. Switch to tab 1 and reload.**

> **Look at:** the receipt. **Check the total against the number you wrote down
> at step 5.** It is the same figure, from the same source, never recalculated.
>
> A rating is offered here and nowhere else — never while the customer is
> watching a car approach.

---

## Part 3 · The same ride from the operations side (3 minutes)

**16. Open <https://lctapp.netlify.app/_role/admin>**

> **Look at:** sixteen sections across the top. This is a **preview**, not a
> replacement for the operations panel LCT already runs at `lctuniversal.us/admin`
> — it does not connect to it.

**17. `Overview`.**

> **Look at:** the counts. Then look at **Revenue** and **Ratings** underneath —
> both say what they are missing rather than showing a chart. There is no
> payments table to total and no ratings store to average, so there is no graph.

**18. `Live Dispatch` → tap `Assign chauffeur` on any ride.**

> **Look at:** this is the one screen in the console that **writes**. Assign
> somebody, then reload the customer's trip in tab 1 — the chauffeur has changed
> there too.
>
> **Also look at:** each chauffeur says *class attachment unknown*. The panel
> groups chauffeurs by the class they drive; this app has no such field, so it
> says so rather than guessing.

**19. `Class Builder` — spend a minute here.**

> **Look at:** five vehicle classes with full rate cards. **The banner says they
> are unconfirmed**, read off a recording of the client's own panel, and that
> edits are lost on reload. Press `+` or `−` on a minimum fare and watch the
> unsaved notice appear. Reload — it is gone. That is deliberate: these figures
> may never reach a customer.
>
> **Then scroll to the bottom.** The console shows, side by side, that
> `lctuniversal.com` disagrees with itself: `/fleet` calls this **From $110**
> class "Executive SUV", `/rates` calls it "SUV". The app now shows this name
> consistently everywhere — that internal split was fixed 2026-08-28 — and
> uses `/fleet`'s name. Nobody has decided which of the site's own two names
> the business prefers. **The console's job here is to show the business its
> own inconsistency**, not to quietly pick a side.

**20. `Fleet`, then `Chauffeurs`.**

> **Look at:** no plates, no colours, no ratings, no tenure. Each row says which
> field is missing and why. None of those exist in the data, so none of them are
> invented.

**21. Tap through `Users & Roles`, `Promotions`, `Coverage`, `Support`,
`Settings`.**

> **Look at:** every one names the table, endpoint or unanswered question that
> would fill it. Not "coming soon". **This turns the console into a
> specification** — a list of what to build next, written by the thing that
> needs it.

---

## What this demo cannot do, and why

Read this before showing the product to anyone. A demo that hides its limits
gets found out in the room.

**There is no map on the web tracking screen.** `react-native-maps` has no web
build. The screen shows a designed placeholder and the real, updating distance
to pickup. On iOS and Android the map is the screen. Three options for the web
demo — leave the placeholder, add a static route image, or add a web mapping
library — are costed in `HANDOFF.md`; nobody has chosen yet.

**Nothing propagates between devices.** The two tabs in Part 2 share state
because they share one browser's storage. Two *phones* would not. A dispatcher
moving a real customer's screen needs a live channel that does not exist yet —
gap G-3.

**There is no backend.** Every screen runs against demo data held in your
browser. No booking is created, no card is charged, no message is sent. Reset
demo returns everything to the start.

**The chauffeur and admin screens are previews of products that do not exist.**
They are built on the real data model, so they are a fair picture of what those
products would look like — but nothing behind them has been built.

**Prices are demo figures.** The published starting prices come from
`lctuniversal.com` and were confirmed by the business. The five rate cards in
Class Builder were read off a screen recording and are explicitly unconfirmed.
**They are two different catalogues and they disagree** — that is a real open
question, not a demo artefact, and it is the first item in `HANDOFF.md`.

**Times are shown in your device's timezone**, not the pickup's. A Dallas pickup
read on a phone set to London time shows London's clock. Bookings carry no
timezone — gap C-4b.

**Nothing here has been verified on a real phone.** Frame rates, cold start,
haptics, the sheet's drag behaviour, and the map with real keys are all
untested. Each has a written procedure in `DEVICE_VERIFICATION.md` and needs a
device and half an hour. (Arabic/RTL is not on this list — it was reversed as
a business decision on 2026-08-30, not deferred pending a device; see
`DESIGN_CHANGELOG.md`.)

---

## If something looks wrong

**A screen is empty.** Check `EXPO_PUBLIC_DEMO_MODE` in the Netlify environment.
Without it the app is not in demo mode and has no backend to talk to.

**A deep link 404s.** The deployed site handles this; a local `serve dist`
without `--single` does not. `expo export` emits a single `index.html`.

**The state looks stale.** Account → Reset demo.

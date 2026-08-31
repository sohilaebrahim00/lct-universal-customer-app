# LCT Universal — app preview walkthrough

A numbered walk through the app preview, written to be followed without anyone
from our side in the room. About twelve minutes end to end.

**Open:** <https://lctapp.netlify.app/>
**On:** a laptop browser. It works on a phone browser too, but Part 3 (the
operations console) is easier to read wide.

**Before you start:** go to **Account → Reset demo** and confirm. The preview
remembers what you do between visits, so a fresh reset makes step 1 look the
way this guide describes. Do this once before you show it, not while showing
it.

> Everything below runs on sample data stored in your own browser. Nothing is
> sent anywhere, no real trip is booked, and no card is charged. What this
> preview can't do yet is listed at the end — please read that section before
> you show this to anyone else, so nothing in it comes as a surprise.

---

## Part 1 — Booking a car, as a customer (about 4 minutes)

**1. Open <https://lctapp.netlify.app/>**
Look at the home screen: an upcoming ride at the top with live status, and two
past trips below with their final fares. This is what a returning customer
sees.

**2. Tap "Book a car."**
Look at the pickup step: the saved addresses (Home, Northline HQ, DFW
Terminal D) are real Dallas–Fort Worth locations, not sample text.

On a browser, this step shows a note in place of the interactive map — that's
explained in the limitations section below, not a bug.

**3. Choose "Home" as pickup, then tap "Confirm pickup."**

**4. Choose "DFW Terminal D" as the destination, then confirm.**
Look at: the route distance appears once both ends are set, and the price
estimate is built from that distance — not a fixed number shown regardless of
where you're going.

**5. On the vehicle step, choose "Executive Sedan."**
Look at the price on the card. **This is the whole promise of the product:**
that price is final. It's the same number that appears on the payment screen,
and again on the receipt at the end. Write it down — you'll check it twice.

Also look at: scroll to "Mercedes Sprinter" or "Coach." These show **Request
Quote** instead of a price, because those vehicles aren't quoted without a
conversation first.

**6. Continue through the details step (date, time, passengers) to payment.**
Look at: the price breakdown is shown openly — base fare, distance, gratuity,
tax — not hidden behind a tap. The total matches step 5.

**7. Confirm the booking**, then tap through to the trip screen.

---

## Part 2 — The chauffeur drives it, and the customer's screen updates live (about 5 minutes)

This is the part worth slowing down for. **Open a second browser tab** and
keep the customer's trip screen open in the first tab so you can switch back
and forth.

The chauffeur and dispatch screens you're about to see are **previews of
products that don't exist yet** — every one of them says so on screen. They
exist to show what the same trip looks like from the other side, built on the
same real data.

**8. In tab 2, open <https://lctapp.netlify.app/_role/chauffeur>**
This is one chauffeur's job list for today. If it says no jobs, that's
correct — today's sample rides belong to other chauffeurs.

**9. Open <https://lctapp.netlify.app/_role/dispatcher> and tap the ride for
"Yolanda Pierce."**
This is dispatch's view of a single ride: who's driving it, what stage it's
at, and the control to assign someone.

**10. Now drive that ride through its stages.** Open
<https://lctapp.netlify.app/_role/status?id=demo-booking-upcoming>
Look at: one button at a time. There's never a list of statuses to pick from
— only one move is ever legal, so the chauffeur is never asked to decide what
happened.

**11. Tap "I'm on my way."** Switch to tab 1 and reload the customer's trip
screen.
Look at: both the headline and the stage tracker have moved to "Chauffeur En
Route" — one action in tab 2 moved what tab 1 shows, because both are reading
the same trip.

**12. Back in tab 2, tap "I've arrived."** Switch to tab 1 and reload.
**This is the moment to slow down and look closely:**
- The headline now reads **"Your chauffeur is outside."**
- A countdown has started — the complimentary waiting time included with the
  ride (30 minutes on a standard ride, 60 on an airport transfer).
- **There is no price anywhere on that countdown.** No fee, no per-minute
  charge, no running total — it's a policy the business has already
  confirmed, not something being priced live.
- The earlier "arriving in N minutes" line is gone, on purpose — once the car
  is outside, there's nothing left to estimate.

**13. In tab 2, tap "Passenger on board."** It will ask you to confirm first.
Look at: the confirmation spells out what the customer will see, not just
what the button does. This step and completing the ride both ask first,
because neither can be undone.

**14. Tap "Start the trip," then "Complete the ride."**

**15. Switch to tab 1 and reload.**
Look at the receipt. **Check the total against the number you wrote down in
step 5** — it's the same figure, from the same source, never recalculated.

A rating prompt appears here, and only here — never while a customer is
watching a car approach.

---

## Part 3 — The same ride, from operations (about 3 minutes)

**16. Open <https://lctapp.netlify.app/_role/admin>**
Sixteen sections across the top. This is a **preview**, not a replacement for
the operations system LCT already runs day to day — it's a separate,
unconnected build.

**17. "Overview."**
Look at the counts, then look at "Revenue" and "Ratings" just below them —
both say what data they're missing instead of showing a made-up chart. There's
no real payment or ratings data behind this preview, so there's no graph
pretending there is.

**18. "Live Dispatch" → tap "Assign chauffeur" on any ride.**
This is the one screen in the whole console that actually changes something.
Assign someone, then reload the customer's trip in tab 1 — the chauffeur has
changed there too.

Also look at: each chauffeur is marked *class attachment unknown*. The real
operations system groups chauffeurs by which vehicle class they drive; this
preview has no such data, so it says so rather than guessing.

**19. "Class Builder" — worth a minute here.**
Look at: five vehicle classes with full rate cards, and a banner stating
plainly that these figures are **unconfirmed** — read off a screen recording
of the real operations system, not a published rate. Try the **+** or **−**
next to a minimum fare: an "unsaved" notice appears, and reloading discards
the change entirely. That's deliberate — these numbers may never be shown to
a customer.

**Then scroll to the bottom.** It shows, side by side, that LCT's own website
publishes two different names for this $110 vehicle class on two different
pages — one page calls it "Executive SUV," the other calls it "SUV." The app
uses the name from the page built to be the catalogue. Nobody at LCT has said
which name they'd prefer yet, and that's a business choice, not something the
software should guess at.

**20. "Fleet," then "Chauffeurs."**
Look at: no license plates, no vehicle colors, no chauffeur ratings, no tenure
shown. Each row names exactly which piece of data is missing rather than
inventing one — none of that data exists yet, so none of it is shown.

**21. Click through "Users & Roles," "Promotions," "Coverage," "Support," and
"Settings."**
Look at: every one of these names the specific system or decision it's
waiting on. Not "coming soon" — a concrete list of what would need to be built
or answered next.

---

## What this preview cannot do yet, and why

Please read this section before showing the app to anyone. Finding out its
limits by accident, in the room, is a worse conversation than hearing them
from us first.

**There's no live map on the web preview.** The mapping library this app uses
doesn't have a web version. What you see instead is a designed placeholder
plus a real, updating distance to pickup. On an iPhone or Android phone, the
map is the whole tracking screen — this is a limitation of the web preview
specifically, not of the product.

**Nothing updates between two separate phones.** The two browser tabs in Part
2 update each other because they share one browser's storage. Two different
phones would not see each other's changes yet — moving a real customer's
screen requires a live connection between devices that hasn't been built.

**There is no live backend behind any of this.** Every screen runs on sample
data stored in your browser. No trip is actually booked, no card is charged,
no message is actually sent anywhere. "Reset demo" returns everything to the
start.

**The chauffeur and operations-console screens are previews of products that
don't exist yet.** They're built on the same real data model the customer app
uses, so they're an honest picture of what those products would look like —
but nothing behind them has actually been built or connected.

**The starting prices shown come from two different sources that disagree
with each other.** The published "From $X" prices come directly from LCT's
own website and were confirmed by the business. The detailed rate cards in
"Class Builder" were read off a screen recording of the internal operations
system and are explicitly marked unconfirmed. Those are two different sets of
numbers, and they don't match — that's a real, open question for the
business, not something introduced by this preview.

**Times shown are in your own device's clock**, not the pickup location's. A
Dallas pickup viewed on a phone set to a different time zone will show that
phone's time instead. The booking data itself doesn't yet record which time
zone a trip is in.

**Nothing here has been tested on an actual phone yet.** Frame rate, how fast
the app opens, how it feels to drag things on a touchscreen, and how it reads
with the phone's larger-text accessibility setting turned on are all still
unverified. Each has a written test procedure ready to go — it just needs
someone with a phone to run it.

---

## If something looks wrong while you're showing it

**A screen is empty when it shouldn't be.** This usually means a setting on
our hosting side got flipped off — let us know immediately, it's a fast fix
on our end, not something to troubleshoot live.

**A link 404s.** Refresh the page once; if it persists, tell us which link.

**The data looks stale or out of order.** Go to Account → Reset demo.

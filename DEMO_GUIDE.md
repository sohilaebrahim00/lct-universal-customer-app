# LCT Universal — demo

A working preview of the LCT Universal customer app. Open the link on a phone or
a laptop and use it exactly as a client would.

It opens already signed in, as a customer called Michael Okafor with one car
booked and two past trips, so you can see the app as a real client sees it
rather than as an empty account.

---

## The walk-through

**1. Home.** Your next car is the first thing on screen — the chauffeur, the
vehicle, and how long until pickup. Below it, the two journeys you take most
often, each with the price you actually paid.

**2. Book a car.** Tap the gold button at the bottom.

- Type a pickup address, then **Set pickup**.
- Type a destination, then confirm.
- **Choose your car.** Three classes, each with its photograph and its price.
  Every price is the final price — gratuity and tax are already inside it.
  Nothing is added later.
- **When & who.** Pick a date and time.
- **Review & pay.** The breakdown is open by default. The total is the same
  number you picked the car on, and the button tells you the amount before you
  press it.
- **Confirmed.** Your reservation, with its own code.

**3. Find it again.** Tap **Trips**. The car you just booked is at the top of
Upcoming. Open it to see the live tracking view.

**4. Have a look round.** Concierge, Account, the fleet — all reachable from the
tab bar and from Account.

---

## What is real and what is not

**Real.** Every layout, every price, every calculation. The fares are worked out
by the same pricing code the live product uses, from LCT Universal's actual rate
card — an Executive Sedan really is $65 base plus $3.25 a mile, with gratuity at
20% and tax on top. Nothing on screen is a typed-in number.

**Cancellation.** The window shown is your real published policy for the service
you are booking — 6 hours on an airport transfer, 12 on a sedan or SUV trip, 48
on hourly and events.

**Demo data.** The customer, the chauffeur, the Dallas–Fort Worth addresses, the
trips and the distances are a prepared example so there is something to look at. This build has
no connection to a live system: no real booking is created, no card is charged,
and nothing reaches dispatch. You can press anything.

**Your booking sticks.** Refresh the page, close the tab and come back — the car
you booked is still there. To hand the demo to someone else from a clean start,
go to **Account → Reset demo**.

---

## Not built yet

Honest about the edges, so nothing surprises you:

- **Maps are not live.** Pickup and destination take a typed address instead of
  an interactive map. The map screens exist and work; they need a Google Maps key
  that has not been issued yet.
- **Hourly service is switched off in this preview.** It needs a duration step
  that is not in the flow yet, so the tile says so rather than taking you
  somewhere unfinished.
- **Sprinters and coaches show "Request quote", not a price.** That is on
  purpose: LCT quotes those classes by hand, so the app does not put a number on
  them.
- **Payment is not connected.** The payment screen is complete, but no card is
  taken and no money moves.
- **Some screens are still the previous design.** Live tracking, the concierge
  chat, and a few account pages work and are populated, but have not yet been
  through the redesign. They will look plainer than the rest.
- **One service detail is still blank on purpose.** Complimentary waiting time
  is not shown anywhere, because it is not published on your website and has not
  been confirmed. Rather than print a number that might be wrong, the app prints
  nothing. Tell us the figure and it appears everywhere it belongs.
- **Customer reviews have been removed.** The earlier version showed testimonials
  that were written as placeholders. They are gone until there are real ones.

Still to come: the accessibility pass, the performance pass, Arabic and
right-to-left support, and the offline states.

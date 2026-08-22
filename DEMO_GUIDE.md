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

**Demo data.** The customer, the chauffeur, the addresses, the trips and the
distances are a prepared example so there is something to look at. This build has
no connection to a live system: no real booking is created, no card is charged,
and nothing reaches dispatch. You can press anything.

**One thing to know:** refreshing the browser starts the demo over. Any car you
booked during your visit disappears and the example trips come back. That is
deliberate, so the next person sees the same starting point.

---

## Not built yet

Honest about the edges, so nothing surprises you:

- **Maps are not live.** Pickup and destination take a typed address instead of
  an interactive map. The map screens exist and work; they need a Google Maps key
  that has not been issued yet.
- **Payment is not connected.** The payment screen is complete, but no card is
  taken and no money moves.
- **Some screens are still the previous design.** Live tracking, the concierge
  chat, and a few account pages work and are populated, but have not yet been
  through the redesign. They will look plainer than the rest.
- **Three service details are blank on purpose.** The free-cancellation window,
  the complimentary waiting time, and the dispatch phone number are not shown
  anywhere, because LCT Universal has not confirmed them yet. Rather than print a
  number that might be wrong, the app prints nothing. Once you tell us the three
  figures they appear everywhere they belong.
- **Customer reviews have been removed.** The earlier version showed testimonials
  that were written as placeholders. They are gone until there are real ones.

Still to come: the accessibility pass, the performance pass, Arabic and
right-to-left support, and the offline states.

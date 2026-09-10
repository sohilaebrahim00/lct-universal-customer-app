import type { VehicleType } from '../types/api';

/**
 * ── THE COMMENT HERE ONCE CLAIMED THESE WERE THE FLEET PHOTOGRAPHS ─────────
 *
 * It read "Real LCT Universal fleet photography … not stock/placeholder
 * images." **That was false**, and false in the most durable way — asserted in
 * the file that loads them, where nobody rechecks it. There is an irony in it
 * worth keeping: the claim was not merely wrong, it was **true of images this
 * app did not have.** The real photography existed the whole time, one
 * directory away in the website repo.
 *
 * Verified 2026-09-02 by md5: the old files were byte-identical to
 * `public/assets/fleet-{sedan,suv,sprinter}.jpg` — studio RENDERS, which the
 * website itself superseded. Its `src/lib/image-map.ts` points every fleet
 * class at client-supplied photographs under `public/assets/official/`, naming
 * the camera originals in its notes (`IMG_8626.JPEG`, `IMG_2444.PNG`).
 *
 * ── Two classes moved to the real photographs, 2026-09-02 ─────────────────
 *   `sprinter`        ← `official/sprinter-exterior.jpg`
 *   `executive_sedan` ← `official/sedan-chauffeur-crop.jpg`
 *
 * The renders they replace were **wrong about the product**, not merely plain:
 * the Sprinter was a *cargo panel van on steel wheels* illustrating a class
 * this app sells as up to 14 passengers, and the sedan was an S-Class on gold
 * aftermarket wheels with a short run of garbled characters where a model badge
 * sits. Both are on the booking picker, which is where a customer compares what
 * to pay for.
 *
 * Copied INTO this repository and resized to the 1200px width the other assets
 * use (`@expo/image-utils`, quality 80, no crop) — 216 KB and 228 KB, against
 * 560 KB and 633 KB camera originals. This app does not reference a sibling
 * checkout, and `HANDOFF.md` §9 records a 6-10s first load on cellular that
 * 1.2 MB of picker art would have made worse.
 *
 * Neither carries third-party branding. The Sprinter's only lettering is the
 * coachbuilder's "Legend" badging; the sedan carries none.
 *
 * ── The SUV was HELD, and the hold is now RESOLVED — 2026-09-10 ───────────
 * The website's Escalade photographs both carried another operator's branding:
 * a front plate with a phone number and web address, and a rear-window decal
 * with a **scannable QR code**. A logo is a claim; a QR code is a working link,
 * and it would have sat on the screen where a customer chooses what to pay for.
 * So the class kept a studio render and the question went to the business.
 *
 * **It was answered by supply rather than by argument.** On 2026-09-10 the
 * client sent clean imagery — an Escalade, a Suburban, an S-Class, and four
 * LCT-liveried group vehicles, none carrying a third party's marks and none
 * carrying a QR code. `suv` therefore moves to the clean Escalade, which is
 * also the vehicle its own row has always named.
 *
 * ── Four of the seven supplied images are NOT here, deliberately ──────────
 * The same message asked for seven customer-facing classes. Four of them —
 * Luxury SUV, First Class, Mini Bus (27) and a Motor Coach split from Mini
 * Coach — **have no rate card**. `/rates` publishes "From $130" and
 * "$150/hour" as STARTING LABELS; the fare engine needs a base rate, a
 * per-mile rate and a per-hour rate, and the Mini Bus has nothing published at
 * all. Creating those classes would mean typing three numbers per class and
 * quoting real bookings from them.
 *
 * Their images are preserved, unreferenced, in
 * `design/fleet-supplied-2026-09-10/` so nothing is lost while the rates are
 * asked for. They are deliberately NOT in `assets/vehicles/`, where
 * `tests/vehicleImages.test.ts` forbids an unreferenced file — an orphan
 * beside its siblings is an invitation to wire it up by accident.
 *
 * Metro requires static string literals for require(), so this is a literal map
 * rather than a computed path.
 */
export const VEHICLE_IMAGES: Record<string, number> = {
  // The client's own chauffeur-and-S-Class photograph. Kept: the studio
  // Mercedes supplied on 2026-09-10 is mapped to FIRST CLASS, a class that
  // does not exist yet — see the fleet note below.
  executive_sedan: require('../../assets/vehicles/executive-sedan-chauffeur.jpg'),
  // Client-supplied 2026-09-10. Replaces the studio render that was held
  // pending the LuxLane question — that question is now resolved by supply.
  suv: require('../../assets/vehicles/premium-suv-escalade.jpg'),
  // Client-supplied 2026-09-10, LCT-liveried. Replaces the DFW-lot photograph.
  sprinter: require('../../assets/vehicles/executive-sprinter.jpg'),
  // Client-supplied 2026-09-10, MCI J4500 in LCT livery.
  coach: require('../../assets/vehicles/motor-coach-mci.jpg'),
};

/**
 * ── `suv` WAS "Luxury SUV". CHANGED 2026-08-28, AND REVERSIBLE IN ONE LINE ──
 *
 * **The old label was wrong under either of the site's own namings.** Read from
 * primary source on 2026-08-26, both `lctuniversal.com/fleet` and
 * `lctuniversal.com/rates` reserve the name **Luxury SUV** for the **$130**
 * class. The app's `suv` class is published at **From $110** — a different
 * class — and was carrying the more expensive one's name.
 *
 * Leaving a known-wrong customer-facing label in production is itself a
 * decision, and the worse one. Moving to a name the site publishes is strictly
 * an improvement.
 *
 * ── Which of two published names, and why this one ─────────────────────────
 * The two pages disagree. For the $110 class:
 *
 *   `lctuniversal.com/fleet`   read 2026-08-26   **Executive SUV**   ← chosen
 *   `lctuniversal.com/rates`   read 2026-08-26   SUV
 *
 * `/fleet` is the catalogue — the page whose job is naming the classes.
 * `/rates` is a pricing page that happens to list them.
 *
 * **It also makes the app internally consistent.** `DEMO_VEHICLES` already
 * carries the literal string `'Executive SUV'` as the vehicle's `name`, so the
 * home screen, the booking picker, `PricingPreview` and `TrackingSheet` have
 * been showing that all along while Fleet and Corporate showed "Luxury SUV".
 * One class, two names, in one app. That is now one name.
 *
 * ── What did NOT change ────────────────────────────────────────────────────
 * The price. `PUBLISHED_STARTING_LABELS.suv` is still `From $110`, which is
 * what both pages publish for this class.
 *
 * ── Still open ─────────────────────────────────────────────────────────────
 * Which of the two published names the business wants — `OPEN_QUESTIONS.md` 2.
 * The question is now "which of these two", not "is the current one right".
 */
export const VEHICLE_DISPLAY_NAME: Record<VehicleType, string> = {
  executive_sedan: 'Executive Sedan',
  suv: 'Executive SUV',
  // Both published pages and the client's 2026-09-10 list agree on this name.
  sprinter: 'Executive Sprinter',
  coach: 'Coach',
};

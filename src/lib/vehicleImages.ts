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
 * ── Why the SUV is HELD, and it is one class rather than the fleet ────────
 * The client-supplied Escalade photographs — both of them — visibly carry
 * **another company's branding**: a LuxLane Transports front plate with phone
 * number and web address, and a rear-window decal with a **scannable QR code**.
 *
 * A logo is a claim; a QR code is a working link, and this one would sit on the
 * screen where a customer chooses what to pay for. Whatever LuxLane is —
 * possibly the same business under another name — routing a customer out of the
 * checkout is a decision to take deliberately rather than by default. So `suv`
 * keeps the render it has, nothing regresses, and the open question is now one
 * class. `OPEN_QUESTIONS.md` #13.
 *
 * Metro requires static string literals for require(), so this is a literal map
 * rather than a computed path.
 */
export const VEHICLE_IMAGES: Record<string, number> = {
  // Real photographs, client-supplied. See the note above for provenance.
  executive_sedan: require('../../assets/vehicles/executive-sedan-chauffeur.jpg'),
  sprinter: require('../../assets/vehicles/sprinter-passenger.jpg'),
  // STILL THE RENDER, and deliberately. See "why the SUV is held" below.
  suv: require('../../assets/vehicles/luxury-suv.jpg'),
  coach: require('../../assets/vehicles/coach.jpg'),
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
  sprinter: 'Mercedes Sprinter',
  coach: 'Coach',
};

import type { VehicleType } from '../types/api';

/**
 * ── THESE ARE NOT THE FLEET PHOTOGRAPHS, AND THE COMMENT HERE SAID THEY WERE ─
 *
 * The previous version of this comment read "Real LCT Universal fleet
 * photography … not stock/placeholder images." **That was false**, and it was
 * false in the most durable way — asserted in the file that loads them, where
 * nobody rechecks it.
 *
 * Verified 2026-09-02 by md5 against the website repo: these three files are
 * byte-identical to `public/assets/fleet-{sedan,suv,sprinter}.jpg`, which are
 * studio RENDERS on black. The website has **superseded all three** — its
 * `src/lib/image-map.ts` points `fleetSedan`, `fleetSuv` and `fleetSprinter` at
 * client-supplied photographs under `public/assets/official/`, with camera
 * originals named in its notes (`IMG_8626.JPEG`, `IMG_2444.PNG`).
 *
 * Two of the three renders are also wrong about the product:
 *   - the sedan is an S-Class on **gold aftermarket wheels**, with a short run
 *     of garbled characters where a model badge sits;
 *   - the Sprinter is a **cargo/panel van on steel wheels**, illustrating a
 *     class this app sells as *up to 14 passengers*.
 *
 * ── Why they have NOT been swapped ────────────────────────────────────────
 * The real photographs visibly carry **another company's branding** — a
 * "LuxLane Transports" plate, decal, QR code and phone number. Putting that
 * inside this app is a decision about who the customer thinks they are booking
 * from, and it is the business's to make. `OPEN_QUESTIONS.md` #13.
 *
 * Metro requires static string literals for require(), so this is a literal map
 * rather than a computed path.
 */
export const VEHICLE_IMAGES: Record<string, number> = {
  executive_sedan: require('../../assets/vehicles/executive-sedan.jpg'),
  suv: require('../../assets/vehicles/luxury-suv.jpg'),
  sprinter: require('../../assets/vehicles/sprinter.jpg'),
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

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
 * ── THIS MAP IS THE BOOKABLE CLASSES ONLY ─────────────────────────────────
 * Four `VehicleType` values, four images, and it powers the booking picker.
 * The **customer-facing catalogue of seven classes** lives in
 * `src/config/fleetCatalogue.ts`, which carries the three display-only classes
 * this map has no key for. Both files require from `assets/vehicles/`, and
 * `tests/vehicleImages.test.ts` reads BOTH when it looks for an orphan — it
 * read only this one at first, and reported two correctly-referenced files as
 * unreferenced.
 *
 * Two of the seven supplied images are still not in `assets/vehicles/`: the
 * Suburban and the Freightliner mini-coach both have malformed lettering. They
 * stay in `design/fleet-supplied-2026-09-10/`, and their catalogue entries
 * carry `image: null` with the reason, so the CLASS appears and the photograph
 * is the only thing missing.
 *
 * Metro requires static string literals for require(), so this is a literal map
 * rather than a computed path.
 */
export const VEHICLE_IMAGES: Record<string, number> = {
  /*
   * The studio Mercedes the client supplied for FIRST CLASS, which is what
   * this class is now called on the fleet page.
   *
   * It replaces their chauffeur-and-S-Class photograph, and the reason is
   * consistency rather than preference: the booking picker reads this map and
   * the fleet page reads the catalogue, so two photographs for one class would
   * have put a different car on the two screens a customer compares. One
   * class, one image. The photograph remains in git history and in the website
   * repository it came from.
   */
  executive_sedan: require('../../assets/vehicles/first-class-sedan.jpg'),
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
/**
 * ── ONE NAME PER CLASS, ENFORCED BY TEST RATHER THAN BY DERIVATION ────────
 *
 * These names and `FLEET_CATALOGUE`'s must agree, and `tests/fleetMapping.test.ts`
 * asserts they do for every class the catalogue marks bookable.
 *
 * **Deriving them from the catalogue was tried first, and is the wrong trade.**
 * Three existing tests PARSE this literal block out of the source text —
 * they must, because Jest cannot import a module that `require()`s a .jpg —
 * and replacing the literals with a function call broke all three for no
 * behavioural gain. A test that fails on divergence gives the same guarantee
 * and costs nothing to read.
 *
 * ── What changed on 2026-09-10, and what did not ──────────────────────────
 * The client's fleet list renames two classes for customers. **No ID moved**,
 * so every stored booking, dispatch record and rate card is untouched:
 *
 *   `executive_sedan` → "First Class"    (keeps its $65/$3.25/$100 rate card)
 *   `suv`             → "Premium SUV"    (keeps its $85/$3.75/$120 rate card)
 *
 * `coach` has no catalogue entry carrying a `vehicleType` — both coach classes
 * are display-only until they are priced — so it keeps a neutral fallback, and
 * no vehicle row returns it today in any case.
 */
export const VEHICLE_DISPLAY_NAME: Record<VehicleType, string> = {
  // Client's 2026-09-10 fleet list. `executive_sedan` keeps its ID — and its
  // complete rate card — while the customer-facing name becomes First Class.
  executive_sedan: 'First Class',
  // Same: the $110 class keeps its ID, and the client's mapping puts the
  // Escalade under "Premium SUV". Their operations panel maps it the other
  // way; see fleetCatalogue and OPEN_QUESTIONS #15.
  suv: 'Premium SUV',
  sprinter: 'Executive Sprinter',
  // No catalogue entry carries this type — both coach classes are display-only
  // until they are priced — and no vehicle row returns it today.
  coach: 'Coach',
};

/**
 * LCT Universal's rating, as published on their reputation dashboard.
 *
 * A SNAPSHOT, not a live feed. There is no reviews endpoint and no integration;
 * these two numbers were read once, by hand, on the date below. That is exactly
 * why the source and the date sit in the constant rather than in a commit
 * message — anyone reading this later can tell how old it is and where to check.
 *
 * Re-read it before a launch, or wire the dashboard up properly and delete this.
 *
 * This is NOT the invented `ReviewsSection` that used to ship on Home. That
 * carried four testimonials attributed to named individuals and was written for
 * a prototype; the file is deleted. These are real aggregate figures with a
 * named source, shown as one quiet line with no stars graphic and no quotes.
 */
export const reputation = {
  rating: 4.93,
  reviewCount: 55,
  source: 'Clienity reputation dashboard',
  /** ISO date the figures were read. */
  readOn: '2026-08-22',
} as const;

/** "4.93 from 55 reviews" — one line, no decoration. */
export const reputationSentence = `${reputation.rating} from ${reputation.reviewCount} reviews`;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  NOT RENDERED. The company's own website declines to publish this.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `lctuniversal.com/reviews`, re-read from primary source on **2026-08-26**,
 * says in the company's own words:
 *
 *   "LCT Universal only publishes verified reviews from our own clients. As we
 *    collect and verify them, they will appear on this page."
 *   "COMING SOON — Verified reviews, only."
 *   "We are in the process of collecting and verifying client testimonials from
 *    real journeys. **Rather than publish placeholder quotes, we choose to leave
 *    this page honest.**"
 *
 * So the app was showing "4.93 from 55 reviews" on its home screen while the
 * business's own public position is that it has no verified reviews to publish
 * yet and has deliberately chosen not to imply otherwise.
 *
 * The figures are not invented — they were read by hand from a third-party
 * reputation dashboard, and they may well be accurate. But an app making a
 * public claim its own company has decided not to make is the same defect as
 * `From $65.00`, pointed at reputation instead of price, and the exposure lands
 * on the client rather than on us.
 *
 * **The line is therefore no longer rendered.** The constant is kept, with its
 * source and both dates, so whoever answers the question has the figures in
 * front of them. Removing a claim is the safe direction; restoring it needs one
 * sentence from the business.
 *
 * See `OPEN_QUESTIONS.md` — this is question 1.
 */
export const REPUTATION_SITE_POSITION = {
  page: 'lctuniversal.com/reviews',
  readOn: '2026-08-26',
  publishesReviews: false,
  quote: 'Rather than publish placeholder quotes, we choose to leave this page honest.',
} as const;

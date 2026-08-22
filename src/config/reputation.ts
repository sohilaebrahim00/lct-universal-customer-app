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

# Slice reports

Written as each part finished. What was done, what was measured, what was **not**
verified, and the wrong turns.

---

# Part 0 — read the website, shorten the question list

## What was read

`lctuniversal.com`, **2026-08-26**, from primary source. Paths discovered from
the site's own navigation and footer rather than guessed, then read directly:

`/` `/fleet` `/rates` `/services` `/airport` `/corporate` `/events` `/faq`
`/terms` `/cancellation-policy` `/service-areas` `/reviews` `/about` `/contact`

The FAQ is an accordion — all twelve questions were expanded before reading, or
the answers would have been invisible.

`BACKEND_FOLLOWUPS.md` §6 was **not** consulted, as instructed.

## The headline finding: the app published a rating the site refuses to publish

`/reviews` says, in the company's words: *"Rather than publish placeholder
quotes, we choose to leave this page honest."* No verified reviews exist yet.

The app's home screen was showing **"4.93 from 55 reviews"** — real figures,
hand-read from a third-party dashboard on 2026-08-22, with a source and a date.
Not invented. But the business has **deliberately chosen not to make that claim
publicly**, and the app was making it on the first screen a customer sees.

**Acted on:** the line is no longer rendered. The constant is kept with both
dates and the site's quote. **This is question 1 in `OPEN_QUESTIONS.md`** —
restoring it needs one sentence from the business.

Judged not to be a stop: it is not a price, a class name or a published policy,
and removing an unsupported claim is the conservative direction. Shipping a
known contradiction would not have been.

## The second finding: the site contradicts itself on class names

`/fleet` and `/rates`, read the same day, publish the **same prices and
capacities under different names** for four of seven classes. `/fleet` prefixes
"Executive"; `/rates` does not.

This **sharpens** the outstanding naming defect instead of resolving it: both
pages reserve "Luxury SUV" for the **$130** class, so the app labelling its
**$110** class "Luxury SUV" is wrong under either naming. What remains open is
only "SUV" versus "Executive SUV" — a choice between the client's own two pages.

**Not changed.** A class name is a customer-facing value. `OPEN_QUESTIONS.md` 2.

This also partially rehabilitates the transcription I called wrong in Slice 10.
`BACKEND_FOLLOWUPS.md` §6 said "SUV"; `/fleet` says "Executive SUV". **Both were
right about different pages.** My correction was itself half wrong, and the only
reason that is visible now is that the site was re-read rather than re-argued.

## What changed in code

**No value was edited.** Every figure in `publishedFleet.ts` and
`servicePolicy.ts` was confirmed against the site and matches:

- `From $95`, `From $110`, Request Quote ×2 — match `/rates` and `/fleet`
- 12 h / 6 h / 48 h cancellation and the 6 h modification cutoff — match
  `/cancellation-policy` exactly
- dispatch number `+1 (888) 615-4065` — matches

What was **added** is provenance and newly-published fact, none of it rendered:
`PUBLISHED_FLEET_REREAD`, `CANCELLATION_FEE_TIERS_PUBLISHED` (the 50% and
no-show tiers the site states and the app has never shown), and
`SITE_ANSWERS_2026_08_26`.

## Question count: **16 → 9**

Seven closed, each with the sentence that closed it, listed at the foot of
`OPEN_QUESTIONS.md`. The most useful: **hourly is "no meter to watch"**, which
settles the competitor's included-mileage model as *not what LCT sells*; and
**meet-and-greet is a published preference**, not an unanswered extra.

## What was NOT verified

- **That the site is stable.** It was read once, today. `/fleet` and `/rates`
  disagreeing means at least one is edited independently of the other, so any
  figure here has a shelf life. The read date is recorded on every constant.
- **That the Clienity rating is wrong.** It may be accurate. What is established
  is only that the company does not publish it.
- **`/hourly` does not exist** (109 chars, not in the site's own navigation).
  Hourly is described in the FAQ instead. No hourly-specific terms page was
  found, so hourly minimum duration remains unpublished.

## Wrong turns

- Read `/reviews` last, almost as an afterthought, and it held the most
  important finding in the part. The pages that look least likely to carry a
  fact are the ones a transcription skips.
- First FAQ read returned the questions with all answers collapsed and I nearly
  recorded "the FAQ answers nothing". Expanding the accordion changed the
  outcome of two questions.

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { AppText } from '../ui/Typography';
import { PriceBreakdown } from '../ui/PriceBreakdown';
import { Surface } from '../ui/Surface';
import { gutter, iconSize, iconStroke, radius, space, theme } from '../../theme';
import { serverFareFrom } from '../../lib/serverFare';
import { formatDateTime } from '../../lib/format';
import type { Booking } from '../../types/api';

/**
 * THE RECEIPT — shown once a ride is completed.
 *
 * ── The fare is READ, never recomputed ──────────────────────────────────────
 * Every figure comes from `serverFareFrom(booking)`, which reads the columns
 * the server priced. Nothing on this screen multiplies, adds or re-derives a
 * fare, and `tests/quoteIsNotScaled.test.ts` covers this module for exactly
 * that reason: it is the last screen between the quote and the customer, and
 * the last place a number could quietly change.
 *
 * There is deliberately no "recalculated at completion" line, no distance
 * reconciliation and no waiting charge — the fare was fixed at booking and the
 * receipt's whole job is to show that it did not move.
 *
 * ── Why a rating is offered HERE and not on the tracking sheet ─────────────
 * `TrackingSheet` carries a documented rule: nothing is ever sold or asked for
 * on it, "no upgrade prompt, no rate-your-driver", because a customer watching
 * a car approach is captive and least able to evaluate anything put in front of
 * them. That rule is about the LIVE screen. A completed trip is a record, the
 * customer is no longer waiting on anything, and asking then costs them
 * nothing. Same product, different moment.
 *
 * ── What the rating does NOT do ────────────────────────────────────────────
 * It does not display an average, a chauffeur's score, or a count. `Chauffeur`
 * has no rating the backend can supply (`BACKEND_FOLLOWUPS.md` §2), and
 * `reputation.ts` holds the company's own figure with its source and read-date.
 * Inventing a per-chauffeur score here would be the fourth invented fact this
 * project has had to delete. It records the tap and says thank you.
 */

export interface TripReceiptProps {
  booking: Booking;
  chauffeurName: string | null;
  onRate?: (stars: number) => void;
}

export function TripReceipt({ booking, chauffeurName, onRate }: TripReceiptProps) {
  const fare = serverFareFrom(booking);
  const [rated, setRated] = useState<number | null>(null);

  return (
    <View style={styles.wrap}>
      <AppText variant="eyebrow">Completed</AppText>
      <AppText variant="title" accessibilityRole="header" style={styles.headline}>
        Thank you for riding with us
      </AppText>

      {/*
        DEVICE-LOCAL TIME, and that is a known gap rather than a choice.

        The rule this project settled on is the PICKUP's local time, with an
        IANA zone identifier and never an offset. `Booking` carries no zone
        column, so there is nothing to render it in — `BACKEND_FOLLOWUPS.md` §8.
        A receipt for a Dallas pickup read in London will show London's clock.
        Using the device's zone is at least honest about being the device's;
        inventing `America/Chicago` here would be a guess dressed as a fact.
      */}
      <AppText variant="caption" style={styles.when}>
        {formatDateTime(booking.scheduled_at)}
      </AppText>

      <Surface style={styles.card}>
        <AppText variant="label">Route</AppText>
        <AppText variant="body" style={styles.route}>
          {booking.pickup_address}
        </AppText>
        {booking.dropoff_address ? (
          <AppText variant="body" style={styles.route}>
            {booking.dropoff_address}
          </AppText>
        ) : null}
        {chauffeurName ? (
          <>
            <AppText variant="label" style={styles.subLabel}>
              Chauffeur
            </AppText>
            <AppText variant="body">{chauffeurName}</AppText>
          </>
        ) : null}
      </Surface>

      {/*
        The same figure, from the same source, with no recomputation. The
        reassurance line is passed only because it is true: these are the
        booking's own priced columns, not a fresh calculation.
      */}
      <PriceBreakdown
        lines={fare.lines}
        total={fare.total}
        currency={fare.currency}
        reassurance="Fixed when you booked. This is what was charged."
        style={styles.fare}
      />

      <Surface style={styles.card}>
        <AppText variant="label">How was your ride?</AppText>
        {rated === null ? (
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => {
                  setRated(n);
                  onRate?.(n);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${n} ${n === 1 ? 'star' : 'stars'}`}
                style={({ pressed }) => [styles.star, pressed ? styles.pressed : null]}
              >
                <Star size={iconSize.md} color={theme.content.accent} strokeWidth={iconStroke.decorative} />
              </Pressable>
            ))}
          </View>
        ) : (
          <AppText variant="body" style={styles.thanks} accessibilityLiveRegion="polite">
            Thank you — your rating has been recorded.
          </AppText>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xl, gap: space.sm },
  headline: { marginTop: space.xs },
  when: { marginBottom: space.smd },
  card: { padding: space.mdl, borderRadius: radius.lg, gap: space.xs },
  subLabel: { marginTop: space.smd },
  route: { marginTop: 2 },
  fare: { marginVertical: space.smd },
  stars: { flexDirection: 'row', marginTop: space.xs },
  /* 44x44 each, with no gap large enough to leave a dead strip between them. */
  star: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  thanks: { marginTop: space.xs },
});

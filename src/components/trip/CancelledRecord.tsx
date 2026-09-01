import { StyleSheet, View } from 'react-native';
import { AppText } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { gutter, radius, space, theme } from '../../theme';
import { formatDateTime } from '../../lib/format';
import type { Booking } from '../../types/api';

/**
 * WHAT A CANCELLED RIDE LOOKS LIKE. A record, not a live feed.
 *
 * `trips/[id]` replaced the tracking layout with a receipt once a ride
 * completed, under a rule written in capitals in that file — and applied it to
 * one terminal status out of two. A cancelled booking fell through to the
 * full-bleed map, the marker smoother, both pins and the floating sheet, with
 * the cancellation reduced to a single line inside the stage timeline.
 *
 * ── Why this is not a receipt ──────────────────────────────────────────────
 * **Nothing was charged, so no figure appears.** Not a zero, not a struck-out
 * total, not the fare that would have applied. Showing a price on a cancelled
 * ride invites the reading that it is owed, and whether anything is owed
 * depends on when it was cancelled — a question the app cannot answer, because
 * the booking carries no cancellation timestamp and `servicePolicy`'s fee tiers
 * are published but have never been confirmed as chargeable in-app.
 *
 * So: what was booked, that it is cancelled, and the way to book it again.
 */

export interface CancelledRecordProps {
  booking: Booking;
  /** Pre-fills the booking form from this journey. Same mapping the Cancelled tab uses. */
  onRebook: () => void;
}

export function CancelledRecord({ booking, onRebook }: CancelledRecordProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="eyebrow">Cancelled</AppText>
      <AppText variant="title" accessibilityRole="header" style={styles.headline}>
        This ride was cancelled
      </AppText>

      <Surface style={styles.card}>
        <AppText variant="label">Was booked for</AppText>
        <AppText variant="body">{formatDateTime(booking.scheduled_at)}</AppText>

        <AppText variant="label" style={styles.subLabel}>
          Route
        </AppText>
        <AppText variant="body" style={styles.route}>
          {booking.pickup_address}
        </AppText>
        {booking.dropoff_address ? (
          <AppText variant="body" style={styles.route}>
            {booking.dropoff_address}
          </AppText>
        ) : null}
      </Surface>

      {/*
        NO FIGURE. See the note above — nothing was charged, and whether
        anything is owed is a question this app cannot answer.
      */}
      <AppText variant="caption" style={styles.note}>
        Nothing was charged for this ride.
      </AppText>

      <Button label="Book this journey again" onPress={onRebook} style={styles.action} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xl, gap: space.sm },
  headline: { marginTop: space.xs },
  card: { padding: space.mdl, borderRadius: radius.lg, gap: space.xs, marginTop: space.smd },
  subLabel: { marginTop: space.smd },
  route: { marginTop: 2 },
  note: { marginTop: space.smd, color: theme.content.secondary },
  action: { marginTop: space.mdl },
});

import { StyleSheet, View } from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AppText } from '../ui/Typography';
import { space, theme } from '../../theme';
import { formatServiceType } from '../../lib/format';
import type { ParsedBookingIntent } from '../../types/api';

/**
 * WHAT THE CONCIERGE UNDERSTOOD, SHOWN BACK BEFORE ANYTHING IS ACTED ON.
 *
 * ── Why a card and not a button ─────────────────────────────────────────────
 * The old flow put "Continue to Vehicle Selection" under the transcript, and
 * pressing it silently loaded whatever the parser had extracted. A customer who
 * typed "airport pickup tomorrow at 8am" had no way to see whether "tomorrow"
 * had been read as tomorrow, or which airport, until several screens later —
 * and by then the fare had been computed against it.
 *
 * Natural language is the one input in this app where the system's
 * understanding and the customer's intent can differ without either party
 * making a mistake. So it is shown, in full, as fields, before it is used.
 *
 * ── The date is the reason this exists ──────────────────────────────────────
 * `scheduledAtDescription` is a STRING — "tomorrow at 8am" — and the backend
 * does not resolve it to an instant. Nothing in this app may either: a
 * client-side guess at what "tomorrow" means, applied to a fare that is
 * promised as final, is exactly the class of silent substitution this whole
 * redesign exists to remove.
 *
 * So the card shows the phrase the concierge heard, and the primary action
 * takes the customer to the date and time step to set it themselves. It is
 * labelled as such — "Set date & time" rather than "Continue" — so the next
 * screen is never a surprise.
 *
 * ── What it does NOT claim ──────────────────────────────────────────────────
 * No price. The concierge has parsed an intent, not priced a journey, and a
 * figure here would be a fourth number in a project that has already found
 * three too many.
 */

export interface IntentCardProps {
  intent: ParsedBookingIntent;
  onConfirm: () => void;
}

export function IntentCard({ intent, onConfirm }: IntentCardProps) {
  const rows: { label: string; value: string }[] = [];

  if (intent.serviceType) rows.push({ label: 'Service', value: formatServiceType(intent.serviceType) });
  if (intent.pickupAddress) rows.push({ label: 'Pickup', value: intent.pickupAddress });
  if (intent.dropoffAddress) rows.push({ label: 'Destination', value: intent.dropoffAddress });
  if (intent.passengerCount) {
    rows.push({ label: 'Guests', value: `${intent.passengerCount} ${intent.passengerCount === 1 ? 'guest' : 'guests'}` });
  }

  const hasDate = Boolean(intent.scheduledAtDescription);

  return (
    <Card style={styles.card}>
      <AppText variant="micro">Let me confirm</AppText>

      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <AppText variant="captionSm" style={styles.label}>
              {row.label}
            </AppText>
            <AppText variant="body" style={styles.value} numberOfLines={2}>
              {row.value}
            </AppText>
          </View>
        ))}

        {hasDate ? (
          <View style={styles.row}>
            <AppText variant="captionSm" style={styles.label}>
              When
            </AppText>
            <View style={styles.value}>
              {/*
                The customer's own phrase, in quotes, because that is exactly
                what it is — a phrase we heard, not a time we resolved.
              */}
              <AppText variant="body">{`“${intent.scheduledAtDescription}”`}</AppText>
              <AppText variant="captionSm" color={theme.content.tertiary} style={styles.unresolved}>
                You&apos;ll set the exact date and time next.
              </AppText>
            </View>
          </View>
        ) : null}
      </View>

      <Button label="Set date & time" onPress={onConfirm} haptic style={styles.action} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.smd },
  rows: { marginTop: space.smd, gap: space.smd },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.smd },
  label: { width: 84, paddingTop: 3 },
  value: { flex: 1 },
  unresolved: { marginTop: 2 },
  action: { marginTop: space.md },
});

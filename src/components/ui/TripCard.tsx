import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Card } from './Card';
import { StatusPill } from './StatusPill';
import { AppText } from './Typography';
import { colors, spacing } from '../../theme/tokens';
import { formatCurrency, formatDateTime } from '../../lib/format';
import type { TripStatus } from '../../lib/tripStatus';

interface Props {
  serviceLabel: string;
  scheduledAt: string;
  totalFare: number | string;
  currency?: string;
  status: TripStatus;
  pickupAddress?: string;
  dropoffAddress?: string | null;
  onPress?: () => void;
}

/** Shared trip/booking summary row — home's next-trip card and the trips list both render this. */
export function TripCard({
  serviceLabel,
  scheduledAt,
  totalFare,
  currency = 'usd',
  status,
  pickupAddress,
  dropoffAddress,
  onPress,
}: Props) {
  const content = (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <AppText variant="subheading" style={styles.serviceLabel} numberOfLines={1}>
          {serviceLabel}
        </AppText>
        <AppText variant="subheading" color={colors.gold}>
          {formatCurrency(totalFare, currency)}
        </AppText>
      </View>
      <AppText variant="caption" style={styles.dateText}>
        {formatDateTime(scheduledAt)}
      </AppText>
      {pickupAddress ? (
        <AppText variant="bodyMuted" numberOfLines={1} style={styles.addressLine}>
          {pickupAddress}
        </AppText>
      ) : null}
      {dropoffAddress ? (
        <AppText variant="bodyMuted" numberOfLines={1} style={styles.dropoffLine}>
          {dropoffAddress}
        </AppText>
      ) : null}
      <View style={styles.footerRow}>
        <StatusPill status={status} />
        {onPress ? <ChevronRight size={18} color={colors.mutedForeground} strokeWidth={1.75} /> : null}
      </View>
    </Card>
  );

  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs, gap: spacing.sm },
  serviceLabel: { flex: 1 },
  dateText: { marginBottom: spacing.sm },
  addressLine: { marginBottom: 2 },
  dropoffLine: { marginBottom: spacing.sm },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

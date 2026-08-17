import { StyleSheet, View } from 'react-native';
import { colors, fonts, fontSizes, radius, spacing } from '../../theme/tokens';
import { TRIP_STATUS_LABELS, type TripStatus } from '../../lib/tripStatus';
import { AppText } from './Typography';

const toneByStatus: Record<TripStatus, { bg: string; fg: string }> = {
  pending: { bg: colors.charcoal, fg: colors.mutedForeground },
  confirmed: { bg: 'rgba(217,177,96,0.16)', fg: colors.gold },
  driver_assigned: { bg: 'rgba(217,177,96,0.16)', fg: colors.gold },
  driver_arriving: { bg: 'rgba(217,177,96,0.22)', fg: colors.goldSoft },
  passenger_picked_up: { bg: 'rgba(217,177,96,0.28)', fg: colors.goldSoft },
  trip_started: { bg: 'rgba(217,177,96,0.28)', fg: colors.goldSoft },
  completed: { bg: 'rgba(103,163,103,0.18)', fg: '#7fd48a' },
  cancelled: { bg: 'rgba(230,43,52,0.14)', fg: colors.destructive },
};

export function StatusPill({ status }: { status: TripStatus }) {
  const tone = toneByStatus[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <AppText style={[styles.label, { color: tone.fg }]}>{TRIP_STATUS_LABELS[status]}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSizes.xs,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

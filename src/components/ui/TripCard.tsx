import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { StatusPill } from './StatusPill';
import { AppText } from './Typography';
import { space, theme } from '../../theme';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { isTerminalStatus, type TripStatus } from '../../lib/tripStatus';

interface Props {
  /** Route as the customer thinks of it, e.g. "Home → DFW Terminal D". */
  route: string;
  scheduledAt: string;
  status: TripStatus;
  totalFare: number | string;
  currency?: string;
  /** "Executive Sedan · Daniel A." — assembled by the caller from what the API returns. */
  meta?: string;
  /** Actions on a hairline-topped row: "Track live", "Receipt". */
  actions?: ReactNode;
  onPress?: () => void;
  /**
   * The stable alternative to `onPress` for list rows.
   *
   * A memoised row is only memoised if its props hold their identity between
   * renders, and an inline `onPress={() => open(item.id)}` never does. Passing
   * the id alongside a `useCallback`'d `onOpen` keeps both stable, so a list
   * re-render touches only the rows whose data actually changed.
   */
  id?: string;
  onOpen?: (id: string) => void;
}

/**
 * The one trip card.
 *
 * `trips/index.tsx` carried its own local `TripCard` — a worse copy of this
 * file, which had zero call sites (audit P0-6). Two components rendering the
 * same object in two slightly different ways is what makes an app feel assembled
 * by different people; the local one is deleted with this.
 *
 * A live trip carries a gold rail down the leading edge, so the one trip that is
 * happening is findable in a list without reading any of them.
 *
 * The whole card is one accessibility node. Otherwise a screen-reader user walks
 * five separate fragments — status, date, route, fare, meta — with no indication
 * they describe the same trip.
 */
function TripCardBase({
  route,
  scheduledAt,
  status,
  totalFare,
  currency = 'usd',
  meta,
  actions,
  onPress,
  id,
  onOpen,
}: Props) {
  const live = !isTerminalStatus(status) && status !== 'pending';
  const fare = formatCurrency(totalFare, currency);
  const when = formatDateTime(scheduledAt);

  const body = (
    <Card style={styles.card} flush>
      {live ? <View style={styles.liveRail} pointerEvents="none" /> : null}
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <StatusPill status={status} />
          <AppText variant="caption">{when}</AppText>
        </View>

        <AppText variant="headingSm" numberOfLines={1} style={styles.route}>
          {route}
        </AppText>

        <AppText variant="caption" numberOfLines={1}>
          {[meta, fare].filter(Boolean).join(' · ')}
        </AppText>

        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </Card>
  );

  const handlePress = onOpen && id ? () => onOpen(id) : onPress;
  if (!handlePress) return body;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={[route, when, [meta, fare].filter(Boolean).join(', ')].join('. ')}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 11 },
  inner: { padding: 15 },
  liveRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // Logical property — mirrors under RTL, which `left` would not.
    insetInlineStart: 0,
    width: 3,
    backgroundColor: theme.content.accent,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  route: { marginBottom: space.xs },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border.hairline,
  },
});

/**
 * MEMOISED.
 *
 * A trip list re-renders on every pull-to-refresh and on every socket status
 * change. Without this, each one rebuilds every row in the list rather than the
 * one row whose status actually moved.
 *
 * Memo only pays if the props are stable, which is why the list passes a
 * `useCallback`'d handler rather than an inline arrow — an inline
 * `onPress={() => ...}` is a new function identity per render and defeats this
 * entirely. The two changes only work together.
 */
export const TripCard = memo(TripCardBase);

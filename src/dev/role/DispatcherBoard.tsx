import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { radius, space } from '../../theme/ref';
import { formatTimeOfDay } from '../../lib/format';
import { type RoleRide, loadRides, stageLabel } from './roleData';
import { roleColor, roleText } from './roleTheme';
import { RoleShell } from './RoleShell';

/**
 * DISPATCHER — TODAY'S BOARD.
 *
 * A data tool, so it is built like one: a real table, 13pt, tight rows, tabular
 * figures so the time column lines up, and no editorial typography anywhere. A
 * dispatcher scans; they do not browse.
 *
 * ── The only use of colour ──────────────────────────────────────────────────
 * Finding the problem row IS the job. Two states are marked and nothing else
 * is: a ride with no chauffeur (amber) and a ride whose pickup has passed with
 * nobody under way (red). Everything else stays monochrome so those two carry
 * all the signal. A count of each sits above the table, because the first
 * question a dispatcher asks is "is anything wrong", not "what is at 2pm".
 *
 * Colour is never the only cue — WCAG 1.4.1. Each flagged row also carries a
 * word in its chauffeur or status cell, and a left rule.
 *
 * The table scrolls horizontally inside its own container rather than wrapping,
 * because a wrapped table is not a table.
 */

const COLUMNS = [
  /*
   * The flag column is FIRST, and it is a word, not only a colour.
   *
   * The chauffeur and status cells that spell out "Unassigned" and "Late" sit
   * far enough right to need a sideways scroll, and a dispatcher must be able
   * to see which row is the problem without scrolling to find out. So the state
   * is repeated here, at the left edge, beside the coloured rule — which also
   * satisfies 1.4.1, since the colour is never carrying the meaning alone.
   */
  { key: 'flag', label: '', width: 54 },
  { key: 'time', label: 'Time', width: 74 },
  { key: 'client', label: 'Client', width: 132 },
  { key: 'pickup', label: 'Pickup', width: 210 },
  { key: 'dropoff', label: 'Destination', width: 210 },
  { key: 'vehicle', label: 'Class', width: 118 },
  { key: 'chauffeur', label: 'Chauffeur', width: 132 },
  { key: 'status', label: 'Status', width: 140 },
] as const;

const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

export function DispatcherBoard() {
  const router = useRouter();
  const [rides, setRides] = useState<RoleRide[] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const at = new Date();
      setNow(at);
      void loadRides(at).then((all) => {
        if (active) setRides(all);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const unassigned = (rides ?? []).filter((r) => !r.chauffeur).length;
  const late = (rides ?? []).filter((r) => r.late).length;

  return (
    <RoleShell
      title="Board · Today"
      note="Preview of a dispatcher tool LCT does not have yet. Same demo data as the client app; assignments here are real within the demo."
      onBack={() => router.replace('/(app)/account')}
    >
      {rides === null ? (
        <Text style={roleText.cellSoft}>Loading…</Text>
      ) : (
        <>
          <View style={styles.summary}>
            <Summary count={rides.length} label="rides today" />
            <Summary count={unassigned} label="unassigned" tone={unassigned > 0 ? 'warning' : undefined} />
            <Summary count={late} label="late" tone={late > 0 ? 'danger' : undefined} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScroll}>
            <View style={{ width: TABLE_WIDTH }}>
              <View style={styles.headRow}>
                {COLUMNS.map((c) => (
                  <Text key={c.key} style={[roleText.cellHead, { width: c.width }]} numberOfLines={1}>
                    {c.label}
                  </Text>
                ))}
              </View>

              {rides.map((ride) => (
                <BoardRow
                  key={ride.booking.id}
                  ride={ride}
                  onPress={() => router.push(`/_role/ride?id=${ride.booking.id}`)}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={[roleText.cellSoft, styles.asOf]}>
            {`Sorted by pickup time · as of ${formatTimeOfDay(now)}`}
          </Text>
        </>
      )}
    </RoleShell>
  );
}

function Summary({ count, label, tone }: { count: number; label: string; tone?: 'warning' | 'danger' }) {
  const color = tone === 'danger' ? roleColor.danger : tone === 'warning' ? roleColor.warning : roleColor.text;
  return (
    <View style={styles.summaryItem}>
      <Text style={[roleText.mono, { color }]}>{String(count)}</Text>
      <Text style={roleText.cellSoft}>{label}</Text>
    </View>
  );
}

function BoardRow({ ride, onPress }: { ride: RoleRide; onPress: () => void }) {
  const { booking, customer, chauffeur, vehicleName, late } = ride;
  const unassigned = !chauffeur;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        formatTimeOfDay(new Date(booking.scheduled_at)),
        customer?.full_name,
        late ? 'late' : null,
        unassigned ? 'unassigned' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [
        styles.row,
        late ? styles.rowLate : unassigned ? styles.rowUnassigned : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        style={[roleText.cellHead, { width: COLUMNS[0].width }, late ? styles.lateText : unassigned ? styles.warnText : null]}
        numberOfLines={1}
      >
        {late ? 'Late' : unassigned ? 'Open' : ''}
      </Text>
      <Text style={[roleText.cellNum, { width: COLUMNS[1].width }]}>
        {formatTimeOfDay(new Date(booking.scheduled_at))}
      </Text>
      <Text style={[roleText.cell, { width: COLUMNS[2].width }]} numberOfLines={1}>
        {customer?.full_name ?? ''}
      </Text>
      <Text style={[roleText.cellSoft, { width: COLUMNS[3].width }]} numberOfLines={1}>
        {booking.pickup_address}
      </Text>
      <Text style={[roleText.cellSoft, { width: COLUMNS[4].width }]} numberOfLines={1}>
        {booking.dropoff_address ?? ''}
      </Text>
      <Text style={[roleText.cellSoft, { width: COLUMNS[5].width }]} numberOfLines={1}>
        {vehicleName ?? ''}
      </Text>
      <Text
        style={[unassigned ? roleText.cellNum : roleText.cell, { width: COLUMNS[6].width }, unassigned ? styles.warnText : null]}
        numberOfLines={1}
      >
        {chauffeur?.full_name ?? 'Unassigned'}
      </Text>
      <Text style={[roleText.cell, { width: COLUMNS[7].width }, late ? styles.lateText : null]} numberOfLines={1}>
        {stageLabel(booking)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: space.xl, marginBottom: space.md },
  summaryItem: { gap: 2 },
  tableScroll: { borderTopWidth: 1, borderTopColor: roleColor.hairline },
  headRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: roleColor.hairline,
  },
  /* Dense on purpose: 34pt rows against the client app's 56+. This view is used
     seated, at a desk, with a pointer — the target rules that govern the
     chauffeur view are answering a different question. */
  row: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    minHeight: 34,
    paddingVertical: space.xs,
    paddingLeft: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: roleColor.hairline,
    /*
     * The flag rule, at x=0 so it is visible no matter how far the table is
     * scrolled sideways. It carried a `marginLeft: -space.sm` at first, which
     * pushed it outside the horizontal ScrollView's content box and clipped it
     * — the flagged rows rendered with no rule at all, which is the one thing
     * this board must not get wrong. Caught in a screenshot, not in review.
     */
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    borderRadius: radius.sm,
  },
  rowUnassigned: { borderLeftColor: roleColor.warning },
  rowLate: { borderLeftColor: roleColor.danger },
  warnText: { color: roleColor.warning },
  lateText: { color: roleColor.danger },
  pressed: { backgroundColor: roleColor.surface },
  asOf: { marginTop: space.md },
});

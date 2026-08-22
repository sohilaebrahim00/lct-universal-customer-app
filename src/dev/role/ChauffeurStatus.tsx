import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { radius, space } from '../../theme/ref';
import { formatTimeOfDay } from '../../lib/format';
import { TRIP_STAGE_ORDER, stageIndex } from '../../lib/tripStatus';
import { advanceTripStatus } from '../demoApi';
import { type RoleRide, loadRide, nextStepFor, statusLabel } from './roleData';
import { roleColor, roleLayout, roleTarget, roleText } from './roleTheme';
import { RoleShell } from './RoleShell';

/**
 * CHAUFFEUR — STATUS.
 *
 * One action. Not a row of statuses to pick from, because there is never a
 * choice: the backend's transition table is strictly linear, so at any moment
 * exactly one forward move is legal. A row of buttons would offer four options
 * where the system permits one, and would put the four-way decision on a person
 * whose attention is on traffic.
 *
 * The write goes to the shared demo store, which is what the client's tracking
 * screen and the dispatcher's board both read. That is the whole point of the
 * exercise: this button changes what the client sees.
 */
export function ChauffeurStatus({ bookingId }: { bookingId: string }) {
  const [ride, setRide] = useState<RoleRide | null | undefined>(undefined);
  const [justSet, setJustSet] = useState<string | null>(null);

  const reload = useCallback(() => {
    void loadRide(bookingId, new Date()).then(setRide);
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (ride === undefined) {
    return (
      <RoleShell title="Status" note={NOTE}>
        <Text style={roleText.bodySoft}>Loading…</Text>
      </RoleShell>
    );
  }

  if (ride === null) {
    return (
      <RoleShell title="Status" note={NOTE}>
        <Text style={roleText.body}>That job is no longer on today&apos;s list.</Text>
      </RoleShell>
    );
  }

  const { booking } = ride;
  const step = nextStepFor(booking.status);
  const reached = stageIndex(booking.status);

  function advance() {
    const next = advanceTripStatus(bookingId);
    if (next) setJustSet(statusLabel(next));
    reload();
  }

  return (
    <RoleShell
      title={formatTimeOfDay(new Date(booking.scheduled_at))}
      note={NOTE}
      footer={
        step ? (
          <View style={styles.footer}>
            <Pressable
              onPress={advance}
              accessibilityRole="button"
              accessibilityLabel={`Mark ${step.label}`}
              style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
            >
              <Text style={[roleText.hero, styles.primaryLabel]}>{step.label}</Text>
            </Pressable>
          </View>
        ) : null
      }
    >
      <Text style={[roleText.label, styles.label]}>Now</Text>
      <Text style={roleText.hero}>{statusLabel(booking.status)}</Text>

      <Text style={[roleText.bodySoft, styles.route]} numberOfLines={2}>
        {[booking.pickup_address, booking.dropoff_address].filter(Boolean).join(' → ')}
      </Text>

      {justSet ? (
        // Confirms the write landed, and says where it went. A chauffeur setting
        // a status wants to know the client was actually told.
        <View style={styles.receipt}>
          <Text style={roleText.body}>{`Set to ${justSet}. The client's trip screen now shows this.`}</Text>
        </View>
      ) : null}

      <Text style={[roleText.label, styles.progressLabel]}>Progress</Text>
      {TRIP_STAGE_ORDER.filter((s) => s !== 'pending').map((stage) => {
        const done = stageIndex(stage) <= reached;
        return (
          <View key={stage} style={styles.stageRow}>
            <View style={[styles.dot, done ? styles.dotDone : null]} />
            <Text style={done ? roleText.body : roleText.bodySoft}>{statusLabel(stage)}</Text>
          </View>
        );
      })}

      {!step ? (
        <Text style={[roleText.body, styles.done]}>
          {booking.status === 'completed'
            ? 'This job is complete. Nothing further to set.'
            : 'Dispatch sets the next step on this job, not you.'}
        </Text>
      ) : null}
    </RoleShell>
  );
}

const NOTE = 'Preview of a chauffeur app LCT does not have yet. Status changes here write to the same demo data the client app reads.';

const styles = StyleSheet.create({
  label: { marginBottom: space.sm },
  route: { marginTop: space.smd },
  receipt: {
    ...roleLayout.card,
    marginTop: space.mdl,
    borderColor: roleColor.accent,
  },
  progressLabel: { marginTop: space.xl, marginBottom: space.smd },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: space.smd, paddingVertical: space.sm },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: roleColor.label,
  },
  dotDone: { backgroundColor: roleColor.accent, borderColor: roleColor.accent },
  done: { marginTop: space.lg },
  footer: {
    padding: space.mdl,
    borderTopWidth: 1,
    borderTopColor: roleColor.hairline,
    backgroundColor: roleColor.page,
  },
  /* 72pt: the largest target in either view, because this is the one control
     whose misfire tells a waiting client something untrue. */
  primary: {
    minHeight: roleTarget.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: roleColor.accent,
  },
  primaryLabel: { color: roleColor.onAccent },
  pressed: { opacity: 0.85 },
});

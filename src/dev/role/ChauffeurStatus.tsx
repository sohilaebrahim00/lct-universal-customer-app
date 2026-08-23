import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { radius, space } from '../../theme/ref';
import { formatTimeOfDay } from '../../lib/format';
import { RIDE_STAGES, RIDE_STAGE_LABELS, chauffeurAction, rideStageIndex, stageFor } from '../../lib/rideStage';
import { advanceTripStatus, arrivedAtOf, markArrivedAtPickup } from '../demoApi';
import { type RoleRide, loadRide, statusLabel } from './roleData';
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
  const [confirming, setConfirming] = useState(false);

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
  const arrivedAt = arrivedAtOf(bookingId);
  const stage = stageFor(booking.status, arrivedAt);
  const action = stage ? chauffeurAction(stage) : null;
  const reached = stage ? rideStageIndex(stage) : -1;

  /**
   * Performs the action, whichever store it writes to.
   *
   * `arrival` writes a TIMESTAMP and no status, because the backend's enum has
   * no member meaning *here*. That asymmetry is the whole of C-4 expressed as
   * two branches of one function — see `src/lib/rideStage.ts`.
   */
  function perform() {
    if (!action) return;
    if (action.kind === 'arrival') {
      const at = markArrivedAtPickup(bookingId);
      if (at) setJustSet(RIDE_STAGE_LABELS.arrived_at_pickup);
    } else {
      const next = advanceTripStatus(bookingId);
      if (next) setJustSet(statusLabel(next));
    }
    setConfirming(false);
    reload();
  }

  /*
   * Irreversible actions ask once. A chauffeur taps this one-handed at a kerb
   * with the engine running; "passenger on board" ends a customer's
   * complimentary waiting window and "complete the ride" ends the ride. Neither
   * has an undo, here or in the backend.
   */
  function press() {
    if (action?.confirm && !confirming) {
      setConfirming(true);
      return;
    }
    perform();
  }

  return (
    <RoleShell
      title={formatTimeOfDay(new Date(booking.scheduled_at))}
      note={NOTE}
      footer={
        action ? (
          <View style={styles.footer}>
            {confirming ? (
              // Says what the customer will read, not just what the button
              // does. The consequence is the thing worth confirming.
              <Text style={[roleText.bodySoft, styles.confirmNote]}>
                {`The client will see “${action.resultingHeadline}”.`}
              </Text>
            ) : null}
            <Pressable
              onPress={press}
              accessibilityRole="button"
              accessibilityLabel={confirming ? `Confirm: ${action.label}` : `Mark ${action.label}`}
              style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
            >
              <Text style={[roleText.hero, styles.primaryLabel]}>
                {confirming ? `Confirm — ${action.label}` : action.label}
              </Text>
            </Pressable>
            {confirming ? (
              <Pressable
                onPress={() => setConfirming(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
              >
                <Text style={roleText.body}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null
      }
    >
      <Text style={[roleText.label, styles.label]}>Now</Text>
      {/* The lifecycle stage, not the backend status — so "Arrived at Pickup"
          can be shown, which no status can express. */}
      <Text style={roleText.hero}>{stage ? RIDE_STAGE_LABELS[stage] : statusLabel(booking.status)}</Text>

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
      {RIDE_STAGES.map((s) => {
        const done = rideStageIndex(s) <= reached;
        return (
          <View key={s} style={styles.stageRow}>
            <View style={[styles.dot, done ? styles.dotDone : null]} />
            <Text style={done ? roleText.body : roleText.bodySoft}>{RIDE_STAGE_LABELS[s]}</Text>
          </View>
        );
      })}

      {!action ? (
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
  confirmNote: { marginBottom: space.sm },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: space.xs },
});

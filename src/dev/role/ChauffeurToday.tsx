import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { space, radius } from '../../theme/ref';
import { formatTimeOfDay } from '../../lib/format';
import { PREVIEW_CHAUFFEUR, type RoleRide, loadRides, ridesFor, statusLabel } from './roleData';
import { roleColor, roleLayout, roleTarget, roleText } from './roleTheme';
import { RoleShell } from './RoleShell';

/**
 * CHAUFFEUR — TODAY.
 *
 * The day's assigned work and nothing else. No earnings, no acceptance rate, no
 * shift controls, no navigation chrome: every one of those needs a business
 * answer nobody has given, and each would compete with the only question this
 * screen answers, which is "where am I going next".
 *
 * The next job is the screen. It is set at hero size in a bordered card; the
 * rest of the day is a quiet list beneath a rule, present so the chauffeur can
 * see what is coming without having to look at it.
 */
export function ChauffeurToday() {
  const router = useRouter();
  const [rides, setRides] = useState<RoleRide[] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const at = new Date();
      setNow(at);
      // Re-read on every focus so a dispatcher's assignment, made moments ago in
      // the other view, is here when the chauffeur looks.
      void loadRides(at).then((all) => {
        if (active) setRides(ridesFor(all, PREVIEW_CHAUFFEUR.id));
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const [next, ...rest] = rides ?? [];

  return (
    <RoleShell
      title={`Today · ${PREVIEW_CHAUFFEUR.full_name.split(' ')[0]}`}
      note="Preview of a chauffeur app LCT does not have yet. Built from the same demo data as the client app."
      onBack={() => router.replace('/(app)/account')}
    >
      {rides === null ? (
        <Text style={roleText.bodySoft}>Loading…</Text>
      ) : rides.length === 0 ? (
        <Text style={roleText.body}>No jobs assigned to you today.</Text>
      ) : (
        <>
          <Text style={[roleText.label, styles.sectionLabel]}>Next</Text>
          {next ? <NextJob ride={next} onPress={() => router.push(`/_role/job?id=${next.booking.id}`)} /> : null}

          {rest.length > 0 ? (
            <>
              <Text style={[roleText.label, styles.sectionLabel, styles.laterLabel]}>
                {`Later today · ${rest.length}`}
              </Text>
              {rest.map((ride) => (
                <LaterJob
                  key={ride.booking.id}
                  ride={ride}
                  onPress={() => router.push(`/_role/job?id=${ride.booking.id}`)}
                />
              ))}
            </>
          ) : null}
        </>
      )}
      {/* `now` is read once per focus; shown so nothing on screen is ambiguous about when. */}
      <Text style={[roleText.bodySoft, styles.asOf]}>{`As of ${formatTimeOfDay(now)}`}</Text>
    </RoleShell>
  );
}

function NextJob({ ride, onPress }: { ride: RoleRide; onPress: () => void }) {
  const { booking, customer, vehicleName } = ride;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Next job, ${formatTimeOfDay(new Date(booking.scheduled_at))}, ${booking.pickup_address}`}
      style={({ pressed }) => [roleLayout.card, styles.nextCard, pressed ? styles.pressed : null]}
    >
      <Text style={roleText.hero}>{formatTimeOfDay(new Date(booking.scheduled_at))}</Text>

      <Text style={[roleText.label, styles.fieldLabel]}>Pick up</Text>
      <Text style={roleText.heading}>{booking.pickup_address}</Text>

      {booking.dropoff_address ? (
        <>
          <Text style={[roleText.label, styles.fieldLabel]}>Drop off</Text>
          <Text style={roleText.heading}>{booking.dropoff_address}</Text>
        </>
      ) : null}

      <View style={styles.metaRow}>
        {/* The fleet CLASS. There is no physical vehicle in the data — no plate,
            no colour, no make or model — so none is shown. Gap C-2. */}
        {vehicleName ? <Text style={roleText.body}>{vehicleName}</Text> : null}
        {customer ? <Text style={roleText.body}>{customer.full_name}</Text> : null}
      </View>

      <Text style={[roleText.bodySoft, styles.statusLine]}>{statusLabel(booking.status)}</Text>
    </Pressable>
  );
}

function LaterJob({ ride, onPress }: { ride: RoleRide; onPress: () => void }) {
  const { booking, customer, vehicleName } = ride;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatTimeOfDay(new Date(booking.scheduled_at))} to ${booking.dropoff_address ?? booking.pickup_address}`}
      style={({ pressed }) => [styles.laterRow, pressed ? styles.pressed : null]}
    >
      <Text style={[roleText.mono, styles.laterTime]}>{formatTimeOfDay(new Date(booking.scheduled_at))}</Text>
      <View style={styles.laterText}>
        <Text style={roleText.body} numberOfLines={1}>
          {booking.pickup_address}
        </Text>
        {booking.dropoff_address ? (
          <Text style={roleText.bodySoft} numberOfLines={1}>
            {`→ ${booking.dropoff_address}`}
          </Text>
        ) : null}
        <Text style={roleText.bodySoft} numberOfLines={1}>
          {[vehicleName, customer?.full_name].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: space.sm },
  laterLabel: { marginTop: space.xl },
  nextCard: { borderColor: roleColor.accent, borderWidth: 2, gap: space.xs },
  fieldLabel: { marginTop: space.smd },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.smd },
  statusLine: { marginTop: space.xs },
  laterRow: {
    flexDirection: 'row',
    gap: space.md,
    minHeight: roleTarget.min,
    paddingVertical: space.smd,
    borderTopWidth: 1,
    borderTopColor: roleColor.hairline,
    borderRadius: radius.sm,
  },
  laterTime: { width: 78 },
  laterText: { flex: 1 },
  pressed: { backgroundColor: roleColor.surfaceRaised },
  asOf: { marginTop: space.xl },
});

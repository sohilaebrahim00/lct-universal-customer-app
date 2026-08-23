import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { radius, space } from '../../theme/ref';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { assignChauffeur } from '../demoApi';
import { ALL_CHAUFFEURS, type RoleRide, loadRide, stageLabel } from './roleData';
import { roleColor, roleLayout, roleText } from './roleTheme';
import { RoleShell } from './RoleShell';

/**
 * DISPATCHER — RIDE DETAIL.
 *
 * The full record for one ride, and the one action a dispatcher takes on it:
 * assign a chauffeur. Assigning writes to the shared demo store, which puts the
 * ride in that chauffeur's Today list and puts "Chauffeur Assigned" on the
 * client's tracking screen — the loop this whole preview exists to demonstrate.
 *
 * Not built here: cancel, reprice, change vehicle, message, invoice. The
 * backend has endpoints for the first three; they are left out because each is
 * a decision with money or a customer promise attached, and a preview that can
 * take those actions stops being a preview.
 *
 * Fields are rendered only where they exist. The record shows what a dispatcher
 * would have today, not what they would want — the difference is the gap list.
 */
export function DispatcherRide({ bookingId }: { bookingId: string }) {
  const [ride, setRide] = useState<RoleRide | null | undefined>(undefined);
  const [pending, setPending] = useState<string | null>(null);

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
      <RoleShell title="Ride" note={NOTE}>
        <Text style={roleText.cellSoft}>Loading…</Text>
      </RoleShell>
    );
  }

  if (ride === null) {
    return (
      <RoleShell title="Ride" note={NOTE}>
        <Text style={roleText.body}>No ride with that reference on today&apos;s board.</Text>
      </RoleShell>
    );
  }

  const { booking, customer, chauffeur, vehicleName, late } = ride;

  function assign(chauffeurId: string) {
    setPending(chauffeurId);
    assignChauffeur(bookingId, chauffeurId);
    reload();
    setPending(null);
  }

  return (
    <RoleShell title={formatDateTime(booking.scheduled_at)} note={NOTE}>
      {late ? (
        <View style={styles.flag}>
          <Text style={[roleText.cellNum, styles.flagText]}>
            Late — pickup time has passed and nobody is under way.
          </Text>
        </View>
      ) : null}

      <View style={roleLayout.card}>
        <Row label="Status">{stageLabel(booking)}</Row>
        <Row label="Client">{customer?.full_name}</Row>
        <Row label="Client phone">{customer?.phone}</Row>
        <Row label="Passenger">{booking.primary_passenger_name}</Row>
        <Row label="Passenger phone">{booking.primary_passenger_phone}</Row>
        <Row label="Pickup">{booking.pickup_address}</Row>
        <Row label="Destination">{booking.dropoff_address}</Row>
        <Row label="Flight">{booking.flight_number}</Row>
        <Row label="Service">{booking.service_type.replace(/_/g, ' ')}</Row>
        <Row label="Class">{vehicleName}</Row>
        <Row label="Passengers">{String(booking.passenger_count)}</Row>
        <Row label="Bags">{String(booking.luggage_count)}</Row>
        <Row label="Notes">{booking.special_requests}</Row>
        <Row label="Fare">{formatCurrency(booking.total_fare, booking.currency)}</Row>
        <Row label="Reference">{booking.id}</Row>
      </View>

      <Text style={[roleText.cellHead, styles.assignLabel]}>Assign chauffeur</Text>
      <View style={roleLayout.card}>
        {ALL_CHAUFFEURS.map((c) => {
          const current = chauffeur?.id === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => assign(c.id)}
              disabled={current || pending !== null}
              accessibilityRole="button"
              accessibilityState={{ selected: current }}
              accessibilityLabel={current ? `${c.full_name}, currently assigned` : `Assign ${c.full_name}`}
              style={({ pressed }) => [styles.assignRow, pressed ? styles.pressed : null]}
            >
              <Text style={current ? roleText.cellNum : roleText.cell}>{c.full_name}</Text>
              {/*
                No rating, no trip count, no availability, no distance from the
                pickup. `TripDriverInfo` carries none of it, and the drivers
                table's `status`/`current_lat` are not exposed to this app — so a
                dispatcher here is choosing a name off a list. Gaps D-3 and D-4.
              */}
              <Text style={roleText.cellSoft}>{current ? 'Assigned' : 'Assign'}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[roleText.cellSoft, styles.footnote]}>
        Assigning writes to the same demo data the client app reads: the ride appears in that chauffeur&apos;s Today
        list, and the client&apos;s trip screen moves to Chauffeur Assigned.
      </Text>
    </RoleShell>
  );
}

const NOTE = 'Preview of a dispatcher tool LCT does not have yet. Same demo data as the client app.';

/** Nothing renders when the value is absent — no dashes, no empty rows. */
function Row({ label, children }: { label: string; children: string | null | undefined }) {
  if (!children) return null;
  return (
    <View style={styles.row}>
      <Text style={[roleText.cellHead, styles.rowLabel]}>{label}</Text>
      <Text style={[roleText.cell, styles.rowValue]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flag: {
    ...roleLayout.card,
    borderColor: roleColor.danger,
    marginBottom: space.md,
    padding: space.smd,
  },
  flagText: { color: roleColor.danger },
  row: { flexDirection: 'row', gap: space.smd, paddingVertical: space.xs, alignItems: 'flex-start' },
  rowLabel: { width: 108, paddingTop: 2 },
  rowValue: { flex: 1 },
  assignLabel: { marginTop: space.lg, marginBottom: space.sm },
  assignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Taller than a board row: this one commits a chauffeur to a job.
    minHeight: 44,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
  },
  pressed: { backgroundColor: roleColor.surfaceRaised },
  footnote: { marginTop: space.md },
});

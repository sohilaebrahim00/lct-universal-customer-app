import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { radius, space } from '../../theme/ref';
import { formatTimeOfDay } from '../../lib/format';
import {
  type RoleRide,
  contactName,
  contactPhone,
  loadRide,
  nameSignText,
  statusLabel,
} from './roleData';
import { roleColor, roleLayout, roleTarget, roleText } from './roleTheme';
import { RoleShell } from './RoleShell';

/**
 * CHAUFFEUR — JOB DETAIL.
 *
 * Everything needed at the kerb, and nothing else. Read standing beside a car,
 * so: full-strength type, generous spacing, one field per line, and two actions
 * that are unmistakable.
 *
 * Every row here is null-guarded. A booking with no flight number renders no
 * flight row — not "Flight: —", not a greyed placeholder. The absent row is the
 * honest signal that the data is absent, and a dash is not.
 */
export function ChauffeurJob({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [ride, setRide] = useState<RoleRide | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadRide(bookingId, new Date()).then((r) => {
        if (active) setRide(r);
      });
      return () => {
        active = false;
      };
    }, [bookingId]),
  );

  if (ride === undefined) {
    return (
      <RoleShell title="Job" note={NOTE}>
        <Text style={roleText.bodySoft}>Loading…</Text>
      </RoleShell>
    );
  }

  if (ride === null) {
    return (
      <RoleShell title="Job" note={NOTE}>
        <Text style={roleText.body}>That job is no longer on today&apos;s list.</Text>
      </RoleShell>
    );
  }

  const { booking, vehicleName } = ride;
  const phone = contactPhone(ride);
  const name = contactName(ride);
  const sign = nameSignText(ride);

  return (
    <RoleShell
      title={formatTimeOfDay(new Date(booking.scheduled_at))}
      note={NOTE}
      footer={
        <View style={styles.actions}>
          {/*
            Two actions, both large, nothing between them. `tel:` and `sms:` are
            the OS's own handlers — there is no in-app messaging anywhere in this
            product, and pretending otherwise would be inventing a feature. Gap C-5.
          */}
          {phone ? (
            <>
              <ActionButton
                label="Call"
                primary
                onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`)}
                hint={name ? `Call ${name}` : 'Call the client'}
              />
              <ActionButton
                label="Message"
                onPress={() => void Linking.openURL(`sms:${phone.replace(/[^\d+]/g, '')}`)}
                hint={name ? `Message ${name}` : 'Message the client'}
              />
            </>
          ) : (
            // No phone on the booking and none on the profile. Saying so beats
            // two dead buttons.
            <Text style={[roleText.bodySoft, styles.noPhone]}>No contact number on this booking.</Text>
          )}
        </View>
      }
    >
      {sign ? (
        <View style={styles.sign}>
          <Text style={[roleText.label, styles.signLabel]}>Name sign</Text>
          {/*
            Derived from `primary_passenger_name`, falling back to the account
            holder. There is no name-sign field in the schema — see gap C-1.
          */}
          <Text style={styles.signText}>{sign}</Text>
        </View>
      ) : null}

      <Field label="Client">{name}</Field>
      <Field label="Pick up">{booking.pickup_address}</Field>
      <Field label="Drop off">{booking.dropoff_address}</Field>
      <Field label="Flight">{booking.flight_number}</Field>
      <Field label="Vehicle">{vehicleName}</Field>
      <Field label="Passengers and bags">
        {`${booking.passenger_count} ${booking.passenger_count === 1 ? 'passenger' : 'passengers'} · ${booking.luggage_count} ${booking.luggage_count === 1 ? 'bag' : 'bags'}`}
      </Field>
      <Field label="Notes">{booking.special_requests}</Field>
      <Field label="Status">{statusLabel(booking.status)}</Field>

      <Pressable
        onPress={() => router.push(`/_role/status?id=${booking.id}`)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.statusLink, pressed ? styles.pressed : null]}
      >
        <Text style={roleText.heading}>Update status →</Text>
      </Pressable>
    </RoleShell>
  );
}

const NOTE = 'Preview of a chauffeur app LCT does not have yet. Built from the same demo data as the client app.';

/** Renders nothing at all when the value is null — never a dash. */
function Field({ label, children }: { label: string; children: string | null | undefined }) {
  if (!children) return null;
  return (
    <View style={styles.field}>
      <Text style={roleText.label}>{label}</Text>
      <Text style={[roleText.body, styles.fieldValue]}>{children}</Text>
    </View>
  );
}

function ActionButton({
  label,
  hint,
  primary,
  onPress,
}: {
  label: string;
  hint: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : styles.actionSecondary,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[roleText.heading, primary ? styles.actionPrimaryLabel : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sign: {
    ...roleLayout.card,
    borderColor: roleColor.accent,
    borderWidth: 2,
    alignItems: 'center',
    paddingVertical: space.lg,
    marginBottom: space.lg,
  },
  signLabel: { marginBottom: space.sm },
  /*
   * The sign is set larger than anything else in the preview on purpose: it is
   * read across an arrivals hall, by the passenger, not by the chauffeur.
   */
  signText: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 1.5,
    textAlign: 'center',
    color: roleColor.text,
    fontWeight: '700',
  },
  field: { marginBottom: space.mdl },
  fieldValue: { marginTop: space.xs },
  statusLink: {
    minHeight: roleTarget.min,
    justifyContent: 'center',
    marginTop: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: roleColor.hairline,
  },
  actions: {
    flexDirection: 'row',
    gap: space.smd,
    padding: space.mdl,
    borderTopWidth: 1,
    borderTopColor: roleColor.hairline,
    backgroundColor: roleColor.page,
  },
  action: {
    flex: 1,
    flexBasis: 0,
    minHeight: roleTarget.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  actionPrimary: { backgroundColor: roleColor.accent },
  actionPrimaryLabel: { color: roleColor.onAccent },
  actionSecondary: { borderWidth: 2, borderColor: roleColor.text },
  noPhone: { flex: 1, paddingVertical: space.mdl },
  pressed: { opacity: 0.85 },
});

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Check, UserPlus } from 'lucide-react-native';
import { AppText } from '../ui/Typography';
import { Button } from '../ui/Button';
import { iconSize, iconStroke, radius, space, theme } from '../../theme';
import { profilesApi } from '../../api/profiles';
import type { SavedPassenger } from '../../types/api';

/**
 * WHO IS TRAVELLING — the connection that was missing, not a new system.
 *
 * Every part of booking for someone else already existed and none of it was
 * wired to a screen:
 *
 *   `SavedPassenger`                     the model
 *   `profilesApi.savedPassengers()`      read
 *   `profilesApi.addSavedPassenger()`    write
 *   `account/saved-passengers.tsx`       a working list with add and delete
 *   `draft.primaryPassengerName/Phone`   the booking form fields
 *   `CreateBookingInput`                 both fields, sent on POST /bookings
 *   the chauffeur's name sign            reads `primary_passenger_name`
 *
 * `grep primaryPassenger app/` returned **nothing**. So every booking was
 * silently for the account holder, and the digital name sign — a feature the
 * client asked for by name — fell back to the payer because nothing else could
 * reach the field.
 *
 * This component writes those two fields. It does not introduce a second
 * passenger store, a second list, or a second add-passenger form: the saved
 * list here is the same `profilesApi` list the account screen manages, so a
 * person added during booking appears there and vice versa.
 *
 * ── What it must not say ──────────────────────────────────────────────────
 * The competitor's equivalent sheet promises *"we'll keep them informed every
 * step of the way."* **This app cannot do that.** There is no passenger-level
 * notification routing — `HANDOFF.md` §5.1, backend work nobody has done — so
 * trip updates reach the ACCOUNT HOLDER only. Saying otherwise would be a
 * promise the product cannot keep, made at the moment a customer is deciding
 * to trust it with someone else's journey. The limit is stated once, where the
 * choice is made, rather than buried.
 */

export interface PassengerSelectorProps {
  /** The account holder's name, shown as the "myself" option. */
  accountHolderName: string | null;
  /** Current draft value — empty string means the booking is for the account holder. */
  passengerName: string;
  passengerPhone: string;
  /** Writes both draft fields at once; empty strings mean "myself". */
  onChange: (name: string, phone: string) => void;
}

export function PassengerSelector({
  accountHolderName,
  passengerName,
  passengerPhone,
  onChange,
}: PassengerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<SavedPassenger[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  /* The "add someone new" sub-form, collapsed until asked for. */
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isGuest = passengerName.trim().length > 0;

  /*
   * Loaded when the sheet is OPENED, from the press handler — not from an
   * effect watching `open`.
   *
   * An effect that calls setState synchronously is a cascading render, and
   * `react-hooks/set-state-in-effect` says so. It is also the wrong shape:
   * fetching the list is a consequence of a person asking for it, not a
   * synchronisation between React and an external system. The press is the
   * event; the effect was a detour.
   *
   * Lazy either way — the collapsed row needs no list, and most bookings never
   * open this.
   */
  const load = useCallback(() => {
    setLoadFailed(false);
    profilesApi
      .savedPassengers()
      .then(setSaved)
      .catch(() => setLoadFailed(true));
  }, []);

  function openSheet() {
    setOpen(true);
    if (saved === null && !loadFailed) load();
  }

  function chooseMyself() {
    onChange('', '');
    setOpen(false);
  }

  function choose(p: SavedPassenger) {
    onChange(p.full_name, p.phone ?? '');
    setOpen(false);
  }

  /*
   * Adds to the account's saved passengers AND selects them. If the save
   * fails the booking still gets the name — the person in front of you is
   * trying to book a car, not to manage an address book, and losing their
   * typing to a network error on a convenience feature would be the wrong
   * trade. The failure is stated rather than swallowed.
   */
  async function addAndChoose() {
    const name = newName.trim();
    if (!name) return;
    const phone = newPhone.trim();
    setSaving(true);
    setSaveError(null);
    /*
     * A LOCAL flag, not the state variable.
     *
     * `setSaveError(...)` does not update `saveError` within this closure, so
     * `if (!saveError)` below would read the value from the render that started
     * this call — always null — and close the sheet over the very message it
     * had just set. The failure would be invisible: the passenger is applied,
     * the sheet vanishes, and nobody learns they were not saved for next time.
     */
    let failed = false;
    try {
      await profilesApi.addSavedPassenger({ fullName: name, phone: phone || undefined });
      setSaved(null); // refetched next open, so the account screen and this agree
    } catch {
      failed = true;
      setSaveError('Applied to this booking, but could not be saved to your passengers.');
    } finally {
      setSaving(false);
      // The booking gets the name either way — see the note above.
      onChange(name, phone);
      if (!failed) {
        setNewName('');
        setNewPhone('');
        setAdding(false);
        setOpen(false);
      }
    }
  }

  const summary = isGuest ? passengerName : (accountHolderName ?? 'Myself');

  if (!open) {
    return (
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`Who is travelling: ${summary}. Change`}
        style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      >
        <View style={styles.rowText}>
          <AppText variant="label">Who is travelling</AppText>
          <AppText variant="body" numberOfLines={1} style={styles.summary}>
            {summary}
            {isGuest && passengerPhone ? ` · ${passengerPhone}` : ''}
          </AppText>
        </View>
        <AppText variant="caption" color={theme.content.accent}>
          Change
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <AppText variant="label">Who is travelling</AppText>

      <Option
        label={accountHolderName ?? 'Myself'}
        sub="Booking for yourself"
        selected={!isGuest}
        onPress={chooseMyself}
      />

      {saved === null && !loadFailed ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.content.accent} />
        </View>
      ) : null}

      {loadFailed ? (
        <View style={styles.note}>
          <AppText variant="caption" color={theme.content.secondary}>
            Your saved passengers could not be loaded. You can still add someone below.
          </AppText>
          <Pressable onPress={load} accessibilityRole="button" accessibilityLabel="Try loading saved passengers again">
            <AppText variant="caption" color={theme.content.accent}>
              Try again
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {saved?.map((p) => (
        <Option
          key={p.id}
          label={p.full_name}
          sub={p.phone ?? 'No phone number saved'}
          selected={isGuest && passengerName === p.full_name}
          onPress={() => choose(p)}
        />
      ))}

      {saved !== null && saved.length === 0 ? (
        <AppText variant="caption" color={theme.content.secondary} style={styles.note}>
          You have not saved anyone yet. Adding someone here keeps them for next time.
        </AppText>
      ) : null}

      {adding ? (
        <View style={styles.addForm}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Full name"
            placeholderTextColor={theme.content.tertiary}
            accessibilityLabel="Passenger full name"
            style={styles.input}
          />
          <TextInput
            value={newPhone}
            onChangeText={setNewPhone}
            placeholder="Phone number (optional)"
            placeholderTextColor={theme.content.tertiary}
            keyboardType="phone-pad"
            accessibilityLabel="Passenger phone number, optional"
            style={styles.input}
          />
          {saveError ? (
            <AppText variant="caption" color={theme.content.secondary}>
              {saveError}
            </AppText>
          ) : null}
          <Button
            label={saving ? 'Adding…' : 'Use this passenger'}
            onPress={() => void addAndChoose()}
            disabled={saving || newName.trim().length === 0}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          accessibilityRole="button"
          accessibilityLabel="Add someone else"
          style={({ pressed }) => [styles.addRow, pressed ? styles.pressed : null]}
        >
          <UserPlus size={iconSize.sm} color={theme.content.accent} strokeWidth={iconStroke.decorative} />
          <AppText variant="body" color={theme.content.accent}>
            Add someone else
          </AppText>
        </Pressable>
      )}

      {/*
        THE LIMIT, STATED WHERE THE CHOICE IS MADE.
        Not a disclaimer at the bottom of a confirmation nobody reads.
      */}
      <AppText variant="captionSm" color={theme.content.tertiary} style={styles.limit}>
        Their name goes to the chauffeur for the name sign. Trip updates come to you, the account holder — we do not
        message the passenger directly.
      </AppText>

      <Pressable
        onPress={() => setOpen(false)}
        accessibilityRole="button"
        accessibilityLabel="Close passenger options"
        style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
      >
        <AppText variant="caption">Done</AppText>
      </Pressable>
    </View>
  );
}

function Option({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.option, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowText}>
        <AppText variant="body" numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="captionSm" color={theme.content.tertiary} numberOfLines={1}>
          {sub}
        </AppText>
      </View>
      {selected ? (
        <Check size={iconSize.sm} color={theme.content.accent} strokeWidth={iconStroke.decorative} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* 44 minimum on every tappable row — this sits among the steppers. */
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.smd,
    paddingVertical: space.smd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border.hairline,
    marginBottom: space.sm,
  },
  rowText: { flex: 1, minWidth: 0 },
  summary: { marginTop: 2 },
  pressed: { opacity: 0.7 },
  panel: {
    padding: space.mdl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    gap: space.xs,
    marginBottom: space.sm,
  },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.smd,
    paddingVertical: space.xs,
  },
  loading: { paddingVertical: space.smd, alignItems: 'flex-start' },
  note: { marginTop: space.xs, gap: space.xs },
  addRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  addForm: { gap: space.xs, marginTop: space.xs },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    backgroundColor: theme.background.inset,
    paddingHorizontal: space.smd,
    color: theme.content.primary,
  },
  limit: { marginTop: space.smd },
  close: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: space.xs },
});

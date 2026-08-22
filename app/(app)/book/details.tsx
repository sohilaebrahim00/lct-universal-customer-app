import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { IconButton } from '../../../src/components/ui/IconButton';
import { ProgressRail } from '../../../src/components/ui/ProgressRail';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Stepper } from '../../../src/components/ui/Stepper';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';
import { DateTimeField } from '../../../src/components/booking/DateTimeField';
import { space, theme } from '../../../src/theme';
import { isRTL } from '../../../src/i18n/rtl';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';

const MIN_LEAD_TIME_MS = 60 * 60 * 1000;

/**
 * STEP 3 — WHEN & WHO.
 *
 * Collected BEFORE the car, which is what makes the fare on the next screen
 * final rather than an estimate.
 *
 * ── The dead end this screen used to be ─────────────────────────────────────
 * On web it rendered two plain text fields expecting `YYYY-MM-DD` and `HH:MM`.
 * Anything else a person typed failed to parse, `scheduledAt` never got set,
 * and the primary button sat disabled with nothing explaining why. The flow
 * ended there. It is now the browser's own date and time controls (see
 * DateTimeField.web.tsx), which emit exactly those formats — the class of bug
 * is removed rather than validated around.
 *
 * ── Why the button no longer says "Pick a date and time" ────────────────────
 * That is an instruction, not an action. A primary button names what it does;
 * the reason it is unavailable belongs beside the field that is missing. So the
 * label is always "Choose your car", and the requirement is a separate line.
 */
export default function DetailsStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);

  // Computed once, at mount — recomputing per render would silently push the
  // earliest bookable time later while the customer is still on this screen.
  const [minimumDate] = useState(() => new Date(Date.now() + MIN_LEAD_TIME_MS));
  const [leadTimeError, setLeadTimeError] = useState<string | null>(null);

  const isHourly = draft.serviceType === 'hourly';
  const duration = draft.hourlyDurationHours ?? 3;

  function handleDateTime(next: Date | null) {
    if (!next) {
      setLeadTimeError(null);
      update({ scheduledAt: null });
      return;
    }
    // A time inside the lead window is a real, explainable refusal — so it says
    // so, rather than leaving the customer with a dead button.
    if (next.getTime() < minimumDate.getTime()) {
      setLeadTimeError('We need at least an hour’s notice. Please choose a later time.');
      update({ scheduledAt: null });
      return;
    }
    setLeadTimeError(null);
    update({ scheduledAt: next });
  }

  const missing = !draft.scheduledAt
    ? 'Choose a pickup date and time to continue.'
    : isHourly && duration <= 0
      ? 'Choose how many hours you need.'
      : null;

  return (
    <ScreenContainer>
      {/*
        The same header as steps 4 and 5 — back control beside the rail.
        Steps 4 and 5 had one and this did not, so the only way out of the
        middle of the booking flow was the system gesture. On Android that is a
        hardware back; on iOS it is an edge swipe that the map screens either
        side of this one intercept.
      */}
      <View style={styles.header}>
        <IconButton
          icon={isRTL() ? ChevronRight : ChevronLeft}
          accessibilityLabel="Go back"
          variant="circular"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)'))}
        />
        <View style={styles.railWrap}>
          <ProgressRail step={3} total={5} label="When & who" />
        </View>
      </View>

      <AppText variant="heading" accessibilityRole="header" style={styles.heading}>
        When should the car arrive?
      </AppText>

      <DateTimeField
        value={draft.scheduledAt}
        minimumDate={minimumDate}
        onChange={handleDateTime}
        error={leadTimeError}
      />

      {isHourly ? (
        <Stepper
          label="Duration"
          unit={duration === 1 ? 'hour' : 'hours'}
          value={duration}
          onChange={(v) => update({ hourlyDurationHours: v })}
          min={1}
          max={12}
          style={styles.stepper}
        />
      ) : null}

      <Stepper
        label="Guests"
        unit={draft.passengerCount === 1 ? 'guest' : 'guests'}
        value={draft.passengerCount}
        onChange={(v) => update({ passengerCount: v })}
        min={1}
        max={40}
        style={styles.stepper}
      />
      <Stepper
        label="Luggage"
        unit={draft.luggageCount === 1 ? 'bag' : 'bags'}
        value={draft.luggageCount}
        onChange={(v) => update({ luggageCount: v })}
        min={0}
        max={40}
        style={styles.stepper}
      />

      <TextField
        label="Notes for your chauffeur (optional)"
        value={draft.specialRequests}
        onChangeText={(text) => update({ specialRequests: text })}
        placeholder="Child seat, extra stop, meet-and-greet sign…"
        multiline
        containerStyle={styles.notes}
      />

      {/* What is needed sits beside the requirement, not on the button. */}
      {missing ? (
        <AppText variant="captionSm" center style={styles.missing}>
          {missing}
        </AppText>
      ) : null}

      <Button
        label="Choose your car"
        onPress={() => router.push('/(app)/book/vehicle')}
        disabled={Boolean(missing)}
        haptic
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.mdl },
  railWrap: { flex: 1, marginStart: space.smd },
  heading: { marginBottom: space.mdl },
  stepper: { marginBottom: space.sm },
  notes: { marginTop: space.sm },
  missing: { marginBottom: space.sm, color: theme.content.tertiary },
});

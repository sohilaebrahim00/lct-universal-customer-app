import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ArrowUpDown, ChevronLeft } from 'lucide-react-native';
import { IconButton } from '../../../src/components/ui/IconButton';
import { ProgressRail } from '../../../src/components/ui/ProgressRail';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Stepper } from '../../../src/components/ui/Stepper';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';
import { DateTimeField } from '../../../src/components/booking/DateTimeField';
import { space, theme } from '../../../src/theme';
import { getRoute } from '../../../src/lib/googlePlaces';
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
  const [swapping, setSwapping] = useState(false);

  /**
   * Exchanges the two ends and RE-ROUTES.
   *
   * The addresses are swapped in the draft, and then the route is fetched
   * again for the reversed journey. A→B and B→A are not the same drive —
   * one-way streets, ramps and turn restrictions all make them differ — so
   * reusing the old `distanceMiles` would price the new journey with the old
   * journey's distance. That is a number the app could not attribute, and this
   * codebase does not render those.
   *
   * If the re-route fails, the derived fields are CLEARED rather than left
   * stale. A null distance makes the vehicle screen say what is missing; a
   * wrong distance would quietly produce a wrong price.
   */
  async function swapEnds() {
    if (swapping) return;
    setSwapping(true);
    try {
      const from = { address: draft.pickupAddress, lat: draft.pickupLat, lng: draft.pickupLng };
      const to = { address: draft.dropoffAddress, lat: draft.dropoffLat, lng: draft.dropoffLng };

      update({
        pickupAddress: to.address,
        pickupLat: to.lat,
        pickupLng: to.lng,
        dropoffAddress: from.address,
        dropoffLat: from.lat,
        dropoffLng: from.lng,
        // Cleared until the new route answers. Never carried across a swap.
        distanceMiles: null,
        durationMinutes: null,
        routePolyline: null,
        // The chosen car and its quote belonged to the old journey.
        vehicle: null,
        allInFare: null,
      });

      const route = await getRoute({ lat: to.lat ?? 0, lng: to.lng ?? 0 }, { lat: from.lat ?? 0, lng: from.lng ?? 0 });
      if (route) {
        update({
          distanceMiles: Math.round(route.distanceMiles * 10) / 10,
          durationMinutes: Math.round(route.durationMinutes),
          routePolyline: route.polyline,
        });
      }
    } finally {
      setSwapping(false);
    }
  }

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
          icon={ChevronLeft}
          accessibilityLabel="Go back"
          variant="circular"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)'))}
        />
        <View style={styles.railWrap}>
          <ProgressRail step={3} total={5} label="When & who" />
        </View>
      </View>

      {/*
        THE ROUTE, WITH A SWAP — and this is the only step where it can live.

        Blacklane puts a swap control between two address fields on one screen.
        This app collects pickup and drop-off on two SEQUENTIAL full-screen
        pickers, so there is no two-field screen to put it between. Building one
        would be a redesign of the booking flow, not "one control".

        So it goes here, on the step after both addresses are known and BEFORE
        any price exists. That ordering is the whole reason this is safe:
        swapping a journey changes its route, and a route change must produce a
        NEW quote rather than move an existing one. On the vehicle screen or the
        review screen a swap would invalidate a fare the customer has already
        been shown, which is the one thing this app does not do.

        Shown only when both ends exist. Nothing to swap otherwise.
      */}
      {draft.pickupAddress && draft.dropoffAddress ? (
        <View style={styles.routeCard}>
          <View style={styles.routeText}>
            <AppText variant="captionSm" color={theme.content.tertiary}>
              Pickup
            </AppText>
            <AppText variant="bodySm" numberOfLines={1}>
              {draft.pickupAddress}
            </AppText>
            <AppText variant="captionSm" color={theme.content.tertiary} style={styles.routeSecond}>
              Drop-off
            </AppText>
            <AppText variant="bodySm" numberOfLines={1}>
              {draft.dropoffAddress}
            </AppText>
          </View>
          <IconButton
            icon={ArrowUpDown}
            accessibilityLabel={swapping ? 'Swapping pickup and drop-off' : 'Swap pickup and drop-off'}
            variant="circular"
            onPress={() => void swapEnds()}
            disabled={swapping}
          />
        </View>
      ) : null}

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
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.smd,
    paddingVertical: space.smd,
    marginBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border.hairline,
  },
  routeText: { flex: 1 },
  routeSecond: { marginTop: space.xs },
  heading: { marginBottom: space.mdl },
  stepper: { marginBottom: space.sm },
  notes: { marginTop: space.sm },
  missing: { marginBottom: space.sm, color: theme.content.tertiary },
});

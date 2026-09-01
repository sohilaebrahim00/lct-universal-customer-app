import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '../../../src/components/ui/IconButton';
import { ChevronLeft } from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { TrackingMap } from '../../../src/components/trip/TrackingMap';
import { TrackingSheet } from '../../../src/components/trip/TrackingSheet';
import { TripReceipt } from '../../../src/components/trip/TripReceipt';
import { CancelledRecord } from '../../../src/components/trip/CancelledRecord';
import { theme } from '../../../src/theme';
import { bookingsApi } from '../../../src/api/bookings';
import { tripsApi } from '../../../src/api/trips';
import type { Booking, Trip, TripDriverInfo, TripVehicleInfo } from '../../../src/types/api';
import { isTerminalStatus, type TripStatus } from '../../../src/lib/tripStatus';
import { arrivedAtFrom } from '../../../src/lib/rideStage';
import { rebookDraftFrom } from '../../../src/lib/rebook';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { useDemoStateSync } from '../../../src/dev/useDemoStateSync';
import { useTripSocket } from '../../../src/lib/useTripSocket';
import { useSmoothedLocation } from '../../../src/lib/useSmoothedLocation';
import type { LatLng } from '../../../src/lib/geo';

/**
 * LIVE TRACKING — artboard 2k.
 *
 * The emotional core of the product, and the last screen still on the old
 * design. It was a scroll view of cards with a 200pt map inset in it, framed at
 * a fixed `latitudeDelta: 0.02` regardless of whether the journey was one mile
 * or twenty-three.
 *
 * ── The map is the screen ───────────────────────────────────────────────────
 * Full bleed, edge to edge, with the sheet floating over it. Everything else —
 * the marker smoothing, the camera easing, the progress curve — exists to make
 * one claim credible: that what is on screen is what is happening outside.
 *
 * ── What this screen never does ─────────────────────────────────────────────
 * Sell anything. No upgrade, no promo, no rating prompt. A customer watching a
 * car approach is at their most captive and their least able to evaluate an
 * offer, and that is exactly why nothing is offered.
 *
 * ── How live it actually is ─────────────────────────────────────────────────
 * The socket carries `{ lat, lng, etaMinutes }` and no heading, so the marker's
 * direction is derived from consecutive fixes. There is no specified update
 * cadence on either side. Both are recorded in BACKEND_FOLLOWUPS.md §9, with
 * what it would take to fix them.
 */
export default function TripDetailScreen() {
  const router = useRouter();
  const { id: bookingId } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driver, setDriver] = useState<TripDriverInfo | null>(null);
  const [vehicle, setVehicle] = useState<TripVehicleInfo | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  /** A failed trip-detail fetch. Distinct from loadError: the booking is fine. */
  const [tripError, setTripError] = useState<Error | null>(null);

  const live = useTripSocket(bookingId ?? null);

  const resetDraft = useBookingFormStore((s) => s.reset);
  const updateDraft = useBookingFormStore((s) => s.update);

  const [cancelling, setCancelling] = useState(false);

  /** Same mapping the Cancelled tab uses -- see src/lib/rebook.ts for what it refuses to carry. */
  const rebookThis = useCallback(() => {
    if (!booking) return;
    resetDraft();
    updateDraft(rebookDraftFrom(booking));
    router.push('/(app)/book/pickup');
  }, [booking, resetDraft, updateDraft, router]);

  const load = useCallback(() => {
    if (!bookingId) return;
    setLoadError(null);
    // The booking IS the screen. A failure here used to be swallowed, leaving
    // "Loading…" forever with no timeout, no retry and no error — audit P0-5.
    bookingsApi
      .get(bookingId)
      .then(setBooking)
      .catch((cause: unknown) => setLoadError(cause instanceof Error ? cause : new Error(String(cause))));
    /*
     * The trip detail is supplementary — a chauffeur may not be assigned yet,
     * and that is not a screen failure. But it is no longer silent.
     *
     * A 404 means the trip does not exist yet, which is a real and expected
     * state before dispatch acts. Anything else is a failure, and with the
     * rebuilt full-bleed map it is a conspicuous one: no marker, no ETA, no
     * chauffeur — a blank map with a status pill and no explanation for why
     * the rest is missing. That is the "empty screen that lies" shape, on the
     * screen a customer stares at while they wait.
     */
    setTripError(null);
    tripsApi
      .getByBookingId(bookingId)
      .then((res) => {
        setTrip(res.trip);
        setDriver(res.driver);
        setVehicle(res.vehicle);
      })
      .catch((cause: unknown) => {
        const status = (cause as { status?: number } | null)?.status;
        if (status === 404) return; // No trip yet. Expected, not an error.
        setTripError(cause instanceof Error ? cause : new Error(String(cause)));
      });
  }, [bookingId]);

  /**
   * The cancel the app had been promising and could not perform.
   *
   * bookingsApi.cancel() and its endpoint both existed; no screen called
   * either, while book/payment and book/confirmed both told the customer they
   * could cancel free within a stated window. A promise with no control.
   *
   * Reloads on success rather than mutating local state, so the screen shows
   * what the store actually holds -- and the cancelled branch above then takes
   * over. On failure the ride is left exactly as it was and the error surfaces
   * through the existing path; a cancel that silently does nothing is the
   * failure-rendering-as-success shape this project keeps removing.
   */
  const cancelThis = useCallback(() => {
    if (!bookingId || cancelling) return;
    setCancelling(true);
    bookingsApi
      .cancel(bookingId)
      .then(() => load())
      .catch((cause: unknown) => setLoadError(cause instanceof Error ? cause : new Error(String(cause))))
      .finally(() => setCancelling(false));
  }, [bookingId, cancelling, load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /*
   * The chauffeur marks arrived in another tab and THIS screen moves, with
   * nothing touched here. Additive: the focus reload above is unchanged, and a
   * browser without the mechanism behaves exactly as it did.
   *
   * Two tabs of one browser. NOT two devices -- that is still G-3.
   */
  useDemoStateSync(load);

  // Re-fetch once the socket reports an assignment, so the chauffeur appears
  // without waiting for the next focus. Deferred a microtask so the refetch's
  // setState never lands synchronously inside the effect body.
  useEffect(() => {
    if (live.status === 'driver_assigned' && !driver) void Promise.resolve().then(load);
  }, [live.status, driver, load]);

  /* ---- what is true right now ---- */

  // The socket wins when it has spoken: it is more recent than the fetch.
  const status: TripStatus = live.status ?? trip?.status ?? booking?.status ?? 'pending';
  const etaMinutes = live.location?.etaMinutes ?? trip?.eta_minutes ?? null;

  /**
   * The denominator the progress curve is drawn against, captured ONCE.
   *
   * Recomputing it from the current ETA every tick would pin progress to a
   * constant and the bar would never move. It is the first ETA this screen
   * sees, held for the life of the mount.
   *
   * State set from an effect rather than a ref written during render: a ref
   * assignment in the render body is the thing the react-hooks rule forbids,
   * and it would also not re-render when the first ETA finally arrived — the
   * bar would stay absent until something else happened to re-render.
   */
  const [totalMinutes, setTotalMinutes] = useState<number | null>(null);
  useEffect(() => {
    if (totalMinutes !== null || etaMinutes === null || etaMinutes <= 0) return;
    // Deferred a microtask so the setState never lands synchronously inside the
    // effect body — the idiom used elsewhere in this codebase, and what the
    // cascading-render rule is asking for.
    void Promise.resolve().then(() => setTotalMinutes(etaMinutes));
  }, [etaMinutes, totalMinutes]);

  const rawChauffeur = useMemo<LatLng | null>(() => {
    const lat = live.location?.lat ?? trip?.driver_current_lat ?? null;
    const lng = live.location?.lng ?? trip?.driver_current_lng ?? null;
    return lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null;
  }, [live.location, trip?.driver_current_lat, trip?.driver_current_lng]);

  // A finished trip is a record, not a live feed — stop animating a marker
  // towards a car that is no longer going anywhere.
  const smoothed = useSmoothedLocation(rawChauffeur, !isTerminalStatus(status));

  /*
   * Keyed on the whole `booking`, not on its optional-chained members: the
   * React Compiler cannot preserve memoization across an optional chain in a
   * dependency list. One object reference, replaced wholesale by the fetch, so
   * the dependency is both correct and stable.
   */
  const pickup = useMemo<LatLng | null>(
    () => coordsOf(booking?.pickup_lat, booking?.pickup_lng),
    [booking],
  );
  const dropoff = useMemo<LatLng | null>(
    () => coordsOf(booking?.dropoff_lat, booking?.dropoff_lng),
    [booking],
  );

  /**
   * Approach until the passenger is aboard, then in-trip.
   *
   * `passenger_picked_up` is the hinge because that is the moment the subject
   * changes: before it the customer cares how close the car is to THEM, after
   * it they care how close they are to where they are going.
   */
  const phase = stageAtLeast(status, 'passenger_picked_up') ? 'in-trip' : 'approach';

  if (loadError) {
    return (
      <ScreenContainer>
        <ErrorState
          title="We couldn't load this trip"
          message="Your booking is safe — this is our end."
          onRetry={load}
        />
      </ScreenContainer>
    );
  }

  if (!booking) {
    return (
      <ScreenContainer>
        <Skeleton.Card />
      </ScreenContainer>
    );
  }

  /*
   * A COMPLETED RIDE IS A RECORD, NOT A LIVE FEED.
   *
   * Once the trip is done there is no car to watch, no ETA to believe and no
   * position to smooth — so the map and the live sheet are replaced entirely by
   * the receipt rather than left on screen showing a stopped marker. Leaving
   * the tracking layout up after completion is how an app ends up animating
   * towards a car that arrived twenty minutes ago.
   */
  if (status === 'completed') {
    return (
      <ScreenContainer scroll>
        <TripReceipt booking={booking} chauffeurName={driver?.full_name ?? null} />
      </ScreenContainer>
    );
  }

  /*
   * AND SO IS A CANCELLED ONE. The rule above was written for `completed` and
   * applied to one terminal status out of two.
   *
   * `isTerminalStatus()` covers both, and `TrackingSheet` computes its own
   * `terminal` from both — but this screen did not, so a cancelled booking fell
   * through to the full-bleed map, the marker smoother, both pins and the
   * floating sheet, with the cancellation reduced to one line inside the
   * timeline. An app animating a car towards a ride that is not happening is
   * the same defect the comment above forbids, in the other terminal state.
   *
   * There is no receipt: nothing was charged. What a customer needs here is
   * what was booked, that it is cancelled, and the way to book it again — which
   * `rebookDraftFrom()` already provides for the Cancelled tab.
   */
  if (status === 'cancelled') {
    return (
      <ScreenContainer scroll>
        <CancelledRecord booking={booking} onRebook={rebookThis} />
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.screen}>
      {/*
        The map sits UNDER everything and fills the display. It is not in a
        scroll view and it is not in a card.
      */}
      <TrackingMap
        chauffeur={smoothed.position}
        bearing={smoothed.bearing}
        pickup={pickup}
        dropoff={dropoff}
        phase={phase}
      />

      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.backWrap} pointerEvents="box-none">
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel="Go back"
            variant="circular"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/trips'))}
          />
        </View>
      </SafeAreaView>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <TrackingSheet
          status={status}
          etaMinutes={etaMinutes}
          totalMinutes={totalMinutes}
          driver={driver}
          vehicle={vehicle}
          /*
           * Null in every build: `drivers.hired_at` does not exist
           * (BACKEND_FOLLOWUPS.md §2). Passed explicitly rather than omitted so
           * the day the column lands, this is the one line that changes — and
           * so nobody is tempted to substitute the rating that IS available.
           */
          chauffeurYears={null}
          pickupAddress={booking.pickup_address}
          dropoffAddress={booking.dropoff_address}
          live={live.connected}
          detailUnavailable={tripError !== null}
          onRetryDetail={load}
          /*
           * The C-4 overlay. `Trip` has no `arrived_at` column — the backend
           * has nowhere to record the moment a car reaches the kerb — so this
           * reads a field that only the demo layer supplies and returns null
           * against a real server. See `src/lib/rideStage.ts`.
           */
          arrivedAt={arrivedAtFrom(trip)}
          serviceType={booking.service_type}
          scheduledAt={booking.scheduled_at}
          onCancel={cancelThis}
          cancelling={cancelling}
        />
      </View>
    </View>
  );
}

/** A pair of nullable columns as a point, or null when either is missing. */
function coordsOf(lat: number | null | undefined, lng: number | null | undefined): LatLng | null {
  return lat != null && lng != null ? { latitude: lat, longitude: lng } : null;
}

/** True when `status` has reached `stage` or gone past it. */
function stageAtLeast(status: TripStatus, stage: TripStatus): boolean {
  const order: TripStatus[] = [
    'pending',
    'confirmed',
    'driver_assigned',
    'driver_arriving',
    'passenger_picked_up',
    'trip_started',
    'completed',
  ];
  const a = order.indexOf(status);
  const b = order.indexOf(stage);
  return a >= 0 && b >= 0 && a >= b;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  overlay: { ...StyleSheet.absoluteFill as object },
  backWrap: { padding: Platform.select({ web: 16, default: 12 }) },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

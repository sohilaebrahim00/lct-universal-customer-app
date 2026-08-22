import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { HomeView, routeLabel, type HomeData, type NextTrip } from '../../src/components/home/HomeView';
import { useAuthStore } from '../../src/store/authStore';
import { useBookingFormStore } from '../../src/store/bookingFormStore';
import { bookingsApi } from '../../src/api/bookings';
import { vehiclesApi } from '../../src/api/vehicles';
import { tripsApi } from '../../src/api/trips';
import type { Booking, ServiceType, Vehicle } from '../../src/types/api';
import { isTerminalStatus } from '../../src/lib/tripStatus';
import { asyncState, type AsyncState } from '../../src/lib/asyncState';

/**
 * HOME — the storefront. Data only; the presentation is in `HomeView`.
 *
 * Was a marketing page: a fixed 380pt hero over seven sibling section headings,
 * with the returning customer's actual job below the fold (audit P2-1). It is
 * now four things in priority order — who you are, the car that is coming, the
 * trip you would most likely repeat, and one way to start a new one.
 *
 * `ReviewsSection` was REMOVED rather than relocated: its four testimonials were
 * attributed to named individuals and written for the prototype. Fabricated
 * reviews do not move to another screen.
 */
export default function HomeScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const resetDraft = useBookingFormStore((s) => s.reset);
  const updateDraft = useBookingFormStore((s) => s.update);

  const [state, setState] = useState<AsyncState<HomeData>>(asyncState.idle<HomeData>());
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    // A guest has no bookings to read; asking would only produce a 401 to swallow.
    if (status !== 'signed-in') {
      setState(asyncState.success<HomeData>({ next: null, rebook: [], vehicleNames: {} }));
      return;
    }

    setState(asyncState.loading<HomeData>());
    setNow(new Date());

    try {
      const [bookings, vehicles] = await Promise.all([bookingsApi.list(), vehiclesApi.list()]);
      const vehicleNames = Object.fromEntries(vehicles.map((v: Vehicle) => [v.id, v.name]));

      const upcoming = bookings
        .filter((b) => !isTerminalStatus(b.status))
        .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
      const past = bookings
        .filter((b) => b.status === 'completed')
        .sort((a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at));

      // Two most recent completed trips, de-duplicated by route so "Book again"
      // never offers the same journey twice.
      const seen = new Set<string>();
      const rebook: Booking[] = [];
      for (const b of past) {
        const key = routeLabel(b);
        if (seen.has(key)) continue;
        seen.add(key);
        rebook.push(b);
        if (rebook.length === 2) break;
      }

      const nextBooking = upcoming[0] ?? null;
      let next: NextTrip | null = null;
      if (nextBooking) {
        next = { booking: nextBooking, driver: null, vehicle: null };
        // The chauffeur row exists only once one is assigned. A failure here is
        // not a screen failure — the trip card still renders without it.
        try {
          const detail = await tripsApi.getByBookingId(nextBooking.id);
          next = { booking: nextBooking, driver: detail.driver, vehicle: detail.vehicle };
        } catch {
          // Intentionally soft; the outer catch handles real failures.
        }
      }

      setState(asyncState.success<HomeData>({ next, rebook, vehicleNames }));
    } catch (cause) {
      // Not `.catch(() => setBookings([]))`. A failed read is not an empty list,
      // and telling a customer with a car coming that they have none is the
      // single worst thing this screen used to do (audit P0-5).
      setState(asyncState.error<HomeData>(cause));
    }
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function startBooking(serviceType: ServiceType) {
    resetDraft();
    updateDraft({ serviceType });
    // Straight to step 1 — this used to push the service picker, where the
    // service was already chosen and Continue was the only control (audit P2-3).
    router.push('/(app)/book/pickup');
  }

  function rebook(booking: Booking) {
    resetDraft();
    updateDraft({
      serviceType: booking.service_type,
      pickupAddress: booking.pickup_address,
      pickupLat: booking.pickup_lat ?? undefined,
      pickupLng: booking.pickup_lng ?? undefined,
      dropoffAddress: booking.dropoff_address ?? '',
      dropoffLat: booking.dropoff_lat ?? undefined,
      dropoffLng: booking.dropoff_lng ?? undefined,
      passengerCount: booking.passenger_count,
      luggageCount: booking.luggage_count,
    });
    router.push('/(app)/book/pickup');
  }

  return (
    <HomeView
      state={state}
      firstName={profile?.full_name?.split(' ')[0] ?? null}
      fullName={profile?.full_name ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      now={now}
      onRetry={() => void load()}
      onStartBooking={startBooking}
      onRebook={rebook}
      onOpenTrip={(id) => router.push(`/(app)/trips/${id}`)}
    />
  );
}

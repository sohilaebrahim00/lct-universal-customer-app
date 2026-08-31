import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { SegmentedControl } from '../../../src/components/ui/SegmentedControl';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { TripCard } from '../../../src/components/ui/TripCard';
import { gutter, space, theme } from '../../../src/theme';
import { bookingsApi } from '../../../src/api/bookings';
import type { Booking } from '../../../src/types/api';
import { isUpcomingBookingStatus } from '../../../src/lib/tripStatus';
import { AuthGate } from '../../../src/components/AuthGate';
import { useAuthStore } from '../../../src/store/authStore';
import { asyncState, type AsyncState } from '../../../src/lib/asyncState';
import { rebookDraftFrom } from '../../../src/lib/rebook';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { isDemoMode } from '../../../src/lib/env';
import { copy } from '../../../src/copy/strings';
import { AppText } from '../../../src/components/ui/Typography';

type Tab = 'upcoming' | 'past' | 'cancelled';

/**
 * Slice 2 replaces this screen's LOCAL `TripCard` — a worse copy of the shared
 * one, which had zero call sites — and swaps the two stacked serif headings for
 * a `SegmentedControl`, which is what lets each list be its own `FlatList`
 * instead of both `.map()`ing inside one `ScrollView` (audit P1-8: trip history
 * is unbounded).
 *
 * It also removes the screen's silent catch. `.catch(() => setBookings([]))`
 * meant a 500 from `GET /bookings` rendered "No upcoming trips" — telling a
 * customer with a car arriving in twenty minutes that they had none. Failed,
 * empty and loading are now three different things on screen.
 *
 * The full artboard-2j treatment (live-trip action row, receipt links) is
 * slice 9. This is the wiring.
 */
export default function TripsScreen() {
  const router = useRouter();
  /** Stable across renders — see the note at the FlatList's renderItem. */
  const openTrip = useCallback((id: string) => router.push(`/(app)/trips/${id}`), [router]);

  const status = useAuthStore((s) => s.status);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [state, setState] = useState<AsyncState<Booking[]>>(asyncState.idle<Booking[]>());
  const [refreshing, setRefreshing] = useState(false);

  const resetDraft = useBookingFormStore((s) => s.reset);
  const updateDraft = useBookingFormStore((s) => s.update);

  /**
   * Book again, from a past or cancelled journey.
   *
   * Offered on Past and Cancelled only — a ride that has not happened yet is
   * not one to book again. `useCallback`'d and id-taking so `TripCard`'s memo
   * is not defeated, exactly as `openTrip` is.
   *
   * The draft mapping is the SHARED one, so this screen and Home cannot drift
   * apart when a field is added to the booking form. See `src/lib/rebook.ts`
   * for what it carries and — more importantly — what it refuses to carry: the
   * old date, the old car and the old fare.
   */
  const bookAgain = useCallback(
    (id: string) => {
      const booking = (state.status === 'success' ? state.data : []).find((b) => b.id === id);
      if (!booking) return;
      resetDraft();
      updateDraft(rebookDraftFrom(booking));
      router.push('/(app)/book/pickup');
    },
    [state, resetDraft, updateDraft, router],
  );

  const load = useCallback(async () => {
    if (status !== 'signed-in') {
      setState(asyncState.success<Booking[]>([]));
      return;
    }
    setState(asyncState.loading<Booking[]>());
    try {
      setState(asyncState.success(await bookingsApi.list()));
    } catch (cause) {
      setState(asyncState.error<Booking[]>(cause));
    }
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      setState(asyncState.success(await bookingsApi.list()));
    } catch (cause) {
      setState(asyncState.error<Booking[]>(cause));
    } finally {
      setRefreshing(false);
    }
  }

  const bookings = state.status === 'success' ? state.data : [];
  /*
   * CANCELLED IS ITS OWN TAB, not a row buried inside Past.
   *
   * It used to be that `past` meant "everything not upcoming", which swept
   * cancelled rides in beside completed ones. A customer scanning Past for a
   * receipt was reading a list where some rows carry a fare that was charged
   * and some carry a fare that never was — told apart only by a status pill.
   *
   * All three lists derive from the SAME statuses the rest of the app uses. No
   * status is invented for the tab: cancelled is `cancelled`, past is anything
   * else terminal, upcoming is everything still live.
   */
  const upcoming = bookings.filter((b) => isUpcomingBookingStatus(b.status));
  const cancelled = bookings.filter((b) => b.status === 'cancelled');
  const past = bookings.filter((b) => !isUpcomingBookingStatus(b.status) && b.status !== 'cancelled');
  const rows = tab === 'upcoming' ? upcoming : tab === 'cancelled' ? cancelled : past;

  function routeOf(booking: Booking): string {
    const from = (booking.pickup_address.split(',')[0] ?? '').trim();
    const to = (booking.dropoff_address?.split(',')[0] ?? '').trim();
    return to ? `${from} → ${to}` : from;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <ScreenHeader title="Trips" />
        {isDemoMode ? (
          <AppText variant="caption" style={{ marginBottom: space.sm }}>
            {copy.common.demoDataNotice}
          </AppText>
        ) : null}
        <SegmentedControl<Tab>
          segments={[
            { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
            { value: 'past', label: 'Past', count: past.length },
            { value: 'cancelled', label: 'Cancelled', count: cancelled.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <AuthGate
        title="Sign in to view your trip history"
        message="Upcoming and past trips, live tracking, and receipts all live here once you have an account."
      >
        {state.status === 'loading' ? (
          <Skeleton.List count={3} style={styles.body} />
        ) : state.status === 'error' ? (
          <ErrorState
            title="We couldn't load your trips"
            message="Your trips are safe — this is our end."
            onRetry={() => void load()}
            style={styles.body}
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.body}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.content.accent} />
            }
            /*
              A STABLE handler, so the memo on TripCard is not defeated.

              `onPress={() => router.push(...)}` is a new function identity on
              every render, which makes every row's props change and re-renders
              the whole list on each pull-to-refresh. `openTrip` is
              `useCallback`'d and takes the id, so the row's props are stable
              between renders and only a row whose data actually changed
              re-renders. The memo and this are one change, not two.
            */
            renderItem={({ item }) => (
              <TripCard
                route={routeOf(item)}
                scheduledAt={item.scheduled_at}
                status={item.status}
                totalFare={item.total_fare}
                currency={item.currency}
                id={item.id}
                onOpen={openTrip}
                onBookAgain={tab === 'upcoming' ? undefined : bookAgain}
              />
            )}
            ListEmptyComponent={
              tab === 'upcoming' ? (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming trips"
                  message="When you book a car, it will show up here."
                  action={<Button label="Book a car" onPress={() => router.push('/(app)/book/pickup')} />}
                />
              ) : tab === 'cancelled' ? (
                /* Its own copy. "No past trips" on the Cancelled tab reads as a
                   bug, and an empty Cancelled list is good news, not an absence. */
                <EmptyState
                  icon={Clock}
                  title="Nothing cancelled"
                  message="Rides you cancel will be listed here, with the option to book them again."
                />
              ) : (
                <EmptyState icon={Clock} title="No past trips" message="Your completed trips will appear here." />
              )
            }
          />
        )}
      </AuthGate>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  header: { paddingHorizontal: gutter, paddingTop: space.sm },
  body: { paddingHorizontal: gutter, paddingTop: space.mdl, paddingBottom: space.xl },
});

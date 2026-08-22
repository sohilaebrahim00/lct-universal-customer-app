import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AlertCircle, ArrowRight, Clock, type LucideIcon } from 'lucide-react-native';
import { Avatar } from '../../src/components/ui/Avatar';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { FadeSlideIn } from '../../src/components/ui/FadeSlideIn';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { StatusPill } from '../../src/components/ui/StatusPill';
import { Surface } from '../../src/components/ui/Surface';
import { AppText } from '../../src/components/ui/Typography';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { gutter, iconSize, iconStroke, radius, space, theme } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useBookingFormStore } from '../../src/store/bookingFormStore';
import { bookingsApi } from '../../src/api/bookings';
import { vehiclesApi } from '../../src/api/vehicles';
import type { Booking, ServiceType, TripDriverInfo, TripVehicleInfo, Vehicle } from '../../src/types/api';
import { tripsApi } from '../../src/api/trips';
import { formatCurrency } from '../../src/lib/format';
import { isTerminalStatus } from '../../src/lib/tripStatus';
import { asyncState, type AsyncState } from '../../src/lib/asyncState';

/**
 * HOME — the storefront.
 *
 * This screen used to be a marketing page: a fixed 380pt hero followed by seven
 * sibling section headings (upcoming trip, quick booking, quick services,
 * featured fleet, why us, pricing preview, reviews), all at the same visual
 * weight, with the returning customer's actual job below the fold (audit P2-1).
 *
 * It is now four things in priority order: who you are, the car that is coming,
 * the trip you are most likely to repeat, and one way to start a new one.
 *
 * Removed, and where each went:
 *  · The 380pt hero — gone. Its job was brand, and the greeting plus the serif
 *    do that without costing the fold.
 *  · "Why LCT Universal" and "Pricing Preview" — belong on the Fleet and About
 *    screens, which already exist and are reachable from Account.
 *  · `ReviewsSection` — REMOVED ENTIRELY, not relocated. It shipped four
 *    testimonials attributed to named individuals ("James R.", "Amara T.", …)
 *    that were written for the prototype. Fabricated reviews presented as real
 *    ones do not move to another screen; they come back when there are real
 *    ones.
 *  · "Quick Booking" — its three rows (pickup, drop-off, date) all called the
 *    same handler and all opened the pickup map, so tapping "Date" opened a map
 *    (audit P2-2). Replaced by re-book rows that carry a real past fare.
 */

interface NextTrip {
  booking: Booking;
  driver: TripDriverInfo | null;
  vehicle: TripVehicleInfo | null;
}

interface HomeData {
  next: NextTrip | null;
  rebook: Booking[];
  vehicleNames: Record<string, string>;
}

const SERVICE_TILES: { type: ServiceType; label: string }[] = [
  { type: 'airport', label: 'Airport' },
  { type: 'corporate', label: 'Corporate' },
  { type: 'hourly', label: 'Hourly' },
];

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "in 3h 12m" / "in 45m". Null once the pickup time has passed — the status pill carries it from there. */
function countdownTo(iso: string, now: Date): string | null {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  const minutes = Math.round((target - now.getTime()) / 60000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  return `in ${Math.round(hours / 24)}d`;
}

/** "1240 Hillcrest Rd, Beverly Hills" → "1240 Hillcrest Rd". */
function shortAddress(address: string | null): string {
  if (!address) return '';
  return (address.split(',')[0] ?? address).trim();
}

function routeLabel(booking: Booking): string {
  const from = shortAddress(booking.pickup_address);
  const to = shortAddress(booking.dropoff_address);
  return to ? `${from} → ${to}` : from;
}

export default function HomeScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const resetDraft = useBookingFormStore((s) => s.reset);
  const updateDraft = useBookingFormStore((s) => s.update);

  const [state, setState] = useState<AsyncState<HomeData>>(asyncState.idle<HomeData>());
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    // A guest has no bookings to read; the screen is the services + primary
    // action, and asking the API would only produce a 401 to swallow.
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
      for (const booking of past) {
        const key = routeLabel(booking);
        if (seen.has(key)) continue;
        seen.add(key);
        rebook.push(booking);
        if (rebook.length === 2) break;
      }

      const nextBooking = upcoming[0] ?? null;
      let next: NextTrip | null = null;
      if (nextBooking) {
        next = { booking: nextBooking, driver: null, vehicle: null };
        // The chauffeur row only exists once one is assigned. A failure here is
        // not a screen failure — the trip card still renders without it.
        try {
          const detail = await tripsApi.getByBookingId(nextBooking.id);
          next = { booking: nextBooking, driver: detail.driver, vehicle: detail.vehicle };
        } catch {
          // Intentionally soft: see above. The outer catch handles real failures.
        }
      }

      setState(asyncState.success<HomeData>({ next, rebook, vehicleNames }));
    } catch (cause) {
      // Not `.catch(() => setBookings([]))`. A failed read is not an empty list,
      // and telling a customer with a car coming that they have no trips is the
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
    // Straight to step 1. This used to push the service picker, where the
    // service was already selected and Continue was the only control — a dead
    // tap at the top of every booking (audit P2-3).
    router.push('/(app)/book/pickup');
  }

  function rebookTrip(booking: Booking) {
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
    // Straight to the time step: the addresses are already known, so asking for
    // them again is the tap this row exists to remove.
    router.push('/(app)/book/pickup');
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? null;
  const data = state.status === 'success' ? state.data : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 1 — who you are */}
        <View style={styles.greeting}>
          <View style={styles.greetingText}>
            <AppText variant="eyebrow">{greetingFor(now)}</AppText>
            <AppText variant="title" numberOfLines={1}>
              {firstName ?? 'Welcome'}
            </AppText>
          </View>
          <Avatar name={profile?.full_name ?? null} uri={profile?.avatar_url ?? null} size="md" />
        </View>

        {/* 2 — the car that is coming */}
        {state.status === 'loading' ? (
          <Skeleton.Card style={styles.block} />
        ) : state.status === 'error' ? (
          <View style={styles.block}>
            <Card>
              {/*
                ErrorState now owns the action row, including the "Call
                dispatch" button that renders only when
                servicePolicy.dispatchPhone is set. That number is still a
                blocked business input, so today this is "Try again" alone.
              */}
              <ErrorState
                icon={AlertCircle}
                title="We couldn't load your trips"
                message="Your trips are safe — this is our end."
                onRetry={() => void load()}
              />
            </Card>
          </View>
        ) : data?.next ? (
          <FadeSlideIn sessionKey="home-next-trip" style={styles.block}>
            <NextTripCard
              trip={data.next}
              now={now}
              onPress={() => router.push(`/(app)/trips/${data.next?.booking.id}`)}
            />
          </FadeSlideIn>
        ) : null}

        {/* 3 — the trip you are most likely to repeat */}
        {data && data.rebook.length > 0 ? (
          <FadeSlideIn sessionKey="home-rebook" delay={60} style={styles.block}>
            <AppText variant="section" style={styles.sectionHeader}>
              Book again
            </AppText>
            <View style={styles.rebookList}>
              {data.rebook.map((booking) => (
                <RebookRow
                  key={booking.id}
                  icon={booking.service_type === 'hourly' ? Clock : ArrowRight}
                  title={routeLabel(booking)}
                  meta={[data.vehicleNames[booking.vehicle_id], `${formatCurrency(booking.total_fare, booking.currency)} all-in`]
                    .filter(Boolean)
                    .join(' · ')}
                  onPress={() => rebookTrip(booking)}
                />
              ))}
            </View>
          </FadeSlideIn>
        ) : null}

        {/* 4 — start a new one */}
        <FadeSlideIn sessionKey="home-services" delay={120} style={styles.block}>
          <AppText variant="section" style={styles.sectionHeader}>
            Services
          </AppText>
          <View style={styles.tiles}>
            {SERVICE_TILES.map((tile) => (
              <Pressable
                key={tile.type}
                onPress={() => startBooking(tile.type)}
                accessibilityRole="button"
                accessibilityLabel={`Book ${tile.label}`}
                style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
              >
                <AppText variant="caption" color={theme.content.primary} center>
                  {tile.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </FadeSlideIn>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Book a car" haptic onPress={() => startBooking('point_to_point')} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */

function NextTripCard({ trip, now, onPress }: { trip: NextTrip; now: Date; onPress: () => void }) {
  const { booking, driver, vehicle } = trip;
  const countdown = countdownTo(booking.scheduled_at, now);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Your next trip, ${routeLabel(booking)}`}>
      <Card prominent flush>
        <View style={styles.nextBody}>
          <View style={styles.nextTopRow}>
            <StatusPill status={booking.status} />
            {countdown ? (
              <AppText variant="caption" style={styles.countdown}>
                {countdown}
              </AppText>
            ) : null}
          </View>

          <AppText variant="heading" numberOfLines={1}>
            {shortAddress(booking.dropoff_address) || shortAddress(booking.pickup_address)}
          </AppText>

          {/*
            The chauffeur row renders only when a chauffeur has been assigned.
            NOTE — the design shows a licence plate and vehicle colour here
            ("Black S-Class · 8XKL294"). Neither exists in the API:
            `TripVehicleInfo` is `{ name, type }` and there is no plate or colour
            field anywhere in src/types/api.ts. Rather than invent one, the row
            shows what the backend actually returns. Logged as a backend
            follow-up — it also blocks slice 13's "vehicle identification
            readable as one utterance".
          */}
          {driver ? (
            <View style={styles.chauffeurRow}>
              <Avatar name={driver.full_name} uri={driver.avatar_url} size="sm" />
              <View style={styles.chauffeurText}>
                <AppText variant="subheading" numberOfLines={1}>
                  {driver.full_name}
                </AppText>
                {vehicle ? (
                  <AppText variant="captionSm" numberOfLines={1}>
                    {vehicle.name}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.trackChip}>
                <AppText variant="caption" color={theme.content.accentSoft}>
                  Track
                </AppText>
              </View>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

function RebookRow({
  icon: Icon,
  title,
  meta,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Book again: ${title}, ${meta}`}>
      <Surface level="row" cornerRadius={radius.md} style={styles.rebookRow}>
        {/* content.secondary, not gold — see ListRow for why the accent stopped doing icon duty. */}
        <Icon size={iconSize.md} color={theme.content.secondary} strokeWidth={iconStroke.decorative} />
        <View style={styles.rebookText}>
          <AppText variant="subheading" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="captionSm" numberOfLines={1}>
            {meta}
          </AppText>
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  scroll: { paddingBottom: space.lg },
  greeting: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: space.sm,
    paddingHorizontal: gutter,
    paddingBottom: space.md,
  },
  greetingText: { flex: 1, marginEnd: space.md },
  block: { paddingHorizontal: gutter, marginBottom: space.md },
  sectionHeader: { marginBottom: space.smd },

  nextBody: { padding: space.md },
  nextTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.smd },
  countdown: {},
  chauffeurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.smd,
    paddingTop: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border.hairline,
  },
  chauffeurText: { flex: 1, marginHorizontal: 11 },
  trackChip: {
    paddingHorizontal: 13,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border.outline,
  },

  rebookList: { gap: 9 },
  rebookRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14 },
  rebookText: { flex: 1, marginStart: space.smd },

  tiles: { flexDirection: 'row', gap: 9 },
  tile: {
    flex: 1,
    // Padding, not aspectRatio — the old tiles were locked to 1.15 and clipped
    // as soon as the user raised text size.
    paddingVertical: 13,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    backgroundColor: theme.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  tilePressed: { backgroundColor: theme.background.tertiary },


  footer: { paddingHorizontal: gutter, paddingBottom: space.smd, paddingTop: space.sm },
});

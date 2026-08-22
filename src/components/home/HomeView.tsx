import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AlertCircle, ArrowRight, Clock, type LucideIcon } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorState } from '../ui/ErrorState';
import { FadeSlideIn } from '../ui/FadeSlideIn';
import { Skeleton } from '../ui/Skeleton';
import { StatusPill } from '../ui/StatusPill';
import { Surface } from '../ui/Surface';
import { AppText } from '../ui/Typography';
import { gutter, iconSize, iconStroke, radius, space, theme } from '../../theme';
import type { Booking, ServiceType, TripDriverInfo, TripVehicleInfo } from '../../types/api';
import { formatCurrency } from '../../lib/format';
import type { AsyncState } from '../../lib/asyncState';

/**
 * Home's presentation, with no data fetching in it.
 *
 * Split out from `app/(app)/index.tsx` so the same view can be rendered from the
 * dev fixture route in states this environment cannot otherwise reach — a
 * populated Home needs a signed-in session and a backend, and there is neither.
 * The route file keeps the loading and the store reads; everything visual is
 * here, which also means a screenshot of a state is a screenshot of the real
 * component rather than of a look-alike.
 */

export interface NextTrip {
  booking: Booking;
  driver: TripDriverInfo | null;
  vehicle: TripVehicleInfo | null;
}

export interface HomeData {
  next: NextTrip | null;
  rebook: Booking[];
  vehicleNames: Record<string, string>;
}

interface Props {
  state: AsyncState<HomeData>;
  firstName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  /** Injected so the greeting and countdown are deterministic under test. */
  now: Date;
  onRetry: () => void;
  onStartBooking: (serviceType: ServiceType) => void;
  onRebook: (booking: Booking) => void;
  onOpenTrip: (bookingId: string) => void;
}

const SERVICE_TILES: { type: ServiceType; label: string }[] = [
  { type: 'airport', label: 'Airport' },
  { type: 'corporate', label: 'Corporate' },
  { type: 'hourly', label: 'Hourly' },
];

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "in 3h 12m" / "in 45m". Null once pickup has passed — the status pill carries it from there. */
export function countdownTo(iso: string, now: Date): string | null {
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
export function shortAddress(address: string | null): string {
  if (!address) return '';
  return (address.split(',')[0] ?? address).trim();
}

export function routeLabel(booking: Booking): string {
  const from = shortAddress(booking.pickup_address);
  const to = shortAddress(booking.dropoff_address);
  return to ? `${from} → ${to}` : from;
}

export function HomeView({
  state,
  firstName,
  fullName,
  avatarUrl,
  now,
  onRetry,
  onStartBooking,
  onRebook,
  onOpenTrip,
}: Props) {
  const data = state.status === 'success' ? state.data : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}>
          <View style={styles.greetingText}>
            <AppText variant="eyebrow">{greetingFor(now)}</AppText>
            <AppText variant="title" numberOfLines={1}>
              {firstName ?? 'Welcome'}
            </AppText>
          </View>
          <Avatar name={fullName} uri={avatarUrl} size="md" />
        </View>

        {state.status === 'loading' ? (
          <Skeleton.Card style={styles.block} />
        ) : state.status === 'error' ? (
          <View style={styles.block}>
            <Card>
              <ErrorState
                icon={AlertCircle}
                title="We couldn't load your trips"
                message="Your trips are safe — this is our end."
                onRetry={onRetry}
              />
            </Card>
          </View>
        ) : data?.next ? (
          <FadeSlideIn sessionKey="home-next-trip" style={styles.block}>
            <NextTripCard trip={data.next} now={now} onPress={() => onOpenTrip(data.next!.booking.id)} />
          </FadeSlideIn>
        ) : null}

        {data && data.rebook.length > 0 ? (
          <FadeSlideIn sessionKey="home-rebook" delay={60} style={styles.block}>
            <AppText variant="section" style={styles.sectionHeader}>
              Book again
            </AppText>
            <View style={styles.rebookList}>
              {data.rebook.map((b) => (
                <RebookRow
                  key={b.id}
                  icon={b.service_type === 'hourly' ? Clock : ArrowRight}
                  title={routeLabel(b)}
                  meta={[data.vehicleNames[b.vehicle_id], `${formatCurrency(b.total_fare, b.currency)} all-in`]
                    .filter(Boolean)
                    .join(' · ')}
                  onPress={() => onRebook(b)}
                />
              ))}
            </View>
          </FadeSlideIn>
        ) : null}

        <FadeSlideIn sessionKey="home-services" delay={120} style={styles.block}>
          <AppText variant="section" style={styles.sectionHeader}>
            Services
          </AppText>
          <View style={styles.tiles}>
            {SERVICE_TILES.map((tile) => (
              <Pressable
                key={tile.type}
                onPress={() => onStartBooking(tile.type)}
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
        <Button label="Book a car" haptic onPress={() => onStartBooking('point_to_point')} />
      </View>
    </View>
  );
}

function NextTripCard({ trip, now, onPress }: { trip: NextTrip; now: Date; onPress: () => void }) {
  const { booking, driver, vehicle } = trip;
  const countdown = countdownTo(booking.scheduled_at, now);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Your next trip, ${routeLabel(booking)}`}>
      <Card prominent flush>
        <View style={styles.nextBody}>
          <View style={styles.nextTopRow}>
            <StatusPill status={booking.status} />
            {countdown ? <AppText variant="caption">{countdown}</AppText> : null}
          </View>

          <AppText variant="heading" numberOfLines={1}>
            {shortAddress(booking.dropoff_address) || shortAddress(booking.pickup_address)}
          </AppText>

          {/*
            NOTE — the design shows a plate and colour here ("Black S-Class ·
            8XKL294"). Neither exists in the API: the trip join returns
            `{ name, type }`, and `vehicles` is a fare-class table with no plate,
            colour or make/model. See BACKEND_FOLLOWUPS.md §1. This renders what
            the backend actually returns rather than inventing the rest.
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
        {/* content.secondary, not gold — the accent is the action, not the icon. */}
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

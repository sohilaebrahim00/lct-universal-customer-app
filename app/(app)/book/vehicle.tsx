import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticSelection } from '../../../src/lib/haptics';
import { Button } from '../../../src/components/ui/Button';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { IconButton } from '../../../src/components/ui/IconButton';
import { ProgressRail } from '../../../src/components/ui/ProgressRail';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { Surface } from '../../../src/components/ui/Surface';
import { AppText } from '../../../src/components/ui/Typography';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { gutter, radius, space, theme } from '../../../src/theme';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { vehiclesApi } from '../../../src/api/vehicles';
import type { Vehicle } from '../../../src/types/api';
import { calculateFarePreview, type FareBreakdown } from '../../../src/lib/pricingPreview';
import { formatCurrency, formatDateTime } from '../../../src/lib/format';
import { VEHICLE_IMAGES } from '../../../src/lib/vehicleImages';
import { asyncState, type AsyncState } from '../../../src/lib/asyncState';
import { isRTL } from '../../../src/i18n/rtl';

/**
 * STEP 4 — CHOOSE YOUR CAR.
 *
 * ── The number here is the number charged ───────────────────────────────────
 * The old screen quoted `Est. $X` computed against `new Date()` as a placeholder,
 * because the real date was not collected until the NEXT screen. Gratuity, tax
 * and any late-night surcharge then appeared for the first time on payment — a
 * ~30% jump at the moment of maximum commitment (audit P0-3).
 *
 * Every price on this screen is now all-in: base + distance + surcharges +
 * gratuity + tax, computed by the real `calculateFarePreview()` from the real
 * rate card. The chosen breakdown is written to `draft.allInFare` and carried to
 * payment, so the two screens read one object rather than each recomputing.
 *
 * ── Known, accepted rework ──────────────────────────────────────────────────
 * The route reorder that moves date/time BEFORE this screen has not landed yet.
 * Until it does, `scheduledAt` may be unset, and this screen falls back to the
 * earliest bookable slot (one hour out) for the late-night check. That is the
 * one input which can still move the total, and the fallback is stated on screen
 * rather than hidden. When the reorder lands, delete `FALLBACK_LEAD_MS` and read
 * the draft directly.
 */

const FALLBACK_LEAD_MS = 60 * 60 * 1000;
/** Card photo width from the artboard; the row's height follows from the content. */
const PHOTO_WIDTH = 108;

export default function VehicleStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);
  // Starts at `loading`, not `idle`, so the mount effect never has to set state
  // synchronously — which is both the lint rule and one fewer render.
  const [state, setState] = useState<AsyncState<Vehicle[]>>(asyncState.loading<Vehicle[]>());

  // Computed once at mount so the fare cannot drift while the screen is open.
  const [scheduledAt] = useState(() => draft.scheduledAt ?? new Date(Date.now() + FALLBACK_LEAD_MS));
  const usingFallbackDate = draft.scheduledAt === null;

  const load = useCallback(async () => {
    try {
      setState(asyncState.success(await vehiclesApi.list()));
    } catch (cause) {
      setState(asyncState.error<Vehicle[]>(cause));
    }
  }, []);

  /** Retry is a user gesture, so showing the loading state here is safe. */
  const retry = useCallback(() => {
    setState(asyncState.loading<Vehicle[]>());
    void load();
  }, [load]);

  useEffect(() => {
    // Deferred a microtask so the fetch's resolution never lands synchronously
    // inside the effect body — the same idiom LocationPickerScreen and
    // PlacesAutocomplete already use in this codebase.
    void Promise.resolve().then(load);
  }, [load]);

  const vehicles = useMemo(() => (state.status === 'success' ? state.data : []), [state]);

  /** All-in fare per vehicle. Never a typed figure — always the pricing function. */
  const fares = useMemo(() => {
    const map = new Map<string, FareBreakdown | null>();
    for (const vehicle of vehicles) {
      try {
        map.set(
          vehicle.id,
          calculateFarePreview({
            vehicle: {
              baseRate: Number(vehicle.base_rate),
              perMileRate: Number(vehicle.per_mile_rate),
              perHourRate: vehicle.per_hour_rate === null ? null : Number(vehicle.per_hour_rate),
            },
            serviceType: draft.serviceType ?? 'point_to_point',
            distanceMiles: draft.distanceMiles,
            hourlyDurationHours: draft.hourlyDurationHours,
            scheduledAt,
          }),
        );
      } catch {
        // A vehicle with no hourly rate on an hourly booking, for example.
        map.set(vehicle.id, null);
      }
    }
    return map;
  }, [vehicles, draft.serviceType, draft.distanceMiles, draft.hourlyDurationHours, scheduledAt]);

  function select(vehicle: Vehicle) {
    const fare = fares.get(vehicle.id) ?? null;
    hapticSelection();
    update({ vehicle, allInFare: fare });
  }

  const selected = draft.vehicle ? vehicles.find((v) => v.id === draft.vehicle?.id) : undefined;
  const selectedFare = selected ? (fares.get(selected.id) ?? null) : null;

  const subhead = [
    'Every price below is final — gratuity and tax included.',
    draft.distanceMiles ? `${draft.distanceMiles} mi` : null,
    formatDateTime(scheduledAt.toISOString()),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL() ? ChevronRight : ChevronLeft}
          accessibilityLabel="Go back"
          variant="circular"
          onPress={() => router.back()}
        />
        <View style={styles.railWrap}>
          <ProgressRail step={3} total={5} label="Your car" />
        </View>
      </View>

      <View style={styles.intro}>
        <AppText variant="heading" accessibilityRole="header">
          Choose your car
        </AppText>
        <AppText variant="captionSm" style={styles.subhead}>
          {subhead}
        </AppText>
        {usingFallbackDate ? (
          <AppText variant="captionSm" color={theme.content.tertiary} style={styles.subhead}>
            Pickup time is confirmed on the next step.
          </AppText>
        ) : null}
      </View>

      {state.status === 'loading' || state.status === 'idle' ? (
        <Skeleton.List count={3} style={styles.body} />
      ) : state.status === 'error' ? (
        <ErrorState
          title="We couldn't load the fleet"
          message="This is our end, not yours."
          onRetry={retry}
          style={styles.body}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              fare={fares.get(vehicle.id) ?? null}
              selected={draft.vehicle?.id === vehicle.id}
              passengerCount={draft.passengerCount}
              onSelect={() => select(vehicle)}
            />
          ))}
        </ScrollView>
      )}

      {/* Sticky footer: the chosen number stays on screen right up to the commit. */}
      <LinearGradient colors={['rgba(2,2,1,0)', theme.background.primary]} locations={[0, 0.4]} style={styles.footer}>
        {selected && selectedFare ? (
          <View style={styles.footerRow}>
            <AppText variant="caption" numberOfLines={1} style={styles.footerName}>
              {`${selected.name} · all-in`}
            </AppText>
            <AppText variant="heading">{formatCurrency(selectedFare.totalFare)}</AppText>
          </View>
        ) : null}
        <Button
          label={selectedFare ? `Continue · ${formatCurrency(selectedFare.totalFare)}` : 'Continue'}
          disabled={!selected || !selectedFare}
          disabledReason="Pick a car to continue"
          haptic
          onPress={() => router.push('/(app)/book/details')}
        />
      </LinearGradient>
    </View>
  );
}

function VehicleCard({
  vehicle,
  fare,
  selected,
  passengerCount,
  onSelect,
}: {
  vehicle: Vehicle;
  fare: FareBreakdown | null;
  selected: boolean;
  passengerCount: number;
  onSelect: () => void;
}) {
  const fits = vehicle.capacity_passengers >= passengerCount;
  const disabled = !fits || fare === null;
  const photo = VEHICLE_IMAGES[vehicle.type];

  const reason = !fits
    ? `Seats ${vehicle.capacity_passengers} — you have ${passengerCount} guests`
    : fare === null
      ? 'Not available for this trip'
      : null;

  return (
    <Pressable
      onPress={onSelect}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={[
        vehicle.name,
        fare ? `${formatCurrency(fare.totalFare)} all in` : null,
        `${vehicle.capacity_passengers} guests, ${vehicle.capacity_luggage} bags`,
        reason,
      ]
        .filter(Boolean)
        .join(', ')}
      style={styles.cardPressable}
    >
      <Surface level="card" cornerRadius={radius.lg} style={[styles.card, disabled ? styles.cardDisabled : null]}>
        <View style={styles.cardRow}>
          {photo ? <Image source={photo} style={styles.photo} resizeMode="cover" /> : null}

          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <AppText variant="subheading" numberOfLines={1} style={styles.name}>
                {vehicle.name}
              </AppText>
              {fare ? (
                <AppText variant="figure" color={theme.content.accentEmphasis}>
                  {formatCurrency(fare.totalFare)}
                </AppText>
              ) : null}
            </View>

            <AppText variant="captionSm" numberOfLines={2} style={styles.description}>
              {vehicle.description ?? ''}
            </AppText>

            <View style={styles.metaRow}>
              <AppText variant="captionSm">{`${vehicle.capacity_passengers} guests`}</AppText>
              <AppText variant="captionSm">{`${vehicle.capacity_luggage} bags`}</AppText>
              {fare ? (
                <AppText variant="micro" style={styles.allIn}>
                  All-in
                </AppText>
              ) : null}
            </View>

            {reason ? (
              <AppText variant="captionSm" color={theme.content.danger} style={styles.reason}>
                {reason}
              </AppText>
            ) : null}
          </View>

          {/*
            Selection is a 4pt rail on the trailing edge. The border width never
            changes — 1 → 1.5 shifted content by half a point on every side at
            the exact moment of the tap (audit P1-3).
          */}
          {selected ? <View style={styles.rail} pointerEvents="none" /> : null}
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.mdl, paddingTop: space.xs },
  railWrap: { flex: 1, marginStart: space.smd },
  intro: { paddingHorizontal: gutter, paddingTop: space.mdl, paddingBottom: space.smd },
  subhead: { marginTop: 5 },
  body: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: 160 },

  cardPressable: { marginBottom: 11 },
  card: { overflow: 'hidden' },
  cardDisabled: { opacity: 0.55 },
  cardRow: { flexDirection: 'row', minHeight: 124 },
  photo: { width: PHOTO_WIDTH, height: '100%' },
  cardBody: { flex: 1, padding: 13, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  name: { flex: 1 },
  description: { marginTop: 4, marginBottom: 7 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.smd,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border.hairline,
  },
  allIn: { marginStart: 'auto' },
  reason: { marginTop: 6 },
  rail: { position: 'absolute', top: 0, bottom: 0, insetInlineEnd: 0, width: 4, backgroundColor: theme.content.accent },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.mdl },
  footerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 },
  footerName: { flex: 1, marginEnd: space.sm },
});

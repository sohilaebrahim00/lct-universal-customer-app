import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { isQuoteOnly } from '../../../src/config/publishedFleet';
import { PRICING_STATEMENT } from '../../../src/config/servicePolicy';
import { AppImage } from '../../../src/components/ui/AppImage';

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
 * ── Why the fare here is final ──────────────────────────────────────────────
 * The route reorder landed: pickup, destination, WHEN & WHO, car, pay. So
 * `scheduledAt` is known before this screen renders, the late-night surcharge
 * is already decided, and there is no input left that can move the total. The
 * placeholder `previewDate = new Date()` is deleted.
 *
 * If `scheduledAt` is somehow missing — a deep link straight to this URL — the
 * screen says so and sends the customer back rather than quoting a number it
 * cannot stand behind.
 */

/** Card photo width from the artboard; the row's height follows from the content. */
const PHOTO_WIDTH = 108;

export default function VehicleStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);
  // Starts at `loading`, not `idle`, so the mount effect never has to set state
  // synchronously — which is both the lint rule and one fewer render.
  const [state, setState] = useState<AsyncState<Vehicle[]>>(asyncState.loading<Vehicle[]>());

  const scheduledAt = draft.scheduledAt;

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
      // The business will not price these without being asked, so neither does
      // the app. See src/lib/quoteOnly.ts.
      if (isQuoteOnly(vehicle.type)) {
        map.set(vehicle.id, null);
        continue;
      }
      if (!scheduledAt) {
        map.set(vehicle.id, null);
        continue;
      }
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
  const selectedIsQuoteOnly = selected ? isQuoteOnly(selected.type) : false;

  const subhead = [
    `${PRICING_STATEMENT} Every price below is final — gratuity and tax included.`,
    draft.distanceMiles ? `${draft.distanceMiles} mi` : null,
    scheduledAt ? formatDateTime(scheduledAt.toISOString()) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  /*
    No pickup time means no final fare. Rather than quote against a guess, the
    screen says what is missing and offers the way back. Only reachable by deep
    link now that the reorder has landed.
  */
  if (!scheduledAt) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <IconButton
            icon={isRTL() ? ChevronRight : ChevronLeft}
            accessibilityLabel="Go back"
            variant="circular"
            onPress={() => router.back()}
          />
        </View>
        <ErrorState
          title="We need your pickup time first"
          message="Prices here are final, so we set them once we know when your car is needed."
          action={<Button label="Set date & time" onPress={() => router.replace('/(app)/book/details')} />}
          style={styles.body}
        />
      </View>
    );
  }

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
          <ProgressRail step={4} total={5} label="Your car" />
        </View>
      </View>

      <View style={styles.intro}>
        <AppText variant="heading" accessibilityRole="header">
          Choose your car
        </AppText>
        <AppText variant="captionSm" style={styles.subhead}>
          {subhead}
        </AppText>

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
        {selected ? (
          <View style={styles.footerRow}>
            <AppText variant="caption" numberOfLines={1} style={styles.footerName}>
              {selectedIsQuoteOnly ? selected.name : `${selected.name} · all-in`}
            </AppText>
            {selectedFare && !selectedIsQuoteOnly ? (
              <AppText variant="heading">{formatCurrency(selectedFare.totalFare)}</AppText>
            ) : null}
          </View>
        ) : null}
        {/*
          A quote-only class continues to a REQUEST, not a booking, and the
          button says so. Committing a customer to "Continue · $X" for a vehicle
          the business quotes by hand would be the app inventing a price.
        */}
        <Button
          label={
            selectedIsQuoteOnly
              ? 'Request a quote'
              : selectedFare
                ? `Review & pay · ${formatCurrency(selectedFare.totalFare)}`
                : 'Review & pay'
          }
          disabled={!selected || (!selectedFare && !selectedIsQuoteOnly)}
          disabledReason="Pick a car to continue"
          haptic
          onPress={() => router.push('/(app)/book/payment')}
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
  const quoteOnly = isQuoteOnly(vehicle.type);
  // Quote-only classes are selectable — they are just not priced here.
  const disabled = !fits;
  const photo = VEHICLE_IMAGES[vehicle.type];

  const reason = !fits
    ? `Seats ${vehicle.capacity_passengers} — you have ${passengerCount} guests`
    : quoteOnly
      ? 'Our team confirms the fare for this class before you commit.'
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
        quoteOnly ? 'request quote' : fare ? `${formatCurrency(fare.totalFare)} all in` : null,
        `${vehicle.capacity_passengers} guests, ${vehicle.capacity_luggage} bags`,
        reason,
      ]
        .filter(Boolean)
        .join(', ')}
      style={styles.cardPressable}
    >
      <Surface level="card" cornerRadius={radius.lg} style={[styles.card, disabled ? styles.cardDisabled : null]}>
        <View style={styles.cardRow}>
          {photo ? <AppImage source={photo} style={styles.photo} /> : null}

          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <AppText variant="subheading" numberOfLines={2} style={styles.name}>
                {vehicle.name}
              </AppText>
              {quoteOnly ? (
                <AppText variant="caption" color={theme.content.accentEmphasis}>
                  Request quote
                </AppText>
              ) : fare ? (
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
              {fare && !quoteOnly ? (
                <AppText variant="micro" style={styles.allIn}>
                  All-in
                </AppText>
              ) : null}
            </View>

            {reason ? (
              <AppText
                variant="captionSm"
                // Only a capacity mismatch is a problem. "We quote this class by
                // hand" is information, and colouring it danger-red reads as an
                // error the customer needs to resolve.
                color={fits ? theme.content.secondary : theme.content.danger}
                style={styles.reason}
              >
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

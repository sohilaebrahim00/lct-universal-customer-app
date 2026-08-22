import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, ChevronLeft, ChevronRight, CreditCard, Plus } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { IconButton } from '../../../src/components/ui/IconButton';
import { ListRow } from '../../../src/components/ui/ListRow';
import { PriceBreakdown, type FareLine } from '../../../src/components/ui/PriceBreakdown';
import { ProgressRail } from '../../../src/components/ui/ProgressRail';
import { AppText } from '../../../src/components/ui/Typography';
import { gutter, iconSize, iconStroke, radius, space, theme } from '../../../src/theme';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { calculateFarePreview, type FareBreakdown } from '../../../src/lib/pricingPreview';
import { formatCurrency, formatDateTime, formatServiceType } from '../../../src/lib/format';
import { isStripeConfigured } from '../../../src/lib/env';
import { useStripeCheckout } from '../../../src/lib/useStripeCheckout';
import { AuthGate } from '../../../src/components/AuthGate';
import { cancellationSentenceFor } from '../../../src/config/servicePolicy';
import { isRTL } from '../../../src/i18n/rtl';

/**
 * STEP 5 — REVIEW & PAY.
 *
 * ── Nothing here is a surprise, which is the entire point ───────────────────
 * The breakdown is expanded by DEFAULT, not behind a disclosure triangle. Fare
 * opacity is the most-complained-about failure in this product category, and
 * the answer is showing every line before the customer authorises it.
 *
 * The total comes from `draft.allInFare` — the exact object the vehicle screen
 * computed and the customer chose on. It is not recomputed here. That is what
 * makes the reassurance line true rather than decorative: the two screens read
 * one value, so they cannot disagree.
 *
 * If the draft somehow arrives without it, this screen recomputes AND drops the
 * reassurance line, because at that point the claim would be unverified.
 *
 * ── The cancellation line ───────────────────────────────────────────────────
 * Renders only when `servicePolicy.freeCancellationWindowHours` is set. It is
 * null — a blocked business input — so nothing renders there. A cancellation
 * promise printed above a pay button is a commitment the business has not made.
 */
export default function PaymentStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const submit = useBookingFormStore((s) => s.submit);
  const submitting = useBookingFormStore((s) => s.submitting);
  const storeError = useBookingFormStore((s) => s.error);
  const { payWithStripe } = useStripeCheckout();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** The figure the customer chose on, carried forward — not re-derived. */
  const carried = draft.allInFare;

  /*
   * THE FARE-CHANGED CHECK.
   *
   * The route reorder that collects date/time BEFORE the car has not landed, so
   * the vehicle screen priced against a fallback time. If the customer then
   * picks a slot between 11pm and 5am, the late-night surcharge applies and the
   * carried figure is stale.
   *
   * Rather than silently swapping the number — the exact failure this whole
   * redesign exists to remove — the difference is recomputed here and stated on
   * screen. The customer authorises the new number knowing it moved and why.
   * When the reorder lands this can only ever be a no-op, and it stays as the
   * guard against the backend disagreeing.
   */

  const fallback = useMemo<FareBreakdown | null>(() => {
    if (carried || !draft.vehicle || !draft.serviceType) return null;
    try {
      return calculateFarePreview({
        vehicle: {
          baseRate: Number(draft.vehicle.base_rate),
          perMileRate: Number(draft.vehicle.per_mile_rate),
          perHourRate: draft.vehicle.per_hour_rate === null ? null : Number(draft.vehicle.per_hour_rate),
        },
        serviceType: draft.serviceType,
        distanceMiles: draft.distanceMiles,
        hourlyDurationHours: draft.hourlyDurationHours,
        scheduledAt: draft.scheduledAt ?? new Date(),
      });
    } catch {
      return null;
    }
  }, [carried, draft]);

  /** Recomputed against the ACTUAL scheduled time, once that is known. */
  const recomputed = useMemo<FareBreakdown | null>(() => {
    if (!draft.vehicle || !draft.serviceType || !draft.scheduledAt) return null;
    try {
      return calculateFarePreview({
        vehicle: {
          baseRate: Number(draft.vehicle.base_rate),
          perMileRate: Number(draft.vehicle.per_mile_rate),
          perHourRate: draft.vehicle.per_hour_rate === null ? null : Number(draft.vehicle.per_hour_rate),
        },
        serviceType: draft.serviceType,
        distanceMiles: draft.distanceMiles,
        hourlyDurationHours: draft.hourlyDurationHours,
        scheduledAt: draft.scheduledAt,
      });
    } catch {
      return null;
    }
  }, [draft]);

  const fare = recomputed ?? carried ?? fallback;
  const fareChanged = Boolean(carried && recomputed && recomputed.totalFare !== carried.totalFare);

  const lines = useMemo<FareLine[]>(() => {
    if (!fare) return [];
    const rows: FareLine[] = [{ label: 'Base fare', amount: fare.baseFare }];
    if (fare.distanceFare > 0) {
      rows.push({
        label: draft.distanceMiles ? `Distance · ${draft.distanceMiles} mi` : 'Distance',
        amount: fare.distanceFare,
      });
    }
    if (fare.timeFare > 0) rows.push({ label: 'Time', amount: fare.timeFare });
    if (fare.surcharges > 0) rows.push({ label: 'Late-night surcharge', amount: fare.surcharges });
    rows.push({ label: 'Gratuity · 20%', amount: fare.gratuity });
    rows.push({ label: 'Tax', amount: fare.tax });
    return rows;
  }, [fare, draft.distanceMiles]);

  async function handlePayAndConfirm() {
    setError(null);
    const result = await submit();
    if (!result) return;

    if (isStripeConfigured) {
      setProcessing(true);
      const checkout = await payWithStripe(result.bookingId);
      setProcessing(false);
      if (checkout.status === 'error') {
        setError(checkout.message ?? 'Payment failed');
        return;
      }
      if (checkout.status === 'cancelled') return;
    }

    router.replace(`/(app)/book/confirmed?bookingId=${result.bookingId}&tripId=${result.tripId}`);
  }

  const total = fare ? formatCurrency(fare.totalFare) : null;

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
          <ProgressRail step={5} total={5} label="Review & pay" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={styles.card} flush>
          <ListRow title="Service" value={draft.serviceType ? formatServiceType(draft.serviceType) : '—'} chevron={false} />
          <ListRow title="Pickup" value={draft.pickupAddress || '—'} chevron={false} />
          {draft.serviceType !== 'hourly' ? (
            <ListRow title="Drop-off" value={draft.dropoffAddress || '—'} chevron={false} />
          ) : null}
          <ListRow
            title="Date & time"
            value={draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()) : 'Confirmed on booking'}
            chevron={false}
          />
          <ListRow title="Car" value={draft.vehicle?.name ?? '—'} chevron={false} divider={false} />
        </Card>

        {fare ? (
          <Card style={styles.card}>
            <PriceBreakdown
              lines={lines}
              total={fare.totalFare}
              // True only when the total IS the carried object. Never a static string.
              // A claim, so only made when it is true.
              reassurance={
                carried && !fareChanged
                  ? `This is the same ${formatCurrency(carried.totalFare)} you chose the car on. Nothing has been added.`
                  : undefined
              }
            />
          </Card>
        ) : null}

        {fareChanged && carried && recomputed ? (
          <Card style={styles.changedCard}>
            <AppText variant="subheading" color={theme.content.accentEmphasis}>
              The fare changed
            </AppText>
            <AppText variant="captionSm" style={styles.changedBody}>
              {`Your pickup time falls in the late-night window, so a surcharge applies. It was ${formatCurrency(
                carried.totalFare,
              )}; it is now ${formatCurrency(recomputed.totalFare)}. Nothing is charged until you authorise it.`}
            </AppText>
          </Card>
        ) : null}

        <AppText variant="section" style={styles.sectionHeader}>
          Payment method
        </AppText>

        <Card style={styles.selectedCard}>
          <View style={styles.methodRow}>
            <CreditCard size={iconSize.lg} color={theme.content.secondary} strokeWidth={iconStroke.decorative} />
            <View style={styles.methodText}>
              <AppText variant="subheading">Card on file</AppText>
              <AppText variant="captionSm">
                {isStripeConfigured ? 'Charged when your chauffeur is assigned' : 'Card payment is not set up on this build'}
              </AppText>
            </View>
            <Check size={iconSize.md} color={theme.content.accent} strokeWidth={2} />
          </View>
        </Card>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a card"
          onPress={() => router.push('/(app)/account/payment-methods')}
          style={styles.addCard}
        >
          <Plus size={iconSize.sm} color={theme.content.accentSoft} strokeWidth={iconStroke.interactive} />
          <AppText variant="caption" color={theme.content.accentSoft} style={styles.addCardLabel}>
            Add a card
          </AppText>
        </Pressable>

        {error ?? storeError ? (
          <AppText variant="caption" color={theme.content.danger} style={styles.error}>
            {error ?? storeError}
          </AppText>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <AuthGate
          title="Create your account to complete your reservation"
          message="You're one step away — sign in or create a free account to confirm. Your trip details are saved."
          onContinueLater={() => router.push('/(app)')}
        >
          <Button
            label={total ? `Authorise ${total}` : 'Authorise'}
            loading={submitting || processing}
            disabled={!fare}
            disabledReason="Pick a car first"
            haptic
            onPress={handlePayAndConfirm}
          />
          {/*
            The published window for THIS service type — 6 hours on an airport
            transfer, 12 on a point-to-point, 48 on hourly or an event. Not a
            generic line: telling an airport customer "12 hours" would be as
            wrong as inventing a figure. Null (a quote-routed custom booking)
            still renders nothing.
          */}
          {cancellationSentenceFor(draft.serviceType) ? (
            <AppText variant="captionSm" center style={styles.policy}>
              {cancellationSentenceFor(draft.serviceType)}
            </AppText>
          ) : null}
        </AuthGate>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.mdl, paddingTop: space.xs },
  railWrap: { flex: 1, marginStart: space.smd },
  body: { paddingHorizontal: gutter, paddingTop: space.mdl, paddingBottom: space.xl },
  card: { marginBottom: 14 },
  sectionHeader: { marginBottom: 9 },
  changedCard: { marginBottom: 14, borderColor: theme.border.accent },
  changedBody: { marginTop: 6 },
  selectedCard: { marginBottom: 9, borderColor: theme.border.selected },
  methodRow: { flexDirection: 'row', alignItems: 'center' },
  methodText: { flex: 1, marginHorizontal: space.smd },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border.accent,
  },
  addCardLabel: { marginStart: space.sm },
  error: { marginTop: space.md },
  footer: { paddingHorizontal: gutter, paddingBottom: space.mdl, paddingTop: space.sm },
  policy: { marginTop: space.smd },
});

import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StepHeader } from '../../../src/components/booking/StepHeader';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ListRow } from '../../../src/components/ui/ListRow';
import { PriceBreakdown, type FareLine } from '../../../src/components/ui/PriceBreakdown';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { calculateFarePreview } from '../../../src/lib/pricingPreview';
import { formatDateTime, formatServiceType } from '../../../src/lib/format';
import { isStripeConfigured } from '../../../src/lib/env';
import { useStripeCheckout } from '../../../src/lib/useStripeCheckout';
import { AuthGate } from '../../../src/components/AuthGate';

/** Only non-zero components are shown — a "$0.00 Time" row is noise, not transparency. */
function fareLines(fare: {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surcharges: number;
  gratuity: number;
  tax: number;
}): FareLine[] {
  const lines: FareLine[] = [{ label: 'Base fare', amount: fare.baseFare }];
  if (fare.distanceFare > 0) lines.push({ label: 'Distance', amount: fare.distanceFare });
  if (fare.timeFare > 0) lines.push({ label: 'Time', amount: fare.timeFare });
  if (fare.surcharges > 0) lines.push({ label: 'Late-night surcharge', amount: fare.surcharges });
  lines.push({ label: 'Gratuity · 20%', amount: fare.gratuity });
  lines.push({ label: 'Tax', amount: fare.tax });
  return lines;
}

/** Summary rows read as label + value; ListRow already renders exactly that. */
function summaryRow(label: string, value: string) {
  return <ListRow key={label} title={label} value={value} chevron={false} />;
}

export default function PaymentStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const submit = useBookingFormStore((s) => s.submit);
  const submitting = useBookingFormStore((s) => s.submitting);
  const storeError = useBookingFormStore((s) => s.error);
  const { payWithStripe } = useStripeCheckout();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The authoritative fare — unlike the vehicle-selection screen's preview,
  // this uses the real scheduledAt collected in the previous step, so the
  // late-night surcharge (the one thing the earlier preview couldn't know)
  // is now exact. The backend recomputes this same calculation server-side
  // on POST /bookings regardless — this is what the customer is shown
  // immediately before authorizing payment for it.
  const fare = useMemo(() => {
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
      // 'paid' and 'skipped' (including the web fallback) both proceed to
      // confirmation — a skipped payment leaves the booking payment-pending,
      // same as when Stripe isn't configured at all.
    }

    router.replace(`/(app)/book/confirmed?bookingId=${result.bookingId}&tripId=${result.tripId}`);
  }

  return (
    <ScreenContainer>
      <StepHeader step={5} title="Payment" subtitle="Review your fare and confirm your booking." />

      <Card style={{ marginBottom: spacing.md }} flush>
        {summaryRow('Service', draft.serviceType ? formatServiceType(draft.serviceType) : '—')}
        {summaryRow('Pickup', draft.pickupAddress || '—')}
        {draft.serviceType !== 'hourly' ? summaryRow('Drop-off', draft.dropoffAddress || '—') : null}
        {summaryRow('Date & time', draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()) : '—')}
        {summaryRow('Vehicle', draft.vehicle?.name ?? '—')}
        {draft.serviceType === 'hourly' && draft.hourlyDurationHours
          ? summaryRow('Duration', `${draft.hourlyDurationHours} hour${draft.hourlyDurationHours === 1 ? '' : 's'}`)
          : draft.durationMinutes
            ? summaryRow('Est. duration', `${draft.durationMinutes} min`)
            : null}
      </Card>

      {/*
        The shared PriceBreakdown, which existed with zero call sites while this
        screen hand-rolled its own rows (audit P0-6).

        NOTE — no `reassurance` prop is passed. "This is the same $261 you chose
        the car on" is a CLAIM, and it is not true yet: the vehicle screen still
        quotes an estimate computed from a placeholder date, and `allInFare`
        does not reach the draft until slice 7. Passing the line now would be
        printing a promise the code cannot keep, which is worse than an honest
        estimate. It gets passed in slice 8, after slice 7's parity check.
      */}
      {fare ? (
        <Card style={{ marginBottom: spacing.md }}>
          <PriceBreakdown lines={fareLines(fare)} total={fare.totalFare} />
        </Card>
      ) : null}

      {!isStripeConfigured ? (
        <AppText variant="caption" style={{ marginBottom: spacing.md }}>
          Card payment isn&apos;t configured on this server yet — your booking will still be created and marked
          payment-pending; you can pay once payment setup is complete.
        </AppText>
      ) : null}

      {error ?? storeError ? (
        <AppText variant="body" color={colors.destructive} style={{ marginBottom: spacing.md }}>
          {error ?? storeError}
        </AppText>
      ) : null}

      <AuthGate
        title="Create your account to complete your reservation"
        message="You're one step away — sign in or create a free account to confirm and pay. Your trip details are saved."
        onContinueLater={() => router.push('/(app)')}
      >
        <Button
          label={isStripeConfigured ? 'Pay & Confirm Booking' : 'Confirm Booking'}
          onPress={handlePayAndConfirm}
          loading={submitting || processing}
          style={{ marginTop: spacing.md }}
        />
      </AuthGate>
    </ScreenContainer>
  );
}

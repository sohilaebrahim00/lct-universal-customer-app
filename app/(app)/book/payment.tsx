import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { StepHeader } from '../../../src/components/booking/StepHeader';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { Divider } from '../../../src/components/ui/Divider';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { calculateFarePreview } from '../../../src/lib/pricingPreview';
import { formatCurrency, formatDateTime, formatServiceType } from '../../../src/lib/format';
import { isStripeConfigured } from '../../../src/lib/env';
import { useStripeCheckout } from '../../../src/lib/useStripeCheckout';
import { AuthGate } from '../../../src/components/AuthGate';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
      <AppText variant="bodyMuted">{label}</AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
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

      <Card style={{ marginBottom: spacing.md }}>
        <Row label="Service" value={draft.serviceType ? formatServiceType(draft.serviceType) : '—'} />
        <Row label="Pickup" value={draft.pickupAddress || '—'} />
        {draft.serviceType !== 'hourly' ? <Row label="Drop-off" value={draft.dropoffAddress || '—'} /> : null}
        <Row label="Date & Time" value={draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()) : '—'} />
        <Row label="Vehicle" value={draft.vehicle?.name ?? '—'} />
        {draft.serviceType === 'hourly' && draft.hourlyDurationHours ? (
          <Row label="Duration" value={`${draft.hourlyDurationHours} hour${draft.hourlyDurationHours === 1 ? '' : 's'}`} />
        ) : draft.durationMinutes ? (
          <Row label="Est. Duration" value={`${draft.durationMinutes} min`} />
        ) : null}
      </Card>

      {fare ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Row label="Base fare" value={formatCurrency(fare.baseFare)} />
          {fare.distanceFare > 0 ? <Row label="Distance" value={formatCurrency(fare.distanceFare)} /> : null}
          {fare.timeFare > 0 ? <Row label="Time" value={formatCurrency(fare.timeFare)} /> : null}
          {fare.surcharges > 0 ? <Row label="Late-night surcharge" value={formatCurrency(fare.surcharges)} /> : null}
          <Row label="Gratuity (20%)" value={formatCurrency(fare.gratuity)} />
          <Row label="Tax" value={formatCurrency(fare.tax)} />
          <Divider />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="subheading">Total</AppText>
            <AppText variant="subheading" color={colors.gold}>
              {formatCurrency(fare.totalFare)}
            </AppText>
          </View>
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

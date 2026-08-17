import { useMemo } from 'react';
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
      <AppText variant="bodyMuted">{label}</AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

export default function ReviewStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const submit = useBookingFormStore((s) => s.submit);
  const submitting = useBookingFormStore((s) => s.submitting);
  const error = useBookingFormStore((s) => s.error);

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

  async function handleConfirm() {
    const result = await submit();
    if (result) router.replace(`/(app)/book/confirmed?bookingId=${result.bookingId}&tripId=${result.tripId}`);
  }

  return (
    <ScreenContainer>
      <StepHeader step={6} title="Review & Confirm" subtitle="Double-check the details before we send this to dispatch." />

      <Card style={{ marginBottom: spacing.md }}>
        <Row label="Service" value={draft.serviceType ? formatServiceType(draft.serviceType) : '—'} />
        <Row label="Pickup" value={draft.pickupAddress || '—'} />
        {draft.serviceType !== 'hourly' ? <Row label="Drop-off" value={draft.dropoffAddress || '—'} /> : null}
        {draft.serviceType === 'hourly' ? <Row label="Duration" value={`${draft.hourlyDurationHours ?? 0} hours`} /> : null}
        <Row label="Date & Time" value={draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()) : '—'} />
        <Row label="Passengers" value={`${draft.passengerCount}`} />
        <Row label="Luggage" value={`${draft.luggageCount}`} />
        <Row label="Vehicle" value={draft.vehicle?.name ?? '—'} />
      </Card>

      {fare ? (
        <Card>
          <Row label="Base fare" value={formatCurrency(fare.baseFare)} />
          {fare.distanceFare > 0 ? <Row label="Distance" value={formatCurrency(fare.distanceFare)} /> : null}
          {fare.timeFare > 0 ? <Row label="Time" value={formatCurrency(fare.timeFare)} /> : null}
          {fare.surcharges > 0 ? <Row label="Late-night surcharge" value={formatCurrency(fare.surcharges)} /> : null}
          <Row label="Gratuity (20%)" value={formatCurrency(fare.gratuity)} />
          <Row label="Tax" value={formatCurrency(fare.tax)} />
          <Divider />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="subheading">Estimated Total</AppText>
            <AppText variant="subheading" color={colors.gold}>
              {formatCurrency(fare.totalFare)}
            </AppText>
          </View>
        </Card>
      ) : null}

      {error ? (
        <AppText variant="body" color={colors.destructive} style={{ marginTop: spacing.md }}>
          {error}
        </AppText>
      ) : null}

      <Button label="Confirm Booking" onPress={handleConfirm} loading={submitting} style={{ marginTop: spacing.xl }} />
    </ScreenContainer>
  );
}

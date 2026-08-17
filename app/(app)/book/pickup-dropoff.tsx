import { useRouter } from 'expo-router';
import { StepHeader } from '../../../src/components/booking/StepHeader';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';
import { spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';

export default function PickupDropoffStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);

  const isHourly = draft.serviceType === 'hourly';
  const canContinue = draft.pickupAddress.trim().length > 0 && (isHourly || draft.dropoffAddress.trim().length > 0);

  return (
    <ScreenContainer>
      <StepHeader step={2} title="Pickup & Drop-off" subtitle="Where should your chauffeur meet you?" />

      <TextField
        label="Pickup Address"
        value={draft.pickupAddress}
        onChangeText={(text) => update({ pickupAddress: text })}
        placeholder="123 Main St, Dallas, TX"
        autoCapitalize="words"
      />

      {draft.serviceType === 'airport' ? (
        <TextField
          label="Flight Number (optional)"
          value={draft.flightNumber}
          onChangeText={(text) => update({ flightNumber: text })}
          placeholder="AA1234"
          autoCapitalize="characters"
        />
      ) : null}

      {isHourly ? (
        <AppText variant="bodyMuted" style={{ marginBottom: spacing.md }}>
          Hourly service keeps your chauffeur and vehicle with you for the full booking — no drop-off address needed.
        </AppText>
      ) : (
        <>
          <TextField
            label="Drop-off Address"
            value={draft.dropoffAddress}
            onChangeText={(text) => update({ dropoffAddress: text })}
            placeholder="Destination address"
            autoCapitalize="words"
          />
          <TextField
            label="Estimated Distance (miles)"
            value={draft.distanceMiles != null ? String(draft.distanceMiles) : ''}
            onChangeText={(text) => {
              const parsed = Number(text);
              update({ distanceMiles: text.trim() === '' || Number.isNaN(parsed) ? null : parsed });
            }}
            placeholder="e.g. 18"
            keyboardType="decimal-pad"
          />
          <AppText variant="caption" style={{ marginTop: -spacing.sm, marginBottom: spacing.md }}>
            A rough estimate is fine — this app doesn&apos;t yet auto-calculate driving distance (no live Google Maps
            key configured for route lookups). Your fare is confirmed before payment either way.
          </AppText>
        </>
      )}

      <Button label="Continue" onPress={() => router.push('/(app)/book/datetime')} disabled={!canContinue} style={{ marginTop: spacing.lg }} />
    </ScreenContainer>
  );
}

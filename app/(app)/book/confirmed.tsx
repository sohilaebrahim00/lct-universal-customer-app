import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';

export default function ConfirmedStep() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ bookingId: string; tripId: string }>();
  const resetDraft = useBookingFormStore((s) => s.reset);

  function goToTrip() {
    resetDraft();
    router.replace(`/(app)/trips/${tripId}`);
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle2 size={72} color={colors.gold} strokeWidth={1.5} />
        <AppText variant="title" center style={{ marginTop: spacing.lg }}>
          Booking Confirmed
        </AppText>
        <AppText variant="bodyMuted" center style={{ marginTop: spacing.sm, marginBottom: spacing.xl, maxWidth: 300 }}>
          We&apos;ve sent your request to dispatch. You&apos;ll be notified as soon as a chauffeur is assigned.
        </AppText>

        <Button label="View Trip" onPress={goToTrip} style={{ width: 220 }} />
      </View>
    </ScreenContainer>
  );
}

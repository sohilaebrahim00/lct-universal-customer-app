import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { isStripeConfigured } from '../../../src/lib/env';
import { paymentsApi } from '../../../src/api/payments';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';

type PayState = 'idle' | 'loading' | 'paid' | 'unavailable' | 'error';

export default function ConfirmedStep() {
  const router = useRouter();
  const { bookingId, tripId } = useLocalSearchParams<{ bookingId: string; tripId: string }>();
  const resetDraft = useBookingFormStore((s) => s.reset);
  const stripe = useStripe();
  const [payState, setPayState] = useState<PayState>('idle');
  const [payError, setPayError] = useState<string | null>(null);

  async function handlePay() {
    if (!isStripeConfigured) {
      setPayState('unavailable');
      return;
    }
    setPayState('loading');
    setPayError(null);
    try {
      const { clientSecret } = await paymentsApi.createIntent(bookingId);
      if (!clientSecret) {
        setPayState('unavailable');
        return;
      }

      const { error: initError } = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'LCT Universal',
      });
      if (initError) {
        setPayError(initError.message);
        setPayState('error');
        return;
      }

      const { error: presentError } = await stripe.presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          setPayError(presentError.message);
          setPayState('error');
        } else {
          setPayState('idle');
        }
        return;
      }

      setPayState('paid');
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed');
      setPayState('error');
    }
  }

  function goToTrip() {
    resetDraft();
    router.replace(`/(app)/trips/${tripId}`);
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark-circle" size={72} color={colors.gold} />
        <AppText variant="title" center style={{ marginTop: spacing.lg }}>
          Booking Confirmed
        </AppText>
        <AppText variant="bodyMuted" center style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
          We&apos;ve sent your request to dispatch. You&apos;ll be notified as soon as a chauffeur is assigned.
        </AppText>

        {payState === 'paid' ? (
          <AppText variant="body" color={colors.gold} style={{ marginBottom: spacing.lg }}>
            Payment received — thank you.
          </AppText>
        ) : payState === 'unavailable' ? (
          <AppText variant="caption" center style={{ marginBottom: spacing.lg, maxWidth: 280 }}>
            Payments aren&apos;t configured on this server yet. Your booking is saved — you can pay once payment setup is
            complete.
          </AppText>
        ) : (
          <>
            {payError ? (
              <AppText variant="caption" color={colors.destructive} center style={{ marginBottom: spacing.sm }}>
                {payError}
              </AppText>
            ) : null}
            <Button
              label="Pay Now"
              onPress={handlePay}
              loading={payState === 'loading'}
              style={{ width: 220, marginBottom: spacing.md }}
            />
          </>
        )}

        <Button label="View Trip" variant="secondary" onPress={goToTrip} style={{ width: 220 }} />
      </View>
    </ScreenContainer>
  );
}

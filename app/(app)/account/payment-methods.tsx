import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { CreditCard, Trash2 } from 'lucide-react-native';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { AppText } from '../../../src/components/ui/Typography';

import { profilesApi } from '../../../src/api/profiles';
import { isStripeConfigured } from '../../../src/lib/env';
import type { PaymentMethodRecord } from '../../../src/types/api';
import { StripePayment } from '../../../src/components/payment/StripePayment';
import { AuthGate } from '../../../src/components/AuthGate';
import { useAuthStore } from '../../../src/store/authStore';
import { space, theme } from '../../../src/theme';

export default function PaymentMethodsScreen() {
  const status = useAuthStore((s) => s.status);
  const [methods, setMethods] = useState<PaymentMethodRecord[]>([]);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const load = useCallback(() => {
    if (status !== 'signed-in') return;
    profilesApi.paymentMethods()
      .then(setMethods).catch((cause: unknown) =>
      // Was `.catch(() => {})`: a failed read rendered as an empty list, which
      // tells the customer they have nothing rather than that we could not ask.
      setLoadError(cause instanceof Error ? cause : new Error(String(cause))),
    );
  }, [status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAddCard(paymentMethodId: string) {
    await profilesApi.addPaymentMethod({ stripePaymentMethodId: paymentMethodId });
    load();
  }

  async function handleRemove(id: string) {
    await profilesApi.removePaymentMethod(id);
    load();
  }

  return (
    <ScreenContainer>
      {loadError ? (
        <ErrorState title="We couldn't load your payment methods" message="This is our end, not yours." onRetry={load} />
      ) : null}
      <AppText variant="title" style={{ marginBottom: space.lg }}>
        Payment Methods
      </AppText>

      <AuthGate
        title="Sign in to save a payment method"
        message="Cards are saved securely to your account so checkout is one tap next time."
      >
        {methods.map((m) => (
          <Card key={m.id} row style={{ marginBottom: space.sm }}>
            <CreditCard size={20} color={theme.content.accent} strokeWidth={1.5} style={{ marginEnd: space.md }} />
            <View style={{ flex: 1 }}>
              <AppText variant="subheading">
                {m.brand ? `${m.brand.toUpperCase()} •••• ${m.last4}` : 'Card on file'}
              </AppText>
              {m.exp_month && m.exp_year ? (
                <AppText variant="caption">
                  Expires {m.exp_month}/{m.exp_year}
                </AppText>
              ) : null}
            </View>
            <Pressable
              onPress={() => handleRemove(m.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove card ending ${m.last4}`}
              style={styles.removeButton}
            >
              <Trash2 size={20} color={theme.content.danger} strokeWidth={1.5} />
            </Pressable>
          </Card>
        ))}

        {!isStripeConfigured ? (
          <AppText variant="bodyMuted" style={{ marginTop: space.md }}>
            Card entry isn&apos;t configured on this build yet — EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing.
          </AppText>
        ) : (
          <>
            <AppText variant="heading" style={{ marginTop: space.lg, marginBottom: space.sm }}>
              Add a Card
            </AppText>
            <StripePayment onAddCard={handleAddCard} />
          </>
        )}
      </AuthGate>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /*
   * A REAL 44x44 box, not hitSlop.
   *
   * The icon measured 20x20 in the built app. `hitSlop={10}` would have made
   * it 40 — still under the floor, and invisible to anything that measures what
   * is actually rendered. A destructive control is the last place to be
   * approximate about a touch target.
   */
  removeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { profilesApi } from '../../../src/api/profiles';
import { isStripeConfigured } from '../../../src/lib/env';
import type { PaymentMethodRecord } from '../../../src/types/api';
import { StripePayment } from '../../../src/components/payment/StripePayment';

export default function PaymentMethodsScreen() {
  const [methods, setMethods] = useState<PaymentMethodRecord[]>([]);

  const load = useCallback(() => {
    profilesApi.paymentMethods().then(setMethods).catch(() => {});
  }, []);

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
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        Payment Methods
      </AppText>

      {methods.map((m) => (
        <Card key={m.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="card-outline" size={20} color={colors.gold} style={{ marginRight: spacing.md }} />
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
          <Pressable onPress={() => handleRemove(m.id)}>
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
          </Pressable>
        </Card>
      ))}

      {!isStripeConfigured ? (
        <AppText variant="bodyMuted" style={{ marginTop: spacing.md }}>
          Card entry isn&apos;t configured on this build yet — EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing.
        </AppText>
      ) : (
        <>
          <AppText variant="heading" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
            Add a Card
          </AppText>
          <StripePayment onAddCard={handleAddCard} />
        </>
      )}
    </ScreenContainer>
  );
}

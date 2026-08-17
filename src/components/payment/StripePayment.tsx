import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Typography';
import { colors, radius, spacing } from '../../theme/tokens';
import { isExpoGo } from '../../lib/expoEnvironment';

interface Props {
  /** Called with the Stripe PaymentMethod ID once card entry succeeds — the caller owns saving it to the backend. */
  onAddCard: (paymentMethodId: string) => Promise<void> | void;
}

/**
 * Native (iOS/Android) card-entry UI — Metro resolves this file for those
 * platforms and StripePayment.web.tsx for web (see StripeAppProvider.tsx
 * for the full `.web.` split reasoning). `@stripe/stripe-react-native` is
 * required lazily inside NativeCardEntry, only ever rendered when NOT
 * running in Expo Go — see the preview-mode fallback below.
 */
function NativeCardEntry({ onAddCard }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load, see comment above.
  const { CardField, useStripe } = require('@stripe/stripe-react-native') as typeof import('@stripe/stripe-react-native');
  const stripe = useStripe();
  const [cardComplete, setCardComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      const { paymentMethod, error: createError } = await stripe.createPaymentMethod({ paymentMethodType: 'Card' });
      if (createError || !paymentMethod) {
        setError(createError?.message ?? 'Failed to read card details');
        return;
      }
      await onAddCard(paymentMethod.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <CardField
        postalCodeEnabled
        style={{ height: 50, marginBottom: spacing.md }}
        cardStyle={{
          backgroundColor: colors.onyx,
          textColor: colors.offWhite,
          placeholderColor: colors.mutedForeground,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.sm,
        }}
        onCardChange={(details) => setCardComplete(details.complete)}
      />
      {error ? (
        <AppText variant="caption" color={colors.destructive} style={{ marginBottom: spacing.md }}>
          {error}
        </AppText>
      ) : null}
      <Button label="Save Card" onPress={handleSave} loading={submitting} disabled={!cardComplete} />
    </>
  );
}

/** Shown in Expo Go, where the real Stripe card form can't run — a clear preview-mode explanation, not a broken screen. */
function ExpoGoPreview() {
  return (
    <View style={styles.container}>
      <Ionicons name="eye-outline" size={26} color={colors.gold} style={{ marginBottom: spacing.sm }} />
      <AppText variant="subheading" center>
        Card entry preview
      </AppText>
      <AppText variant="bodyMuted" center style={{ marginTop: spacing.xs }}>
        Stripe&apos;s native card form doesn&apos;t run inside Expo Go. Open this build with the LCT Universal
        development client (or a production build) to add a real card.
      </AppText>
    </View>
  );
}

export function StripePayment({ onAddCard }: Props) {
  if (isExpoGo) return <ExpoGoPreview />;
  return <NativeCardEntry onAddCard={onAddCard} />;
}

const styles = {
  container: {
    alignItems: 'center' as const,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
  },
};

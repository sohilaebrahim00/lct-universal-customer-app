import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../ui/Typography';
import { colors, radius, spacing } from '../../theme/tokens';

/**
 * Web fallback — `@stripe/stripe-react-native` (CardField, useStripe) is a
 * native-only module with no web build, so this file must never import it.
 * Card entry is a mobile-only feature by design; this is a clear,
 * professional explanation rather than a broken or blank screen.
 */
export function StripePayment() {
  return (
    <View style={styles.container}>
      <Ionicons name="phone-portrait-outline" size={28} color={colors.gold} style={{ marginBottom: spacing.sm }} />
      <AppText variant="subheading" center>
        Payment methods are available in the mobile app
      </AppText>
      <AppText variant="bodyMuted" center style={{ marginTop: spacing.xs }}>
        Adding a card requires a secure on-device payment form supported on iOS and Android — install the LCT
        Universal app to add or manage saved cards.
      </AppText>
    </View>
  );
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

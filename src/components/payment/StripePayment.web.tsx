import { View } from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { AppText } from '../ui/Typography';
import { radius, space, theme } from '../../theme';

/**
 * Web fallback — `@stripe/stripe-react-native` (CardField, useStripe) is a
 * native-only module with no web build, so this file must never import it.
 * Card entry is a mobile-only feature by design; this is a clear,
 * professional explanation rather than a broken or blank screen.
 */
export function StripePayment() {
  return (
    <View style={styles.container}>
      <Smartphone size={28} color={theme.content.accent} strokeWidth={1.5} style={{ marginBottom: space.sm }} />
      <AppText variant="subheading" center>
        Payment methods are available in the mobile app
      </AppText>
      <AppText variant="bodyMuted" center style={{ marginTop: space.xs }}>
        Adding a card requires a secure on-device payment form supported on iOS and Android — install the LCT
        Universal app to add or manage saved cards.
      </AppText>
    </View>
  );
}

const styles = {
  container: {
    alignItems: 'center' as const,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    backgroundColor: theme.background.secondary,
  },
};

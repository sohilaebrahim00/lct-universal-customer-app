import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './ui/Typography';
import { colors, radius, spacing } from '../theme/tokens';

function SocialButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Ionicons name={icon} size={18} color={colors.offWhite} />
      <AppText variant="body" style={{ marginLeft: spacing.sm }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Google/Apple are UI placeholders — no OAuth client IDs are configured for
 * this preview build, so tapping surfaces a clear "coming soon" message
 * rather than silently failing or pretending to sign in.
 */
export function SocialAuthButtons() {
  function handleComingSoon(provider: string) {
    Alert.alert(`${provider} Sign-In`, `${provider} sign-in isn't configured on this build yet.`);
  }

  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <AppText variant="caption" style={{ marginHorizontal: spacing.sm }}>
          OR CONTINUE WITH
        </AppText>
        <View style={styles.dividerLine} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SocialButton icon="logo-google" label="Continue with Google" onPress={() => handleComingSoon('Google')} />
        <SocialButton icon="logo-apple" label="Continue with Apple" onPress={() => handleComingSoon('Apple')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
    paddingVertical: spacing.md,
  },
});

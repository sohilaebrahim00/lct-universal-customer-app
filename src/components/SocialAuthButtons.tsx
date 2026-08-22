import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Globe, Apple, type LucideIcon } from 'lucide-react-native';
import { AppText } from './ui/Typography';
import { radius, space, theme } from '../theme';

function SocialButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button} accessibilityRole="button" accessible>
      <Icon size={18} color={theme.content.primary} strokeWidth={1.5} />
      <AppText variant="body" style={{ marginStart: space.sm }}>
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
        <AppText variant="caption" style={{ marginHorizontal: space.sm }}>
          OR CONTINUE WITH
        </AppText>
        <View style={styles.dividerLine} />
      </View>

      <View style={{ gap: space.sm }}>
        <SocialButton icon={Globe} label="Continue with Google" onPress={() => handleComingSoon('Google')} />
        <SocialButton icon={Apple} label="Continue with Apple" onPress={() => handleComingSoon('Apple')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: space.lg },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.border.hairline },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    backgroundColor: theme.background.secondary,
    paddingVertical: space.md,
  },
});

import { useState } from 'react';
import Constants from 'expo-constants';
import { Switch, View } from 'react-native';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { useAuthStore } from '../../../src/store/authStore';
import { registerForPushNotifications } from '../../../src/lib/pushNotifications';

export default function SettingsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushError, setPushError] = useState<string | null>(null);

  async function handleTogglePush(value: boolean) {
    setPushEnabled(value);
    setPushError(null);
    if (value) {
      const result = await registerForPushNotifications();
      if (!result.registered) setPushError(result.reason ?? 'Could not enable push notifications.');
    }
    // Disabling only stops re-registering the device token going forward —
    // deleting an already-registered token from the backend happens from
    // the OS notification settings, which is the platform-standard place
    // for that, not an in-app toggle.
  }

  return (
    <ScreenContainer>
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        Settings
      </AppText>

      <Card style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <AppText variant="subheading">Push Notifications</AppText>
            <AppText variant="caption">Booking updates, driver status, and trip reminders</AppText>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={handleTogglePush}
            trackColor={{ true: colors.gold, false: colors.charcoal }}
            thumbColor={colors.offWhite}
          />
        </View>
        {pushError ? (
          <AppText variant="caption" color={colors.destructive} style={{ marginTop: spacing.sm }}>
            {pushError}
          </AppText>
        ) : null}
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <AppText variant="caption">Signed in as</AppText>
        <AppText variant="body">{profile?.email ?? '—'}</AppText>
      </Card>

      <Card>
        <AppText variant="caption">App Version</AppText>
        <AppText variant="body">
          {Constants.expoConfig?.version ?? '1.0.0'} ({Constants.expoConfig?.slug ?? 'lct-universal-customer-app'})
        </AppText>
      </Card>
    </ScreenContainer>
  );
}

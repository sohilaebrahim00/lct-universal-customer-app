import { useState } from 'react';
import Constants from 'expo-constants';
import { Switch, View } from 'react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';

import { useAuthStore } from '../../../src/store/authStore';
import { useLocaleStore, useTranslation } from '../../../src/i18n';
import { registerForPushNotifications } from '../../../src/lib/pushNotifications';
import { space, theme } from '../../../src/theme';

function LanguageCard() {
  const t = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <Card style={{ marginBottom: space.md }}>
      <AppText variant="subheading" style={{ marginBottom: 2 }}>
        {t.language.title}
      </AppText>
      <AppText variant="caption" style={{ marginBottom: space.md }}>
        {t.language.subtitle}
      </AppText>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          label={t.language.english}
          variant={locale === 'en' ? 'primary' : 'secondary'}
          onPress={() => void setLocale('en')}
          style={{ flex: 1 }}
        />
        <Button
          label={t.language.arabic}
          variant={locale === 'ar' ? 'primary' : 'secondary'}
          onPress={() => void setLocale('ar')}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
}

export default function SettingsScreen() {
  const t = useTranslation();
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
      <AppText variant="title" style={{ marginBottom: space.lg }}>
        {t.settings.title}
      </AppText>

      <LanguageCard />

      <Card style={{ marginBottom: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginEnd: space.md }}>
            <AppText variant="subheading">{t.settings.pushTitle}</AppText>
            <AppText variant="caption">{t.settings.pushSubtitle}</AppText>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={handleTogglePush}
            trackColor={{ true: theme.content.accent, false: theme.background.tertiary }}
            thumbColor={theme.content.primary}
          />
        </View>
        {pushError ? (
          <AppText variant="caption" color={theme.content.secondary} style={{ marginTop: space.sm }}>
            {pushError}
          </AppText>
        ) : null}
      </Card>

      <Card style={{ marginBottom: space.md }}>
        <AppText variant="caption">{t.settings.signedInAs}</AppText>
        <AppText variant="body">{profile?.email ?? '—'}</AppText>
      </Card>

      <Card>
        <AppText variant="caption">{t.settings.appVersion}</AppText>
        <AppText variant="body">
          {Constants.expoConfig?.version ?? '1.0.0'} ({Constants.expoConfig?.slug ?? 'lct-universal-customer-app'})
        </AppText>
      </Card>
    </ScreenContainer>
  );
}

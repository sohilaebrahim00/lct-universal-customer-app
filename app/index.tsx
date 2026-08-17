import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../src/theme/tokens';
import { useAuthStore } from '../src/store/authStore';
import { hasSeenOnboarding } from '../src/lib/onboarding';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    hasSeenOnboarding().then((seen) => {
      setNeedsOnboarding(!seen);
      setOnboardingChecked(true);
    });
  }, []);

  if (status === 'loading' || !onboardingChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceBlack, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (status === 'signed-in') return <Redirect href="/(app)" />;
  if (needsOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/(auth)/login" />;
}

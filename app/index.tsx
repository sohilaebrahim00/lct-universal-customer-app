import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import { hasSeenOnboarding } from '../src/lib/onboarding';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const isGuest = useAuthStore((s) => s.isGuest);
  const guestModeChecked = useAuthStore((s) => s.guestModeChecked);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    hasSeenOnboarding().then((seen) => {
      setNeedsOnboarding(!seen);
      setOnboardingChecked(true);
    });
  }, []);

  if (status === 'loading' || !onboardingChecked || !guestModeChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background.primary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.content.accent} size="large" />
      </View>
    );
  }

  // Signed in and guest browsing both land directly in the app shell — the
  // app is never fully locked behind auth. Specific actions (booking
  // confirmation, payment methods, trip history) prompt for an account
  // only when the guest actually reaches them — see AuthGate.tsx.
  if (status === 'signed-in' || isGuest) return <Redirect href="/(app)" />;
  if (needsOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/welcome" />;
}

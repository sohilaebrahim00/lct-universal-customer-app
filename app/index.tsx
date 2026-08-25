import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import { hasSeenOnboarding } from '../src/lib/onboarding';
import { accountKindOf, landingRouteFor } from '../src/lib/accountRole';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const isGuest = useAuthStore((s) => s.isGuest);
  const guestModeChecked = useAuthStore((s) => s.guestModeChecked);
  const profile = useAuthStore((s) => s.profile);
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

  /*
   * ONE LOGIN, THREE DESTINATIONS.
   *
   * A chauffeur and an operator sign in on the same screen as a customer and
   * land somewhere different, because `Profile.role` says so. That field has
   * been in the API contract since the project started and no screen had ever
   * read it — `src/lib/accountRole.ts` is the first thing that does.
   *
   * A GUEST IS ALWAYS A CUSTOMER, checked before the role: a guest has no
   * profile, and `accountKindOf(null)` returns customer, but ordering it this
   * way means a future change to that default cannot route a signed-out
   * visitor into an operations console.
   *
   * Everything else is unchanged: the app is never fully locked behind auth,
   * and specific actions prompt for an account when a guest reaches them.
   */
  if (isGuest) return <Redirect href="/(app)" />;
  if (status === 'signed-in') return <Redirect href={landingRouteFor(accountKindOf(profile))} />;
  if (needsOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/welcome" />;
}

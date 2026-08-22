import { useEffect, type ReactNode } from 'react';
import {
  useFonts,
  // Cormorant 400 is the weight the redesign's type scale specifies at every
  // serif step (display/title/heading/headingSm). It ships in the already
  // installed @expo-google-fonts package — no new dependency, one extra font
  // file. 500/600/700 stay registered while screens migrate off the old
  // `fonts.displayBold`/`displayMedium` names in src/theme/tokens.ts.
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import { useLocaleStore } from '../src/i18n';
import { AppLoadingScreen } from '../src/components/AppLoadingScreen';
import { StripeAppProvider } from '../src/components/payment/StripeAppProvider';
import { ToastProvider } from '../src/components/ui/Toast';

void SplashScreen.preventAutoHideAsync();

function AppShell({ children }: { children: ReactNode }) {
  // ToastProvider sits inside StripeAppProvider and outside the navigator, so a
  // toast survives navigation — the rollback message from an optimistic action
  // must outlive the screen that started it (slice 12).
  return (
    <StripeAppProvider>
      <ToastProvider>{children}</ToastProvider>
    </StripeAppProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const initialize = useAuthStore((s) => s.initialize);
  const initializeLocale = useLocaleStore((s) => s.initialize);
  const localeHydrated = useLocaleStore((s) => s.hydrated);

  // Sets up the Supabase auth-state subscription on mount — initialize()
  // itself is synchronous (it returns an unsubscribe function immediately;
  // the actual session check runs in the background), and useAuthStore's
  // `status` starts at 'loading' regardless, which every downstream screen
  // (app/index.tsx, the (auth)/(app) group layouts) already handles on its
  // own. So this effect only needs to run the subscription setup/teardown
  // — it doesn't need to gate anything here in the root layout.
  useEffect(() => {
    return initialize();
  }, [initialize]);

  // Gated below (see `ready`) so the very first paint already shows the
  // right language — otherwise the UI would flash English before switching.
  useEffect(() => {
    void initializeLocale();
  }, [initializeLocale]);

  useEffect(() => {
    if ((fontsLoaded || fontsError) && localeHydrated) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontsError, localeHydrated]);

  const ready = (fontsLoaded || fontsError) && localeHydrated;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background.primary }}>
      <SafeAreaProvider>
        <AppShell>
          <StatusBar style="light" />
          {ready ? (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background.primary } }}>
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="welcome" />
              <Stack.Screen name="demo-account" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          ) : (
            <AppLoadingScreen />
          )}
        </AppShell>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

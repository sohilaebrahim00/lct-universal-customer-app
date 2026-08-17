import { useEffect, type ReactElement } from 'react';
import { useFonts, CormorantGaramond_500Medium, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme/tokens';
import { useAuthStore } from '../src/store/authStore';
import { AppLoadingScreen } from '../src/components/AppLoadingScreen';
import { StripeAppProvider } from '../src/components/payment/StripeAppProvider';

void SplashScreen.preventAutoHideAsync();

function AppShell({ children }: { children: ReactElement[] }) {
  return <StripeAppProvider>{children}</StripeAppProvider>;
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const initialize = useAuthStore((s) => s.initialize);

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

  useEffect(() => {
    if (fontsLoaded || fontsError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontsError]);

  const ready = fontsLoaded || fontsError;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surfaceBlack }}>
      <SafeAreaProvider>
        <AppShell>
          <StatusBar style="light" />
          {ready ? (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfaceBlack } }}>
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="welcome" />
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

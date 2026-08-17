import { useEffect, useState, type ReactElement } from 'react';
import { useFonts, CormorantGaramond_500Medium, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme/tokens';
import { env } from '../src/lib/env';
import { useAuthStore } from '../src/store/authStore';
import { AppLoadingScreen } from '../src/components/AppLoadingScreen';

void SplashScreen.preventAutoHideAsync();

// Always mounted, even with an empty publishableKey — StripeProvider only
// runs its native init effect when the key is truthy (see its source), so
// this is safe with Stripe unconfigured. Keeping it unconditional means
// useStripe()/usePaymentSheet() can be called unconditionally everywhere
// else too, instead of being gated behind conditional hook calls.
function AppShell({ children }: { children: ReactElement[] }) {
  return (
    <StripeProvider
      publishableKey={env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}
      merchantIdentifier="merchant.com.lctuniversal.customer"
    >
      {children}
    </StripeProvider>
  );
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
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = initialize();
    setAuthReady(true);
    return unsubscribe;
  }, [initialize]);

  useEffect(() => {
    if (fontsLoaded || fontsError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontsError]);

  const ready = (fontsLoaded || fontsError) && authReady;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surfaceBlack }}>
      <SafeAreaProvider>
        <AppShell>
          <StatusBar style="light" />
          {ready ? (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfaceBlack } }}>
              <Stack.Screen name="onboarding" />
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

import type { ExpoConfig } from 'expo/config';

// app.config.ts (not app.json) specifically so build-time config — the
// Google Maps API key baked into the native manifest, the Stripe merchant
// identifier — can be read from process.env rather than hardcoded. Runtime
// config (API base URL, Supabase anon key, Stripe publishable key) is read
// separately from EXPO_PUBLIC_* vars at JS runtime — see src/lib/env.ts.
const config: ExpoConfig = {
  name: 'LCT Universal',
  slug: 'lct-universal-customer-app',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'lctuniversal',
  userInterfaceStyle: 'dark',
  backgroundColor: '#020201',
  icon: './assets/icon.png',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lctuniversal.customer',
    config: {
      // Restrict this key to the bundle identifier above in the Google
      // Cloud Console before shipping — see .env.example.
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS ?? undefined,
    },
  },
  android: {
    package: 'com.lctuniversal.customer',
    adaptiveIcon: {
      backgroundColor: '#020201',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? undefined,
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-font',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        image: './assets/brand/lct-logo.png',
        resizeMode: 'contain',
        backgroundColor: '#020201',
      },
    ],
    'expo-secure-store',
    [
      '@stripe/stripe-react-native',
      {
        // Placeholder — replace with the real registered Apple merchant ID
        // before Apple Pay is enabled; the plugin still builds fine without
        // a real one, Apple Pay just won't work until it's real.
        merchantIdentifier: process.env.STRIPE_MERCHANT_IDENTIFIER ?? 'merchant.com.lctuniversal.customer',
        enableGooglePay: true,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/brand/lct-logo.png',
        color: '#d9b160',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;

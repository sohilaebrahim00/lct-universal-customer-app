import type { ExpoConfig } from 'expo/config';

// app.config.ts (not app.json) specifically so build-time config — the
// Google Maps API key baked into the native manifest, the Stripe merchant
// identifier — can be read from process.env rather than hardcoded. Runtime
// config (API base URL, Supabase anon key, Stripe publishable key) is read
// separately from EXPO_PUBLIC_* vars at JS runtime — see src/lib/env.ts.
const config: ExpoConfig = {
  name: 'LCT Universal',
  slug: 'lct-universal-customer-app',
  owner: 'sohila00',
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
    infoPlist: {
      // Declares this app's encryption use for Apple's export-compliance
      // question. `false` = "exempt" — correct for the encryption actually
      // in this app (AES for on-device secure-token storage only, via
      // standard algorithms, never for transmitting data to third
      // parties), which is the common qualifying case. Re-verify this
      // against Apple's current export-compliance rules before an actual
      // App Store (not just internal/dev-client) submission — this is a
      // legal declaration, not just a build flag.
      ITSAppUsesNonExemptEncryption: false,
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
      // EAS project IDs aren't secrets (unlike the API keys elsewhere in
      // this file) — they're meant to be committed, the same way a static
      // app.json would have this written in after `eas init`. EAS can't
      // auto-write into a dynamic app.config.ts the way it can a static
      // app.json, so this has to be set explicitly. Still overridable via
      // EAS_PROJECT_ID for anyone building against a different EAS
      // project (e.g. their own account while developing locally).
      // `||`, not `??` — .env.example (and a freshly copied .env) defines
      // EAS_PROJECT_ID as an empty string rather than leaving it unset, and
      // an empty string is just as invalid as undefined here.
      projectId: process.env.EAS_PROJECT_ID || '03d4efcf-a430-4fd7-9240-5af90cb90f42',
    },
  },
};

export default config;

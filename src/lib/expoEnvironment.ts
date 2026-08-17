import Constants, { AppOwnership } from 'expo-constants';

/**
 * True only when the JS bundle is actually running inside the published
 * Expo Go app — NOT true for a custom `expo-dev-client` development build,
 * which is what the newer `Constants.executionEnvironment` API conflates
 * (both Expo Go and a dev-client build report `StoreClient`). `appOwnership`
 * is deprecated for general execution-environment checks, but per its own
 * documented behavior — `'expo'` in Expo Go, `null` everywhere else,
 * including dev-client and production builds — it's still the correct,
 * precise signal for this specific question, and there's no non-deprecated
 * replacement that makes the same distinction.
 *
 * Used to disable/mock native-only modules (Stripe, react-native-maps)
 * that either aren't compiled into Expo Go at all or crash when their
 * native binding is touched there, while leaving every development-client
 * and production build fully native — see StripeAppProvider.tsx,
 * StripePayment.tsx, useStripeCheckout.ts, and the map components for
 * where this is actually applied.
 */
export const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

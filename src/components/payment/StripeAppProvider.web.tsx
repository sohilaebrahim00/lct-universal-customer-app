import type { ReactNode } from 'react';

/**
 * Web implementation — `@stripe/stripe-react-native` is a native-only
 * module (no web build), so the web bundle must never import it, even
 * transitively. This is a pure passthrough: the app renders normally on
 * web, just without a Stripe context, since no web screen reads from it
 * (see StripePayment.web.tsx and useStripeCheckout.web.ts for the
 * corresponding web fallbacks at each actual usage site).
 */
/**
 * `children` is ReactNode, not ReactElement[].
 *
 * It was typed as an array because it happened to receive two elements, which
 * made it impossible to wrap the tree in a single provider without an array
 * literal. Type-only widening: the native/web split, the Expo Go guard and the
 * fallback contract are untouched, and BOTH counterparts change together so
 * their signatures stay identical.
 */
export function StripeAppProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

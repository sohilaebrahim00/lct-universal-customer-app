import type { ReactElement } from 'react';

/**
 * Web implementation — `@stripe/stripe-react-native` is a native-only
 * module (no web build), so the web bundle must never import it, even
 * transitively. This is a pure passthrough: the app renders normally on
 * web, just without a Stripe context, since no web screen reads from it
 * (see StripePayment.web.tsx and useStripeCheckout.web.ts for the
 * corresponding web fallbacks at each actual usage site).
 */
export function StripeAppProvider({ children }: { children: ReactElement[] }) {
  return <>{children}</>;
}

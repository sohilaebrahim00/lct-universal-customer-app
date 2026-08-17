import type { ReactElement } from 'react';
import { env } from '../../lib/env';
import { isExpoGo } from '../../lib/expoEnvironment';

/**
 * Native (iOS/Android) implementation — Metro resolves this file for those
 * platforms and StripeAppProvider.web.tsx for web, based on the `.web.`
 * filename convention (see that file for the web-specific reasoning).
 *
 * `@stripe/stripe-react-native` is required lazily, inside NativeStripeProvider's
 * own render, rather than as a static top-level import — a static import
 * would be evaluated the moment this module loads, which happens
 * immediately since it's mounted in the root layout. Requiring it lazily
 * means its native-module binding is only ever touched when
 * NativeStripeProvider actually renders, which StripeAppProvider below
 * ensures never happens inside Expo Go (Expo Go doesn't have the Stripe
 * native SDK compiled in, so touching its binding there can throw) — every
 * development-client and production build still gets the real thing.
 */
function NativeStripeProvider({ children }: { children: ReactElement[] }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load, see comment above.
  const { StripeProvider } = require('@stripe/stripe-react-native') as typeof import('@stripe/stripe-react-native');
  return (
    <StripeProvider
      publishableKey={env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}
      merchantIdentifier="merchant.com.lctuniversal.customer"
    >
      {children}
    </StripeProvider>
  );
}

export function StripeAppProvider({ children }: { children: ReactElement[] }) {
  if (isExpoGo) return <>{children}</>;
  return <NativeStripeProvider>{children}</NativeStripeProvider>;
}

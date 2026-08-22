import type { ReactNode } from 'react';
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
function NativeStripeProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load, see comment above.
  const { StripeProvider } = require('@stripe/stripe-react-native') as typeof import('@stripe/stripe-react-native');
  return (
    <StripeProvider
      publishableKey={env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}
      merchantIdentifier="merchant.com.lctuniversal.customer"
    >
      {/*
        Stripe's own StripeProvider types its children as
        `ReactElement | ReactElement[]`, not ReactNode — so the fragment is
        load-bearing, not decoration: it gives Stripe the single ReactElement it
        insists on while this component keeps the wider ReactNode signature its
        callers need.
      */}
      <>{children}</>
    </StripeProvider>
  );
}

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
  if (isExpoGo) return <>{children}</>;
  return <NativeStripeProvider>{children}</NativeStripeProvider>;
}

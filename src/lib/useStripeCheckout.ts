import { paymentsApi } from '../api/payments';
import { isExpoGo } from './expoEnvironment';

export interface StripeCheckoutResult {
  status: 'paid' | 'skipped' | 'cancelled' | 'error';
  message?: string;
}

const EXPO_GO_MESSAGE =
  'Card payment requires the LCT Universal development client or a production build — not available in Expo Go.';

/**
 * Native (iOS/Android) implementation of the booking-flow payment step —
 * see StripeAppProvider.tsx for the full explanation of the `.web.` split
 * that keeps `@stripe/stripe-react-native` out of the web bundle entirely.
 *
 * `@stripe/stripe-react-native` is required lazily, and its `useStripe()`
 * hook is only ever called when NOT running in Expo Go — gated by an early
 * return, not a conditional deeper in the call stack, so this stays a
 * valid hook call: `isExpoGo` is fixed for the lifetime of the running
 * process, so this hook takes exactly one of the two branches below on
 * every single render of whatever component calls it, never switching
 * mid-session. (The one thing that would NOT be safe is calling
 * `useStripe()` inside an async callback/after an `await` — that's invalid
 * regardless of any condition, since hooks only work during a component's
 * synchronous render call. That's why `useStripe()` is called here, at
 * this hook's own top level, and not inside `payWithStripe` below.)
 */
export function useStripeCheckout() {
  if (isExpoGo) {
    return {
      payWithStripe: async (): Promise<StripeCheckoutResult> => ({ status: 'skipped', message: EXPO_GO_MESSAGE }),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load, see comment above.
  const { useStripe } = require('@stripe/stripe-react-native') as typeof import('@stripe/stripe-react-native');
  // isExpoGo is fixed for the process lifetime (see the doc comment above), so this hook takes exactly one of its
  // two return branches on every render, never switching — the actual invalid-hook-call hazard (calling a hook
  // inside an async callback) is avoided by calling useStripe() here, at this hook's own top level, not inside
  // payWithStripe below.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const stripe = useStripe();

  async function payWithStripe(bookingId: string): Promise<StripeCheckoutResult> {
    try {
      const { clientSecret } = await paymentsApi.createIntent(bookingId);
      if (!clientSecret) return { status: 'skipped' };

      const { error: initError } = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'LCT Universal',
      });
      if (initError) return { status: 'error', message: initError.message };

      const { error: presentError } = await stripe.presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') return { status: 'cancelled' };
        return { status: 'error', message: presentError.message };
      }

      return { status: 'paid' };
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : 'Payment failed' };
    }
  }

  return { payWithStripe };
}

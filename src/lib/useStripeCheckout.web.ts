export interface StripeCheckoutResult {
  status: 'paid' | 'skipped' | 'cancelled' | 'error';
  message?: string;
}

/**
 * Web implementation — `@stripe/stripe-react-native` has no web build, so
 * this file must never import it. The booking is still created (that logic
 * lives in the booking-form store, not here); payment is simply deferred,
 * the same way it is when Stripe isn't configured at all on native.
 */
export function useStripeCheckout() {
  async function payWithStripe(): Promise<StripeCheckoutResult> {
    return { status: 'skipped', message: 'Card payment is available in the LCT Universal mobile app.' };
  }

  return { payWithStripe };
}

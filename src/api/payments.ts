import { api } from '../lib/apiClient';

export const paymentsApi = {
  config: () => api.get<{ stripeConfigured: boolean }>('/payments/config'),
  createIntent: (bookingId: string, paymentMethodId?: string) =>
    api.post<{ payment: { id: string }; clientSecret: string | null }>('/payments/intent', {
      bookingId,
      paymentMethodId,
    }),
};

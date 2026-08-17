import { api } from '../lib/apiClient';
import type { PaymentMethodRecord, Profile, SavedLocation, SavedPassenger } from '../types/api';

export const profilesApi = {
  me: () => api.get<{ profile: Profile }>('/profiles/me').then((r) => r.profile),
  updateMe: (input: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    api.patch<{ profile: Profile }>('/profiles/me', input).then((r) => r.profile),

  savedPassengers: () =>
    api.get<{ passengers: SavedPassenger[] }>('/profiles/me/saved-passengers').then((r) => r.passengers),
  addSavedPassenger: (input: { fullName: string; phone?: string; email?: string }) =>
    api.post<{ passenger: SavedPassenger }>('/profiles/me/saved-passengers', input).then((r) => r.passenger),
  removeSavedPassenger: (id: string) => api.delete(`/profiles/me/saved-passengers/${id}`),

  savedLocations: () => api.get<{ locations: SavedLocation[] }>('/profiles/me/saved-locations').then((r) => r.locations),
  addSavedLocation: (input: { label: string; address: string; lat?: number; lng?: number }) =>
    api.post<{ location: SavedLocation }>('/profiles/me/saved-locations', input).then((r) => r.location),
  removeSavedLocation: (id: string) => api.delete(`/profiles/me/saved-locations/${id}`),

  paymentMethods: () =>
    api.get<{ paymentMethods: PaymentMethodRecord[] }>('/profiles/me/payment-methods').then((r) => r.paymentMethods),
  addPaymentMethod: (input: { stripePaymentMethodId: string; isDefault?: boolean }) =>
    api.post<{ paymentMethod: PaymentMethodRecord; stripeConfigured: boolean }>('/profiles/me/payment-methods', input),
  removePaymentMethod: (id: string) => api.delete(`/profiles/me/payment-methods/${id}`),
};

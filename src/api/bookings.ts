import { api } from '../lib/apiClient';
import type { Booking, ServiceType } from '../types/api';

export interface CreateBookingInput {
  serviceType: ServiceType;
  vehicleId: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  scheduledAt: string;
  hourlyDurationHours?: number;
  distanceMiles?: number;
  passengerCount: number;
  luggageCount: number;
  primaryPassengerName?: string;
  primaryPassengerPhone?: string;
  specialRequests?: string;
  flightNumber?: string;
}

export const bookingsApi = {
  create: (input: CreateBookingInput) =>
    api.post<{ booking: Booking; tripId: string }>('/bookings', input),
  list: (opts: { upcoming?: boolean } = {}) =>
    api
      .get<{ bookings: Booking[] }>(`/bookings${opts.upcoming ? '?upcoming=true' : ''}`)
      .then((r) => r.bookings),
  get: (id: string) => api.get<{ booking: Booking }>(`/bookings/${id}`).then((r) => r.booking),
  cancel: (id: string, cancellationReason?: string) =>
    api.post<{ booking: Booking }>(`/bookings/${id}/cancel`, { cancellationReason }).then((r) => r.booking),
  confirm: (id: string) => api.post<{ booking: Booking }>(`/bookings/${id}/confirm`).then((r) => r.booking),
};

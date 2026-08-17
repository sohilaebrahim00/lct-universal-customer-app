import { api } from '../lib/apiClient';
import type { Trip, TripDriverInfo, TripStatusEvent, TripVehicleInfo } from '../types/api';

interface TripDetailResponse {
  trip: Trip;
  events: TripStatusEvent[];
  driver: TripDriverInfo | null;
  vehicle: TripVehicleInfo | null;
}

export const tripsApi = {
  get: (id: string) => api.get<TripDetailResponse>(`/trips/${id}`),
  getByBookingId: (bookingId: string) => api.get<TripDetailResponse>(`/bookings/${bookingId}/trip`),
};

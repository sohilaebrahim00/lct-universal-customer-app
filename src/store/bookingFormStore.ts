import { create } from 'zustand';
import type { CreateBookingInput } from '../api/bookings';
import { bookingsApi } from '../api/bookings';
import type { ServiceType, Vehicle } from '../types/api';

export interface BookingDraft {
  serviceType: ServiceType | null;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  scheduledAt: Date | null;
  hourlyDurationHours: number | null;
  distanceMiles: number | null;
  durationMinutes: number | null;
  routePolyline: string | null;
  passengerCount: number;
  luggageCount: number;
  primaryPassengerName: string;
  primaryPassengerPhone: string;
  specialRequests: string;
  flightNumber: string;
  vehicle: Vehicle | null;
}

const initialDraft: BookingDraft = {
  serviceType: null,
  pickupAddress: '',
  dropoffAddress: '',
  scheduledAt: null,
  hourlyDurationHours: null,
  distanceMiles: null,
  durationMinutes: null,
  routePolyline: null,
  passengerCount: 1,
  luggageCount: 0,
  primaryPassengerName: '',
  primaryPassengerPhone: '',
  specialRequests: '',
  flightNumber: '',
  vehicle: null,
};

interface BookingFormState {
  draft: BookingDraft;
  submitting: boolean;
  error: string | null;
  update: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
  isReadyForVehicleSelection: () => boolean;
  isReadyForDetails: () => boolean;
  isReadyForPayment: () => boolean;
  submit: () => Promise<{ bookingId: string; tripId: string } | null>;
}

export const useBookingFormStore = create<BookingFormState>((set, get) => ({
  draft: { ...initialDraft },
  submitting: false,
  error: null,

  update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  reset: () => set({ draft: { ...initialDraft }, error: null, submitting: false }),

  isReadyForVehicleSelection: () => {
    const { draft } = get();
    if (!draft.serviceType || !draft.pickupAddress) return false;
    if (draft.serviceType === 'hourly') return true;
    return Boolean(draft.dropoffAddress);
  },

  isReadyForDetails: () => Boolean(get().draft.vehicle),

  isReadyForPayment: () => {
    const { draft } = get();
    if (!draft.vehicle || !draft.scheduledAt) return false;
    if (draft.serviceType === 'hourly') return Boolean(draft.hourlyDurationHours && draft.hourlyDurationHours > 0);
    return true;
  },

  submit: async () => {
    const { draft } = get();
    if (!draft.serviceType || !draft.vehicle || !draft.scheduledAt) {
      set({ error: 'Booking details are incomplete.' });
      return null;
    }

    set({ submitting: true, error: null });
    try {
      const input: CreateBookingInput = {
        serviceType: draft.serviceType,
        vehicleId: draft.vehicle.id,
        pickupAddress: draft.pickupAddress,
        pickupLat: draft.pickupLat,
        pickupLng: draft.pickupLng,
        dropoffAddress: draft.serviceType === 'hourly' ? undefined : draft.dropoffAddress,
        dropoffLat: draft.dropoffLat,
        dropoffLng: draft.dropoffLng,
        scheduledAt: draft.scheduledAt.toISOString(),
        hourlyDurationHours: draft.hourlyDurationHours ?? undefined,
        distanceMiles: draft.distanceMiles ?? undefined,
        passengerCount: draft.passengerCount,
        luggageCount: draft.luggageCount,
        primaryPassengerName: draft.primaryPassengerName || undefined,
        primaryPassengerPhone: draft.primaryPassengerPhone || undefined,
        specialRequests: draft.specialRequests || undefined,
        flightNumber: draft.flightNumber || undefined,
      };

      const result = await bookingsApi.create(input);
      set({ submitting: false });
      return { bookingId: result.booking.id, tripId: result.tripId };
    } catch (err) {
      set({ submitting: false, error: err instanceof Error ? err.message : 'Failed to create booking' });
      return null;
    }
  },
}));

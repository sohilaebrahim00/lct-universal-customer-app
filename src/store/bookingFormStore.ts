import { create } from 'zustand';
import type { CreateBookingInput } from '../api/bookings';
import { bookingsApi } from '../api/bookings';
import type { Booking, ServiceType, Vehicle } from '../types/api';
import type { FareBreakdown } from '../lib/pricingPreview';

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
  /**
   * The all-in fare computed ONCE, on the vehicle screen, and carried forward.
   *
   * Exists so the vehicle card and the payment total cannot disagree: they read
   * the same object rather than each recomputing and hoping the inputs match.
   * That divergence is audit P0-3, and a shared value is the only structural
   * fix for it.
   */
  allInFare: FareBreakdown | null;
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
  allInFare: null,
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
  submit: () => Promise<{ bookingId: string; tripId: string; booking: Booking } | null>;
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
        /*
         * `allInFare` reaches the DEMO backend and nothing else.
         *
         * This used to carry a comment claiming the created booking "stores the
         * exact figure the customer authorised, rather than a re-derivation of
         * it". That is false against the real API and was true only because the
         * demo layer is the only thing that reads it. The backend's
         * `createBookingSchema` is a plain `z.object`, so zod strips unknown
         * keys silently: the field is dropped, and `POST /bookings` prices the
         * booking itself with its own `calculateFare()`.
         *
         * It is still sent, because `src/dev/demoApi.ts` uses it to keep demo
         * fares consistent with the vehicle card. It is NOT a guarantee, and the
         * guarantee now lives where it belongs — in the payment screen's
         * comparison of the server's returned total against the authorised one.
         */
        ...(draft.allInFare ? { allInFare: draft.allInFare } : {}),
        flightNumber: draft.flightNumber || undefined,
      };

      const result = await bookingsApi.create(input);
      set({ submitting: false });
      // The whole BOOKING comes back, not just its id. The server priced it,
      // and from here on its `total_fare` is the authoritative number — the
      // payment screen compares it against what the customer authorised before
      // anything reaches Stripe. Returning only the id is what made that
      // comparison impossible.
      return { bookingId: result.booking.id, tripId: result.tripId, booking: result.booking };
    } catch (err) {
      set({ submitting: false, error: err instanceof Error ? err.message : 'Failed to create booking' });
      return null;
    }
  },
}));

/**
 * Mirrors the trip status enum and stage order from
 * lct-universal-backend/src/modules/trips/state-machine.ts. The backend is
 * the only place that *enforces* legal transitions — this file only needs
 * the same ordering and human labels to render the live tracking timeline,
 * so it's a deliberately small, duplicated constant rather than a shared
 * package (these two repos don't share a build pipeline).
 */
export type TripStatus =
  | 'pending'
  | 'confirmed'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'passenger_picked_up'
  | 'trip_started'
  | 'completed'
  | 'cancelled';

export const TRIP_STAGE_ORDER: TripStatus[] = [
  'pending',
  'confirmed',
  'driver_assigned',
  'driver_arriving',
  'passenger_picked_up',
  'trip_started',
  'completed',
];

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  // "Chauffeur", not "Driver". Blacklane and Wheely say chauffeur; Uber says
  // driver. It is the brand distinction the whole design rests on, so it has to
  // hold in the status labels a customer reads most often. The status KEYS stay
  // as the backend defines them.
  driver_assigned: 'Chauffeur Assigned',
  driver_arriving: 'Chauffeur Arriving',
  passenger_picked_up: 'Passenger Picked Up',
  trip_started: 'Trip In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function stageIndex(status: TripStatus): number {
  return TRIP_STAGE_ORDER.indexOf(status);
}

/**
 * The one status a trip can legally move to next, or null at the end.
 *
 * The backend's `ALLOWED_TRANSITIONS` is strictly linear once you set the
 * cancel edges aside — `confirmed` may only become `driver_assigned`,
 * `driver_assigned` may only become `driver_arriving`, and so on. So "the next
 * stage in order" and "the only legal forward transition" are the same thing.
 *
 * That is what lets a chauffeur's screen show ONE button rather than a row of
 * statuses to choose from: there is never a choice to make. Cancellation is
 * deliberately not expressed here — it is a different kind of decision, and the
 * backend guards it separately.
 */
export function nextTripStage(status: TripStatus): TripStatus | null {
  const i = TRIP_STAGE_ORDER.indexOf(status);
  if (i < 0) return null;
  return TRIP_STAGE_ORDER[i + 1] ?? null;
}

export function isTerminalStatus(status: TripStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function isUpcomingBookingStatus(status: TripStatus): boolean {
  return !isTerminalStatus(status);
}

/**
 * The statuses a CUSTOMER may cancel from: before the passenger is aboard.
 *
 * ── This is the client's own rule, not a mirrored one ──────────────────────
 * `TRIP_STAGE_ORDER` above mirrors the backend's forward transitions, which
 * this repository has a copy of. Its **cancel** edges it does not: the backend
 * source is not in this repository and nothing here states which statuses
 * `POST /bookings/:id/cancel` accepts. So this list is a product decision —
 * a customer sitting in the car is not cancelling, they are ending a ride
 * that is under way, and that is a call to dispatch — and it is deliberately
 * the conservative end of whatever the server allows.
 *
 * If the server refuses one of these, the screen surfaces the error rather
 * than pretending; see the cancel handler in `app/(app)/trips/[id].tsx`.
 */
export const CUSTOMER_CANCELLABLE: readonly TripStatus[] = [
  'pending',
  'confirmed',
  'driver_assigned',
  'driver_arriving',
];

export function isCustomerCancellable(status: TripStatus): boolean {
  return CUSTOMER_CANCELLABLE.includes(status);
}

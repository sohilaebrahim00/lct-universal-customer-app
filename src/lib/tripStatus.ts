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

export function isTerminalStatus(status: TripStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function isUpcomingBookingStatus(status: TripStatus): boolean {
  return !isTerminalStatus(status);
}

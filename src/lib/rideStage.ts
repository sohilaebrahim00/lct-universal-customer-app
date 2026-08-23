import { TRIP_STAGE_ORDER, type TripStatus } from './tripStatus';
import { complimentaryWaitMinutesFor } from '../config/servicePolicy';
import type { ServiceType } from '../types/api';

/**
 * THE RIDE LIFECYCLE, AS ONE STATE MACHINE ALL THREE VIEWS READ.
 *
 * The customer's tracking screen, the chauffeur preview and the dispatcher
 * board each render from this module rather than from their own reading of
 * `booking.status`. That is the point: an action taken in one view moves the
 * other two because there is one function deciding what stage a ride is in.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  `arrived_at_pickup` IS NOT A BACKEND STATUS, AND THIS DOES NOT FIX C-4.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `TripStatus` has no "arrived" member and this file does not add one. The
 * backend's enum goes `driver_arriving → passenger_picked_up`, where
 * `driver_arriving` means *on the way*, not *here*. Nothing in the schema marks
 * the moment a car reaches the kerb, which is why `bookings.waiting_minutes`
 * and `waiting_fare` exist and can never be filled correctly, and why the
 * business has a complimentary waiting policy it cannot bill against.
 *
 * So arrival is modelled as an **overlay**: a timestamp carried BESIDE the
 * booking, exactly as `assignments` is, because the backend has nowhere to put
 * either. `stageFor()` derives `arrived_at_pickup` from
 * `driver_arriving` + a timestamp.
 *
 * That shape is deliberate and is the argument itself. It demonstrates what
 * C-4 would enable — a customer told the car is outside, a waiting window that
 * starts at a real moment — while making it structurally obvious that the
 * datum has no home in the API. **Nothing here makes the backend able to do
 * this.** When `trips.arrived_at` exists, this overlay is deleted and
 * `stageFor()` reads the column instead; the rest of this file is unchanged.
 */

/** The seven stages a customer, a chauffeur and a dispatcher all see. */
export type RideStage =
  | 'confirmed'
  | 'chauffeur_assigned'
  | 'chauffeur_en_route'
  | 'arrived_at_pickup'
  | 'passenger_picked_up'
  | 'trip_in_progress'
  | 'completed';

export const RIDE_STAGES: readonly RideStage[] = [
  'confirmed',
  'chauffeur_assigned',
  'chauffeur_en_route',
  'arrived_at_pickup',
  'passenger_picked_up',
  'trip_in_progress',
  'completed',
];

/** What each stage is called, in the customer's language. */
export const RIDE_STAGE_LABELS: Record<RideStage, string> = {
  confirmed: 'Confirmed',
  chauffeur_assigned: 'Chauffeur Assigned',
  chauffeur_en_route: 'Chauffeur En Route',
  arrived_at_pickup: 'Arrived at Pickup',
  passenger_picked_up: 'Passenger Picked Up',
  trip_in_progress: 'Trip In Progress',
  completed: 'Completed',
};

/**
 * The stage a ride is in.
 *
 * `arrivedAt` is the overlay described above — an ISO timestamp, or null when
 * the chauffeur has not marked arrival. It only refines `driver_arriving`: a
 * timestamp on any other status is ignored rather than allowed to drag the
 * stage backwards, because a stale overlay must never un-start a trip that has
 * moved on.
 */
export function stageFor(status: TripStatus, arrivedAt: string | null): RideStage | null {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return 'confirmed';
    case 'driver_assigned':
      return 'chauffeur_assigned';
    case 'driver_arriving':
      return arrivedAt ? 'arrived_at_pickup' : 'chauffeur_en_route';
    case 'passenger_picked_up':
      return 'passenger_picked_up';
    case 'trip_started':
      return 'trip_in_progress';
    case 'completed':
      return 'completed';
    case 'cancelled':
      // Cancellation is not a point on this line. Callers render it separately;
      // returning a stage would put a cancelled ride somewhere on a progress
      // rail, which is exactly the wrong thing to show.
      return null;
  }
}

export function rideStageIndex(stage: RideStage): number {
  return RIDE_STAGES.indexOf(stage);
}

/** Has the ride reached `stage` or gone past it? Drives the progress rail. */
export function hasReached(current: RideStage, stage: RideStage): boolean {
  const a = rideStageIndex(current);
  const b = rideStageIndex(stage);
  return a >= 0 && b >= 0 && a >= b;
}

/** The headline the customer reads, per stage. Never a status key. */
export function customerHeadline(stage: RideStage): string {
  switch (stage) {
    case 'confirmed':
      return 'Your ride is confirmed';
    case 'chauffeur_assigned':
      return 'Your chauffeur is assigned';
    case 'chauffeur_en_route':
      return 'Your chauffeur is on the way';
    case 'arrived_at_pickup':
      // The one sentence this whole slice exists to be able to say.
      return 'Your chauffeur is outside';
    case 'passenger_picked_up':
      return 'You are on board';
    case 'trip_in_progress':
      return 'On the way to your destination';
    case 'completed':
      return 'Trip completed';
  }
}

/**
 * What the chauffeur does next — one action, never a choice.
 *
 * Derived from the stage rather than hand-listed, so the buttons cannot drift
 * out of sync with the states. `kind` says which store the action writes:
 * `status` advances `booking.status` along the backend's own linear order;
 * `arrival` writes only the overlay timestamp and changes no status, because
 * there is no status for it to write.
 *
 * `confirm` marks the transitions a chauffeur cannot take back. Picking up a
 * passenger and completing a ride both end something — a waiting window, a
 * journey — and a mis-tap on a phone held in one hand at a kerb is not a
 * remote possibility.
 */
export interface ChauffeurAction {
  label: string;
  kind: 'status' | 'arrival';
  confirm: boolean;
  /** What the customer will read once this action lands. */
  resultingHeadline: string;
}

export function chauffeurAction(stage: RideStage): ChauffeurAction | null {
  switch (stage) {
    case 'confirmed':
      // Assignment is dispatch's decision, not the chauffeur's.
      return null;
    case 'chauffeur_assigned':
      return { label: "I'm on my way", kind: 'status', confirm: false, resultingHeadline: customerHeadline('chauffeur_en_route') };
    case 'chauffeur_en_route':
      return { label: "I've arrived", kind: 'arrival', confirm: false, resultingHeadline: customerHeadline('arrived_at_pickup') };
    case 'arrived_at_pickup':
      return { label: 'Passenger on board', kind: 'status', confirm: true, resultingHeadline: customerHeadline('passenger_picked_up') };
    case 'passenger_picked_up':
      return { label: 'Start the trip', kind: 'status', confirm: false, resultingHeadline: customerHeadline('trip_in_progress') };
    case 'trip_in_progress':
      return { label: 'Complete the ride', kind: 'status', confirm: true, resultingHeadline: customerHeadline('completed') };
    case 'completed':
      return null;
  }
}

/**
 * THE COMPLIMENTARY WAITING WINDOW — a demonstration of policy, never a charge.
 *
 * `servicePolicy` gives 30 minutes standard and 60 for airport, confirmed by
 * the business. This computes what is left of that window against the moment
 * the chauffeur marked arrival.
 *
 * ── It does not, and must not, price anything ────────────────────────────────
 * No fee is computed here and none may be computed anywhere on the client. The
 * fare is fixed at booking; `tests/quoteIsNotScaled.test.ts` fails the build if
 * any module between quote and receipt multiplies a fare. Showing a customer a
 * countdown is telling them what they have been promised. Showing them a
 * running charge would be inventing a price the business never quoted — the
 * same defect as `From $65.00`, wearing a clock.
 *
 * ── On timezones, stated precisely rather than gestured at ──────────────────
 * A countdown is DURATION arithmetic — two instants subtracted — and is
 * timezone-independent. Nothing here needs a zone and nothing here uses one.
 * What does need the pickup's zone is *rendering the arrival time* ("arrived at
 * 7:42 PM") and deciding which local day a booking falls on, which is
 * `formatInZone` in `src/lib/localeFormat.ts` and is unchanged by this slice.
 * Saying the countdown "depends on a clock" is true; saying it depends on a
 * timezone would not be.
 */
export interface WaitingWindow {
  /** The whole complimentary allowance, per policy. */
  totalMinutes: number;
  /** Whole minutes left, floored at zero. */
  minutesRemaining: number;
  /** Seconds left within the current minute — for a ticking display. */
  secondsRemaining: number;
  /** True once the window has run out. Still not a charge. */
  elapsed: boolean;
}

export function waitingWindow(
  arrivedAt: string,
  serviceType: ServiceType | null,
  now: Date,
): WaitingWindow | null {
  const total = complimentaryWaitMinutesFor(serviceType);
  // Null means the policy has no figure for this service type. The rule the
  // whole project runs on: no figure, render nothing — never a zero, never a
  // dash, never a guess.
  if (total === null) return null;

  const started = new Date(arrivedAt).getTime();
  if (!Number.isFinite(started)) return null;

  const endsAt = started + total * 60_000;
  const msLeft = endsAt - now.getTime();

  if (msLeft <= 0) {
    return { totalMinutes: total, minutesRemaining: 0, secondsRemaining: 0, elapsed: true };
  }
  const secondsLeft = Math.floor(msLeft / 1000);
  return {
    totalMinutes: total,
    minutesRemaining: Math.floor(secondsLeft / 60),
    secondsRemaining: secondsLeft % 60,
    elapsed: false,
  };
}

/**
 * The sentence shown beside the countdown.
 *
 * Deliberately says what the policy IS rather than what it will cost, and says
 * nothing at all about money once the window elapses — because what happens
 * after it is a business question (`PLATFORM_RECONCILIATION.md` Q6) that
 * nobody has answered.
 */
export function waitingSentence(w: WaitingWindow): string {
  if (w.elapsed) {
    return `Your ${w.totalMinutes}-minute complimentary wait has ended. Your chauffeur is still waiting.`;
  }
  return `Complimentary wait — ${w.totalMinutes} minutes included.`;
}

/**
 * Guard used by the demo layer: arrival may only be marked from en route.
 *
 * Exported so the state machine's rule lives with the state machine rather than
 * being re-derived by each caller, and so a test can assert the illegal cases.
 */
export function canMarkArrived(status: TripStatus): boolean {
  return status === 'driver_arriving';
}

/**
 * MAY THE CLIENT RENDER AN ETA AT THIS STAGE?
 *
 * The socket carries a single `etaMinutes` with no statement of which leg it
 * measures — `BACKEND_FOLLOWUPS.md` G-5, "ETA is whatever the driver app last
 * said". Before pickup that number happens to coincide with the leg the
 * customer is watching. **That is luck, not correctness**: nothing in the
 * contract says it is the arrival ETA, and after pickup there is no basis at
 * all for claiming it means the destination.
 *
 * So: the ETA may be rendered only while the car is still approaching the
 * customer. From arrival onwards it is not shown IN ANY FORM — not as a
 * headline, and not as a progress bar derived from it, which is the same claim
 * with the digits removed.
 *
 * It lives here rather than in the sheet because it is a property of the STAGE,
 * not of a widget: a second screen that wants to show an ETA has to answer the
 * same question, and should not be able to answer it differently.
 */
export function etaIsAttributable(stage: RideStage | null): boolean {
  if (stage === null) return false;
  return stage === 'confirmed' || stage === 'chauffeur_assigned' || stage === 'chauffeur_en_route';
}

/**
 * Reads the arrival overlay off a trip payload.
 *
 * `arrived_at` IS NOT A FIELD ON `Trip`. `src/types/api.ts` declares no such
 * column because the backend has none, and that file is not changed by this
 * slice. The demo layer adds the key to its own payload; a real server never
 * will.
 *
 * So this is written defensively on purpose: unknown key, unknown type, and
 * anything that is not a string becomes null. Against production it always
 * returns null, `stageFor()` never derives `arrived_at_pickup`, and the
 * lifecycle degrades to the six stages the backend can actually express —
 * which is the correct behaviour, not a bug to work around.
 */
export function arrivedAtFrom(trip: unknown): string | null {
  const overlay = (trip as { arrived_at?: unknown } | null | undefined)?.arrived_at;
  return typeof overlay === 'string' && overlay.length > 0 ? overlay : null;
}

/** The backend statuses this lifecycle spans, in order. Used by tests. */
export const BACKEND_STATUSES_IN_ORDER = TRIP_STAGE_ORDER;

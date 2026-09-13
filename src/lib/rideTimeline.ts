import { TRIP_STAGE_ORDER, type TripStatus } from './tripStatus';
import type { TripStatusEvent } from '../types/api';

/**
 * THE RIDE'S OWN HISTORY — built from recorded events, never from estimates.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  A TIMESTAMP IS EITHER RECORDED OR IT IS NOT SHOWN.
 *
 *  The client asked for the history of a ride: what happened, and when. The
 *  only honest source for that is an event the system WROTE DOWN at the moment
 *  it happened. A time computed backwards from a schedule is a guess wearing a
 *  clock face, and it is worse than a blank because nobody can tell.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── The one demo-only field, and why it exists ────────────────────────────
 * `src/dev/demoData.ts` seeds a completed ride so the board is not empty on a
 * first visit, and it has no way to know when that ride's stages really
 * happened — its own comment said the timestamps were "evenly spaced across
 * the four hours before pickup". Those are placeholders.
 *
 * So the demo layer marks them `estimated: true`, and everything here treats an
 * estimated event as having **no time at all**: it appears in the timeline as a
 * stage that occurred, with no clock beside it, and it is excluded from every
 * duration. A real backend sends no such flag, so real events are always timed
 * — the default is correct for production and the flag only ever subtracts.
 *
 * That is the opposite of the usual shape: the demo is the environment that
 * has to admit it knows less.
 */

/** A `TripStatusEvent` plus the demo layer's honesty flag, which production omits. */
export interface TimelineEvent extends TripStatusEvent {
  /**
   * True when the timestamp is a placeholder rather than a record of the
   * moment. Demo-only: it rides along on the demo payload the same way
   * `arrived_at` does, and is absent from every real response.
   */
  estimated?: boolean;
}

/** What a customer or an operator should read for each stage. */
export const TIMELINE_LABELS: Record<TripStatus, string> = {
  pending: 'Booked',
  confirmed: 'Confirmed',
  driver_assigned: 'Chauffeur assigned',
  driver_arriving: 'En route to pickup',
  passenger_picked_up: 'Passenger on board',
  trip_started: 'Ride started',
  completed: 'Ride completed',
  cancelled: 'Cancelled',
};

export interface TimelineRow {
  status: TripStatus;
  label: string;
  /** ISO time, or null when the event is estimated and therefore untimed. */
  at: string | null;
  note: string | null;
}

/**
 * The ride's stages in the order they happened.
 *
 * Ordered by RECORDED TIME where there is one, and by the state machine's own
 * stage order otherwise — so a timeline containing estimated events still reads
 * top to bottom correctly without inventing a clock to sort by.
 */
export function rideTimeline(events: readonly TimelineEvent[]): TimelineRow[] {
  const rows = events.map((e) => ({
    status: e.status,
    label: TIMELINE_LABELS[e.status] ?? e.status,
    at: e.estimated ? null : e.created_at,
    note: e.note,
  }));

  return rows.sort((a, b) => {
    if (a.at && b.at) return Date.parse(a.at) - Date.parse(b.at);
    // One or both untimed: fall back to the state machine's order, which is
    // the only other thing that is actually known.
    const ai = TRIP_STAGE_ORDER.indexOf(a.status);
    const bi = TRIP_STAGE_ORDER.indexOf(b.status);
    return ai - bi;
  });
}

/** The recorded time a stage was reached, or null if it was never recorded. */
export function recordedAt(events: readonly TimelineEvent[], status: TripStatus): string | null {
  const hit = events.find((e) => e.status === status && !e.estimated);
  return hit?.created_at ?? null;
}

/**
 * "1 hr 9 min", "27 min", "3 min" — or null.
 *
 * Null whenever either end is missing, which is the common case and must stay
 * visibly empty rather than rendering "0 min". A zero is a measurement; a blank
 * is an absence, and they are different claims.
 */
export function formatDuration(fromIso: string | null, toIso: string | null): string | null {
  if (!fromIso || !toIso) return null;
  const ms = Date.parse(toIso) - Date.parse(fromIso);
  if (!Number.isFinite(ms) || ms < 0) return null;

  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = `${hours} hr`;
  return minutes === 0 ? h : `${h} ${minutes} min`;
}

export interface RideMetrics {
  /** Chauffeur set off → reached the kerb. */
  travelToPickup: string | null;
  /** Reached the kerb → passenger aboard. */
  waitingAtPickup: string | null;
  /** Ride started → dropped off. */
  rideDuration: string | null;
  /** Set off → dropped off. The whole job, from the operator's point of view. */
  totalOperational: string | null;
}

/**
 * The four durations the brief asks for, each derived or each null.
 *
 * ── Derived, never stored ─────────────────────────────────────────────────
 * Nothing here is persisted. A stored duration is a second copy of something
 * two timestamps already say, and the copy is the one that goes stale — the
 * same reason this project derives a verdict from a ledger rather than writing
 * it alongside.
 *
 * ── `arrivedAt` is passed in rather than read from the events ─────────────
 * Arrival is not a status. The backend enum has no member between
 * `driver_arriving` and `passenger_picked_up`, so there is no event to carry
 * it — it is a timestamp beside the booking (gap C-4). The caller supplies
 * whatever the trip payload had, and null is the honest and usual answer.
 */
export function rideMetrics(events: readonly TimelineEvent[], arrivedAt: string | null = null): RideMetrics {
  const enRoute = recordedAt(events, 'driver_arriving');
  const aboard = recordedAt(events, 'passenger_picked_up');
  const started = recordedAt(events, 'trip_started');
  const completed = recordedAt(events, 'completed');

  return {
    travelToPickup: formatDuration(enRoute, arrivedAt),
    waitingAtPickup: formatDuration(arrivedAt, aboard),
    rideDuration: formatDuration(started, completed),
    totalOperational: formatDuration(enRoute, completed),
  };
}

/**
 * Whether this ride has any recorded history at all.
 *
 * Drives the empty state: a ride whose every event is estimated has a timeline
 * worth showing (the stages happened) and no metrics worth showing (nobody
 * recorded when). The screen needs to tell those apart.
 */
export function hasRecordedTimes(events: readonly TimelineEvent[]): boolean {
  return events.some((e) => !e.estimated);
}

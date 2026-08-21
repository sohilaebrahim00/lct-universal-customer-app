/**
 * The shape every remote read in this app resolves to.
 *
 * Replaces the `useState<T | null>` + `.catch(() => {})` pattern, which
 * collapsed three genuinely different situations into one: a 500 from
 * `GET /bookings` rendered as "No upcoming trips", and a failed
 * `GET /bookings/:id` left the trip screen on "Loading…" forever (audit P0-5).
 *
 * `empty` is deliberately distinct from `success` with no rows, because "you
 * have no trips" and "we could not reach the server" are different sentences and
 * the customer needs to be told which one is true. `offline` is likewise its own
 * status rather than a flavour of `error` — the recovery is different (wait vs
 * retry vs call dispatch).
 *
 * Slice 1 uses this on Home. Slice 12 rolls it across every screen and deletes
 * the remaining silent catches.
 */

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'offline';

export type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'empty'; data: null; error: null }
  | { status: 'error'; data: null; error: Error }
  | { status: 'offline'; data: null; error: null };

export const asyncState = {
  idle: <T>(): AsyncState<T> => ({ status: 'idle', data: null, error: null }),
  loading: <T>(): AsyncState<T> => ({ status: 'loading', data: null, error: null }),
  success: <T>(data: T): AsyncState<T> => ({ status: 'success', data, error: null }),
  empty: <T>(): AsyncState<T> => ({ status: 'empty', data: null, error: null }),
  offline: <T>(): AsyncState<T> => ({ status: 'offline', data: null, error: null }),
  error: <T>(cause: unknown): AsyncState<T> => ({
    status: 'error',
    data: null,
    error: cause instanceof Error ? cause : new Error(String(cause)),
  }),
} as const;

/** `success` when there is something to show, `empty` when the call succeeded and there is not. */
export function fromList<T>(rows: T[]): AsyncState<T[]> {
  return rows.length > 0 ? asyncState.success(rows) : asyncState.empty<T[]>();
}

/** `success` when the value exists, `empty` when the call succeeded and returned nothing. */
export function fromOptional<T>(value: T | null | undefined): AsyncState<T> {
  return value === null || value === undefined ? asyncState.empty<T>() : asyncState.success(value);
}

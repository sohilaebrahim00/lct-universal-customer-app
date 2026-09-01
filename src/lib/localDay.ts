/**
 * Same calendar day, in the device's local time.
 *
 * ── Why it lives here and not in roleData ──────────────────────────────────
 * It is the rule the dispatcher board filters on, so a test asserting "the
 * board is never empty" has to use the SAME rule rather than its own copy —
 * this project has twice found a check quietly passing against a duplicate of
 * the thing it was meant to be checking.
 *
 * It used to sit in `src/dev/role/roleData.ts`, which imports the API client
 * and therefore Supabase, so importing it from a node-environment test failed
 * to load at all. A three-line date comparison should not drag a network client
 * behind it. `roleData` re-exports it, so every existing caller is unchanged.
 *
 * ── Local, deliberately ────────────────────────────────────────────────────
 * "Today" for a dispatcher is the day they are looking at a screen on. The
 * pickup's own timezone is a different question and a real gap — `bookings`
 * carries no zone column (C-4b) — but it is not this function's question.
 */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

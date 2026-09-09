import { describe, expect, it } from '@jest/globals';
import { buildRideIcs, icsFileName, type RideCalendarEvent } from '../src/lib/calendarEvent';

/**
 * THE CALENDAR FILE.
 *
 * "Add to calendar" was a present, labelled control with an empty `onPress`.
 * These assertions are about the file that replaced it — and, as much, about
 * what must never be in it.
 */

const RIDE: RideCalendarEvent = {
  scheduledAt: '2026-09-10T19:30:00.000Z',
  pickupAddress: '4820 Maple Ave, Dallas, TX',
  dropoffAddress: 'DFW Terminal D, DFW Airport, TX',
  reservationCode: 'LCT-4F2A19',
  vehicleName: 'Executive Sedan',
};

const NOW = new Date('2026-09-09T12:00:00.000Z');

describe('the ride .ics', () => {
  it('is a well-formed VCALENDAR with one VEVENT', () => {
    const ics = buildRideIcs(RIDE, NOW);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(1);
  });

  it('uses CRLF line endings, which Outlook enforces', () => {
    const ics = buildRideIcs(RIDE, NOW);
    // Every newline is preceded by a carriage return — no bare LF anywhere.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it('starts at the scheduled instant, in UTC form', () => {
    expect(buildRideIcs(RIDE, NOW)).toContain('DTSTART:20260910T193000Z');
  });

  it('ends after it starts', () => {
    const ics = buildRideIcs(RIDE, NOW);
    const start = /DTSTART:(\d{8}T\d{6}Z)/.exec(ics)![1]!;
    const end = /DTEND:(\d{8}T\d{6}Z)/.exec(ics)![1]!;
    expect(end > start).toBe(true);
  });

  /*
   * THE ONE THAT MATTERS MOST.
   *
   * A calendar entry syncs to devices, work accounts and shared calendars this
   * app does not control. The fare does not go into any of them.
   */
  it('contains NO fare, and no currency amount of any kind', () => {
    const ics = buildRideIcs({ ...RIDE, vehicleName: 'Executive Sedan' }, NOW);
    expect(ics).not.toMatch(/\$/);
    expect(ics).not.toMatch(/\d+\.\d{2}/);
    expect(ics.toLowerCase()).not.toContain('fare');
    expect(ics.toLowerCase()).not.toContain('total');
  });

  it('carries the reservation code rather than the internal id', () => {
    const ics = buildRideIcs(RIDE, NOW);
    expect(ics).toContain('LCT-4F2A19');
    // A UUID-shaped id must never reach a file the customer forwards.
    expect(ics).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });

  /*
   * Every address in this product has commas in it. RFC 5545 §3.3.11 requires
   * them escaped; unescaped, the field silently truncates at the first comma
   * and the calendar entry loses its location.
   */
  it('escapes commas and semicolons in addresses', () => {
    const ics = buildRideIcs(RIDE, NOW);
    expect(ics).toContain('4820 Maple Ave\\, Dallas\\, TX');
    expect(ics).not.toMatch(/LOCATION:[^\\\r\n]*,/);
  });

  it('escapes a semicolon in a special-character address', () => {
    const ics = buildRideIcs({ ...RIDE, pickupAddress: 'Gate 3; North Ramp' }, NOW);
    expect(ics).toContain('Gate 3\\; North Ramp');
  });

  /* RFC 5545 §3.1 — a line over 75 octets must be folded or clients reject it. */
  it('folds long lines, with continuations beginning in a space', () => {
    const long = 'A'.repeat(200);
    const ics = buildRideIcs({ ...RIDE, pickupAddress: long }, NOW);
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
    expect(ics).toMatch(/\r\n [A]/);
  });

  it('names the passenger only when the ride is for someone else', () => {
    expect(buildRideIcs(RIDE, NOW)).not.toContain('Passenger:');
    expect(buildRideIcs({ ...RIDE, passengerName: 'Priya Raman' }, NOW)).toContain('Passenger:');
  });

  it('gives the same ride the same UID, so re-adding updates rather than duplicates', () => {
    const a = /UID:(.+)/.exec(buildRideIcs(RIDE, NOW))![1];
    const b = /UID:(.+)/.exec(buildRideIcs(RIDE, new Date('2026-09-09T18:00:00Z')))![1];
    expect(a).toBe(b);
  });

  it('survives an hourly ride with no destination', () => {
    const ics = buildRideIcs({ ...RIDE, dropoffAddress: null }, NOW);
    expect(ics).toContain('SUMMARY:LCT Universal — chauffeur');
    expect(ics).not.toContain('Drop-off:');
  });

  it('produces a recognisable filename', () => {
    expect(icsFileName(RIDE)).toBe('lct-lct-4f2a19.ics');
    expect(icsFileName({ ...RIDE, reservationCode: null })).toBe('lct-ride.ics');
  });
});

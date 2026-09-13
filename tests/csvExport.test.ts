import { describe, expect, it } from '@jest/globals';
import {
  COMPLETED_RIDE_COLUMNS,
  completedRideRows,
  completedRidesCsv,
  csvField,
  exportFileName,
  toCsv,
} from '../src/lib/csvExport';
import type { TimelineEvent } from '../src/lib/rideTimeline';
import type { Booking, Profile, TripDriverInfo } from '../src/types/api';

/**
 * THE EXPORT, AND THE TWO WAYS IT COULD LIE.
 *
 * A CSV is the last place a guess should land: it gets filtered, summed and
 * pasted into a report, and nothing downstream can tell a recorded value from
 * a placeholder. So the assertions here are mostly about escaping — which
 * silently corrupts a file rather than failing it — and about estimated
 * timestamps never reaching a cell.
 */

const T = (hhmm: string) => `2026-09-14T${hhmm}:00.000Z`;

const booking = (over: Partial<Booking> = {}): Booking =>
  ({
    id: 'bk-1',
    user_id: 'u1',
    vehicle_id: 'demo-vehicle-sedan',
    service_type: 'point_to_point',
    status: 'completed',
    scheduled_at: T('14:00'),
    pickup_address: '4820 Maple Ave, Dallas, TX',
    dropoff_address: 'DFW Terminal D, DFW Airport, TX',
    primary_passenger_name: null,
    primary_passenger_phone: null,
    special_requests: null,
    flight_number: null,
    hourly_duration_hours: null,
    distance_miles: '23.2',
    total_fare: '180.06',
    currency: 'usd',
    created_at: T('10:00'),
    ...over,
  }) as Booking;

const customer = { full_name: 'Michael Okafor' } as Profile;
const driver = { id: 'd1', full_name: 'Daniel Alvarez', avatar_url: null, rating: null } as TripDriverInfo;

const recorded: TimelineEvent[] = [
  { status: 'trip_started', note: null, created_at: T('14:20') },
  { status: 'completed', note: null, created_at: T('15:26') },
];

describe('escaping — the part that corrupts a file rather than failing it', () => {
  it('leaves an ordinary value alone', () => {
    expect(csvField('Daniel Alvarez')).toBe('Daniel Alvarez');
    expect(csvField(180.06)).toBe('180.06');
  });

  /**
   * EVERY ADDRESS IN THIS PRODUCT CONTAINS A COMMA. Unquoted, the columns from
   * Pickup onwards shift by one and the file still opens — which is worse than
   * a failure, because it looks like data.
   */
  it('quotes a value containing a comma', () => {
    expect(csvField('4820 Maple Ave, Dallas, TX')).toBe('"4820 Maple Ave, Dallas, TX"');
  });

  it('doubles inner quotes, as RFC 4180 requires', () => {
    expect(csvField('Meet at the "north" kerb')).toBe('"Meet at the ""north"" kerb"');
  });

  it('quotes a value containing a line break', () => {
    expect(csvField('Child seat\nMeet inside')).toBe('"Child seat\nMeet inside"');
  });

  it('writes an empty cell for null and undefined, never the word', () => {
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
    expect(csvField('')).toBe('');
  });
});

describe('the document', () => {
  it('starts with a UTF-8 BOM so Excel does not mangle a non-ASCII name', () => {
    expect(toCsv([['Name']])).toMatch(/^﻿/);
  });

  it('separates rows with CRLF', () => {
    const doc = toCsv([['a', 'b'], ['c', 'd']]);
    expect(doc).toBe('﻿a,b\r\nc,d\r\n');
  });

  it('names the file for the day it was taken', () => {
    expect(exportFileName('completed-rides', new Date(2026, 8, 13))).toBe('lct-completed-rides-2026-09-13.csv');
    // Zero-padded, so the files sort.
    expect(exportFileName('drivers', new Date(2026, 0, 5))).toBe('lct-drivers-2026-01-05.csv');
  });
});

describe('completed rides', () => {
  const row = () =>
    completedRideRows([{ booking: booking(), customer, driver, vehicleName: 'First Class', events: recorded }])[0]!;

  it('has one cell per declared column', () => {
    expect(row()).toHaveLength(COMPLETED_RIDE_COLUMNS.length);
  });

  it('uses the RECORDED start and end, and the duration between them', () => {
    const cells = row();
    const i = (name: string) => COMPLETED_RIDE_COLUMNS.indexOf(name as never);
    expect(cells[i('Actual Start')]).not.toBe('');
    expect(cells[i('Actual End')]).not.toBe('');
    expect(cells[i('Duration')]).toBe('1 hr 6 min');
  });

  /**
   * THE ONE THAT KEEPS A PLACEHOLDER OUT OF A SPREADSHEET.
   *
   * A seeded ride carries evenly-spaced timestamps that mean nothing. They must
   * export as blank — not as a time, and not as a duration somebody could sum.
   */
  it('exports blanks for a ride whose times are only estimated', () => {
    const estimated = recorded.map((e) => ({ ...e, estimated: true }));
    const cells = completedRideRows([
      { booking: booking(), customer, driver, vehicleName: 'First Class', events: estimated },
    ])[0]!;
    const i = (name: string) => COMPLETED_RIDE_COLUMNS.indexOf(name as never);
    expect(cells[i('Actual Start')]).toBe('');
    expect(cells[i('Actual End')]).toBe('');
    expect(cells[i('Duration')]).toBe('');
    // The ride still exports — it happened. Only the clock is missing.
    expect(cells[i('Final Fare')]).toBe('180.06');
  });

  /**
   * THE STORED FARE, NEVER A RECALCULATION. First Class moved from $100/hour to
   * $150/hour this month; a historical ride must still export what was charged.
   */
  it('exports the fare stored on the booking', () => {
    const cells = completedRideRows([
      { booking: booking({ total_fare: '97.45' }), customer, driver, vehicleName: 'First Class', events: recorded },
    ])[0]!;
    expect(cells[COMPLETED_RIDE_COLUMNS.indexOf('Final Fare' as never)]).toBe('97.45');
  });

  it('exports the travelling passenger, not the account holder, when they differ', () => {
    const cells = completedRideRows([
      {
        booking: booking({ primary_passenger_name: 'Priya Raman' }),
        customer,
        driver,
        vehicleName: 'First Class',
        events: recorded,
      },
    ])[0]!;
    const i = (name: string) => COMPLETED_RIDE_COLUMNS.indexOf(name as never);
    expect(cells[i('Customer')]).toBe('Michael Okafor');
    expect(cells[i('Passenger')]).toBe('Priya Raman');
  });

  it('leaves Passenger blank rather than repeating the account holder', () => {
    const cells = row();
    expect(cells[COMPLETED_RIDE_COLUMNS.indexOf('Passenger' as never)]).toBe('');
  });

  /*
   * Plate and Payment Status have no source in this repository — there are no
   * physical vehicles and Booking has no payment field. They stay as columns so
   * the shape is stable, and stay EMPTY because an empty cell says "not
   * recorded" and a plausible value says something false.
   */
  it('leaves the two columns with no source empty rather than filling them', () => {
    const cells = row();
    const i = (name: string) => COMPLETED_RIDE_COLUMNS.indexOf(name as never);
    expect(cells[i('Plate')]).toBe('');
    expect(cells[i('Payment Status')]).toBe('');
  });

  it('carries no unassigned driver rather than a placeholder name', () => {
    const cells = completedRideRows([
      { booking: booking(), customer, driver: null, vehicleName: null, events: recorded },
    ])[0]!;
    expect(cells[COMPLETED_RIDE_COLUMNS.indexOf('Driver' as never)]).toBe('');
  });

  it('exports the filtered set it is given, and nothing else', () => {
    const doc = completedRidesCsv([
      { booking: booking({ id: 'keep-me' }), customer, driver, vehicleName: 'First Class', events: recorded },
    ]);
    expect(doc).toContain('keep-me');
    // Header plus one row plus the trailing break.
    expect(doc.trimEnd().split('\r\n')).toHaveLength(2);
  });

  it('produces a parseable document when every field is hostile', () => {
    const doc = completedRidesCsv([
      {
        booking: booking({
          pickup_address: 'A, B "C"\nD',
          dropoff_address: 'Terminal, D',
          primary_passenger_name: 'O\'Brien, "Jr"',
        }),
        customer,
        driver,
        vehicleName: 'First Class',
        events: recorded,
      },
    ]);
    /*
     * Written this way after the first version passed with the escaping
     * REMOVED — it stripped quoted spans and then split on CRLF, and an
     * unescaped `\n` is not a CRLF, so the count never moved. A test that
     * survives the defect it names is decorative.
     *
     * So this asserts the escaped forms are present, which is the thing that
     * actually keeps the file parseable.
     */
    expect(doc).toContain('"A, B ""C""\nD"');
    expect(doc).toContain('"Terminal, D"');
    expect(doc).toContain('"O\'Brien, ""Jr"""');

    // And the record count still holds, now that quoting is proven.
    const records = doc.replace(/"(?:[^"]|"")*"/g, 'Q').trimEnd().split('\r\n');
    expect(records).toHaveLength(2);
  });

  it('exports nothing but a header for an empty result', () => {
    expect(completedRidesCsv([]).trimEnd()).toBe(`﻿${COMPLETED_RIDE_COLUMNS.join(',')}`);
  });
});

import { describe, expect, it } from '@jest/globals';
import { TRIP_STAGE_ORDER, isTerminalStatus, isUpcomingBookingStatus, stageIndex } from '../src/lib/tripStatus';

describe('tripStatus helpers', () => {
  it('orders the seven live stages, spec-accurate', () => {
    expect(TRIP_STAGE_ORDER).toEqual([
      'pending',
      'confirmed',
      'driver_assigned',
      'driver_arriving',
      'passenger_picked_up',
      'trip_started',
      'completed',
    ]);
  });

  it('stageIndex resolves each stage to its position', () => {
    expect(stageIndex('pending')).toBe(0);
    expect(stageIndex('trip_started')).toBe(5);
    expect(stageIndex('completed')).toBe(6);
  });

  it('stageIndex returns -1 for cancelled (not part of the linear sequence)', () => {
    expect(stageIndex('cancelled')).toBe(-1);
  });

  it('treats completed and cancelled as terminal', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
    expect(isTerminalStatus('trip_started')).toBe(false);
  });

  it('isUpcomingBookingStatus is the inverse of isTerminalStatus', () => {
    expect(isUpcomingBookingStatus('pending')).toBe(true);
    expect(isUpcomingBookingStatus('completed')).toBe(false);
  });
});

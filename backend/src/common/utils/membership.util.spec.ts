import { describe, expect, it } from 'vitest';

import { gymDate, startOfGymDayInstant } from './membership.util';

describe('gym calendar dates', () => {
  it('assigns after-midnight Damascus attendance to the new local day', () => {
    const instant = new Date('2026-06-29T21:30:00.000Z');
    expect(gymDate(instant).toISOString()).toBe('2026-06-30T00:00:00.000Z');
  });

  it('returns the UTC instant corresponding to Damascus midnight', () => {
    const instant = new Date('2026-06-29T22:00:00.000Z');
    expect(startOfGymDayInstant(instant).toISOString()).toBe('2026-06-29T21:00:00.000Z');
  });
});

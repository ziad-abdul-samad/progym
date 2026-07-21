import { describe, expect, it } from 'vitest';

import { computeSubscriptionChargeMinor } from './memberships.service';

describe('computeSubscriptionChargeMinor', () => {
  it('charges two months at twice the configured monthly price', () => {
    expect(computeSubscriptionChargeMinor(2500, 60)).toBe(5000);
  });

  it('prorates partial months to the nearest cent', () => {
    expect(computeSubscriptionChargeMinor(2500, 45)).toBe(3750);
  });

  it('never creates a negative payment', () => {
    expect(computeSubscriptionChargeMinor(2500, -30)).toBe(0);
  });
});

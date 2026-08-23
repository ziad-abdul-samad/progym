import { describe, expect, it } from 'vitest';

import { canSubscriptionEnterBranch, computeSubscriptionChargeMinor } from './memberships.service';

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

describe('canSubscriptionEnterBranch', () => {
  it('allows a paid main-branch subscription into every branch', () => {
    expect(canSubscriptionEnterBranch('b1', 'branch_b1', 'branch_b1')).toBe(true);
    expect(canSubscriptionEnterBranch('b1', 'branch_b1', 'branch_b2')).toBe(true);
    expect(canSubscriptionEnterBranch('b1', 'branch_b1', 'branch_b3')).toBe(true);
  });

  it('limits other paid subscriptions to their own branch', () => {
    expect(canSubscriptionEnterBranch('b2', 'branch_b2', 'branch_b2')).toBe(true);
    expect(canSubscriptionEnterBranch('b2', 'branch_b2', 'branch_b1')).toBe(false);
    expect(canSubscriptionEnterBranch('b3', 'branch_b3', 'branch_b2')).toBe(false);
  });
});

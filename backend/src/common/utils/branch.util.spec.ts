import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import type { AuthenticatedUser } from '../types/authenticated-user';
import { assertSameBranch, normalizeBranchCode, requireBranchId } from './branch.util';

const user: AuthenticatedUser = {
  branchCode: 'b2',
  branchId: 'branch_b2',
  fullName: 'Observer',
  id: 'observer-user',
  role: UserRole.OBSERVER,
  username: 'b2.observer.1',
};

describe('branch request isolation', () => {
  it('normalizes a branch header without accepting whitespace as a branch', () => {
    expect(normalizeBranchCode(' B2 ')).toBe('b2');
    expect(normalizeBranchCode(['b3', 'b1'])).toBe('b3');
    expect(normalizeBranchCode('   ')).toBeUndefined();
  });

  it('requires a selected branch for branch-scoped operations', () => {
    expect(requireBranchId(user)).toBe('branch_b2');
    expect(() => requireBranchId({ ...user, branchId: undefined })).toThrow(BadRequestException);
  });

  it('rejects access to a record belonging to another branch', () => {
    expect(() => assertSameBranch('branch_b2', user)).not.toThrow();
    expect(() => assertSameBranch('branch_b1', user)).toThrow(ForbiddenException);
  });
});

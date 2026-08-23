import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../types/authenticated-user';

export const BRANCH_HEADER = 'x-progym-branch';
export const DEFAULT_BRANCH_CODE = 'b1';
export const BRANCH_CODES = ['b1', 'b2', 'b3'] as const;

export type BranchCode = (typeof BRANCH_CODES)[number];

export function normalizeBranchCode(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.trim().toLowerCase();
  return normalized || undefined;
}

export function requireBranchId(user: AuthenticatedUser): string {
  if (!user.branchId) {
    throw new BadRequestException('Choose a Pro Gym branch before continuing');
  }
  return user.branchId;
}

export function assertSameBranch(actualBranchId: string, user: AuthenticatedUser): void {
  const branchId = requireBranchId(user);
  if (actualBranchId !== branchId) {
    throw new ForbiddenException('This record belongs to another Pro Gym branch');
  }
}

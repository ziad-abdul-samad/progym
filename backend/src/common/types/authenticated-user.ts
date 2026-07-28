import type { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  memberProfileId?: string;
  coachProfileId?: string;
  shiftObserverId?: string;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  ip?: string;
}

'use client';

import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '@/lib/api/client';

export type SessionUser = {
  assignedCoach: {
    avatarUrl: string | null;
    fullName: string;
    status: 'ACTIVE' | 'PAUSED';
  } | null;
  id: string;
  avatarUrl: string | null;
  coachProfileId: string | null;
  fullName: string;
  memberProfileId: string | null;
  membership: {
    status: string;
    remainingDays: number;
    isExpired: boolean;
  } | null;
  pendingPhotoRequest: {
    id: string;
    message: string | null;
    type: string;
    coach?: { user?: { fullName?: string } };
  } | null;
  role: 'MEMBER' | 'COACH' | 'ADMIN' | 'OBSERVER';
  shiftObserver: {
    id: string;
    shiftEnd: string | null;
    shiftStart: string | null;
  } | null;
  status: string;
  username: string;
};

export function useAuth() {
  return useQuery({
    queryFn: () => apiRequest<SessionUser>('/auth/me'),
    queryKey: ['auth', 'me'],
    retry: false,
  });
}

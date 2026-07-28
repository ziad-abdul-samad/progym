import { UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  authScopeForRole,
  authScopeFromHeader,
  scopedAuthCookieName,
} from './auth-scope.util';

describe('auth scope utilities', () => {
  it('maps every account role to a bounded cookie scope', () => {
    expect(authScopeForRole(UserRole.ADMIN)).toBe('admin');
    expect(authScopeForRole(UserRole.OBSERVER)).toBe('observer');
    expect(authScopeForRole(UserRole.COACH)).toBe('coach');
    expect(authScopeForRole(UserRole.MEMBER)).toBe('member');
  });

  it('rejects arbitrary scope headers and accepts the supported scopes', () => {
    expect(authScopeFromHeader('observer')).toBe('observer');
    expect(authScopeFromHeader(['admin'])).toBe('admin');
    expect(authScopeFromHeader('owner')).toBeUndefined();
  });

  it('keeps legacy cookie names when no tab scope exists', () => {
    expect(scopedAuthCookieName('access_token')).toBe('access_token');
    expect(scopedAuthCookieName('csrf_token', 'observer')).toBe('csrf_token_observer');
    expect(scopedAuthCookieName('refresh_token', 'admin')).toBe('refresh_token_admin');
  });
});

import type { UserRole } from '@prisma/client';

export const AUTH_SCOPE_HEADER = 'x-auth-scope';

const AUTH_SCOPES = ['admin', 'observer', 'coach', 'member'] as const;

export type AuthScope = (typeof AUTH_SCOPES)[number];

export function authScopeFromHeader(value: string | string[] | undefined): AuthScope | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return AUTH_SCOPES.find((scope) => scope === candidate);
}

export function authScopeForRole(role: UserRole): AuthScope {
  return role.toLowerCase() as AuthScope;
}

export function scopedAuthCookieName(
  baseName: 'access_token' | 'csrf_token' | 'refresh_token',
  scope?: AuthScope,
): string {
  return scope ? `${baseName}_${scope}` : baseName;
}

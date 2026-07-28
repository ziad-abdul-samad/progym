'use client';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

const AUTH_SCOPE_KEY = 'progym_auth_scope';
const AUTH_SCOPES = ['admin', 'observer', 'coach', 'member'] as const;

type AuthScope = (typeof AUTH_SCOPES)[number];

function isAuthScope(value: string | null): value is AuthScope {
  return AUTH_SCOPES.some((scope) => scope === value);
}

function getAuthScope(): AuthScope | undefined {
  if (typeof window === 'undefined') return undefined;

  const tabScope = window.sessionStorage.getItem(AUTH_SCOPE_KEY);
  if (isAuthScope(tabScope)) return tabScope;

  const latestScope = window.localStorage.getItem(AUTH_SCOPE_KEY);
  if (!isAuthScope(latestScope)) return undefined;
  window.sessionStorage.setItem(AUTH_SCOPE_KEY, latestScope);
  return latestScope;
}

function setAuthScopeFromRole(role: unknown): AuthScope | undefined {
  if (typeof window === 'undefined' || typeof role !== 'string') return undefined;
  const scope = role.toLowerCase();
  if (!isAuthScope(scope)) return undefined;
  window.sessionStorage.setItem(AUTH_SCOPE_KEY, scope);
  window.localStorage.setItem(AUTH_SCOPE_KEY, scope);
  return scope;
}

function clearAuthScope() {
  if (typeof window === 'undefined') return;
  const scope = window.sessionStorage.getItem(AUTH_SCOPE_KEY);
  window.sessionStorage.removeItem(AUTH_SCOPE_KEY);
  if (scope && window.localStorage.getItem(AUTH_SCOPE_KEY) === scope) {
    window.localStorage.removeItem(AUTH_SCOPE_KEY);
  }
}

function scopedCookieName(baseName: 'csrf_token', scope?: AuthScope): string {
  return scope ? `${baseName}_${scope}` : baseName;
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

export async function apiRequest<TData>(path: string, init: RequestInit = {}): Promise<TData> {
  const isFormData = init.body instanceof FormData;
  const headers = new Headers(init.headers);
  let authScope = getAuthScope();
  if (authScope) headers.set('x-auth-scope', authScope);

  if (!isFormData && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const method = init.method?.toUpperCase() ?? 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCookie(scopedCookieName('csrf_token', authScope));
    if (csrfToken) headers.set('x-csrf-token', decodeURIComponent(csrfToken));
  }

  const apiBaseUrl =
    typeof window === 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1')
      : '/api/v1';
  const request = () =>
    fetch(`${apiBaseUrl}${path}`, {
      ...init,
      cache: init.cache ?? 'no-store',
      credentials: 'include',
      headers,
    });
  let response = await request();

  const canRefresh =
    response.status === 401 &&
    ![
      '/auth/login',
      '/auth/logout',
      '/auth/refresh',
      '/auth/register',
      '/auth/registration-status',
    ].includes(path);
  if (canRefresh) {
    const csrfToken = getCookie(scopedCookieName('csrf_token', authScope));
    const refreshHeaders = new Headers({ 'Content-Type': 'application/json' });
    if (authScope) refreshHeaders.set('x-auth-scope', authScope);
    if (csrfToken) refreshHeaders.set('x-csrf-token', decodeURIComponent(csrfToken));
    const refreshed = await fetch(`${apiBaseUrl}/auth/refresh`, {
      credentials: 'include',
      headers: refreshHeaders,
      method: 'POST',
    });
    if (refreshed.ok) {
      const refreshPayload = (await refreshed
        .clone()
        .json()
        .catch(() => null)) as {
        data?: { role?: unknown };
      } | null;
      authScope = setAuthScopeFromRole(refreshPayload?.data?.role) ?? authScope;
      if (authScope) headers.set('x-auth-scope', authScope);
      const refreshedCsrfToken = getCookie(scopedCookieName('csrf_token', authScope));
      if (refreshedCsrfToken) {
        headers.set('x-csrf-token', decodeURIComponent(refreshedCsrfToken));
      }
      response = await request();
    }
  }
  const payload = (await response.json().catch(() => null)) as {
    data?: TData;
    error?: { message?: string; details?: unknown };
  } | null;

  if (!response.ok) {
    throw new ApiClientError(
      payload?.error?.message ?? 'حدث خطأ غير متوقع',
      response.status,
      payload?.error?.details,
    );
  }

  if (path === '/auth/login') {
    setAuthScopeFromRole((payload?.data as { role?: unknown } | undefined)?.role);
  } else if (path === '/auth/registration-status') {
    setAuthScopeFromRole((payload?.data as { user?: { role?: unknown } } | undefined)?.user?.role);
  } else if (path === '/auth/logout') {
    clearAuthScope();
  }

  return payload?.data as TData;
}

export function jsonBody<TValue>(value: TValue): BodyInit {
  return JSON.stringify(value);
}

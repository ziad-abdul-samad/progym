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

  if (!isFormData && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const method = init.method?.toUpperCase() ?? 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCookie('csrf_token');
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
    const csrfToken = getCookie('csrf_token');
    const refreshHeaders = new Headers({ 'Content-Type': 'application/json' });
    if (csrfToken) refreshHeaders.set('x-csrf-token', decodeURIComponent(csrfToken));
    const refreshed = await fetch(`${apiBaseUrl}/auth/refresh`, {
      credentials: 'include',
      headers: refreshHeaders,
      method: 'POST',
    });
    if (refreshed.ok) response = await request();
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

  return payload?.data as TData;
}

export function jsonBody<TValue>(value: TValue): BodyInit {
  return JSON.stringify(value);
}

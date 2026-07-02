export const API_BASE_PATH = '/api/v1';

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:4000${API_BASE_PATH}`;
}

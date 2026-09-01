import { getToken } from '@/lib/server/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://api:8000/api';

export async function laravelFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const token = await getToken();

  const headers = new Headers(options?.headers);
  headers.set('Accept', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
import type { ApiResponse, ApiError } from '@/types/api';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const proxyUrl = `/api/proxy${cleanEndpoint}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Automatically set application/json content-type if body is a plain JSON object string and not FormData/Blob
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(proxyUrl, {
    ...options,
    headers,
  });

  let payload: ApiResponse<T> | ApiError | null = null;
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    try {
      payload = (await response.json()) as ApiResponse<T> | ApiError;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || !payload || !('success' in payload) || !payload.success) {
    const status = response.status;
    const message =
      payload && 'message' in payload ? payload.message : 'Terjadi kesalahan pada sistem.';
    const errors =
      payload && 'errors' in payload ? payload.errors ?? undefined : undefined;

    throw new ApiClientError(status, message, errors);
  }

  return payload as ApiResponse<T>;
}

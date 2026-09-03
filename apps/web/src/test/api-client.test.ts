import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, ApiClientError } from '@/lib/client/api';

describe('apiFetch Client Wrapper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches successfully and unwraps ApiResponse envelope', async () => {
    const mockData = { id: 1, title: 'Test Ticket' };
    const mockResponse = {
      success: true,
      message: 'Ticket retrieved successfully.',
      data: mockData,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await apiFetch<typeof mockData>('/tickets/1');
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
  });

  it('throws ApiClientError with validation errors when 422 is returned', async () => {
    const mockErrorResponse = {
      success: false,
      message: 'Data tidak valid.',
      errors: {
        title: ['validation.required'],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockErrorResponse,
    } as unknown as Response);

    await expect(apiFetch('/tickets', { method: 'POST' })).rejects.toThrow(
      ApiClientError
    );

    try {
      await apiFetch('/tickets', { method: 'POST' });
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.errors?.title).toEqual(['validation.required']);
    }
  });
});

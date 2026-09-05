import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ROLE_HOME } from '@/lib/navigation';
import DashboardRouterPage from '@/app/(app)/page';
import { laravelFetch } from '@/lib/server/api';
import { redirect } from 'next/navigation';

vi.mock('@/lib/server/api', () => ({
  laravelFetch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest?: string };
    error.digest = `NEXT_REDIRECT;replace;${url};307;;`;
    throw error;
  }),
}));

describe('ROLE_HOME Constant', () => {
  it('maps all roles to their expected home routes', () => {
    expect(ROLE_HOME).toBeDefined();
    expect(ROLE_HOME['administrator']).toBe('/dashboard/admin');
    expect(ROLE_HOME['manager']).toBe('/dashboard/manager');
    expect(ROLE_HOME['technician']).toBe('/dashboard/technician');
    expect(ROLE_HOME['employee']).toBe('/dashboard/employee');
  });
});

describe('DashboardRouterPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects administrator to /dashboard/admin', async () => {
    vi.mocked(laravelFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            role: { name: 'administrator' },
          },
        }),
        { status: 200 }
      )
    );

    await expect(DashboardRouterPage()).rejects.toThrow('NEXT_REDIRECT: /dashboard/admin');
    expect(redirect).toHaveBeenCalledWith('/dashboard/admin');
  });

  it('redirects manager to /dashboard/manager', async () => {
    vi.mocked(laravelFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            role: { name: 'manager' },
          },
        }),
        { status: 200 }
      )
    );

    await expect(DashboardRouterPage()).rejects.toThrow('NEXT_REDIRECT: /dashboard/manager');
    expect(redirect).toHaveBeenCalledWith('/dashboard/manager');
  });

  it('redirects technician to /dashboard/technician', async () => {
    vi.mocked(laravelFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            role: { name: 'technician' },
          },
        }),
        { status: 200 }
      )
    );

    await expect(DashboardRouterPage()).rejects.toThrow('NEXT_REDIRECT: /dashboard/technician');
    expect(redirect).toHaveBeenCalledWith('/dashboard/technician');
  });

  it('redirects employee to /dashboard/employee', async () => {
    vi.mocked(laravelFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            role: { name: 'employee' },
          },
        }),
        { status: 200 }
      )
    );

    await expect(DashboardRouterPage()).rejects.toThrow('NEXT_REDIRECT: /dashboard/employee');
    expect(redirect).toHaveBeenCalledWith('/dashboard/employee');
  });

  it('falls back to /dashboard/employee when role is unknown or missing', async () => {
    vi.mocked(laravelFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            role: { name: 'guest_or_other' },
          },
        }),
        { status: 200 }
      )
    );

    await expect(DashboardRouterPage()).rejects.toThrow('NEXT_REDIRECT: /dashboard/employee');
    expect(redirect).toHaveBeenCalledWith('/dashboard/employee');
  });

  it('redirects to /login when response is not ok (e.g. 401 Unauthorized)', async () => {
    vi.mocked(laravelFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Unauthenticated.' }), { status: 401 })
    );

    await expect(DashboardRouterPage()).rejects.toThrow('NEXT_REDIRECT: /login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when network or fetch throws an error', async () => {
    vi.mocked(laravelFetch).mockRejectedValueOnce(new Error('Network error'));

    await expect(DashboardRouterPage()).rejects.toThrow('NEXT_REDIRECT: /login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});

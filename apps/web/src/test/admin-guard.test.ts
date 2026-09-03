import { describe, it, expect } from 'vitest';
import { resolveAdminAccess, type MePayload } from '@/lib/server/require-admin';

function me(role: string | null, permissions: string[] = []): MePayload {
  return {
    data: {
      id: 1,
      email: 'user@example.com',
      full_name: 'User',
      ...(role ? { role: { id: 1, name: role } } : {}),
      permissions,
    },
  } as MePayload;
}

describe('resolveAdminAccess', () => {
  it("returns 'admin' for role administrator", () => {
    expect(resolveAdminAccess(me('administrator'))).toBe('admin');
  });

  it("returns 'audit-viewer' for manager with audit-log.viewAny", () => {
    expect(resolveAdminAccess(me('manager', ['audit-log.viewAny']))).toBe('audit-viewer');
  });

  it("returns 'denied' for manager without audit-log.viewAny", () => {
    expect(resolveAdminAccess(me('manager', []))).toBe('denied');
  });

  it("returns 'denied' for technician", () => {
    expect(resolveAdminAccess(me('technician', ['audit-log.viewAny']))).toBe('denied');
  });

  it("returns 'denied' for employee", () => {
    expect(resolveAdminAccess(me('employee'))).toBe('denied');
  });

  it("returns 'denied' for null payload", () => {
    expect(resolveAdminAccess(null)).toBe('denied');
  });
});

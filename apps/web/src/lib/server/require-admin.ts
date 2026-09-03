import { redirect } from 'next/navigation';
import { laravelFetch } from '@/lib/server/api';

export interface MePayload {
  data: {
    id: number;
    email: string;
    full_name: string;
    role?: { id: number; name: string } | null;
    permissions: string[];
  };
}

export type AdminAccess = 'admin' | 'audit-viewer' | 'denied';

export function resolveAdminAccess(me: MePayload | null): AdminAccess {
  const role = me?.data?.role?.name;
  const permissions = me?.data?.permissions ?? [];
  if (role === 'administrator') return 'admin';
  if (role === 'manager' && permissions.includes('audit-log.viewAny')) return 'audit-viewer';
  return 'denied';
}

async function fetchMe(): Promise<MePayload | null> {
  const res = await laravelFetch('/me', { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as MePayload;
}

export async function requireAdmin(): Promise<void> {
  if (resolveAdminAccess(await fetchMe()) !== 'admin') redirect('/403');
}

export async function requireAuditViewer(): Promise<void> {
  if (resolveAdminAccess(await fetchMe()) === 'denied') redirect('/403');
}

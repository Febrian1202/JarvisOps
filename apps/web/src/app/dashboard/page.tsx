import { redirect } from 'next/navigation';

import { laravelFetch } from '@/lib/server/api';
import type { ApiResponse, User } from '@/types/api';
import LogoutButton from './logout-button';
import ProxyProbe from './proxy-probe';

export default async function DashboardPage() {
  let response: Response;

  try {
    response = await laravelFetch('/me');
  } catch {
    redirect('/login');
  }

  if (!response.ok) {
    redirect('/login');
  }

  const payload = (await response.json()) as ApiResponse<User>;
  const user = payload.data;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Selamat datang, {user.full_name}.
          </p>
        </div>
        <LogoutButton />
      </header>

      <ProxyProbe />
    </main>
  );
}
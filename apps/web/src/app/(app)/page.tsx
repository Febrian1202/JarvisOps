import { redirect } from 'next/navigation';
import { laravelFetch } from '@/lib/server/api';
import { ROLE_HOME } from '@/lib/navigation';

export default async function DashboardRouterPage() {
  try {
    const res = await laravelFetch('/me');

    if (!res.ok) {
      redirect('/login');
    }

    const json = await res.json();
    const roleName = json?.data?.role?.name?.toLowerCase();
    const destination = (roleName && ROLE_HOME[roleName]) ? ROLE_HOME[roleName] : '/dashboard/employee';

    redirect(destination);
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    redirect('/login');
  }
}

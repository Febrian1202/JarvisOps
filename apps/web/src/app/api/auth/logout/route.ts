import { NextResponse } from 'next/server';

import { laravelFetch } from '@/lib/server/api';
import { deleteToken } from '@/lib/server/session';

export async function POST() {
  await laravelFetch('/logout', { method: 'POST' });
  await deleteToken();

  return NextResponse.json({
    success: true,
    message: 'Logout successful.',
    data: null,
  });
}
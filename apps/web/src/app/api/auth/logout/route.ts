import { NextResponse } from 'next/server';

import { laravelFetch } from '@/lib/server/api';
import { deleteToken } from '@/lib/server/session';

export async function POST() {
  try {
    await laravelFetch('/logout', { method: 'POST' });
  } finally {
    await deleteToken();
  }

  return NextResponse.json({
    success: true,
    message: 'Logout successful.',
    data: null,
  });
}
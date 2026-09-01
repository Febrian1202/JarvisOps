import { NextResponse } from 'next/server';

import { laravelFetch } from '@/lib/server/api';
import { deleteToken } from '@/lib/server/session';

export async function POST() {
  try {
    await laravelFetch('/logout', { method: 'POST' });
  } catch {
    // Backend revoke failed; local session is still terminated below.
  }

  try {
    await deleteToken();
  } catch {
    // Cookie clearing failed; return the envelope anyway.
  }

  return NextResponse.json({
    success: true,
    message: 'Logout successful.',
    data: null,
  });
}
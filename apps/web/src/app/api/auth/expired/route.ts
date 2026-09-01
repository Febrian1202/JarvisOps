import { NextResponse } from 'next/server';

import { deleteToken } from '@/lib/server/session';

export async function GET(request: Request) {
  await deleteToken();

  return NextResponse.redirect(new URL('/login', request.url));
}

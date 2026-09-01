import { NextResponse } from 'next/server';

import { API_BASE_URL } from '@/lib/server/api';
import { setToken } from '@/lib/server/session';
import type { ApiResponse, User } from '@/types/api';

interface LoginData {
  token: string;
  user: User;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.', data: null },
      { status: 400 },
    );
  }

  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return response;
  }

  const payload = (await response.json()) as ApiResponse<LoginData>;

  await setToken(payload.data.token);

  return NextResponse.json({
    success: true,
    message: payload.message,
    data: { user: payload.data.user },
  });
}
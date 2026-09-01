import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'auth_token';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 12 * 60 * 60, // 12 hours, matches SANCTUM_EXPIRATION
};

export async function setToken(token: string) {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, token, cookieOptions);
}

export async function getToken() {
  const store = await cookies();
  return store.get(AUTH_COOKIE_NAME)?.value;
}

export async function deleteToken() {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
}
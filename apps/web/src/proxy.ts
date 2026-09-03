import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/favicon.ico'];

export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has('auth_token');
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path));

  // If already authenticated and trying to access /login, redirect to /
  if (hasToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If unauthenticated and trying to access protected routes (excluding API and public paths)
  if (!hasToken && !isPublic && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};

import { NextRequest, NextResponse } from 'next/server';
import { getToken, deleteToken } from '@/lib/server/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://api:8000/api';

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const token = await getToken();
  const search = request.nextUrl.search;
  const targetUrl = `${API_BASE_URL}/${path.join('/')}${search}`;

  const headers = new Headers();
  const incomingAccept = request.headers.get('accept');
  headers.set('Accept', incomingAccept || 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const contentType = request.headers.get('content-type');
  let body: BodyInit | undefined = undefined;

  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (contentType?.includes('multipart/form-data')) {
      body = await request.blob();
      headers.set('Content-Type', contentType);
    } else if (contentType?.includes('application/json')) {
      body = await request.text();
      headers.set('Content-Type', 'application/json');
    } else {
      body = await request.blob();
      if (contentType) {
        headers.set('Content-Type', contentType);
      }
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });

    if (response.status === 401) {
      await deleteToken();
    }

    const responseHeaders = new Headers();
    response.headers.forEach((val, key) => {
      if (!['content-encoding', 'content-length'].includes(key.toLowerCase())) {
        responseHeaders.set(key, val);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Backend service unreachable.', errors: null },
      { status: 503 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;

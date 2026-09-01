import { type NextRequest } from 'next/server';

import { laravelFetch } from '@/lib/server/api';
import { deleteToken } from '@/lib/server/session';

function forwardResponse(response: Response) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function buildEndpoint(request: NextRequest, path: string[]) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.toString();
  return '/' + path.join('/') + (query ? '?' + query : '');
}

async function handleRequest(
  request: NextRequest,
  path: string[],
  method: string,
) {
  const endpoint = buildEndpoint(request, path);
  const options: RequestInit = { method };

  if (method === 'POST' || method === 'PUT') {
    options.body = await request.text();
    const contentType = request.headers.get('content-type');
    if (contentType) {
      options.headers = { 'Content-Type': contentType };
    }
  }

  const response = await laravelFetch(endpoint, options);

  if (response.status === 401) {
    await deleteToken();
  }

  return forwardResponse(response);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return handleRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return handleRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return handleRequest(request, path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return handleRequest(request, path, 'DELETE');
}
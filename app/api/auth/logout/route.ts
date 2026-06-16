import { NextResponse } from 'next/server';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request) {
  const response = NextResponse.redirect(`${getBaseUrl(request)}/login?logout=1`, 303);
  response.cookies.set('lqdc_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  return response;
}

export async function GET(request: Request) {
  return POST(request);
}

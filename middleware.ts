import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = ['/projects', '/templates', '/api/projects', '/api/export'];

function isProtected(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('lqdc_session')?.value;

  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/projects', request.url));
  }

  if (isProtected(pathname) && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/projects/:path*', '/templates/:path*', '/api/projects/:path*', '/api/export/:path*', '/login']
};

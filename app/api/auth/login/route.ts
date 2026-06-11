import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get('email') || '');
  const password = String(form.get('password') || '');
  const user = await prisma.user.findUnique({ where: { email } });

  const baseUrl = getBaseUrl(request);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.redirect(`${baseUrl}/login?error=1`, 303);
  }

  const response = NextResponse.redirect(`${baseUrl}/projects`, 303);
  response.cookies.set('lqdc_session', user.id, { httpOnly: true, sameSite: 'lax', path: '/' });
  return response;
}

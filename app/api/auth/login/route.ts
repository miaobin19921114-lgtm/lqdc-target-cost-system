import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

function safeNext(value: string) {
  if (!value.startsWith('/')) return '/projects';
  if (value.startsWith('//')) return '/projects';
  if (value.startsWith('/login')) return '/projects';
  if (value === '/workspace') return '/projects';
  if (value.includes('/dashboard-lite')) return '/projects';
  return value;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const identifier = String(form.get('identifier') || form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  const next = safeNext(String(form.get('next') || '/projects'));
  const adminPhone = process.env.ADMIN_PHONE || '';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@lqdc.local';
  const loginKey = identifier === adminPhone && adminPhone ? adminEmail : identifier;
  const user = await prisma.user.findFirst({ where: { OR: [{ email: loginKey }, { phone: loginKey }] } });

  const baseUrl = getBaseUrl(request);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.redirect(`${baseUrl}/login?error=1&next=${encodeURIComponent(next)}`, 303);
  }

  const response = NextResponse.redirect(`${baseUrl}${next}`, 303);
  response.cookies.set('lqdc_session', user.id, { httpOnly: true, sameSite: 'lax', path: '/' });
  return response;
}

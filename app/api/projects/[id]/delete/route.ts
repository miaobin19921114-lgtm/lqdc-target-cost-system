import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
  if (project) await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.redirect(`${getBaseUrl(request)}/projects?deleted=1`, 303);
}

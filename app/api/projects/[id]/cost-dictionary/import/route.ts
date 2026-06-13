import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getV57CostDictionaryRows } from '@/data/cost-dictionary-v57';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const baseUrl = getBaseUrl(request);
  const rows = getV57CostDictionaryRows().map((row) => ({ ...row, projectId: params.id }));

  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId: params.id } }),
    ...(rows.length ? [prisma.costDictionaryRow.createMany({ data: rows })] : [])
  ]);

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/cost-dictionary?imported=${rows.length}`, 303);
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toNumber = (value: FormDataEntryValue | null) => Number(value || 0);

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const project = await prisma.project.create({
    data: {
      name: String(form.get('name') || '未命名项目'),
      city: String(form.get('city') || ''),
      district: String(form.get('district') || ''),
      landArea: toNumber(form.get('landArea')),
      plotRatio: toNumber(form.get('plotRatio')),
      totalBuildingArea: toNumber(form.get('totalBuildingArea')),
      saleableArea: toNumber(form.get('saleableArea')),
      parkingCount: Math.round(toNumber(form.get('parkingCount'))),
      remark: String(form.get('remark') || ''),
      versions: { create: { name: '初始版本', status: 'draft' } }
    }
  });

  const baseUrl = getBaseUrl(request);
  return NextResponse.redirect(`${baseUrl}/projects/${project.id}`, 303);
}

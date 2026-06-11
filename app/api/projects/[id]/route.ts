import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toNumber = (value: FormDataEntryValue | null) => Number(value || 0);

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();

  await prisma.project.update({
    where: { id: params.id },
    data: {
      name: String(form.get('name') || '未命名项目'),
      city: String(form.get('city') || ''),
      district: String(form.get('district') || ''),
      landArea: toNumber(form.get('landArea')),
      plotRatio: toNumber(form.get('plotRatio')),
      totalBuildingArea: toNumber(form.get('totalBuildingArea')),
      capacityBuildingArea: toNumber(form.get('capacityBuildingArea')),
      aboveGroundArea: toNumber(form.get('aboveGroundArea')),
      undergroundArea: toNumber(form.get('undergroundArea')),
      saleableArea: toNumber(form.get('saleableArea')),
      nonSaleableArea: toNumber(form.get('nonSaleableArea')),
      parkingCount: Math.round(toNumber(form.get('parkingCount'))),
      remark: String(form.get('remark') || '')
    }
  });

  const baseUrl = getBaseUrl(request);
  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/overview?saved=1`, 303);
}

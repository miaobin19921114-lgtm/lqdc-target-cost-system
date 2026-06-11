import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toNumber = (value: FormDataEntryValue | null) => Number(value || 0);

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

  return NextResponse.redirect(new URL(`/projects/${project.id}`, request.url));
}

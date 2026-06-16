import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function toNumber(form: FormData, name: string) {
  const value = Number(clean(form, name));
  return Number.isFinite(value) ? value : 0;
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

async function getOrCreateVersion(projectId: string) {
  const existing = await prisma.projectVersion.findFirst({ where: { projectId }, orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return prisma.projectVersion.create({ data: { projectId, name: '初始版本', status: 'draft' } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const version = await getOrCreateVersion(params.id);
  const rowCount = Math.max(0, Math.min(200, Number(form.get('rowCount') || 0)));
  let savedCount = 0;

  for (let index = 0; index < rowCount; index += 1) {
    const id = clean(form, `productId-${index}`);
    const name = clean(form, `name-${index}`);
    if (!name) continue;

    const data = {
      buildingArea: toNumber(form, `buildingArea-${index}`),
      capacityArea: toNumber(form, `capacityArea-${index}`),
      saleableArea: toNumber(form, `saleableArea-${index}`),
      nonSaleableArea: toNumber(form, `nonSaleableArea-${index}`),
      allocationWeight: toNumber(form, `allocationWeight-${index}`) || 1,
      isSaleable: form.get(`isSaleable-${index}`) === 'on',
      participateAllocation: form.get(`participateAllocation-${index}`) === 'on',
      remark: clean(form, `remark-${index}`)
    };

    const hasData = id || data.buildingArea || data.capacityArea || data.saleableArea || data.nonSaleableArea || data.remark;
    if (!hasData) continue;

    if (id) {
      const product = await prisma.productType.findFirst({ where: { id, projectVersionId: version.id, isActive: true } });
      if (!product) continue;
      await prisma.productType.update({ where: { id }, data: { name, ...data } });
    } else {
      const existing = await prisma.productType.findFirst({ where: { projectVersionId: version.id, name } });
      if (existing) {
        if (!existing.isActive) continue;
        await prisma.productType.update({ where: { id: existing.id }, data });
      } else {
        await prisma.productType.create({ data: { projectVersionId: version.id, name, ...data } });
      }
    }
    savedCount += 1;
  }

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/overview?productSaved=1&rows=${savedCount}`, 303);
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

async function getOrCreateVersion(projectId: string) {
  const existing = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });
  if (existing) return existing;
  return prisma.projectVersion.create({
    data: { projectId, name: '初始版本', status: 'draft' }
  });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const version = await getOrCreateVersion(params.id);
  const customName = String(form.get('customName') || '').trim();
  const name = customName || String(form.get('name') || '未命名业态').trim();
  const category = String(form.get('category') || form.get('customCategory') || '').trim();
  const returnPath = String(form.get('returnPath') || 'products');
  const existing = await prisma.productType.findFirst({ where: { projectVersionId: version.id, name } });
  const rawRemark = String(form.get('remark') || '');
  const remark = category && !rawRemark.includes('模板业态｜') ? `${rawRemark ? `${rawRemark}；` : ''}模板业态｜${category}` : rawRemark;

  const data: any = {
    buildingArea: toNumber(form, 'buildingArea'),
    saleableArea: toNumber(form, 'saleableArea'),
    capacityArea: toNumber(form, 'capacityArea'),
    nonSaleableArea: toNumber(form, 'nonSaleableArea'),
    isSaleable: form.get('isSaleable') === 'on',
    participateAllocation: form.get('participateAllocation') === 'on',
    allocationWeight: toNumber(form, 'allocationWeight') || 1,
    remark
  };

  if (form.has('salePrice')) data.salePrice = toNumber(form, 'salePrice');

  if (existing) {
    if (returnPath === 'overview' && form.get('mode') === 'create') {
      const baseUrl = getBaseUrl(request);
      return NextResponse.redirect(`${baseUrl}/projects/${params.id}/overview?productSaved=duplicate`, 303);
    }
    await prisma.productType.update({ where: { id: existing.id }, data });
  } else {
    await prisma.productType.create({ data: { projectVersionId: version.id, name, ...data } });
  }

  const baseUrl = getBaseUrl(request);
  const target = returnPath === 'overview' ? 'overview?productSaved=1' : 'products?saved=1';
  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${target}`, 303);
}

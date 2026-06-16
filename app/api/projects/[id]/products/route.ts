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

async function saveCustomProductToDefaultTemplate(input: { name: string; category: string; isSaleable: boolean; participateAllocation: boolean; allocationWeight: number; remark: string }) {
  const template = await prisma.template.findFirst({ where: { isDefault: true, isActive: true } });
  if (!template) return false;
  const last = await prisma.templateProduct.findFirst({
    where: { templateId: template.id, category: input.category || '其他' },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true }
  });
  const sortOrder = (last?.sortOrder ?? 0) + 1;
  await prisma.templateProduct.upsert({
    where: { templateId_name: { templateId: template.id, name: input.name } },
    update: {
      category: input.category || '其他',
      isSaleable: input.isSaleable,
      participateAllocation: input.participateAllocation,
      allocationWeight: input.allocationWeight || 1,
      remark: input.remark || '项目自定义业态沉淀'
    },
    create: {
      templateId: template.id,
      category: input.category || '其他',
      name: input.name,
      isSaleable: input.isSaleable,
      participateAllocation: input.participateAllocation,
      allocationWeight: input.allocationWeight || 1,
      sortOrder,
      remark: input.remark || '项目自定义业态沉淀'
    }
  });
  return true;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const version = await getOrCreateVersion(params.id);
  const customName = String(form.get('customName') || '').trim();
  const name = customName || String(form.get('name') || '未命名业态').trim();
  const category = String(form.get('category') || form.get('customCategory') || '').trim();
  const returnPath = String(form.get('returnPath') || 'products');
  const saveToTemplate = form.get('saveToTemplate') === 'on';
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

  const templateSaved = customName && saveToTemplate ? await saveCustomProductToDefaultTemplate({ name, category, ...data }) : false;

  if (existing) {
    if (form.get('mode') === 'create') {
      const baseUrl = getBaseUrl(request);
      const duplicateTarget = returnPath === 'product-maintenance' ? `product-maintenance?duplicate=1${templateSaved ? '&templateSaved=1' : ''}` : returnPath === 'overview' ? `overview?productSaved=duplicate${templateSaved ? '&templateSaved=1' : ''}` : `products?duplicate=1${templateSaved ? '&templateSaved=1' : ''}`;
      return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${duplicateTarget}`, 303);
    }
    await prisma.productType.update({ where: { id: existing.id }, data });
  } else {
    await prisma.productType.create({ data: { projectVersionId: version.id, name, ...data } });
  }

  const baseUrl = getBaseUrl(request);
  const templateParam = templateSaved ? '&templateSaved=1' : '';
  const target = returnPath === 'product-maintenance' ? `product-maintenance?saved=1${templateParam}` : returnPath === 'overview' ? `overview?productSaved=1${templateParam}` : `products?saved=1${templateParam}`;
  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${target}`, 303);
}

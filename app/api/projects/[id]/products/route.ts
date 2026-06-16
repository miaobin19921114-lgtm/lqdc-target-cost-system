import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateActiveVersion } from '@/lib/project-version';

const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  const found = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
}

async function copyDefaultTemplateToUser(userId: string) {
  const source = await prisma.template.findFirst({
    where: { isDefault: true, isActive: true, ownerId: null },
    include: { products: true, costRules: true, taxRules: true }
  });
  if (!source) return null;
  const existing = await prisma.template.findFirst({ where: { ownerId: userId, baseTemplateId: source.id } });
  if (existing) return existing;
  return prisma.template.create({
    data: {
      ownerId: userId,
      baseTemplateId: source.id,
      name: `${source.name}（我的模板）`,
      type: source.type,
      description: `个人模板，来源：${source.name}`,
      isDefault: false,
      isActive: true,
      sortOrder: source.sortOrder,
      products: { create: source.products.map((item) => ({ category: item.category, name: item.name, isSaleable: item.isSaleable, participateAllocation: item.participateAllocation, allocationWeight: item.allocationWeight, sortOrder: item.sortOrder, remark: item.remark, isActive: item.isActive, disabledAt: item.disabledAt })) },
      costRules: { create: source.costRules.map((item) => ({ costCode: item.costCode, category: item.category, subjectName: item.subjectName, sourceTable: item.sourceTable, measureBasis: item.measureBasis, unit: item.unit, defaultTaxRate: item.defaultTaxRate, allocationMethod: item.allocationMethod, sortOrder: item.sortOrder, remark: item.remark })) },
      taxRules: { create: source.taxRules.map((item) => ({ name: item.name, rate: item.rate, scope: item.scope, remark: item.remark, sortOrder: item.sortOrder })) }
    }
  });
}

async function saveCustomProductToPersonalTemplate(request: Request, input: { name: string; category: string; isSaleable: boolean; participateAllocation: boolean; allocationWeight: number; remark: string }) {
  const userId = cookieValue(request, 'lqdc_session');
  if (!userId) return false;
  const template = await copyDefaultTemplateToUser(userId);
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
      remark: input.remark || '项目自定义业态沉淀',
      isActive: true,
      disabledAt: null
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
  const version = await getOrCreateActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/overview?productSaved=0`, 303);

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

  const templateSaved = customName && saveToTemplate ? await saveCustomProductToPersonalTemplate(request, { name, category, ...data }) : false;

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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const clean = (form: FormData, name: string) => String(form.get(name) || '').trim();
const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function redirectTo(request: Request, flag: string) {
  return NextResponse.redirect(`${getBaseUrl(request)}/templates?${flag}=1`, 303);
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  const found = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
}

function currentUserId(request: Request) {
  return cookieValue(request, 'lqdc_session');
}

async function nextSortOrder(templateId: string, category: string) {
  const last = await prisma.templateProduct.findFirst({
    where: { templateId, category },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true }
  });
  return (last?.sortOrder || 0) + 1;
}

function getAction(form: FormData) {
  const actions = form.getAll('action').map((item) => String(item || '').trim()).filter(Boolean);
  return actions[actions.length - 1] || '';
}

async function copyTemplateToUser(templateId: string, userId: string) {
  const source = await prisma.template.findUnique({
    where: { id: templateId },
    include: { products: true, costRules: true, taxRules: true }
  });
  if (!source) return null;
  if (source.ownerId === userId) return source;
  const baseTemplateId = source.baseTemplateId || source.id;
  const existing = await prisma.template.findFirst({
    where: { ownerId: userId, baseTemplateId }
  });
  if (existing) return existing;
  return prisma.template.create({
    data: {
      ownerId: userId,
      baseTemplateId,
      name: `${source.name}（我的模板）`,
      type: source.type,
      description: `个人模板，来源：${source.name}`,
      isDefault: false,
      isActive: true,
      sortOrder: source.sortOrder,
      products: {
        create: source.products.map((item) => ({
          category: item.category,
          name: item.name,
          isSaleable: item.isSaleable,
          participateAllocation: item.participateAllocation,
          allocationWeight: item.allocationWeight,
          sortOrder: item.sortOrder,
          remark: item.remark,
          isActive: item.isActive,
          disabledAt: item.disabledAt
        }))
      },
      costRules: {
        create: source.costRules.map((item) => ({
          costCode: item.costCode,
          category: item.category,
          subjectName: item.subjectName,
          sourceTable: item.sourceTable,
          measureBasis: item.measureBasis,
          unit: item.unit,
          defaultTaxRate: item.defaultTaxRate,
          allocationMethod: item.allocationMethod,
          sortOrder: item.sortOrder,
          remark: item.remark
        }))
      },
      taxRules: {
        create: source.taxRules.map((item) => ({
          name: item.name,
          rate: item.rate,
          scope: item.scope,
          remark: item.remark,
          sortOrder: item.sortOrder
        }))
      }
    }
  });
}

async function editableTemplate(templateId: string, request: Request) {
  const userId = currentUserId(request);
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template || !userId) return null;
  if (template.ownerId === userId) return template;
  if (!template.ownerId) return copyTemplateToUser(template.id, userId);
  return null;
}

async function editableProduct(productId: string, request: Request) {
  const userId = currentUserId(request);
  const product = await prisma.templateProduct.findUnique({ where: { id: productId }, include: { template: true } });
  if (!product || !userId) return null;
  if (product.template.ownerId === userId) return product;
  if (!product.template.ownerId) {
    const copied = await copyTemplateToUser(product.templateId, userId);
    if (!copied) return null;
    return prisma.templateProduct.findUnique({ where: { templateId_name: { templateId: copied.id, name: product.name } }, include: { template: true } });
  }
  return null;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const action = getAction(form);
  const templateId = clean(form, 'templateId');
  const productId = clean(form, 'productId');

  if (action === 'copy') {
    const userId = currentUserId(request);
    if (!templateId || !userId) return redirectTo(request, 'missing');
    const copied = await copyTemplateToUser(templateId, userId);
    return copied ? redirectTo(request, 'personalTemplate') : redirectTo(request, 'missing');
  }

  if (action === 'create') {
    const name = clean(form, 'name');
    const category = clean(form, 'category') || '其他';
    const template = await editableTemplate(templateId, request);
    if (!template || !name) return redirectTo(request, 'missing');
    const sortOrder = toNumber(form, 'sortOrder') || await nextSortOrder(template.id, category);
    await prisma.templateProduct.upsert({
      where: { templateId_name: { templateId: template.id, name } },
      update: {
        category,
        isSaleable: form.get('isSaleable') === 'on',
        participateAllocation: form.get('participateAllocation') === 'on',
        allocationWeight: toNumber(form, 'allocationWeight') || 1,
        sortOrder,
        remark: clean(form, 'remark') || null,
        isActive: true,
        disabledAt: null
      },
      create: {
        templateId: template.id,
        name,
        category,
        isSaleable: form.get('isSaleable') === 'on',
        participateAllocation: form.get('participateAllocation') === 'on',
        allocationWeight: toNumber(form, 'allocationWeight') || 1,
        sortOrder,
        remark: clean(form, 'remark') || null
      }
    });
    return redirectTo(request, template.id === templateId ? 'productSaved' : 'personalTemplate');
  }

  const product = productId ? await editableProduct(productId, request) : null;
  if (!product) return redirectTo(request, 'missing');

  if (action === 'update') {
    const name = clean(form, 'name');
    const category = clean(form, 'category') || '其他';
    if (!name) return redirectTo(request, 'missing');
    try {
      await prisma.templateProduct.update({
        where: { id: product.id },
        data: {
          name,
          category,
          isSaleable: form.get('isSaleable') === 'on',
          participateAllocation: form.get('participateAllocation') === 'on',
          allocationWeight: toNumber(form, 'allocationWeight') || 1,
          sortOrder: toNumber(form, 'sortOrder') || product.sortOrder,
          remark: clean(form, 'remark') || null
        }
      });
      return redirectTo(request, 'productUpdated');
    } catch {
      return redirectTo(request, 'duplicate');
    }
  }

  if (action === 'disable') {
    await prisma.templateProduct.update({ where: { id: product.id }, data: { isActive: false, disabledAt: new Date() } });
    return redirectTo(request, 'productDisabled');
  }

  if (action === 'restore') {
    await prisma.templateProduct.update({ where: { id: product.id }, data: { isActive: true, disabledAt: null } });
    return redirectTo(request, 'productRestored');
  }

  if (action === 'delete') {
    await prisma.templateProduct.delete({ where: { id: product.id } });
    return redirectTo(request, 'productDeleted');
  }

  return redirectTo(request, 'unknown');
}

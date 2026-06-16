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

async function nextSortOrder(templateId: string, category: string) {
  const last = await prisma.templateProduct.findFirst({
    where: { templateId, category },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true }
  });
  return (last?.sortOrder || 0) + 1;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const action = clean(form, 'action');
  const templateId = clean(form, 'templateId');
  const productId = clean(form, 'productId');

  if (action === 'create') {
    const name = clean(form, 'name');
    const category = clean(form, 'category') || '其他';
    if (!templateId || !name) return redirectTo(request, 'missing');
    const sortOrder = toNumber(form, 'sortOrder') || await nextSortOrder(templateId, category);
    await prisma.templateProduct.upsert({
      where: { templateId_name: { templateId, name } },
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
        templateId,
        name,
        category,
        isSaleable: form.get('isSaleable') === 'on',
        participateAllocation: form.get('participateAllocation') === 'on',
        allocationWeight: toNumber(form, 'allocationWeight') || 1,
        sortOrder,
        remark: clean(form, 'remark') || null
      }
    });
    return redirectTo(request, 'productSaved');
  }

  const product = productId ? await prisma.templateProduct.findUnique({ where: { id: productId } }) : null;
  if (!product) return redirectTo(request, 'missing');

  if (action === 'update') {
    const name = clean(form, 'name');
    const category = clean(form, 'category') || '其他';
    if (!name) return redirectTo(request, 'missing');
    try {
      await prisma.templateProduct.update({
        where: { id: productId },
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
    await prisma.templateProduct.update({ where: { id: productId }, data: { isActive: false, disabledAt: new Date() } });
    return redirectTo(request, 'productDisabled');
  }

  if (action === 'restore') {
    await prisma.templateProduct.update({ where: { id: productId }, data: { isActive: true, disabledAt: null } });
    return redirectTo(request, 'productRestored');
  }

  if (action === 'delete') {
    await prisma.templateProduct.delete({ where: { id: productId } });
    return redirectTo(request, 'productDeleted');
  }

  return redirectTo(request, 'unknown');
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const clean = (form: FormData, name: string) => String(form.get(name) || '').trim();

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  const found = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
}

function redirectTo(request: Request, flag: string) {
  return NextResponse.redirect(`${getBaseUrl(request)}/templates?${flag}=1`, 303);
}

function copyName(name: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${name}（副本 ${stamp}）`;
}

async function copyTemplate(sourceId: string, userId: string, newName?: string) {
  const source = await prisma.template.findFirst({
    where: { id: sourceId, OR: [{ ownerId: null }, { ownerId: userId }] },
    include: { products: true, costRules: true, taxRules: true }
  });
  if (!source) return null;
  const baseTemplateId = source.baseTemplateId || source.id;
  return prisma.template.create({
    data: {
      ownerId: userId,
      baseTemplateId,
      sourceProjectId: source.sourceProjectId,
      sourceProjectName: source.sourceProjectName,
      name: newName || copyName(source.name),
      type: source.type,
      description: source.ownerId ? `个人模板副本，来源：${source.name}` : `个人模板，来源：${source.name}`,
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

export async function POST(request: Request) {
  const userId = cookieValue(request, 'lqdc_session');
  if (!userId) return redirectTo(request, 'missing');
  const form = await request.formData();
  const action = clean(form, 'action');
  const templateId = clean(form, 'templateId');

  if (action === 'copy') {
    if (!templateId) return redirectTo(request, 'missing');
    const copied = await copyTemplate(templateId, userId, clean(form, 'newName') || undefined);
    return copied ? redirectTo(request, 'templateCopied') : redirectTo(request, 'missing');
  }

  const template = templateId ? await prisma.template.findFirst({ where: { id: templateId, ownerId: userId } }) : null;
  if (!template) return redirectTo(request, 'systemTemplateReadonly');

  if (action === 'setDefault') {
    await prisma.$transaction([
      prisma.template.updateMany({ where: { ownerId: userId }, data: { isDefault: false } }),
      prisma.template.update({ where: { id: template.id }, data: { isDefault: true } })
    ]);
    return redirectTo(request, 'templateDefaulted');
  }

  if (action === 'rename') {
    const name = clean(form, 'name');
    if (!name) return redirectTo(request, 'missing');
    await prisma.template.update({
      where: { id: template.id },
      data: {
        name,
        type: clean(form, 'type') || template.type,
        description: clean(form, 'description') || null
      }
    });
    return redirectTo(request, 'templateRenamed');
  }

  if (action === 'delete') {
    await prisma.template.delete({ where: { id: template.id } });
    return redirectTo(request, 'templateDeleted');
  }

  return redirectTo(request, 'unknown');
}

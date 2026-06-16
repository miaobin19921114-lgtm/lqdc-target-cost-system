import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const clean = (form: FormData, name: string) => String(form.get(name) || '').trim();
const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);

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

function redirectTo(request: Request, templateId: string, flag: string) {
  return NextResponse.redirect(`${getBaseUrl(request)}/templates/${templateId}/rules?${flag}=1`, 303);
}

function backToTemplates(request: Request, flag: string) {
  return NextResponse.redirect(`${getBaseUrl(request)}/templates?${flag}=1`, 303);
}

function taxRateFrom(raw: string, fallback = 0.09) {
  if (!raw) return fallback;
  const num = Number(raw.replace('%', ''));
  if (!Number.isFinite(num)) return fallback;
  return raw.includes('%') || num > 1 ? num / 100 : num;
}

async function copyTemplateToUser(templateId: string, userId: string) {
  const source = await prisma.template.findUnique({ where: { id: templateId }, include: { products: true, costRules: true, taxRules: true } });
  if (!source || !userId) return null;
  if (source.ownerId === userId) return source;
  const baseTemplateId = source.baseTemplateId || source.id;
  const existing = await prisma.template.findFirst({ where: { ownerId: userId, baseTemplateId } });
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
      products: { create: source.products.map((item) => ({ category: item.category, name: item.name, isSaleable: item.isSaleable, participateAllocation: item.participateAllocation, allocationWeight: item.allocationWeight, sortOrder: item.sortOrder, remark: item.remark, isActive: item.isActive, disabledAt: item.disabledAt })) },
      costRules: { create: source.costRules.map((item) => ({ costCode: item.costCode, category: item.category, subjectName: item.subjectName, sourceTable: item.sourceTable, measureBasis: item.measureBasis, unit: item.unit, defaultTaxRate: item.defaultTaxRate, allocationMethod: item.allocationMethod, sortOrder: item.sortOrder, remark: item.remark })) },
      taxRules: { create: source.taxRules.map((item) => ({ name: item.name, rate: item.rate, scope: item.scope, remark: item.remark, sortOrder: item.sortOrder })) }
    }
  });
}

async function editableTemplate(templateId: string, request: Request) {
  const userId = cookieValue(request, 'lqdc_session');
  if (!userId || !templateId) return null;
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) return null;
  if (template.ownerId === userId) return template;
  if (!template.ownerId) return copyTemplateToUser(template.id, userId);
  return null;
}

async function editableRule(ruleId: string, request: Request) {
  const userId = cookieValue(request, 'lqdc_session');
  if (!userId || !ruleId) return null;
  const rule = await prisma.templateCostRule.findUnique({ where: { id: ruleId }, include: { template: true } });
  if (!rule) return null;
  if (rule.template.ownerId === userId) return rule;
  if (!rule.template.ownerId) {
    const copied = await copyTemplateToUser(rule.templateId, userId);
    if (!copied) return null;
    return prisma.templateCostRule.findFirst({ where: { templateId: copied.id, costCode: rule.costCode, subjectName: rule.subjectName }, include: { template: true } });
  }
  return null;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const action = clean(form, 'action');
  const templateId = clean(form, 'templateId');
  const ruleId = clean(form, 'ruleId');

  if (action === 'create') {
    const template = await editableTemplate(templateId, request);
    if (!template) return backToTemplates(request, 'missing');
    const data = {
      costCode: clean(form, 'costCode') || null,
      category: clean(form, 'category') || null,
      subjectName: clean(form, 'subjectName') || '未命名科目',
      sourceTable: clean(form, 'sourceTable') || null,
      measureBasis: clean(form, 'measureBasis') || null,
      unit: clean(form, 'unit') || null,
      defaultTaxRate: taxRateFrom(clean(form, 'defaultTaxRate'), 0.09),
      allocationMethod: clean(form, 'allocationMethod') || null,
      sortOrder: toNumber(form, 'sortOrder') || 0,
      remark: clean(form, 'remark') || null
    };
    await prisma.templateCostRule.create({ data: { templateId: template.id, ...data } });
    return redirectTo(request, template.id, template.id === templateId ? 'costRuleSaved' : 'personalTemplate');
  }

  const rule = await editableRule(ruleId, request);
  if (!rule) return backToTemplates(request, 'missing');

  if (action === 'update') {
    await prisma.templateCostRule.update({
      where: { id: rule.id },
      data: {
        costCode: clean(form, 'costCode') || null,
        category: clean(form, 'category') || null,
        subjectName: clean(form, 'subjectName') || rule.subjectName,
        sourceTable: clean(form, 'sourceTable') || null,
        measureBasis: clean(form, 'measureBasis') || null,
        unit: clean(form, 'unit') || null,
        defaultTaxRate: taxRateFrom(clean(form, 'defaultTaxRate'), Number(rule.defaultTaxRate || 0.09)),
        allocationMethod: clean(form, 'allocationMethod') || null,
        sortOrder: toNumber(form, 'sortOrder') || rule.sortOrder,
        remark: clean(form, 'remark') || null
      }
    });
    return redirectTo(request, rule.templateId, 'costRuleUpdated');
  }

  if (action === 'delete') {
    await prisma.templateCostRule.delete({ where: { id: rule.id } });
    return redirectTo(request, rule.templateId, 'costRuleDeleted');
  }

  return redirectTo(request, rule.templateId, 'unknown');
}

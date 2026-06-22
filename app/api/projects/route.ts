import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { defaultVersionStage, normalizeVersionStage } from '@/lib/version-stage';
import { parseTemplateAllocationRules, writeTemplateAllocationRemark } from '@/lib/template-allocation-rules';

const toNumber = (value: FormDataEntryValue | null) => Number(value || 0);

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

function rateByName(taxRules: { name: string; rate: any }[], keyword: string, fallback: number) {
  const row = taxRules.find((item) => item.name.includes(keyword));
  return row ? Number(row.rate) : fallback;
}

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  const found = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
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
      sourceProjectId: source.sourceProjectId,
      sourceProjectName: source.sourceProjectName,
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

async function saveCustomProductToPersonalTemplate(request: Request, input: { templateId: string; name: string; category: string; isSaleable: boolean; participateAllocation: boolean }) {
  if (!input.templateId || !input.name) return;
  const userId = cookieValue(request, 'lqdc_session');
  if (!userId) return;
  const template = await copyTemplateToUser(input.templateId, userId);
  if (!template) return;
  const last = await prisma.templateProduct.findFirst({
    where: { templateId: template.id, category: input.category || '其他' },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true }
  });
  await prisma.templateProduct.upsert({
    where: { templateId_name: { templateId: template.id, name: input.name } },
    update: {
      category: input.category || '其他',
      isSaleable: input.isSaleable,
      participateAllocation: input.participateAllocation,
      allocationWeight: 1,
      remark: '项目初始化自定义业态沉淀',
      isActive: true,
      disabledAt: null
    },
    create: {
      templateId: template.id,
      category: input.category || '其他',
      name: input.name,
      isSaleable: input.isSaleable,
      participateAllocation: input.participateAllocation,
      allocationWeight: 1,
      sortOrder: (last?.sortOrder || 0) + 1,
      remark: '项目初始化自定义业态沉淀'
    }
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const templateId = String(form.get('templateId') || '');
  const selectedIds = form.getAll('templateProductIds').map((item) => String(item));
  const selectedCostRuleIds = form.getAll('costRuleIds').map((item) => String(item));
  const stage = normalizeVersionStage(clean(form, 'stage') || defaultVersionStage);
  const customProductName = String(form.get('customProductName') || '').trim();
  const customCategory = String(form.get('customCategory') || '').trim();
  const template = templateId ? await prisma.template.findUnique({
    where: { id: templateId },
    include: { products: true, costRules: true, taxRules: true }
  }) : null;
  const selectedProducts = template?.products.filter((item) => item.isActive && selectedIds.includes(item.id)) || [];
  const selectedCostRules = template?.costRules.filter((item) => selectedCostRuleIds.includes(item.id)) || [];
  const taxRules = template?.taxRules || [];
  const productCreates = selectedProducts.map((item) => ({
    name: item.name,
    isSaleable: item.isSaleable,
    participateAllocation: item.participateAllocation,
    allocationWeight: Number(item.allocationWeight || 1),
    remark: item.remark || ''
  }));
  const projectCostRuleCreates = selectedCostRules.map((rule) => {
    const parsed = parseTemplateAllocationRules(rule.allocationMethod, rule.remark);
    const operating = clean(form, `costRuleAllocationMethod-${rule.id}`) || parsed.operatingAllocationMethod || rule.allocationMethod || '按建筑面积占比';
    return {
      costCode: rule.costCode,
      category: rule.category,
      subjectName: rule.subjectName,
      sourceTable: rule.sourceTable,
      measureBasis: rule.measureBasis,
      unit: rule.unit,
      defaultTaxRate: toNumber(form.get(`costRuleTaxRate-${rule.id}`)) || Number(rule.defaultTaxRate || 0.09),
      allocationMethod: operating,
      sortOrder: rule.sortOrder,
      remark: writeTemplateAllocationRemark(rule.remark, {
        operatingAllocationMethod: operating,
        landVatAllocationMethod: parsed.landVatAllocationMethod,
        incomeTaxAllocationMethod: parsed.incomeTaxAllocationMethod
      })
    };
  });
  if (customProductName) {
    const customIsSaleable = form.get('customIsSaleable') === 'on';
    const customParticipateAllocation = form.get('customParticipateAllocation') === 'on';
    productCreates.push({
      name: customProductName,
      isSaleable: customIsSaleable,
      participateAllocation: customParticipateAllocation,
      allocationWeight: 1,
      remark: customCategory ? `模板业态｜${customCategory}` : '自定义业态'
    });
    if (form.get('saveToTemplate') === 'on') {
      await saveCustomProductToPersonalTemplate(request, { templateId, name: customProductName, category: customCategory || '其他', isSaleable: customIsSaleable, participateAllocation: customParticipateAllocation });
    }
  }

  const project = await prisma.project.create({
    data: {
      sourceTemplateId: template?.id || null,
      sourceTemplateName: template?.name || null,
      sourceTemplateType: template ? (template.ownerId ? '个人模板' : '系统模板') : null,
      name: String(form.get('name') || '未命名项目'),
      city: String(form.get('city') || ''),
      district: String(form.get('district') || ''),
      landArea: toNumber(form.get('landArea')),
      plotRatio: toNumber(form.get('plotRatio')),
      totalBuildingArea: toNumber(form.get('totalBuildingArea')),
      saleableArea: toNumber(form.get('saleableArea')),
      parkingCount: Math.round(toNumber(form.get('parkingCount'))),
      remark: String(form.get('remark') || ''),
      versions: {
        create: {
          name: '初始版本',
          stage,
          status: 'draft',
          products: { create: productCreates },
          costRules: { create: projectCostRuleCreates },
          taxes: {
            create: {
              vatRate: rateByName(taxRules, '增值税', 0.09),
              urbanMaintenanceTaxRate: rateByName(taxRules, '城建税', 0.07),
              educationSurchargeRate: rateByName(taxRules, '教育费附加', 0.03),
              localEducationSurchargeRate: rateByName(taxRules, '地方教育附加', 0.02),
              incomeTaxRate: rateByName(taxRules, '企业所得税', 0.25),
              landVatPrepayRate: rateByName(taxRules, '土地增值税', 0),
              landVatClearanceMode: '预缴+清算测算',
              incomeTaxMode: '项目口径测算'
            }
          }
        }
      }
    },
    include: { versions: { orderBy: { createdAt: 'asc' } } }
  });

  const firstVersion = project.versions[0];
  if (firstVersion) await prisma.project.update({ where: { id: project.id }, data: { activeVersionId: firstVersion.id } });

  const baseUrl = getBaseUrl(request);
  return NextResponse.redirect(`${baseUrl}/projects/${project.id}/overview`, 303);
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function POST(request: Request) {
  const form = await request.formData();
  const templateId = String(form.get('templateId') || '');
  const selectedIds = form.getAll('templateProductIds').map((item) => String(item));
  const selectedCostRuleIds = form.getAll('costRuleIds').map((item) => String(item));
  const stage = clean(form, 'stage') || '投拓阶段';
  const customProductName = String(form.get('customProductName') || '').trim();
  const customCategory = String(form.get('customCategory') || '').trim();
  const template = templateId ? await prisma.template.findUnique({
    where: { id: templateId },
    include: { products: true, costRules: true, taxRules: true }
  }) : null;
  const selectedProducts = template?.products.filter((item) => selectedIds.includes(item.id)) || [];
  const selectedCostRules = template?.costRules.filter((item) => selectedCostRuleIds.includes(item.id)) || [];
  const taxRules = template?.taxRules || [];
  const productCreates = selectedProducts.map((item) => ({
    name: item.name,
    isSaleable: item.isSaleable,
    participateAllocation: item.participateAllocation,
    allocationWeight: Number(item.allocationWeight || 1),
    remark: item.remark || ''
  }));
  const projectCostRuleCreates = selectedCostRules.map((rule) => ({
    costCode: rule.costCode,
    category: rule.category,
    subjectName: rule.subjectName,
    sourceTable: rule.sourceTable,
    measureBasis: rule.measureBasis,
    unit: rule.unit,
    defaultTaxRate: toNumber(form.get(`costRuleTaxRate-${rule.id}`)) || Number(rule.defaultTaxRate || 0.09),
    allocationMethod: clean(form, `costRuleAllocationMethod-${rule.id}`) || rule.allocationMethod || '建筑面积分摊',
    sortOrder: rule.sortOrder,
    remark: rule.remark
  }));
  if (customProductName) {
    productCreates.push({
      name: customProductName,
      isSaleable: form.get('customIsSaleable') === 'on',
      participateAllocation: form.get('customParticipateAllocation') === 'on',
      allocationWeight: 1,
      remark: customCategory ? `模板业态｜${customCategory}` : '自定义业态'
    });
  }

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
              urbanMaintenanceRate: rateByName(taxRules, '城建税', 0.07),
              educationSurchargeRate: rateByName(taxRules, '教育费附加', 0.03),
              localEducationSurchargeRate: rateByName(taxRules, '地方教育附加', 0.02),
              corporateIncomeTaxRate: rateByName(taxRules, '企业所得税', 0.25),
              landValueAddedTaxRate: rateByName(taxRules, '土地增值税', 0),
              remark: template ? `来自模板：${template.name}；阶段：${stage}` : `阶段：${stage}`
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

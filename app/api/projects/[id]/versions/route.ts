import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function redirectTo(request: Request, projectId: string, result: string) {
  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${projectId}/versions?${result}=1`, 303);
}

async function copyVersion(projectId: string, sourceVersionId: string, name: string, stage: string, copyCosts: boolean) {
  const source = await prisma.projectVersion.findFirst({
    where: { id: sourceVersionId, projectId },
    include: { products: true, costRules: true, taxes: true, revenues: true, costs: true }
  });
  if (!source) return null;

  const target = await prisma.projectVersion.create({ data: { projectId, name, stage, status: 'draft' } });
  const productIdMap = new Map<string, string>();

  for (const product of source.products) {
    const created = await prisma.productType.create({
      data: {
        projectVersionId: target.id,
        name: product.name,
        buildingArea: product.buildingArea,
        saleableArea: product.saleableArea,
        capacityArea: product.capacityArea,
        nonSaleableArea: product.nonSaleableArea,
        salePrice: product.salePrice,
        isSaleable: product.isSaleable,
        participateAllocation: product.participateAllocation,
        allocationWeight: product.allocationWeight,
        isActive: product.isActive,
        disabledAt: product.disabledAt,
        remark: product.remark
      }
    });
    productIdMap.set(product.id, created.id);
  }

  for (const rule of source.costRules) {
    await prisma.projectCostRule.create({
      data: {
        projectVersionId: target.id,
        costCode: rule.costCode,
        category: rule.category,
        subjectName: rule.subjectName,
        sourceTable: rule.sourceTable,
        measureBasis: rule.measureBasis,
        unit: rule.unit,
        defaultTaxRate: rule.defaultTaxRate,
        allocationMethod: rule.allocationMethod,
        sortOrder: rule.sortOrder,
        remark: rule.remark
      }
    });
  }

  if (source.taxes) {
    await prisma.taxParameter.create({
      data: {
        projectVersionId: target.id,
        vatRate: source.taxes.vatRate,
        urbanMaintenanceRate: source.taxes.urbanMaintenanceRate,
        educationSurchargeRate: source.taxes.educationSurchargeRate,
        localEducationSurchargeRate: source.taxes.localEducationSurchargeRate,
        corporateIncomeTaxRate: source.taxes.corporateIncomeTaxRate,
        landValueAddedTaxRate: source.taxes.landValueAddedTaxRate,
        remark: source.taxes.remark
      }
    });
  }

  for (const revenue of source.revenues) {
    const mappedProductId = productIdMap.get(revenue.productTypeId);
    if (!mappedProductId) continue;
    await prisma.revenueLine.create({
      data: {
        projectVersionId: target.id,
        productTypeId: mappedProductId,
        saleableArea: revenue.saleableArea,
        salePrice: revenue.salePrice,
        taxRate: revenue.taxRate,
        taxInclusiveRevenue: revenue.taxInclusiveRevenue,
        taxExclusiveRevenue: revenue.taxExclusiveRevenue,
        taxAmount: revenue.taxAmount,
        remark: revenue.remark
      }
    });
  }

  if (copyCosts) {
    for (const cost of source.costs) {
      const mappedProductId = cost.productTypeId ? productIdMap.get(cost.productTypeId) : null;
      await prisma.costLine.create({
        data: {
          projectVersionId: target.id,
          costSubjectId: cost.costSubjectId,
          productTypeId: mappedProductId || null,
          detailName: cost.detailName,
          regionOrProductType: cost.regionOrProductType,
          professionalGroup: cost.professionalGroup,
          measureBasis: cost.measureBasis,
          quantity: cost.quantity,
          unit: cost.unit,
          taxExclusiveUnitPrice: cost.taxExclusiveUnitPrice,
          taxInclusiveUnitPrice: cost.taxInclusiveUnitPrice,
          taxRate: cost.taxRate,
          taxExclusiveAmount: cost.taxExclusiveAmount,
          taxAmount: cost.taxAmount,
          taxInclusiveAmount: cost.taxInclusiveAmount,
          allocationMethod: cost.allocationMethod,
          isDirectAssigned: cost.isDirectAssigned,
          description: cost.description,
          remark: cost.remark,
          sortOrder: cost.sortOrder
        }
      });
    }
  }

  return target;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const action = clean(form, 'action') || 'copy';
  const project = await prisma.project.findUnique({ where: { id: params.id }, include: { versions: { orderBy: { createdAt: 'asc' } } } });
  if (!project) return redirectTo(request, params.id, 'missing');

  if (action === 'set-active') {
    const versionId = clean(form, 'versionId');
    const version = project.versions.find((item) => item.id === versionId);
    if (!version) return redirectTo(request, params.id, 'missing');
    await prisma.project.update({ where: { id: params.id }, data: { activeVersionId: version.id } });
    return redirectTo(request, params.id, 'active');
  }

  if (action === 'lock' || action === 'unlock') {
    const versionId = clean(form, 'versionId');
    const version = project.versions.find((item) => item.id === versionId);
    if (!version) return redirectTo(request, params.id, 'missing');
    await prisma.projectVersion.update({
      where: { id: version.id },
      data: { status: action === 'lock' ? 'locked' : 'draft' }
    });
    return redirectTo(request, params.id, action === 'lock' ? 'locked' : 'unlocked');
  }

  if (action === 'delete') {
    const versionId = clean(form, 'versionId');
    if (project.versions.length <= 1) return redirectTo(request, params.id, 'cannotDelete');
    const version = project.versions.find((item) => item.id === versionId);
    if (!version) return redirectTo(request, params.id, 'missing');
    if (version.status === 'locked' || version.status === 'final') return redirectTo(request, params.id, 'lockedDelete');
    await prisma.projectVersion.delete({ where: { id: version.id } });
    if (project.activeVersionId === version.id || !project.activeVersionId) {
      const fallback = project.versions.find((item) => item.id !== version.id);
      await prisma.project.update({ where: { id: params.id }, data: { activeVersionId: fallback?.id || null } });
    }
    return redirectTo(request, params.id, 'deleted');
  }

  const name = clean(form, 'name') || '新测算版本';
  const stage = clean(form, 'stage') || '投拓阶段';
  const sourceVersionId = clean(form, 'sourceVersionId') || project.activeVersionId || project.versions[0]?.id || '';
  const copyCosts = form.get('copyCosts') === 'on';

  if (!sourceVersionId) {
    const created = await prisma.projectVersion.create({ data: { projectId: params.id, name, stage, status: 'draft' } });
    await prisma.project.update({ where: { id: params.id }, data: { activeVersionId: created.id } });
    return redirectTo(request, params.id, 'created');
  }

  const created = await copyVersion(params.id, sourceVersionId, name, stage, copyCosts);
  if (!created) return redirectTo(request, params.id, 'missing');
  await prisma.project.update({ where: { id: params.id }, data: { activeVersionId: created.id } });
  return redirectTo(request, params.id, 'cloned');
}

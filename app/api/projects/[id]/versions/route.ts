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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const name = clean(form, 'name') || '新测算版本';
  const stage = clean(form, 'stage') || '投拓阶段';
  const sourceVersionId = clean(form, 'sourceVersionId');
  const copyCosts = form.get('copyCosts') === 'on';

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!project) return redirectTo(request, params.id, 'missing');

  if (!sourceVersionId) {
    await prisma.projectVersion.create({ data: { projectId: params.id, name, stage, status: 'draft' } });
    return redirectTo(request, params.id, 'created');
  }

  const source = await prisma.projectVersion.findFirst({
    where: { id: sourceVersionId, projectId: params.id },
    include: {
      products: true,
      costRules: true,
      taxes: true,
      revenues: true,
      costs: true
    }
  });
  if (!source) return redirectTo(request, params.id, 'missing');

  const target = await prisma.projectVersion.create({
    data: { projectId: params.id, name, stage, status: 'draft' }
  });

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
        isActive: rule.isActive,
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

  return redirectTo(request, params.id, 'cloned');
}

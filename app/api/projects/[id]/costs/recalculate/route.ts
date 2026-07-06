import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { calculateRuleDrivenQuantity } from '@/lib/rule-driven-quantity';
import { recommendPriceIndicator } from '@/lib/price-indicator-matcher';
import { costLineQuantityPatch } from '@/lib/cost-line-quantity-fields';

function toNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value && typeof value === 'object' && 'toString' in value) return Number(value.toString()) || 0;
  return Number(value || 0) || 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calc(quantity: number, taxInclusiveUnitPrice: number, taxRate: number) {
  const taxInclusiveAmount = round2((quantity * taxInclusiveUnitPrice) / 10000);
  const taxExclusiveAmount = round2(taxInclusiveAmount / (1 + taxRate));
  const taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
  const taxExclusiveUnitPrice = taxInclusiveUnitPrice ? round2(taxInclusiveUnitPrice / (1 + taxRate)) : 0;
  return { taxInclusiveAmount, taxExclusiveAmount, taxAmount, taxExclusiveUnitPrice };
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function productName(productType: unknown) {
  const record = productType as Record<string, unknown> | null | undefined;
  return String(record?.name || record?.productType || record?.productName || record?.typeName || '');
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const baseUrl = getBaseUrl(request);
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs-batch?recalculated=0`, 303);
  if (locked) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs-batch?locked=1`, 303);

  const lines = await prisma.costLine.findMany({
    where: { projectVersionId: version.id },
    include: { costSubject: true, productType: true },
    orderBy: { sortOrder: 'asc' }
  });

  let updatedRows = 0;
  let ruleRows = 0;
  let priceRows = 0;
  let amountRows = 0;

  for (const line of lines) {
    const code = line.costSubject?.code || '';
    if (!code) continue;

    let measureValue = toNumber(line.measureValue);
    let coefficient = toNumber(line.coefficient) || 1;
    let quantity = toNumber(line.quantity);
    let unit = line.unit || line.costSubject?.defaultUnit || '项';
    let taxInclusiveUnitPrice = toNumber(line.taxInclusiveUnitPrice);
    let taxRate = toNumber(line.taxRate) || toNumber(line.costSubject?.defaultTaxRate) || 0.09;
    const regionOrProductType = line.regionOrProductType || productName(line.productType) || '';
    const remarkParts = [line.remark || ''];
    let changed = false;

    if (!line.quantityOverride) {
      const ruleQuantity = await calculateRuleDrivenQuantity(prisma, {
        projectId: params.id,
        projectVersionId: version.id,
        costCode: code,
        basisName: line.measureBasis || line.costSubject?.defaultMeasureBasis || '',
        regionOrProductType,
        fallbackMeasureValue: measureValue,
        fallbackCoefficient: coefficient,
        fallbackQuantity: quantity,
        quantityOverride: false,
        fallbackUnit: unit
      });

      if (ruleQuantity.applied) {
        measureValue = ruleQuantity.measureValue;
        coefficient = ruleQuantity.coefficient;
        quantity = ruleQuantity.quantity;
        unit = ruleQuantity.unit || unit;
        remarkParts.push(`一键重算：${ruleQuantity.source}`);
        ruleRows += 1;
        changed = true;
      }
    }

    if (!taxInclusiveUnitPrice) {
      const price = await recommendPriceIndicator(prisma, {
        projectId: params.id,
        costCode: code,
        regionOrProductType,
        fallbackUnit: unit
      });
      if (price.applied) {
        taxInclusiveUnitPrice = price.taxInclusiveUnitPrice;
        taxRate = price.taxRate || taxRate;
        unit = unit || price.quantityUnit || unit;
        remarkParts.push(`一键重算：${price.source}`);
        priceRows += 1;
        changed = true;
      }
    }

    const quantityState = costLineQuantityPatch({
      ...line,
      measureValue,
      coefficient,
      quantity,
      taxInclusiveUnitPrice
    });
    quantity = Number(quantityState.quantity || 0);
    const amounts = calc(quantity, taxInclusiveUnitPrice, taxRate);
    const oldIncl = toNumber(line.taxInclusiveAmount);
    const oldExcl = toNumber(line.taxExclusiveAmount);
    const oldTax = toNumber(line.taxAmount);
    if (round2(oldIncl) !== amounts.taxInclusiveAmount || round2(oldExcl) !== amounts.taxExclusiveAmount || round2(oldTax) !== amounts.taxAmount) {
      amountRows += 1;
      changed = true;
    }

    if (!changed) continue;

    const remark = Array.from(new Set(remarkParts.map((item) => String(item || '').trim()).filter(Boolean))).join('；');
    await prisma.costLine.update({
      where: { id: line.id },
      data: {
        measureValue,
        coefficient,
        quantity,
        quantitySource: quantityState.quantitySource,
        quantityStatus: quantityState.quantityStatus,
        quantityFormula: quantityState.quantityFormula,
        unitPriceSourceType: taxInclusiveUnitPrice ? line.unitPriceSourceType : undefined,
        pricingUnit: unit ? `元/${unit}` : line.pricingUnit,
        amountStatus: quantityState.amountStatus,
        unit,
        taxRate,
        taxInclusiveUnitPrice,
        taxExclusiveUnitPrice: amounts.taxExclusiveUnitPrice,
        taxInclusiveAmount: amounts.taxInclusiveAmount,
        taxExclusiveAmount: amounts.taxExclusiveAmount,
        taxAmount: amounts.taxAmount,
        remark
      }
    });
    updatedRows += 1;
  }

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs-batch?recalculated=1&recalcRows=${updatedRows}&ruleRows=${ruleRows}&priceRows=${priceRows}&amountRows=${amountRows}`, 303);
}

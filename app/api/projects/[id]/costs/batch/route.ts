import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { calculateRuleDrivenQuantity } from '@/lib/rule-driven-quantity';
import { recommendPriceIndicator } from '@/lib/price-indicator-matcher';
import { costLineQuantityPatch, costLineV101FieldsFromForm } from '@/lib/cost-line-quantity-fields';

const clean = (input: FormDataEntryValue | null) => String(input || '').trim();

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function numberFrom(form: FormData, name: string) {
  const raw = clean(form.get(name));
  if (!raw) return 0;
  const num = Number(raw.replace('%', ''));
  return Number.isFinite(num) ? num : 0;
}

function taxRateFrom(inputValue: FormDataEntryValue | string | null, fallback = 0.09) {
  const raw = clean(inputValue as FormDataEntryValue | null);
  if (!raw) return fallback;
  const num = Number(raw.replace('%', ''));
  if (!Number.isFinite(num)) return fallback;
  if (raw.includes('%')) return num / 100;
  return num > 1 ? num / 100 : num;
}

function round2(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function calc(quantity: number, taxInclusiveUnitPrice: number, taxRate: number) {
  // 全系统成本口径：单价为“元/单位”，合价统一保存为“万元”。
  const taxInclusiveAmount = round2((quantity * taxInclusiveUnitPrice) / 10000);
  const taxExclusiveAmount = round2(taxInclusiveAmount / (1 + taxRate));
  const taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
  const taxExclusiveUnitPrice = taxInclusiveUnitPrice ? round2(taxInclusiveUnitPrice / (1 + taxRate)) : 0;
  return { taxInclusiveAmount, taxExclusiveAmount, taxAmount, taxExclusiveUnitPrice };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const { version, locked } = await getEditableActiveVersion(params.id);
  const baseUrl = getBaseUrl(request);
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs-batch?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs-batch?locked=1`, 303);

  const rowIds = form.getAll('dictionaryRowId').map((item) => String(item || '')).filter(Boolean);
  let savedCount = 0;
  let ruleAppliedCount = 0;
  let priceAppliedCount = 0;

  for (const dictionaryRowId of rowIds) {
    let quantity = numberFrom(form, `quantity-${dictionaryRowId}`);
    let taxInclusiveUnitPrice = numberFrom(form, `taxInclusiveUnitPrice-${dictionaryRowId}`);
    const remarkInput = clean(form.get(`remark-${dictionaryRowId}`));
    let unitInput = clean(form.get(`unit-${dictionaryRowId}`));
    const taxRateInput = clean(form.get(`taxRate-${dictionaryRowId}`));
    const costLineId = clean(form.get(`costLineId-${dictionaryRowId}`));
    const regionOrProductTypeInput = clean(form.get(`regionOrProductType-${dictionaryRowId}`));
    const measureBasisInput = clean(form.get(`measureBasis-${dictionaryRowId}`));
    const allocationMethodInput = clean(form.get(`allocationMethod-${dictionaryRowId}`));

    if (!quantity && !taxInclusiveUnitPrice && !remarkInput && !costLineId && !regionOrProductTypeInput && !measureBasisInput && !allocationMethodInput) continue;

    const dict = await prisma.costDictionaryRow.findUnique({ where: { id: dictionaryRowId } });
    if (!dict || !dict.detailSubject) continue;

    const code = dict.costCode || '03';
    const subjectName = dict.detailSubject;
    const costSubject = await prisma.costSubject.upsert({
      where: { code },
      update: {
        name: subjectName,
        level: Number(dict.subjectLevel || 4) || 4,
        fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
        defaultUnit: dict.unit || undefined,
        defaultTaxRate: taxRateFrom(dict.defaultTaxRate || '9%'),
        defaultMeasureBasis: dict.measureBasis || undefined,
        defaultAllocationMethod: dict.targetAllocationMethod || undefined,
        enabled: true
      },
      create: {
        code,
        name: subjectName,
        level: Number(dict.subjectLevel || 4) || 4,
        fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
        defaultUnit: dict.unit || undefined,
        defaultTaxRate: taxRateFrom(dict.defaultTaxRate || '9%'),
        defaultMeasureBasis: dict.measureBasis || undefined,
        defaultAllocationMethod: dict.targetAllocationMethod || undefined,
        sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || 300,
        enabled: true
      }
    });

    const ruleQuantity = await calculateRuleDrivenQuantity(prisma, {
      projectId: params.id,
      projectVersionId: version.id,
      costCode: code,
      basisName: measureBasisInput || dict.measureBasis || '',
      regionOrProductType: regionOrProductTypeInput || dict.applicableProductType || '',
      fallbackMeasureValue: quantity,
      fallbackCoefficient: 1,
      fallbackQuantity: quantity,
      quantityOverride: false,
      fallbackUnit: unitInput || dict.unit || ''
    });

    let measureValue = quantity;
    let coefficient = 1;
    if (ruleQuantity.applied) {
      measureValue = ruleQuantity.measureValue;
      coefficient = ruleQuantity.coefficient;
      quantity = ruleQuantity.quantity;
      unitInput = ruleQuantity.unit || unitInput;
      ruleAppliedCount += 1;
    }

    const price = !taxInclusiveUnitPrice ? await recommendPriceIndicator(prisma, {
      projectId: params.id,
      costCode: code,
      regionOrProductType: regionOrProductTypeInput || dict.applicableProductType || '',
      fallbackUnit: unitInput || dict.unit || ''
    }) : null;
    if (price?.applied) {
      taxInclusiveUnitPrice = price.taxInclusiveUnitPrice;
      unitInput = unitInput || price.quantityUnit || '';
      priceAppliedCount += 1;
    }

    const existing = costLineId ? await prisma.costLine.findFirst({ where: { id: costLineId, projectVersionId: version.id } }) : null;
    const semanticPatch = costLineV101FieldsFromForm(form, (field) => `${field}-${dictionaryRowId}`);
    const taxRate = taxRateInput ? taxRateFrom(taxRateInput, price?.taxRate || 0.09) : (price?.applied ? price.taxRate : taxRateFrom(dict.defaultTaxRate, 0.09));
    const quantityState = costLineQuantityPatch({
      ...existing,
      ...semanticPatch,
      measureValue,
      coefficient,
      quantity,
      taxInclusiveUnitPrice
    });
    quantity = Number(quantityState.quantity || 0);
    const amounts = calc(quantity, taxInclusiveUnitPrice, taxRate);
    const remark = [
      remarkInput,
      ruleQuantity.applied && ruleQuantity.source ? `后端${ruleQuantity.source}自动计算工程量` : '',
      price?.applied && price.source ? `后端${price.source}自动推荐单价` : ''
    ].filter(Boolean).join('；');
    const data = {
      projectVersionId: version.id,
      costSubjectId: costSubject.id,
      productTypeId: null,
      detailName: dict.detailSubject,
      regionOrProductType: regionOrProductTypeInput || dict.applicableProductType || '项目整体共用',
      professionalGroup: dict.sourceTable?.replace('表', '') || dict.secondSubject || '目标成本',
      measureBasis: measureBasisInput || dict.measureBasis || '',
      measureValue,
      coefficient,
      quantityOverride: false,
      ...semanticPatch,
      quantity,
      quantitySource: quantityState.quantitySource,
      quantityStatus: quantityState.quantityStatus,
      quantityFormula: quantityState.quantityFormula,
      unitPriceSourceType: semanticPatch.unitPriceSourceType ?? (price?.applied ? price.source : existing?.unitPriceSourceType),
      pricingUnit: semanticPatch.pricingUnit ?? (unitInput ? `元/${unitInput}` : existing?.pricingUnit),
      amountStatus: quantityState.amountStatus,
      unit: unitInput || dict.unit || '',
      taxRate,
      taxInclusiveUnitPrice,
      taxExclusiveUnitPrice: amounts.taxExclusiveUnitPrice,
      taxInclusiveAmount: amounts.taxInclusiveAmount,
      taxExclusiveAmount: amounts.taxExclusiveAmount,
      taxAmount: amounts.taxAmount,
      allocationMethod: allocationMethodInput || dict.targetAllocationMethod || '按可售面积占比',
      isDirectAssigned: false,
      description: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
      remark
    };

    if (costLineId) {
      if (existing) await prisma.costLine.update({ where: { id: costLineId }, data });
    } else {
      await prisma.costLine.create({ data: { ...data, sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || Date.now() % 1000000000 } });
    }
    savedCount += 1;
  }

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs-batch?saved=1&batch=${savedCount}&rules=${ruleAppliedCount}&prices=${priceAppliedCount}`, 303);
}

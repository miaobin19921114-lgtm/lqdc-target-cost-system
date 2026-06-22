import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { calculateRuleDrivenQuantity } from '@/lib/rule-driven-quantity';
import { recommendPriceIndicator } from '@/lib/price-indicator-matcher';

const clean = (input: FormDataEntryValue | null) => String(input || '').trim();

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function entryKey(rowId: string, field: string) {
  return `${field}-${rowId}`;
}

function dictionaryIdFromEntry(entryId: string) {
  return entryId.split('__')[0] || entryId;
}

function numberFrom(form: FormData, name: string) {
  const raw = clean(form.get(name));
  if (!raw) return 0;
  const num = Number(raw.replace('%', ''));
  return Number.isFinite(num) ? num : 0;
}

function boolFrom(form: FormData, name: string) {
  const value = clean(form.get(name));
  return value === '1' || value === 'true' || value === 'on';
}

function taxRateFrom(inputValue: FormDataEntryValue | string | null, fallback = 0.09) {
  const raw = clean(inputValue as FormDataEntryValue | null);
  if (!raw) return fallback;
  const num = Number(raw.replace('%', ''));
  if (!Number.isFinite(num)) return fallback;
  if (raw.includes('%')) return num / 100;
  return num > 1 ? num / 100 : num;
}

function round2(amount: number) { return Math.round((amount + Number.EPSILON) * 100) / 100; }
function calc(quantity: number, taxInclusiveUnitPrice: number, taxRate: number) {
  // 全系统成本口径：单价为“元/单位”，合价统一保存为“万元”。
  const taxInclusiveAmount = round2((quantity * taxInclusiveUnitPrice) / 10000);
  const taxExclusiveAmount = round2(taxInclusiveAmount / (1 + taxRate));
  const taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
  const taxExclusiveUnitPrice = taxInclusiveUnitPrice ? round2(taxInclusiveUnitPrice / (1 + taxRate)) : 0;
  return { taxInclusiveAmount, taxExclusiveAmount, taxAmount, taxExclusiveUnitPrice };
}

function matchesInactiveProductName(text: string | null | undefined, inactiveNames: Set<string>) {
  const value = String(text || '').trim();
  if (!value) return false;
  return Array.from(inactiveNames).some((name) => value === name || value === `业态-${name}` || value === `区域-${name}`);
}

function entryMatchesSaveScope(form: FormData, entryId: string, saveGroupId: string) {
  if (!saveGroupId) return true;
  if (entryId.includes(`__${saveGroupId}`)) return true;
  return form.getAll(entryKey(entryId, 'saveScope')).map((item) => String(item || '')).includes(saveGroupId);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const baseUrl = getBaseUrl(request);
  const professionalGroup = clean(form.get('professionalGroup')) || '专业明细';
  const returnPath = clean(form.get('returnPath')) || 'costs';
  const saveGroupId = clean(form.get('saveGroupId'));
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${returnPath}?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${returnPath}?locked=1`, 303);

  const products = await prisma.productType.findMany({ where: { projectVersionId: version.id }, select: { name: true, isActive: true } });
  const inactiveProductNames = new Set(products.filter((item) => !item.isActive).map((item) => item.name));
  const allRowEntries = form.getAll('dictionaryRowId').map((item) => String(item || '')).filter(Boolean);
  const rowEntries = saveGroupId ? allRowEntries.filter((entryId) => entryMatchesSaveScope(form, entryId, saveGroupId)) : allRowEntries;
  let savedCount = 0;
  let ruleAppliedCount = 0;
  let priceAppliedCount = 0;

  for (const rowEntryId of rowEntries) {
    const rowId = dictionaryIdFromEntry(rowEntryId);
    let measureValue = numberFrom(form, entryKey(rowEntryId, 'measureValue'));
    const coefficientRaw = numberFrom(form, entryKey(rowEntryId, 'coefficient'));
    let coefficient = coefficientRaw || 1;
    const quantityInput = numberFrom(form, entryKey(rowEntryId, 'quantity'));
    const quantityOverride = boolFrom(form, entryKey(rowEntryId, 'quantityOverride'));
    const formulaQuantity = measureValue ? round2(measureValue * coefficient) : 0;
    let quantity = quantityOverride || !formulaQuantity ? quantityInput : formulaQuantity;
    let taxInclusiveUnitPrice = numberFrom(form, entryKey(rowEntryId, 'taxInclusiveUnitPrice'));
    const remarkInput = clean(form.get(entryKey(rowEntryId, 'remark')));
    let unitInput = clean(form.get(entryKey(rowEntryId, 'unit')));
    const taxRateInput = clean(form.get(entryKey(rowEntryId, 'taxRate')));
    const costLineId = clean(form.get(entryKey(rowEntryId, 'costLineId')));
    const regionOrProductTypeInput = clean(form.get(entryKey(rowEntryId, 'regionOrProductType')));
    const measureBasisInput = clean(form.get(entryKey(rowEntryId, 'measureBasis')));
    const allocationMethodInput = clean(form.get(entryKey(rowEntryId, 'allocationMethod')));

    if (!quantity && !measureValue && !coefficientRaw && !taxInclusiveUnitPrice && !remarkInput && !costLineId && !regionOrProductTypeInput && !measureBasisInput && !allocationMethodInput) continue;
    const dict = await prisma.costDictionaryRow.findUnique({ where: { id: rowId } });
    if (!dict || !dict.detailSubject) continue;
    if (matchesInactiveProductName(regionOrProductTypeInput || dict.applicableProductType, inactiveProductNames)) continue;

    const existingCostLine = costLineId ? await prisma.costLine.findFirst({ where: { id: costLineId, projectVersionId: version.id }, include: { productType: true } }) : null;
    if (existingCostLine?.productTypeId && !existingCostLine.productType?.isActive) continue;
    if (matchesInactiveProductName(existingCostLine?.regionOrProductType, inactiveProductNames)) continue;

    const code = dict.costCode || '03';
    const subjectName = dict.detailSubject;
    const codeSort = Number(String(code).replace(/\D/g, '').slice(0, 8)) || 300;
    const costSubject = await prisma.costSubject.upsert({
      where: { code },
      update: { name: subjectName, level: Number(dict.subjectLevel || 4) || 4, parentCode: dict.parentCode || undefined, fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join('/'), defaultUnit: dict.unit || undefined, defaultMeasureBasis: dict.measureBasis || undefined, defaultAllocationMethod: dict.targetAllocationMethod || undefined, enabled: true },
      create: { code, name: subjectName, level: Number(dict.subjectLevel || 4) || 4, parentCode: dict.parentCode || undefined, fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join('/'), defaultUnit: dict.unit || undefined, defaultMeasureBasis: dict.measureBasis || undefined, defaultAllocationMethod: dict.targetAllocationMethod || undefined, sortOrder: codeSort, enabled: true }
    });

    const ruleQuantity = await calculateRuleDrivenQuantity(prisma, {
      projectId: params.id,
      projectVersionId: version.id,
      costCode: code,
      basisName: measureBasisInput || dict.measureBasis || '',
      regionOrProductType: regionOrProductTypeInput || existingCostLine?.regionOrProductType || dict.applicableProductType || '',
      fallbackMeasureValue: measureValue,
      fallbackCoefficient: coefficient,
      fallbackQuantity: quantity,
      quantityOverride,
      fallbackUnit: unitInput || dict.unit || '项'
    });

    if (ruleQuantity.applied && !quantityOverride) {
      measureValue = ruleQuantity.measureValue;
      coefficient = ruleQuantity.coefficient;
      quantity = ruleQuantity.quantity;
      unitInput = ruleQuantity.unit || unitInput;
      ruleAppliedCount += 1;
    }

    const price = !taxInclusiveUnitPrice ? await recommendPriceIndicator(prisma, {
      projectId: params.id,
      costCode: code,
      regionOrProductType: regionOrProductTypeInput || existingCostLine?.regionOrProductType || dict.applicableProductType || '',
      fallbackUnit: unitInput || dict.unit || '项'
    }) : null;
    if (price?.applied) {
      taxInclusiveUnitPrice = price.taxInclusiveUnitPrice;
      unitInput = unitInput || price.quantityUnit || '';
      priceAppliedCount += 1;
    }

    const taxRate = taxRateInput ? taxRateFrom(taxRateInput, price?.taxRate || 0.09) : (price?.applied ? price.taxRate : taxRateFrom(dict.defaultTaxRate, 0.09));
    const amounts = calc(quantity, taxInclusiveUnitPrice, taxRate);
    const remark = [
      remarkInput,
      ruleQuantity.applied && ruleQuantity.source ? `后端${ruleQuantity.source}自动计算工程量` : '',
      price?.applied && price.source ? `后端${price.source}自动推荐单价` : ''
    ].filter(Boolean).join('；');
    const data = {
      projectVersionId: version.id,
      costSubjectId: costSubject.id,
      detailName: dict.detailSubject,
      regionOrProductType: regionOrProductTypeInput || dict.applicableProductType || '项目整体共用',
      professionalGroup,
      measureBasis: measureBasisInput || dict.measureBasis || '',
      measureValue,
      coefficient,
      quantityOverride,
      quantity,
      unit: unitInput || dict.unit || '项',
      taxInclusiveUnitPrice,
      taxExclusiveUnitPrice: amounts.taxExclusiveUnitPrice,
      taxRate,
      taxInclusiveAmount: amounts.taxInclusiveAmount,
      taxExclusiveAmount: amounts.taxExclusiveAmount,
      taxAmount: amounts.taxAmount,
      allocationMethod: allocationMethodInput || dict.targetAllocationMethod || '建筑面积分摊',
      description: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
      remark,
      sortOrder: codeSort || Date.now() % 1000000000
    };

    if (costLineId) await prisma.costLine.update({ where: { id: costLineId }, data });
    else await prisma.costLine.create({ data });
    savedCount += 1;
  }

  const query = saveGroupId ? `saved=1&groupSaved=1&batch=${savedCount}&rules=${ruleAppliedCount}&prices=${priceAppliedCount}` : `saved=1&batch=${savedCount}&rules=${ruleAppliedCount}&prices=${priceAppliedCount}`;
  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${returnPath}?${query}`, 303);
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { refreshTargetCostAggregates, upsertDetailCalculationResult } from '@/lib/detail-calculation-result-sync';
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

function rateFromText(inputValue: FormDataEntryValue | null, fallback = 0) {
  const raw = clean(inputValue);
  if (!raw) return fallback;
  const num = Number(raw.replace('%', ''));
  if (!Number.isFinite(num)) return fallback;
  if (raw.includes('%')) return num / 100;
  return num > 1 ? num / 100 : num;
}

function taxRateFrom(inputValue: FormDataEntryValue | null, fallback = 0) {
  return rateFromText(inputValue, fallback);
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function matchesInactiveProductName(text: string | null | undefined, inactiveNames: Set<string>) {
  const value = String(text || '').trim();
  if (!value) return false;
  return Array.from(inactiveNames).some((name) => value === name || value === `业态-${name}` || value === `区域-${name}`);
}

function landRowName(dict: { detailSubject?: string | null; measureBasis?: string | null }) {
  return `${dict.detailSubject || ''}${dict.measureBasis || ''}`;
}

function isRateBasedLandFee(dict: { detailSubject?: string | null; measureBasis?: string | null }) {
  const name = landRowName(dict);
  return ['契税', '土地交易服务费', '土地评估费', '土地咨询', '居间服务费'].some((key) => name.includes(key));
}

function defaultTaxRateForLandRow(dict: { detailSubject?: string | null; defaultTaxRate?: string | null }) {
  const name = dict.detailSubject || '';
  if (name.includes('契税')) return 0;
  if (['土地交易服务费', '土地评估费', '土地咨询', '居间服务费', '土地尽调费', '法务尽调费', '财税尽调费'].some((key) => name.includes(key))) return 0.06;
  return taxRateFrom(dict.defaultTaxRate || '0%', 0);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, totalBuildingArea: true, saleableArea: true } });
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/land?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/land?locked=1`, 303);
  const [versionSnapshot] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT "id" FROM "VersionRuleSnapshot" WHERE "projectId"=$1 AND "versionId"=$2 ORDER BY "createdAt" DESC LIMIT 1
  `, params.id, version.id).catch(() => []);
  const products = await prisma.productType.findMany({ where: { projectVersionId: version.id }, select: { name: true, isActive: true } });
  const inactiveProductNames = new Set(products.filter((item) => !item.isActive).map((item) => item.name));
  const rowIds = form.getAll('dictionaryRowId').map((item) => String(item || '')).filter(Boolean);
  const saveGroupId = clean(form.get('saveGroupId'));
  let savedCount = 0;

  for (const rowId of rowIds) {
    if (saveGroupId) {
      const scopes = form.getAll(`saveScope-${rowId}`).map((item) => clean(item)).filter(Boolean);
      if (!scopes.includes(saveGroupId)) continue;
    }

    const quantity = numberFrom(form, `quantity-${rowId}`);
    const priceWanPerUnit = numberFrom(form, `priceWanPerUnit-${rowId}`);
    const remark = clean(form.get(`remark-${rowId}`));
    const unitInput = clean(form.get(`unit-${rowId}`));
    const taxRateInput = clean(form.get(`taxRate-${rowId}`));
    const regionOrProductType = clean(form.get(`regionOrProductType-${rowId}`));
    const costLineId = clean(form.get(`costLineId-${rowId}`));

    if (!quantity && !priceWanPerUnit && !remark && !costLineId) continue;
    const dict = await prisma.costDictionaryRow.findUnique({ where: { id: rowId } });
    if (!dict || !dict.detailSubject) continue;
    if (matchesInactiveProductName(dict.applicableProductType, inactiveProductNames)) continue;
    if (matchesInactiveProductName(regionOrProductType, inactiveProductNames)) continue;

    const existingCostLine = costLineId ? await prisma.costLine.findFirst({ where: { id: costLineId, projectVersionId: version.id }, include: { productType: true } }) : null;
    if (existingCostLine?.productTypeId && !existingCostLine.productType?.isActive) continue;
    if (matchesInactiveProductName(existingCostLine?.regionOrProductType, inactiveProductNames)) continue;

    const code = dict.costCode || '01.01';
    const subjectName = dict.detailSubject;
    const costSubject = await prisma.costSubject.upsert({
      where: { code },
      update: {
        name: subjectName,
        level: Number(dict.subjectLevel || 4) || 4,
        parentCode: dict.parentCode || undefined,
        fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
        defaultUnit: dict.unit || undefined,
        defaultTaxRate: defaultTaxRateForLandRow(dict),
        defaultMeasureBasis: dict.measureBasis || undefined,
        defaultAllocationMethod: dict.targetAllocationMethod || undefined,
        enabled: true
      },
      create: {
        code,
        name: subjectName,
        level: Number(dict.subjectLevel || 4) || 4,
        parentCode: dict.parentCode || undefined,
        fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
        defaultUnit: dict.unit || undefined,
        defaultTaxRate: defaultTaxRateForLandRow(dict),
        defaultMeasureBasis: dict.measureBasis || undefined,
        defaultAllocationMethod: dict.targetAllocationMethod || undefined,
        sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || 101,
        enabled: true
      }
    });

    const rateBased = isRateBasedLandFee(dict);
    const taxRate = taxRateFrom(taxRateInput || dict.defaultTaxRate, defaultTaxRateForLandRow(dict));
    let taxInclusiveUnitPrice = 0;
    let taxInclusiveAmount = 0;
    let detailUnitPriceWan = priceWanPerUnit;

    if (rateBased) {
      const feeRate = rateFromText(form.get(`priceWanPerUnit-${rowId}`), 0);
      taxInclusiveUnitPrice = round2(feeRate * 10000);
      taxInclusiveAmount = round2(quantity * feeRate);
      detailUnitPriceWan = feeRate;
    } else {
      taxInclusiveUnitPrice = round2(priceWanPerUnit * 10000);
      taxInclusiveAmount = round2((quantity * taxInclusiveUnitPrice) / 10000);
      detailUnitPriceWan = priceWanPerUnit;
    }

    const semanticPatch = costLineV101FieldsFromForm(form, (field) => `${field}-${rowId}`);
    const quantityState = costLineQuantityPatch({
      ...existingCostLine,
      ...semanticPatch,
      measureValue: quantity,
      coefficient: 1,
      quantity,
      taxInclusiveUnitPrice
    });
    const finalQuantity = Number(quantityState.quantity || 0);
    if (finalQuantity !== quantity) {
      taxInclusiveAmount = rateBased ? round2(finalQuantity * detailUnitPriceWan) : round2((finalQuantity * taxInclusiveUnitPrice) / 10000);
    }
    const taxExclusiveAmount = taxRate ? round2(taxInclusiveAmount / (1 + taxRate)) : taxInclusiveAmount;
    const taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
    const taxExclusiveUnitPrice = taxRate ? round2(taxInclusiveUnitPrice / (1 + taxRate)) : taxInclusiveUnitPrice;

    const data = {
      projectVersionId: version.id,
      costSubjectId: costSubject.id,
      productTypeId: null,
      detailName: dict.detailSubject,
      regionOrProductType: regionOrProductType || dict.applicableProductType || '项目整体',
      professionalGroup: '土地费用',
      measureBasis: rateBased ? '土地价款/成交价×费率' : (dict.measureBasis || '土地面积/固定金额'),
      measureValue: finalQuantity,
      coefficient: 1,
      ...semanticPatch,
      quantity: finalQuantity,
      quantitySource: quantityState.quantitySource,
      quantityStatus: quantityState.quantityStatus,
      quantityFormula: quantityState.quantityFormula,
      pricingUnit: semanticPatch.pricingUnit ?? (unitInput ? `元/${unitInput}` : existingCostLine?.pricingUnit),
      amountStatus: quantityState.amountStatus,
      unit: unitInput || (rateBased ? '万元基数' : (dict.unit || '亩')),
      taxRate,
      taxInclusiveUnitPrice,
      taxExclusiveUnitPrice,
      taxInclusiveAmount,
      taxExclusiveAmount,
      taxAmount,
      allocationMethod: dict.targetAllocationMethod || '按可售面积占比',
      isDirectAssigned: false,
      description: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
      remark,
      sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || Date.now() % 1000000000
    };

    if (costLineId) await prisma.costLine.update({ where: { id: costLineId }, data });
    else await prisma.costLine.create({ data });

    await upsertDetailCalculationResult(prisma, {
      id: `detail-land-${version.id}-${rowId}`,
      projectId: params.id,
      versionId: version.id,
      versionSnapshotId: versionSnapshot?.id || null,
      sourceRuleId: `manual-land-${rowId}`,
      detailType: 'land',
      subjectCode: code,
      subjectName,
      applicableStage: version.stage || 'SCHEME',
      precisionLevel: 'L3',
      areaZone: regionOrProductType || dict.applicableProductType || '项目整体',
      professionalGroup: '土地费用',
      measureBasis: data.measureBasis,
      quantityFormula: dict.measureBasis || null,
      pricingUnit: unitInput || (rateBased ? '费率' : (dict.unit || '亩')),
      unitPriceSource: '土地费用明细表',
      quantity: finalQuantity,
      unitPrice: detailUnitPriceWan,
      taxRate,
      amountFormula: rateBased ? '土地价款/成交价×费率' : '工程量×含税单价',
      costAttributionMethod: '土地费直接归集',
      allocationMethod: data.allocationMethod,
      vatTreatment: taxRate ? `进项税率${round2(taxRate * 100)}%` : '不可抵扣/无税',
      landVatTreatment: '计入土地增值税扣除项目',
      incomeTaxTreatment: '计入所得税成本对象',
      remark
    });

    savedCount += 1;
  }

  await refreshTargetCostAggregates(prisma, {
    projectId: params.id,
    versionId: version.id,
    buildingArea: Number(project?.totalBuildingArea || 0),
    saleableArea: Number(project?.saleableArea || 0)
  });

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/land?saved=1&batch=${savedCount}`, 303);
}

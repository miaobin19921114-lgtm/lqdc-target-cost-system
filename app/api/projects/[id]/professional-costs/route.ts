import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { costLineQuantityPatch, costLineV101FieldsFromForm } from '@/lib/cost-line-quantity-fields';

const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);
const clean = (value: FormDataEntryValue | null) => String(value || '').trim();

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function parseTaxRate(value?: string | null, fallback = 0) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (raw.includes('%')) return Number(raw.replace('%', '')) / 100 || fallback;
  const num = Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return num > 1 ? num / 100 : num;
}

function presetValue(input: FormDataEntryValue | null, preset?: string | null, fallback = '') {
  const value = clean(input);
  if (!value || value === '项目整体共用' || value === '建筑面积分摊') return preset || fallback;
  return value;
}

function taxCalc(quantity: number, taxInclusiveUnitPrice: number, taxRate: number) {
  const taxInclusiveAmount = quantity * taxInclusiveUnitPrice;
  const taxExclusiveAmount = taxRate > -1 ? taxInclusiveAmount / (1 + taxRate) : taxInclusiveAmount;
  return {
    taxInclusiveAmount,
    taxExclusiveAmount,
    taxAmount: taxInclusiveAmount - taxExclusiveAmount,
    taxExclusiveUnitPrice: taxRate > -1 ? taxInclusiveUnitPrice / (1 + taxRate) : taxInclusiveUnitPrice
  };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const baseUrl = getBaseUrl(request);

  const professionalGroup = String(form.get('professionalGroup') || '专业明细');
  const returnPath = String(form.get('returnPath') || 'costs');
  const dictionaryRowId = String(form.get('dictionaryRowId') || '');
  const costLineId = clean(form.get('costLineId'));
  const dict = dictionaryRowId ? await prisma.costDictionaryRow.findUnique({ where: { id: dictionaryRowId } }) : null;

  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${returnPath}?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${returnPath}?locked=1`, 303);

  const code = dict?.costCode || '03';
  const subjectName = dict?.detailSubject || dict?.thirdSubject || dict?.secondSubject || dict?.firstSubject || professionalGroup;
  const costSubject = await prisma.costSubject.upsert({
    where: { code },
    update: {
      name: subjectName,
      level: Number(dict?.subjectLevel || 3) || 3,
      fullPath: [dict?.firstSubject, dict?.secondSubject, dict?.thirdSubject, dict?.detailSubject].filter(Boolean).join('/'),
      defaultUnit: dict?.unit || undefined,
      defaultMeasureBasis: dict?.measureBasis || undefined,
      defaultAllocationMethod: dict?.targetAllocationMethod || undefined,
      enabled: true
    },
    create: {
      code,
      name: subjectName,
      level: Number(dict?.subjectLevel || 3) || 3,
      fullPath: [dict?.firstSubject, dict?.secondSubject, dict?.thirdSubject, dict?.detailSubject].filter(Boolean).join('/'),
      defaultUnit: dict?.unit || undefined,
      defaultMeasureBasis: dict?.measureBasis || undefined,
      defaultAllocationMethod: dict?.targetAllocationMethod || undefined,
      sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || 300,
      enabled: true
    }
  });

  let quantity = toNumber(form, 'quantity');
  const taxInclusiveUnitPrice = toNumber(form, 'taxInclusiveUnitPrice');
  const taxRate = dict?.defaultTaxRate ? parseTaxRate(dict.defaultTaxRate, 0.09) : parseTaxRate(clean(form.get('taxRate')), 0.09);
  const existing = costLineId ? await prisma.costLine.findFirst({ where: { id: costLineId, projectVersionId: version.id } }) : null;
  const semanticPatch = costLineV101FieldsFromForm(form, (field) => field);
  const quantityState = costLineQuantityPatch({
    ...existing,
    ...semanticPatch,
    measureValue: quantity,
    coefficient: 1,
    quantity,
    taxInclusiveUnitPrice
  });
  quantity = Number(quantityState.quantity || 0);
  const amounts = taxCalc(quantity, taxInclusiveUnitPrice, taxRate);
  const data = {
    projectVersionId: version.id,
    costSubjectId: costSubject.id,
    detailName: presetValue(form.get('detailName'), subjectName, professionalGroup),
    regionOrProductType: presetValue(form.get('regionOrProductType'), dict?.applicableProductType, '项目整体共用'),
    professionalGroup,
    measureBasis: presetValue(form.get('measureBasis'), dict?.measureBasis),
    measureValue: quantity,
    coefficient: 1,
    ...semanticPatch,
    quantity,
    quantitySource: quantityState.quantitySource,
    quantityStatus: quantityState.quantityStatus,
    quantityFormula: quantityState.quantityFormula,
    unit: presetValue(form.get('unit'), dict?.unit, '项'),
    taxInclusiveUnitPrice,
    taxExclusiveUnitPrice: amounts.taxExclusiveUnitPrice,
    taxRate,
    taxInclusiveAmount: amounts.taxInclusiveAmount,
    taxExclusiveAmount: amounts.taxExclusiveAmount,
    taxAmount: amounts.taxAmount,
    pricingUnit: semanticPatch.pricingUnit ?? `元/${presetValue(form.get('unit'), dict?.unit, '项')}`,
    amountStatus: quantityState.amountStatus,
    allocationMethod: presetValue(form.get('allocationMethod'), dict?.targetAllocationMethod, '建筑面积分摊'),
    description: dict ? [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / ') : professionalGroup,
    remark: clean(form.get('remark')),
    sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || Date.now() % 1000000000
  };

  if (costLineId) {
    await prisma.costLine.update({ where: { id: costLineId }, data });
  } else {
    await prisma.costLine.create({ data });
  }

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${returnPath}?saved=1`, 303);
}

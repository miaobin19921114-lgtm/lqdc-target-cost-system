import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';

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

function taxRateFrom(inputValue: FormDataEntryValue | null, fallback = 0.09) {
  const raw = clean(inputValue);
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
  const taxInclusiveAmount = round2(quantity * taxInclusiveUnitPrice);
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

  for (const dictionaryRowId of rowIds) {
    const quantity = numberFrom(form, `quantity-${dictionaryRowId}`);
    const taxInclusiveUnitPrice = numberFrom(form, `taxInclusiveUnitPrice-${dictionaryRowId}`);
    const remark = clean(form.get(`remark-${dictionaryRowId}`));
    const unitInput = clean(form.get(`unit-${dictionaryRowId}`));
    const taxRateInput = clean(form.get(`taxRate-${dictionaryRowId}`));
    const costLineId = clean(form.get(`costLineId-${dictionaryRowId}`));
    const regionOrProductTypeInput = clean(form.get(`regionOrProductType-${dictionaryRowId}`));
    const measureBasisInput = clean(form.get(`measureBasis-${dictionaryRowId}`));
    const allocationMethodInput = clean(form.get(`allocationMethod-${dictionaryRowId}`));

    if (!quantity && !taxInclusiveUnitPrice && !remark && !costLineId && !regionOrProductTypeInput && !measureBasisInput && !allocationMethodInput) continue;

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

    const taxRate = taxRateFrom(taxRateInput || dict.defaultTaxRate, 0.09);
    const amounts = calc(quantity, taxInclusiveUnitPrice, taxRate);
    const data = {
      projectVersionId: version.id,
      costSubjectId: costSubject.id,
      productTypeId: null,
      detailName: dict.detailSubject,
      regionOrProductType: regionOrProductTypeInput || dict.applicableProductType || '项目整体共用',
      professionalGroup: dict.sourceTable?.replace('表', '') || dict.secondSubject || '目标成本',
      measureBasis: measureBasisInput || dict.measureBasis || '',
      quantity,
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
      const existing = await prisma.costLine.findFirst({ where: { id: costLineId, projectVersionId: version.id } });
      if (existing) await prisma.costLine.update({ where: { id: costLineId }, data });
    } else {
      await prisma.costLine.create({ data: { ...data, sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || Date.now() % 1000000000 } });
    }
    savedCount += 1;
  }

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs-batch?saved=1&batch=${savedCount}`, 303);
}

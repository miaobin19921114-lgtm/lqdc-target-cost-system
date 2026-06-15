import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

function taxRateFrom(inputValue: FormDataEntryValue | null, fallback = 0) {
  const raw = clean(inputValue);
  if (!raw) return fallback;
  const num = Number(raw.replace('%', ''));
  if (!Number.isFinite(num)) return fallback;
  if (raw.includes('%')) return num / 100;
  return num > 1 ? num / 100 : num;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function getOrCreateVersion(projectId: string) {
  const existing = await prisma.projectVersion.findFirst({ where: { projectId }, orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return prisma.projectVersion.create({ data: { projectId, name: '初始版本', status: 'draft' } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const version = await getOrCreateVersion(params.id);
  const rowIds = form.getAll('dictionaryRowId').map((item) => String(item || '')).filter(Boolean);
  let savedCount = 0;

  for (const rowId of rowIds) {
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

    const code = dict.costCode || '01.01';
    const subjectName = dict.detailSubject;
    const costSubject = await prisma.costSubject.upsert({
      where: { code },
      update: {
        name: subjectName,
        level: Number(dict.subjectLevel || 4) || 4,
        fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
        defaultUnit: dict.unit || undefined,
        defaultTaxRate: taxRateFrom(dict.defaultTaxRate || '0%'),
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
        defaultTaxRate: taxRateFrom(dict.defaultTaxRate || '0%'),
        defaultMeasureBasis: dict.measureBasis || undefined,
        defaultAllocationMethod: dict.targetAllocationMethod || undefined,
        sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || 101,
        enabled: true
      }
    });

    const taxRate = taxRateFrom(taxRateInput || dict.defaultTaxRate, 0);
    const taxInclusiveUnitPrice = round2(priceWanPerUnit * 10000);
    const taxInclusiveAmount = round2(quantity * taxInclusiveUnitPrice);
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
      measureBasis: dict.measureBasis || '土地面积/固定金额',
      quantity,
      unit: unitInput || dict.unit || '亩',
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
    savedCount += 1;
  }

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/land?saved=1&batch=${savedCount}`, 303);
}

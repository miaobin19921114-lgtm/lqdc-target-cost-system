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

function taxRateFrom(inputValue: FormDataEntryValue | null, fallback = 0.09) {
  const raw = clean(inputValue);
  if (!raw) return fallback;
  const num = Number(raw.replace('%', ''));
  if (!Number.isFinite(num)) return fallback;
  if (raw.includes('%')) return num / 100;
  return num > 1 ? num / 100 : num;
}

function calc(quantity: number, taxInclusiveUnitPrice: number, taxRate: number) {
  const taxInclusiveAmount = Math.round((quantity * taxInclusiveUnitPrice + Number.EPSILON) * 100) / 100;
  const taxExclusiveAmount = Math.round((taxInclusiveAmount / (1 + taxRate) + Number.EPSILON) * 100) / 100;
  const taxAmount = Math.round((taxInclusiveAmount - taxExclusiveAmount + Number.EPSILON) * 100) / 100;
  const taxExclusiveUnitPrice = taxInclusiveUnitPrice ? Math.round((taxInclusiveUnitPrice / (1 + taxRate) + Number.EPSILON) * 100) / 100 : 0;
  return { taxInclusiveAmount, taxExclusiveAmount, taxAmount, taxExclusiveUnitPrice };
}

async function getOrCreateVersion(projectId: string) {
  const existing = await prisma.projectVersion.findFirst({ where: { projectId }, orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return prisma.projectVersion.create({ data: { projectId, name: '初始版本' } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const baseUrl = getBaseUrl(request);
  const professionalGroup = clean(form.get('professionalGroup')) || '专业明细';
  const returnPath = clean(form.get('returnPath')) || 'costs';
  const version = await getOrCreateVersion(params.id);
  const rowIds = form.getAll('dictionaryRowId').map((item) => String(item || '')).filter(Boolean);
  let savedCount = 0;

  for (const rowId of rowIds) {
    const quantity = numberFrom(form, `quantity-${rowId}`);
    const taxInclusiveUnitPrice = numberFrom(form, `taxInclusiveUnitPrice-${rowId}`);
    const remark = clean(form.get(`remark-${rowId}`));
    const unitInput = clean(form.get(`unit-${rowId}`));
    const taxRateInput = clean(form.get(`taxRate-${rowId}`));
    const costLineId = clean(form.get(`costLineId-${rowId}`));

    if (!quantity && !taxInclusiveUnitPrice && !remark && !costLineId) continue;
    const dict = await prisma.costDictionaryRow.findUnique({ where: { id: rowId } });
    if (!dict) continue;

    const code = dict.costCode || '03';
    const subjectName = dict.detailSubject || dict.thirdSubject || dict.secondSubject || dict.firstSubject || professionalGroup;
    const costSubject = await prisma.costSubject.upsert({
      where: { code },
      update: {
        name: subjectName,
        level: Number(dict.subjectLevel || 3) || 3,
        fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join('/'),
        defaultUnit: dict.unit || undefined,
        defaultMeasureBasis: dict.measureBasis || undefined,
        defaultAllocationMethod: dict.targetAllocationMethod || undefined,
        enabled: true
      },
      create: {
        code,
        name: subjectName,
        level: Number(dict.subjectLevel || 3) || 3,
        fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join('/'),
        defaultUnit: dict.unit || undefined,
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
      detailName: dict.detailSubject || dict.thirdSubject || dict.secondSubject || professionalGroup,
      regionOrProductType: dict.applicableProductType || '项目整体共用',
      professionalGroup,
      measureBasis: dict.measureBasis || '',
      quantity,
      unit: unitInput || dict.unit || '项',
      taxInclusiveUnitPrice,
      taxExclusiveUnitPrice: amounts.taxExclusiveUnitPrice,
      taxRate,
      taxInclusiveAmount: amounts.taxInclusiveAmount,
      taxExclusiveAmount: amounts.taxExclusiveAmount,
      taxAmount: amounts.taxAmount,
      allocationMethod: dict.targetAllocationMethod || '建筑面积分摊',
      description: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
      remark,
      sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || Date.now() % 1000000000
    };

    if (costLineId) await prisma.costLine.update({ where: { id: costLineId }, data });
    else await prisma.costLine.create({ data });
    savedCount += 1;
  }

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${returnPath}?saved=1&batch=${savedCount}`, 303);
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const clean = (value: FormDataEntryValue | null) => String(value || '').trim();

function toNumber(form: FormData, name: string) {
  const raw = clean(form.get(name));
  if (!raw) return 0;
  const value = Number(raw.replace('%', ''));
  if (!Number.isFinite(value)) return 0;
  return raw.includes('%') ? value / 100 : value;
}

function parseTaxRate(value: FormDataEntryValue | null, fallback = 0.09) {
  const raw = clean(value);
  if (!raw) return fallback;
  const value = Number(raw.replace('%', ''));
  if (!Number.isFinite(value)) return fallback;
  if (raw.includes('%')) return value / 100;
  return value > 1 ? value / 100 : value;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calcCost(quantity: number, taxInclusiveUnitPrice: number, taxRate: number) {
  const taxInclusiveAmount = round2(quantity * taxInclusiveUnitPrice);
  const taxExclusiveAmount = round2(taxInclusiveAmount / (1 + taxRate));
  const taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
  const taxExclusiveUnitPrice = taxInclusiveUnitPrice ? round2(taxInclusiveUnitPrice / (1 + taxRate)) : 0;
  return { taxInclusiveAmount, taxExclusiveAmount, taxAmount, taxExclusiveUnitPrice };
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

async function getOrCreateVersion(projectId: string) {
  const existing = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });
  if (existing) return existing;
  return prisma.projectVersion.create({ data: { projectId, name: '初始版本', status: 'draft' } });
}

function presetValue(input: FormDataEntryValue | null, fallback = '') {
  return clean(input) || fallback;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const version = await getOrCreateVersion(params.id);
  const costLineId = clean(form.get('costLineId'));
  const dictionaryRowId = clean(form.get('dictionaryRowId'));
  const dict = dictionaryRowId ? await prisma.costDictionaryRow.findUnique({ where: { id: dictionaryRowId } }) : null;
  const rawSubjectId = clean(form.get('costSubjectId'));

  let costSubjectId = rawSubjectId;
  if (dict) {
    const code = dict.costCode || '03';
    const subjectName = dict.detailSubject || dict.thirdSubject || dict.secondSubject || dict.firstSubject || '目标成本';
    const subject = await prisma.costSubject.upsert({
      where: { code },
      update: {
        name: subjectName,
        level: Number(dict.subjectLevel || 4) || 4,
        fullPath: [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / '),
        defaultUnit: dict.unit || undefined,
        defaultTaxRate: parseTaxRate(dict.defaultTaxRate || '9%'),
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
        defaultTaxRate: parseTaxRate(dict.defaultTaxRate || '9%'),
        defaultMeasureBasis: dict.measureBasis || undefined,
        defaultAllocationMethod: dict.targetAllocationMethod || undefined,
        sortOrder: Number(String(code).replace(/\D/g, '').slice(0, 8)) || 300,
        enabled: true
      }
    });
    costSubjectId = subject.id;
  }

  if (!costSubjectId) {
    const baseUrl = getBaseUrl(request);
    return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs?error=subject`, 303);
  }

  const productTypeId = clean(form.get('productTypeId'));
  const quantity = Number(clean(form.get('quantity'))) || 0;
  const taxInclusiveUnitPrice = Number(clean(form.get('taxInclusiveUnitPrice'))) || 0;
  const taxRate = parseTaxRate(form.get('taxRate'), dict?.defaultTaxRate ? parseTaxRate(dict.defaultTaxRate) : 0.09);
  const calculated = calcCost(quantity, taxInclusiveUnitPrice, taxRate);
  const professionalGroup = presetValue(form.get('professionalGroup'), dict?.sourceTable?.replace('表', '') || dict?.secondSubject || '目标成本');
  const detailName = presetValue(form.get('detailName'), dict?.detailSubject || dict?.thirdSubject || '未命名成本明细');
  const description = presetValue(form.get('description'), dict ? [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / ') : '');
  const data = {
    projectVersionId: version.id,
    costSubjectId,
    productTypeId: productTypeId || null,
    detailName,
    regionOrProductType: presetValue(form.get('regionOrProductType'), dict?.applicableProductType || ''),
    professionalGroup,
    measureBasis: presetValue(form.get('measureBasis'), dict?.measureBasis || ''),
    quantity,
    unit: presetValue(form.get('unit'), dict?.unit || ''),
    taxRate,
    taxInclusiveUnitPrice,
    taxExclusiveUnitPrice: calculated.taxExclusiveUnitPrice,
    taxInclusiveAmount: calculated.taxInclusiveAmount,
    taxExclusiveAmount: calculated.taxExclusiveAmount,
    taxAmount: calculated.taxAmount,
    allocationMethod: presetValue(form.get('allocationMethod'), dict?.targetAllocationMethod || ''),
    isDirectAssigned: form.get('isDirectAssigned') === 'on',
    description,
    remark: clean(form.get('remark'))
  };

  if (costLineId) {
    await prisma.costLine.update({ where: { id: costLineId }, data });
  } else {
    await prisma.costLine.create({ data: { ...data, sortOrder: Date.now() % 1000000000 } });
  }

  const baseUrl = getBaseUrl(request);
  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs?saved=1`, 303);
}

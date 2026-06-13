import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
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
  const dict = dictionaryRowId ? await prisma.costDictionaryRow.findUnique({ where: { id: dictionaryRowId } }) : null;

  const version = await prisma.projectVersion.findFirst({ where: { projectId: params.id }, orderBy: { createdAt: 'asc' } }) || await prisma.projectVersion.create({ data: { projectId: params.id, name: '初始版本' } });

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

  const quantity = toNumber(form, 'quantity');
  const taxInclusiveUnitPrice = toNumber(form, 'taxInclusiveUnitPrice');
  const taxRate = toNumber(form, 'taxRate');
  const amounts = taxCalc(quantity, taxInclusiveUnitPrice, taxRate);

  await prisma.costLine.create({
    data: {
      projectVersionId: version.id,
      costSubjectId: costSubject.id,
      detailName: String(form.get('detailName') || subjectName),
      regionOrProductType: String(form.get('regionOrProductType') || '项目整体共用'),
      professionalGroup,
      measureBasis: String(form.get('measureBasis') || dict?.measureBasis || ''),
      quantity,
      unit: String(form.get('unit') || dict?.unit || '项'),
      taxInclusiveUnitPrice,
      taxExclusiveUnitPrice: amounts.taxExclusiveUnitPrice,
      taxRate,
      taxInclusiveAmount: amounts.taxInclusiveAmount,
      taxExclusiveAmount: amounts.taxExclusiveAmount,
      taxAmount: amounts.taxAmount,
      allocationMethod: String(form.get('allocationMethod') || dict?.targetAllocationMethod || '建筑面积分摊'),
      description: dict ? [dict.firstSubject, dict.secondSubject, dict.thirdSubject, dict.detailSubject].filter(Boolean).join(' / ') : professionalGroup,
      remark: String(form.get('remark') || ''),
      sortOrder: Date.now() % 1000000000
    }
  });

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${returnPath}?saved=1`, 303);
}

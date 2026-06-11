import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);

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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const version = await getOrCreateVersion(params.id);
  const costSubjectId = String(form.get('costSubjectId') || '');
  const productTypeId = String(form.get('productTypeId') || '');
  const quantity = toNumber(form, 'quantity');
  const taxInclusiveUnitPrice = toNumber(form, 'taxInclusiveUnitPrice');
  const taxRate = toNumber(form, 'taxRate') || 0.09;
  const calculated = calcCost(quantity, taxInclusiveUnitPrice, taxRate);

  await prisma.costLine.create({
    data: {
      projectVersionId: version.id,
      costSubjectId,
      productTypeId: productTypeId || null,
      detailName: String(form.get('detailName') || '未命名成本明细'),
      regionOrProductType: String(form.get('regionOrProductType') || ''),
      professionalGroup: String(form.get('professionalGroup') || ''),
      measureBasis: String(form.get('measureBasis') || ''),
      quantity,
      unit: String(form.get('unit') || ''),
      taxRate,
      taxInclusiveUnitPrice,
      taxExclusiveUnitPrice: calculated.taxExclusiveUnitPrice,
      taxInclusiveAmount: calculated.taxInclusiveAmount,
      taxExclusiveAmount: calculated.taxExclusiveAmount,
      taxAmount: calculated.taxAmount,
      allocationMethod: String(form.get('allocationMethod') || ''),
      isDirectAssigned: form.get('isDirectAssigned') === 'on',
      description: String(form.get('description') || ''),
      remark: String(form.get('remark') || '')
    }
  });

  const baseUrl = getBaseUrl(request);
  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/costs?saved=1`, 303);
}

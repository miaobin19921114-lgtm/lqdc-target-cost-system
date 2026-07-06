import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { costLineQuantityPatch, costLineV101FieldsFromForm } from '@/lib/cost-line-quantity-fields';

const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

async function getLandSubject() {
  const subject = await prisma.costSubject.findFirst({ where: { code: '01' } });
  if (subject) return subject;
  return prisma.costSubject.create({ data: { code: '01', name: '土地获取费', level: 1, sortOrder: 1 } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/land?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/land?locked=1`, 303);
  const landSubject = await getLandSubject();

  let landMu = toNumber(form, 'landMu');
  const priceWanPerMu = toNumber(form, 'priceWanPerMu');
  const taxRate = toNumber(form, 'taxRate');
  const taxInclusiveUnitPrice = priceWanPerMu * 10000;
  const semanticPatch = costLineV101FieldsFromForm(form, (field) => field);
  const quantityState = costLineQuantityPatch({
    ...semanticPatch,
    measureValue: landMu,
    coefficient: 1,
    quantity: landMu,
    taxInclusiveUnitPrice
  });
  landMu = Number(quantityState.quantity || 0);
  const taxInclusiveAmount = round2(landMu * taxInclusiveUnitPrice);
  const taxExclusiveAmount = taxRate ? round2(taxInclusiveAmount / (1 + taxRate)) : taxInclusiveAmount;
  const taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
  const taxExclusiveUnitPrice = taxRate ? round2(taxInclusiveUnitPrice / (1 + taxRate)) : taxInclusiveUnitPrice;

  await prisma.costLine.create({
    data: {
      projectVersionId: version.id,
      costSubjectId: landSubject.id,
      detailName: String(form.get('detailName') || '土地款'),
      regionOrProductType: String(form.get('regionOrProductType') || '项目整体'),
      professionalGroup: '土地费用',
      measureBasis: '土地面积（亩）',
      measureValue: landMu,
      coefficient: 1,
      ...semanticPatch,
      quantity: landMu,
      quantitySource: quantityState.quantitySource,
      quantityStatus: quantityState.quantityStatus,
      quantityFormula: quantityState.quantityFormula,
      unit: '亩',
      taxRate,
      taxInclusiveUnitPrice,
      taxExclusiveUnitPrice,
      taxInclusiveAmount,
      taxExclusiveAmount,
      taxAmount,
      pricingUnit: semanticPatch.pricingUnit ?? '元/亩',
      amountStatus: quantityState.amountStatus,
      allocationMethod: String(form.get('allocationMethod') || '可售面积分摊'),
      isDirectAssigned: false,
      description: String(form.get('description') || ''),
      remark: String(form.get('remark') || '')
    }
  });

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/land?saved=1`, 303);
}

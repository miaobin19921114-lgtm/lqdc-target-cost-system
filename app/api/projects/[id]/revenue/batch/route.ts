import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { getEditableActiveVersion } from '@/lib/project-version';

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function toNumber(form: FormData, name: string) {
  const value = Number(clean(form, name));
  return Number.isFinite(value) ? value : 0;
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

async function upsertRevenueLine(input: { projectVersionId: string; productTypeId: string; saleableArea: number; salePrice: number; taxRate: number }) {
  const result = calculateRevenueLine(input.saleableArea, input.salePrice, input.taxRate);
  const data = {
    saleableArea: input.saleableArea,
    salePrice: input.salePrice,
    taxRate: input.taxRate,
    taxInclusiveRevenue: result.taxInclusiveRevenue,
    taxExclusiveRevenue: result.taxExclusiveRevenue,
    taxAmount: result.taxAmount,
    remark: '按业态指标自动同步'
  };
  const old = await prisma.revenueLine.findFirst({ where: { projectVersionId: input.projectVersionId, productTypeId: input.productTypeId } });
  if (old) await prisma.revenueLine.update({ where: { id: old.id }, data });
  else await prisma.revenueLine.create({ data: { projectVersionId: input.projectVersionId, productTypeId: input.productTypeId, ...data } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const rowCount = Math.max(0, Math.min(200, Number(form.get('rowCount') || 0)));
  let savedCount = 0;

  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/revenue?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/revenue?locked=1`, 303);

  const tax = await prisma.taxParameter.findUnique({ where: { projectVersionId: version.id } });
  const taxRate = Number(tax?.vatRate || 0.09);

  for (let index = 0; index < rowCount; index += 1) {
    const productId = clean(form, `productId-${index}`);
    if (!productId) continue;
    const product = await prisma.productType.findFirst({ where: { id: productId, projectVersionId: version.id, isActive: true, isSaleable: true } });
    if (!product) continue;
    const salePrice = toNumber(form, `salePrice-${index}`);
    const updated = await prisma.productType.update({ where: { id: productId }, data: { salePrice } });
    await upsertRevenueLine({
      projectVersionId: version.id,
      productTypeId: productId,
      saleableArea: Number(updated.saleableArea || 0),
      salePrice,
      taxRate
    });
    savedCount += 1;
  }

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/revenue?saved=1&synced=1&rows=${savedCount}`, 303);
}

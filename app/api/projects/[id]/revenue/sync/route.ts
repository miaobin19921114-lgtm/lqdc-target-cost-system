import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { getEditableActiveVersion } from '@/lib/project-version';

export const runtime = 'nodejs';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function isParkingProduct(name?: string | null) {
  const value = name || '';
  return value.includes('车位') || value.includes('人防');
}

function isChargingProduct(name?: string | null) {
  return (name || '').includes('充电');
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
    remark: '按普通业态面积自动同步'
  };
  const old = await prisma.revenueLine.findFirst({ where: { projectVersionId: input.projectVersionId, productTypeId: input.productTypeId } });
  if (old) await prisma.revenueLine.update({ where: { id: old.id }, data });
  else await prisma.revenueLine.create({ data: { projectVersionId: input.projectVersionId, productTypeId: input.productTypeId, ...data } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { version, locked } = await getEditableActiveVersion(params.id);
  const back = `${getBaseUrl(request)}/projects/${params.id}/revenue`;
  if (!version) return NextResponse.redirect(`${back}?synced=0`, 303);
  if (locked) return NextResponse.redirect(`${back}?locked=1`, 303);

  const tax = await prisma.taxParameter.findUnique({ where: { projectVersionId: version.id } });
  const taxRate = Number(tax?.vatRate || 0.09);
  const products = await prisma.productType.findMany({ where: { projectVersionId: version.id, isActive: true, isSaleable: true } });
  const ordinaryProducts = products.filter((product) => !isParkingProduct(product.name) && !isChargingProduct(product.name));

  let count = 0;
  for (const product of ordinaryProducts) {
    await upsertRevenueLine({
      projectVersionId: version.id,
      productTypeId: product.id,
      saleableArea: Number(product.saleableArea || 0),
      salePrice: Number(product.salePrice || 0),
      taxRate
    });
    count += 1;
  }

  await prisma.revenueLine.deleteMany({
    where: {
      projectVersionId: version.id,
      OR: [
        { productType: { isActive: false } },
        { productType: { isSaleable: false } },
        { productType: { name: { contains: '充电' } } }
      ]
    }
  });

  return NextResponse.redirect(`${back}?synced=1&rows=${count}`, 303);
}

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

async function upsertRevenueLine(input: { projectVersionId: string; productTypeId: string; count: number; salePrice: number; taxRate: number }) {
  const result = calculateRevenueLine(input.count, input.salePrice, input.taxRate);
  const data = {
    saleableArea: input.count,
    salePrice: input.salePrice,
    taxRate: input.taxRate,
    taxInclusiveRevenue: result.taxInclusiveRevenue,
    taxExclusiveRevenue: result.taxExclusiveRevenue,
    taxAmount: result.taxAmount,
    remark: '车位收入按个数×单价自动同步；saleableArea 字段暂存车位个数'
  };
  const old = await prisma.revenueLine.findFirst({ where: { projectVersionId: input.projectVersionId, productTypeId: input.productTypeId } });
  if (old) await prisma.revenueLine.update({ where: { id: old.id }, data });
  else await prisma.revenueLine.create({ data: { projectVersionId: input.projectVersionId, productTypeId: input.productTypeId, ...data } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const rowCount = Math.max(0, Math.min(20, Number(form.get('rowCount') || 0)));
  const back = `${getBaseUrl(request)}/projects/${params.id}/parking-revenue`;
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${back}?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${back}?locked=1`, 303);

  const tax = await prisma.taxParameter.findUnique({ where: { projectVersionId: version.id } });
  const taxRate = Number(tax?.vatRate || 0.09);
  let savedCount = 0;

  for (let index = 0; index < rowCount; index += 1) {
    const name = clean(form, `name-${index}`);
    const count = toNumber(form, `count-${index}`);
    const salePrice = toNumber(form, `salePrice-${index}`);
    if (!name || count <= 0) continue;

    const existing = await prisma.productType.findFirst({ where: { projectVersionId: version.id, name } });
    const product = existing
      ? await prisma.productType.update({
          where: { id: existing.id },
          data: { saleableArea: count, buildingArea: 0, capacityArea: 0, salePrice, isSaleable: true, isActive: true, participateAllocation: true, allocationWeight: 1, remark: '车位收入按个数×单价测算' }
        })
      : await prisma.productType.create({
          data: { projectVersionId: version.id, name, saleableArea: count, buildingArea: 0, capacityArea: 0, salePrice, isSaleable: true, isActive: true, participateAllocation: true, allocationWeight: 1, remark: '车位收入按个数×单价测算' }
        });

    await upsertRevenueLine({ projectVersionId: version.id, productTypeId: product.id, count, salePrice, taxRate });
    savedCount += 1;
  }

  return NextResponse.redirect(`${back}?saved=1&rows=${savedCount}`, 303);
}

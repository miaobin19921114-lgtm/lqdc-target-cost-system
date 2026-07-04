import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { isVersionLocked, VERSION_LOCKED_MESSAGE } from '@/lib/project-version';

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function isParkingProduct(name?: string | null) {
  return /车位|车库|停车|人防车位|非人防|充电桩车位|立体车位/.test(String(name || ''));
}

export async function POST(_request: Request, { params }: { params: { versionId: string } }) {
  const version = await prisma.projectVersion.findUnique({
    where: { id: params.versionId },
    include: {
      taxes: true,
      products: { where: { isActive: true, isSaleable: true } },
      revenues: { include: { productType: true } }
    }
  });
  if (!version) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return jsonError('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423);

  const enabledIds = new Set(version.products.map((product) => product.id));
  const taxRateDefault = Number(version.taxes?.vatRate || 0.09);
  const recalculated = [];

  for (const row of version.revenues.filter((item) => enabledIds.has(item.productTypeId))) {
    const parking = isParkingProduct(row.productType?.name);
    const quantity = parking ? n(row.productType?.parkingCount) || n(row.saleableArea) : n(row.saleableArea);
    if (parking && quantity <= 0) return jsonError('INCOME_CALCULATION_INVALID', '车位收入必须有 parkingCount。');
    const result = calculateRevenueLine(quantity, n(row.salePrice), n(row.taxRate) || taxRateDefault);
    recalculated.push({ id: row.id, quantity, ...result });
  }

  await prisma.$transaction(
    recalculated.map((row) =>
      prisma.revenueLine.update({
        where: { id: row.id },
        data: {
          saleableArea: row.quantity,
          taxInclusiveRevenue: row.taxInclusiveRevenue,
          taxExclusiveRevenue: row.taxExclusiveRevenue,
          taxAmount: row.taxAmount
        }
      })
    )
  );

  return NextResponse.json({ success: true, data: { recalculatedCount: recalculated.length } });
}

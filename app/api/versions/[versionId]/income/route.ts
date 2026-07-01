import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { isVersionLocked } from '@/lib/project-version';

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

async function loadVersion(versionId: string) {
  return prisma.projectVersion.findUnique({
    where: { id: versionId },
    include: { taxes: true, products: { where: { isActive: true }, orderBy: { name: 'asc' } } }
  });
}

export async function GET(_request: Request, { params }: { params: { versionId: string } }) {
  const version = await loadVersion(params.versionId);
  if (!version) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const enabledIds = new Set(version.products.map((product) => product.id));
  const revenues = await prisma.revenueLine.findMany({
    where: { projectVersionId: params.versionId, productTypeId: { in: [...enabledIds] } },
    include: { productType: true }
  });
  const rowsByProductId = new Map(revenues.map((row) => [row.productTypeId, row]));

  return NextResponse.json({
    success: true,
    data: version.products.filter((product) => product.isSaleable).map((product) => {
      const row = rowsByProductId.get(product.id);
      if (!row) {
        const parking = isParkingProduct(product.name);
        return {
          id: null,
          productTypeId: product.id,
          productTypeName: product.name,
          incomeType: parking ? 'parking' : 'saleable_property',
          saleableArea: 0,
          unitPrice: 0,
          parkingCount: 0,
          parkingUnitPrice: 0,
          taxRate: Number(version.taxes?.vatRate || 0.09),
          taxInclusiveRevenue: 0,
          taxExclusiveRevenue: 0,
          taxAmount: 0,
          remark: null
        };
      }
      const parking = isParkingProduct(row.productType?.name);
      return {
        id: row.id,
        productTypeId: row.productTypeId,
        productTypeName: row.productType?.name || '',
        incomeType: parking ? 'parking' : 'saleable_property',
        saleableArea: parking ? 0 : Number(row.saleableArea || 0),
        unitPrice: parking ? 0 : Number(row.salePrice || 0),
        parkingCount: parking ? Number(row.saleableArea || 0) : Number(row.productType?.parkingCount || 0),
        parkingUnitPrice: parking ? Number(row.salePrice || 0) : 0,
        taxRate: Number(row.taxRate || 0),
        taxInclusiveRevenue: Number(row.taxInclusiveRevenue || 0),
        taxExclusiveRevenue: Number(row.taxExclusiveRevenue || 0),
        taxAmount: Number(row.taxAmount || 0),
        remark: row.remark
      };
    })
  });
}

export async function PUT(request: Request, { params }: { params: { versionId: string } }) {
  const version = await loadVersion(params.versionId);
  if (!version) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version)) return jsonError('VERSION_LOCKED', '当前测算版本已锁定，不能修改收入测算。', 423);

  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const enabledProducts = new Map(version.products.map((product) => [product.id, product]));
  const taxRateDefault = Number(version.taxes?.vatRate || 0.09);

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const productTypeId = String(row.productTypeId || '');
        const product = enabledProducts.get(productTypeId);
        if (!product) throw new Error('PRODUCT_TYPE_DISABLED');
        const parking = isParkingProduct(product.name);
        if (parking && String(row.pricingUnit || '') === '元/㎡') throw new Error('PARKING_UNIT_INVALID');

        const quantity = parking ? n(row.parkingCount) : n(row.saleableArea);
        const price = parking ? n(row.parkingUnitPrice) : n(row.unitPrice ?? row.salePrice);
        if (parking && quantity <= 0) throw new Error('PARKING_COUNT_REQUIRED');

        const taxRate = n(row.taxRate ?? taxRateDefault) || taxRateDefault;
        const result = calculateRevenueLine(quantity, price, taxRate);
        await tx.productType.update({
          where: { id: productTypeId },
          data: parking ? { parkingCount: Math.round(quantity), saleableArea: quantity, salePrice: price } : { saleableArea: quantity, salePrice: price }
        });
        await tx.revenueLine.upsert({
          where: { id: String(row.id || '') },
          update: {
            saleableArea: quantity,
            salePrice: price,
            taxRate,
            taxInclusiveRevenue: result.taxInclusiveRevenue,
            taxExclusiveRevenue: result.taxExclusiveRevenue,
            taxAmount: result.taxAmount,
            remark: parking ? '车位收入按个数×单价测算；saleableArea 字段暂存车位个数' : row.remark || '可售物业按面积×单价测算'
          },
          create: {
            projectVersionId: params.versionId,
            productTypeId,
            saleableArea: quantity,
            salePrice: price,
            taxRate,
            taxInclusiveRevenue: result.taxInclusiveRevenue,
            taxExclusiveRevenue: result.taxExclusiveRevenue,
            taxAmount: result.taxAmount,
            remark: parking ? '车位收入按个数×单价测算；saleableArea 字段暂存车位个数' : row.remark || '可售物业按面积×单价测算'
          }
        });
      }
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'INCOME_CALCULATION_INVALID';
    const message =
      code === 'PRODUCT_TYPE_DISABLED'
        ? '停用业态不能参与收入测算。'
        : code === 'PARKING_UNIT_INVALID'
          ? '车位收入计价单位不得为 元/㎡，必须按个数×单价测算。'
          : code === 'PARKING_COUNT_REQUIRED'
            ? '车位收入必须填写 parkingCount。'
            : '收入测算校验失败。';
    return jsonError('INCOME_CALCULATION_INVALID', message);
  }

  return NextResponse.json({ success: true, data: { savedCount: rows.length } });
}

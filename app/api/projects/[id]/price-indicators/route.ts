import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { priceIndicatorPresets } from '@/data/price-indicator-presets';

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toString' in value) return Number(value.toString()) || 0;
  return Number(value || 0) || 0;
}

function normalize(row: Record<string, unknown>) {
  return {
    id: String(row.id || ''),
    costCode: String(row.costCode || ''),
    subjectName: String(row.subjectName || ''),
    indicatorName: String(row.indicatorName || ''),
    region: String(row.region || '全国'),
    city: String(row.city || '通用'),
    productType: String(row.productType || '通用'),
    stage: String(row.stage || 'SCHEME'),
    standardLevel: String(row.standardLevel || '标准'),
    quantityUnit: String(row.quantityUnit || ''),
    pricingUnit: String(row.pricingUnit || ''),
    taxInclusiveUnitPrice: toNumber(row.taxInclusiveUnitPrice),
    taxExclusiveUnitPrice: toNumber(row.taxExclusiveUnitPrice),
    taxRate: toNumber(row.taxRate),
    sourceType: String(row.sourceType || 'experience'),
    sourceName: String(row.sourceName || ''),
    confidence: toNumber(row.confidence),
    remark: String(row.remark || '')
  };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { city: true } });
  const city = project?.city || '成都';

  try {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM "PriceIndicatorLibrary"
      WHERE "enabled" = TRUE
      ORDER BY
        CASE WHEN "city" = ${city} THEN 0 ELSE 1 END,
        "costCode" ASC,
        "confidence" DESC,
        "updatedAt" DESC
    `;
    return NextResponse.json({ city, indicators: rows.map(normalize) });
  } catch {
    return NextResponse.json({
      city,
      indicators: priceIndicatorPresets.map((row, index) => ({
        id: `preset-${index}`,
        ...row,
        taxExclusiveUnitPrice: row.taxInclusiveUnitPrice / (1 + row.taxRate)
      }))
    });
  }
}

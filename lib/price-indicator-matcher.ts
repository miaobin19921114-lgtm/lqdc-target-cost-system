import type { PrismaClient } from '@prisma/client';
import { priceIndicatorPresets } from '@/data/price-indicator-presets';

type PriceIndicatorRow = {
  costCode: string;
  indicatorName: string;
  city: string;
  productType: string;
  quantityUnit: string;
  pricingUnit: string;
  taxInclusiveUnitPrice: number;
  taxRate: number;
  sourceName: string;
  confidence: number;
};

type PriceInput = {
  projectId: string;
  costCode: string;
  regionOrProductType?: string | null;
  fallbackUnit?: string | null;
};

export type RecommendedPrice = {
  applied: boolean;
  taxInclusiveUnitPrice: number;
  taxRate: number;
  quantityUnit?: string | null;
  pricingUnit?: string | null;
  source?: string;
};

function toNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value && typeof value === 'object' && 'toString' in value) return Number(value.toString()) || 0;
  return Number(value || 0) || 0;
}

function normalize(row: Record<string, unknown>): PriceIndicatorRow {
  return {
    costCode: String(row.costCode || ''),
    indicatorName: String(row.indicatorName || ''),
    city: String(row.city || '通用'),
    productType: String(row.productType || '通用'),
    quantityUnit: String(row.quantityUnit || ''),
    pricingUnit: String(row.pricingUnit || ''),
    taxInclusiveUnitPrice: toNumber(row.taxInclusiveUnitPrice),
    taxRate: toNumber(row.taxRate) || 0.09,
    sourceName: String(row.sourceName || ''),
    confidence: toNumber(row.confidence)
  };
}

function costCodeMatches(target: string, candidate: string) {
  if (!target || !candidate) return false;
  return target === candidate || target.startsWith(`${candidate}.`) || candidate.startsWith(`${target}.`);
}

function textMatches(text: string, row: PriceIndicatorRow) {
  if (!text) return false;
  return text.includes(row.productType) || text.includes(row.indicatorName);
}

async function loadPriceRows(prisma: PrismaClient, city: string) {
  try {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT "costCode", "indicatorName", "city", "productType", "quantityUnit", "pricingUnit", "taxInclusiveUnitPrice", "taxRate", "sourceName", "confidence"
      FROM "PriceIndicatorLibrary"
      WHERE "enabled" = TRUE
      ORDER BY
        CASE WHEN "city" = ${city} THEN 0 ELSE 1 END,
        "costCode" ASC,
        "confidence" DESC,
        "updatedAt" DESC
    `;
    return rows.map(normalize);
  } catch {
    return priceIndicatorPresets.map((row) => ({
      costCode: row.costCode,
      indicatorName: row.indicatorName,
      city: row.city,
      productType: row.productType,
      quantityUnit: row.quantityUnit,
      pricingUnit: row.pricingUnit,
      taxInclusiveUnitPrice: row.taxInclusiveUnitPrice,
      taxRate: row.taxRate,
      sourceName: row.sourceName,
      confidence: row.confidence
    }));
  }
}

export async function recommendPriceIndicator(prisma: PrismaClient, input: PriceInput): Promise<RecommendedPrice> {
  const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { city: true } });
  const city = project?.city || '成都';
  const rows = await loadPriceRows(prisma, city);
  const text = String(input.regionOrProductType || '').trim();
  const candidates = rows.filter((row) => costCodeMatches(input.costCode, row.costCode));
  if (!candidates.length) {
    return { applied: false, taxInclusiveUnitPrice: 0, taxRate: 0.09, quantityUnit: input.fallbackUnit };
  }

  const sorted = candidates.sort((a, b) => {
    const cityScore = Number(b.city === city) - Number(a.city === city);
    if (cityScore) return cityScore;
    const textScore = Number(textMatches(text, b)) - Number(textMatches(text, a));
    if (textScore) return textScore;
    const codeScore = b.costCode.length - a.costCode.length;
    if (codeScore) return codeScore;
    return b.confidence - a.confidence;
  });
  const best = sorted[0];
  if (!best.taxInclusiveUnitPrice) {
    return { applied: false, taxInclusiveUnitPrice: 0, taxRate: best.taxRate || 0.09, quantityUnit: input.fallbackUnit };
  }

  return {
    applied: true,
    taxInclusiveUnitPrice: best.taxInclusiveUnitPrice,
    taxRate: best.taxRate || 0.09,
    quantityUnit: best.quantityUnit || input.fallbackUnit,
    pricingUnit: best.pricingUnit,
    source: `量价库：${best.indicatorName}${best.sourceName ? `｜${best.sourceName}` : ''}`
  };
}

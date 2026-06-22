import { PrismaClient } from '@prisma/client';
import { priceIndicatorPresets } from '../data/price-indicator-presets';

const prisma = new PrismaClient();

function rowId(seed: (typeof priceIndicatorPresets)[number]) {
  return `${seed.costCode}-${seed.indicatorName}-${seed.city}-${seed.productType}-${seed.stage}`.replace(/[^\w\u4e00-\u9fa5.-]/g, '-').slice(0, 120);
}

async function main() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "PriceIndicatorLibrary" (
      "id" TEXT PRIMARY KEY,
      "costCode" TEXT NOT NULL,
      "subjectName" TEXT,
      "indicatorName" TEXT NOT NULL,
      "region" TEXT DEFAULT '全国',
      "city" TEXT DEFAULT '通用',
      "productType" TEXT DEFAULT '通用',
      "stage" TEXT DEFAULT 'SCHEME',
      "standardLevel" TEXT DEFAULT '标准',
      "quantityUnit" TEXT,
      "pricingUnit" TEXT,
      "taxInclusiveUnitPrice" DECIMAL(18, 4) DEFAULT 0,
      "taxExclusiveUnitPrice" DECIMAL(18, 4) DEFAULT 0,
      "taxRate" DECIMAL(8, 4) DEFAULT 0.09,
      "sourceType" TEXT DEFAULT 'experience',
      "sourceName" TEXT,
      "effectiveDate" TEXT,
      "confidence" DECIMAL(8, 4) DEFAULT 0.6,
      "enabled" BOOLEAN DEFAULT TRUE,
      "remark" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("costCode", "indicatorName", "region", "city", "productType", "stage", "standardLevel")
    )`;

  for (const seed of priceIndicatorPresets) {
    const taxExclusiveUnitPrice = seed.taxInclusiveUnitPrice / (1 + seed.taxRate);
    await prisma.$executeRaw`
      INSERT INTO "PriceIndicatorLibrary" (
        "id", "costCode", "subjectName", "indicatorName", "region", "city", "productType", "stage", "standardLevel", "quantityUnit", "pricingUnit", "taxInclusiveUnitPrice", "taxExclusiveUnitPrice", "taxRate", "sourceType", "sourceName", "effectiveDate", "confidence", "enabled", "remark", "updatedAt"
      ) VALUES (${rowId(seed)}, ${seed.costCode}, ${seed.subjectName}, ${seed.indicatorName}, ${seed.region}, ${seed.city}, ${seed.productType}, ${seed.stage}, ${seed.standardLevel}, ${seed.quantityUnit}, ${seed.pricingUnit}, ${seed.taxInclusiveUnitPrice}, ${taxExclusiveUnitPrice}, ${seed.taxRate}, ${seed.sourceType}, ${seed.sourceName}, ${new Date().toISOString().slice(0, 10)}, ${seed.confidence}, TRUE, ${seed.remark || null}, CURRENT_TIMESTAMP)
      ON CONFLICT ("costCode", "indicatorName", "region", "city", "productType", "stage", "standardLevel") DO UPDATE SET
        "subjectName" = EXCLUDED."subjectName",
        "quantityUnit" = EXCLUDED."quantityUnit",
        "pricingUnit" = EXCLUDED."pricingUnit",
        "taxInclusiveUnitPrice" = EXCLUDED."taxInclusiveUnitPrice",
        "taxExclusiveUnitPrice" = EXCLUDED."taxExclusiveUnitPrice",
        "taxRate" = EXCLUDED."taxRate",
        "sourceType" = EXCLUDED."sourceType",
        "sourceName" = EXCLUDED."sourceName",
        "effectiveDate" = EXCLUDED."effectiveDate",
        "confidence" = EXCLUDED."confidence",
        "enabled" = TRUE,
        "remark" = EXCLUDED."remark",
        "updatedAt" = CURRENT_TIMESTAMP`;
  }

  console.log(`Seeded ${priceIndicatorPresets.length} price indicator rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

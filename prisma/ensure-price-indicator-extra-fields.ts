import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "priceType" TEXT DEFAULT 'experience_indicator'`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "dataScope" TEXT DEFAULT 'general'`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "sourceProjectName" TEXT`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "sourceContractName" TEXT`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "brandOrSpec" TEXT`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "materialName" TEXT`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "laborOrMachine" TEXT`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "minUnitPrice" DECIMAL(18,4) DEFAULT 0`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "maxUnitPrice" DECIMAL(18,4) DEFAULT 0`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "sampleCount" INTEGER DEFAULT 0`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "effectiveStartDate" TEXT`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "effectiveEndDate" TEXT`,
  `ALTER TABLE "PriceIndicatorLibrary" ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT DEFAULT 'draft'`,

  `CREATE INDEX IF NOT EXISTS "PriceIndicatorLibrary_priceType_idx" ON "PriceIndicatorLibrary" ("priceType")`,
  `CREATE INDEX IF NOT EXISTS "PriceIndicatorLibrary_dataScope_idx" ON "PriceIndicatorLibrary" ("dataScope")`,
  `CREATE INDEX IF NOT EXISTS "PriceIndicatorLibrary_sourceProjectName_idx" ON "PriceIndicatorLibrary" ("sourceProjectName")`,
  `CREATE INDEX IF NOT EXISTS "PriceIndicatorLibrary_sourceContractName_idx" ON "PriceIndicatorLibrary" ("sourceContractName")`,
  `CREATE INDEX IF NOT EXISTS "PriceIndicatorLibrary_materialName_idx" ON "PriceIndicatorLibrary" ("materialName")`,
  `CREATE INDEX IF NOT EXISTS "PriceIndicatorLibrary_laborOrMachine_idx" ON "PriceIndicatorLibrary" ("laborOrMachine")`,
  `CREATE INDEX IF NOT EXISTS "PriceIndicatorLibrary_reviewStatus_idx" ON "PriceIndicatorLibrary" ("reviewStatus")`
];

async function main() {
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
  console.log('Ensured PriceIndicatorLibrary extra business fields.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

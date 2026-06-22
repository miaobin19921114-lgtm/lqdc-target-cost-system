import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "ruleType" TEXT DEFAULT 'quantity'`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "calculationLevel" TEXT DEFAULT 'project'`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "formulaExpression" TEXT`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "quantitySourcePriority" TEXT`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "priceSourcePriority" TEXT`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "applicableStage" TEXT`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "applicableRegion" TEXT`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "applicableStandardLevel" TEXT`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "needBuildingDetail" BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "needProductTypeDetail" BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE "MeasureBasisRule" ADD COLUMN IF NOT EXISTS "needManualReview" BOOLEAN DEFAULT FALSE`,

  `CREATE INDEX IF NOT EXISTS "MeasureBasisRule_ruleType_idx" ON "MeasureBasisRule" ("ruleType")`,
  `CREATE INDEX IF NOT EXISTS "MeasureBasisRule_calculationLevel_idx" ON "MeasureBasisRule" ("calculationLevel")`,
  `CREATE INDEX IF NOT EXISTS "MeasureBasisRule_applicableStage_idx" ON "MeasureBasisRule" ("applicableStage")`,
  `CREATE INDEX IF NOT EXISTS "MeasureBasisRule_applicableRegion_idx" ON "MeasureBasisRule" ("applicableRegion")`,
  `CREATE INDEX IF NOT EXISTS "MeasureBasisRule_applicableStandardLevel_idx" ON "MeasureBasisRule" ("applicableStandardLevel")`,
  `CREATE INDEX IF NOT EXISTS "MeasureBasisRule_needBuildingDetail_idx" ON "MeasureBasisRule" ("needBuildingDetail")`,
  `CREATE INDEX IF NOT EXISTS "MeasureBasisRule_needProductTypeDetail_idx" ON "MeasureBasisRule" ("needProductTypeDetail")`,
  `CREATE INDEX IF NOT EXISTS "MeasureBasisRule_needManualReview_idx" ON "MeasureBasisRule" ("needManualReview")`
];

async function main() {
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
  console.log('Ensured MeasureBasisRule extra business fields.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

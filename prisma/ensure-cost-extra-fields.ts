import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements = [
  // CostSubject: make the subject tree drive source table, dynamic cost, contract and tax allocation logic.
  `ALTER TABLE "CostSubject" ADD COLUMN IF NOT EXISTS "subjectType" TEXT`,
  `ALTER TABLE "CostSubject" ADD COLUMN IF NOT EXISTS "costNature" TEXT`,
  `ALTER TABLE "CostSubject" ADD COLUMN IF NOT EXISTS "sourceDetailTable" TEXT`,
  `ALTER TABLE "CostSubject" ADD COLUMN IF NOT EXISTS "isContractable" BOOLEAN DEFAULT TRUE`,
  `ALTER TABLE "CostSubject" ADD COLUMN IF NOT EXISTS "isDynamicTrackable" BOOLEAN DEFAULT TRUE`,
  `ALTER TABLE "CostSubject" ADD COLUMN IF NOT EXISTS "taxDeductionCategory" TEXT`,
  `ALTER TABLE "CostSubject" ADD COLUMN IF NOT EXISTS "landVatAllocationMethod" TEXT`,
  `ALTER TABLE "CostSubject" ADD COLUMN IF NOT EXISTS "incomeTaxCostCategory" TEXT`,

  // CostLine: keep calculation traceability and later review/risk workflow.
  `ALTER TABLE "CostLine" ADD COLUMN IF NOT EXISTS "sourceType" TEXT DEFAULT 'manual'`,
  `ALTER TABLE "CostLine" ADD COLUMN IF NOT EXISTS "sourceRef" TEXT`,
  `ALTER TABLE "CostLine" ADD COLUMN IF NOT EXISTS "measureRuleId" TEXT`,
  `ALTER TABLE "CostLine" ADD COLUMN IF NOT EXISTS "priceIndicatorRef" TEXT`,
  `ALTER TABLE "CostLine" ADD COLUMN IF NOT EXISTS "priceOverride" BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE "CostLine" ADD COLUMN IF NOT EXISTS "amountOverride" BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE "CostLine" ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT DEFAULT 'draft'`,
  `ALTER TABLE "CostLine" ADD COLUMN IF NOT EXISTS "riskLevel" TEXT`,

  `CREATE INDEX IF NOT EXISTS "CostSubject_subjectType_idx" ON "CostSubject" ("subjectType")`,
  `CREATE INDEX IF NOT EXISTS "CostSubject_costNature_idx" ON "CostSubject" ("costNature")`,
  `CREATE INDEX IF NOT EXISTS "CostSubject_isContractable_idx" ON "CostSubject" ("isContractable")`,
  `CREATE INDEX IF NOT EXISTS "CostSubject_isDynamicTrackable_idx" ON "CostSubject" ("isDynamicTrackable")`,
  `CREATE INDEX IF NOT EXISTS "CostSubject_taxDeductionCategory_idx" ON "CostSubject" ("taxDeductionCategory")`,
  `CREATE INDEX IF NOT EXISTS "CostLine_sourceType_idx" ON "CostLine" ("sourceType")`,
  `CREATE INDEX IF NOT EXISTS "CostLine_measureRuleId_idx" ON "CostLine" ("measureRuleId")`,
  `CREATE INDEX IF NOT EXISTS "CostLine_priceIndicatorRef_idx" ON "CostLine" ("priceIndicatorRef")`,
  `CREATE INDEX IF NOT EXISTS "CostLine_reviewStatus_idx" ON "CostLine" ("reviewStatus")`,
  `CREATE INDEX IF NOT EXISTS "CostLine_riskLevel_idx" ON "CostLine" ("riskLevel")`
];

async function main() {
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
  console.log('Ensured CostSubject and CostLine extra business fields.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

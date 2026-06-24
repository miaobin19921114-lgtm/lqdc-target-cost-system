import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function safeExecute(label: string, sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`OK: ${label}`);
  } catch (error) {
    console.warn(`Skipped: ${label}`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  await safeExecute('create DetailCalculationResult', `
    CREATE TABLE IF NOT EXISTS "DetailCalculationResult" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "versionId" TEXT NOT NULL,
      "versionSnapshotId" TEXT NOT NULL,
      "sourceRuleId" TEXT NOT NULL,
      "detailType" TEXT NOT NULL,
      "ruleType" TEXT NOT NULL DEFAULT 'COST',
      "subjectCode" TEXT NOT NULL,
      "subjectName" TEXT NOT NULL,
      "applicableStage" TEXT NOT NULL,
      "precisionLevel" TEXT NOT NULL,
      "areaBizType" TEXT,
      "areaZone" TEXT,
      "professionalGroup" TEXT,
      "measureBasis" TEXT,
      "quantityFormula" TEXT,
      "pricingUnit" TEXT,
      "unitPriceSource" TEXT,
      "quantity" DECIMAL(18,4),
      "unitPrice" DECIMAL(18,2),
      "taxRate" DECIMAL(10,4),
      "taxInclusiveAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "taxExclusiveAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "amountFormula" TEXT,
      "costAttributionMethod" TEXT,
      "allocationMethod" TEXT,
      "vatTreatment" TEXT,
      "landVatTreatment" TEXT,
      "incomeTaxTreatment" TEXT,
      "calculationStatus" TEXT NOT NULL DEFAULT 'draft',
      "isManualAdjusted" BOOLEAN NOT NULL DEFAULT FALSE,
      "remark" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DetailCalculationResult_unique" UNIQUE ("versionId", "sourceRuleId", "detailType")
    )
  `);

  await safeExecute('add detail result enhanced columns', `
    ALTER TABLE "DetailCalculationResult"
    ADD COLUMN IF NOT EXISTS "subjectPath" TEXT,
    ADD COLUMN IF NOT EXISTS "majorSubjectCode" TEXT,
    ADD COLUMN IF NOT EXISTS "majorSubjectName" TEXT,
    ADD COLUMN IF NOT EXISTS "regionOrProduct" TEXT,
    ADD COLUMN IF NOT EXISTS "quantityField" TEXT,
    ADD COLUMN IF NOT EXISTS "unit" TEXT,
    ADD COLUMN IF NOT EXISTS "calculationSource" TEXT NOT NULL DEFAULT 'version-rule-snapshot'
  `);

  await safeExecute('create DetailCalculationResult indexes', `
    CREATE INDEX IF NOT EXISTS "DetailCalculationResult_project_version_idx" ON "DetailCalculationResult" ("projectId", "versionId");
    CREATE INDEX IF NOT EXISTS "DetailCalculationResult_detail_type_idx" ON "DetailCalculationResult" ("detailType");
    CREATE INDEX IF NOT EXISTS "DetailCalculationResult_subject_idx" ON "DetailCalculationResult" ("subjectCode");
  `);

  await safeExecute('create DetailCalculationBatch', `
    CREATE TABLE IF NOT EXISTS "DetailCalculationBatch" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "versionId" TEXT NOT NULL,
      "versionSnapshotId" TEXT,
      "detailType" TEXT NOT NULL,
      "batchName" TEXT NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'version-rule-snapshot',
      "generatedRows" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'success',
      "remark" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeExecute('create TargetCostMeasureAggregate', `
    CREATE TABLE IF NOT EXISTS "TargetCostMeasureAggregate" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "versionId" TEXT NOT NULL,
      "subjectCode" TEXT NOT NULL,
      "subjectName" TEXT NOT NULL,
      "ruleType" TEXT NOT NULL DEFAULT 'COST',
      "subjectLevel" INTEGER NOT NULL DEFAULT 0,
      "subjectPath" TEXT,
      "taxInclusiveAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "taxExclusiveAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "buildingAreaUnitCost" DECIMAL(18,2),
      "saleableAreaUnitCost" DECIMAL(18,2),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TargetCostMeasureAggregate_unique" UNIQUE ("versionId", "subjectCode")
    )
  `);

  await safeExecute('create TargetCostSummaryAggregate', `
    CREATE TABLE IF NOT EXISTS "TargetCostSummaryAggregate" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "versionId" TEXT NOT NULL,
      "subjectCode" TEXT NOT NULL,
      "subjectName" TEXT NOT NULL,
      "summaryLevel" INTEGER NOT NULL DEFAULT 1,
      "taxInclusiveAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "taxExclusiveAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "buildingAreaUnitCost" DECIMAL(18,2),
      "saleableAreaUnitCost" DECIMAL(18,2),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TargetCostSummaryAggregate_unique" UNIQUE ("versionId", "subjectCode")
    )
  `);

  console.log('Detail calculation result tables ensured.');
}

main().finally(async () => prisma.$disconnect());

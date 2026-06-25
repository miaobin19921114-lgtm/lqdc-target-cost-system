CREATE TABLE IF NOT EXISTS "CalculationCheck" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "checkObjectType" TEXT NOT NULL,
  "checkObjectId" TEXT,
  "checkRule" TEXT NOT NULL,
  "checkLevel" TEXT NOT NULL DEFAULT 'warning',
  "checkResult" TEXT NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "isProcessed" BOOLEAN NOT NULL DEFAULT false,
  "processedBy" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CalculationCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalculationCheck_projectId_idx"
ON "CalculationCheck"("projectId");

CREATE INDEX IF NOT EXISTS "CalculationCheck_versionId_idx"
ON "CalculationCheck"("versionId");

CREATE INDEX IF NOT EXISTS "CalculationCheck_checkObjectType_idx"
ON "CalculationCheck"("checkObjectType");

CREATE INDEX IF NOT EXISTS "CalculationCheck_checkLevel_idx"
ON "CalculationCheck"("checkLevel");

CREATE INDEX IF NOT EXISTS "CalculationCheck_checkResult_idx"
ON "CalculationCheck"("checkResult");

CREATE INDEX IF NOT EXISTS "CalculationCheck_isProcessed_idx"
ON "CalculationCheck"("isProcessed");

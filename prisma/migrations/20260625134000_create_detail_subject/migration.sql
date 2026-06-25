CREATE TABLE IF NOT EXISTS "DetailSubject" (
  "id" TEXT NOT NULL,
  "costSubjectId" TEXT NOT NULL,
  "detailSubjectCode" TEXT,
  "detailSubjectName" TEXT NOT NULL,
  "subjectFullPath" TEXT,
  "measurementBasis" TEXT,
  "defaultIndicatorSource" TEXT,
  "defaultQuantityUnit" TEXT,
  "defaultPricingUnit" TEXT,
  "defaultTaxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "defaultProductType" TEXT,
  "defaultCostObject" TEXT,
  "participateAllocation" BOOLEAN NOT NULL DEFAULT false,
  "defaultAllocationBasis" TEXT,
  "enterLandVatDeduction" BOOLEAN NOT NULL DEFAULT false,
  "enterIncomeTaxCost" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DetailSubject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DetailSubject_costSubjectId_idx"
ON "DetailSubject"("costSubjectId");

CREATE INDEX IF NOT EXISTS "DetailSubject_detailSubjectCode_idx"
ON "DetailSubject"("detailSubjectCode");

CREATE INDEX IF NOT EXISTS "DetailSubject_detailSubjectName_idx"
ON "DetailSubject"("detailSubjectName");

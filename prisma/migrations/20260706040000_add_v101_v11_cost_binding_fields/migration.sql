-- Additive V1.0.1 + V1.1 target-cost binding support.
-- This migration intentionally avoids drops, rewrites, and destructive changes.

CREATE TABLE IF NOT EXISTS "SubjectIndicatorBinding" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "versionId" TEXT,
    "detailSubjectId" TEXT NOT NULL,
    "costSubjectCode" TEXT NOT NULL,
    "baseIndicatorCode" TEXT,
    "contentRuleCode" TEXT,
    "unitPriceSourceCode" TEXT,
    "calculationMode" TEXT NOT NULL DEFAULT 'quantity_unit_price',
    "defaultFormula" TEXT,
    "allowManualOverride" BOOLEAN NOT NULL DEFAULT true,
    "allowExcelOverride" BOOLEAN NOT NULL DEFAULT true,
    "allowDrawingMeasuredOverride" BOOLEAN NOT NULL DEFAULT true,
    "missingBaseIndicatorAction" TEXT NOT NULL DEFAULT 'warn_and_continue',
    "missingContentRuleAction" TEXT NOT NULL DEFAULT 'warn_and_continue',
    "missingUnitPriceAction" TEXT NOT NULL DEFAULT 'warn_and_continue',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubjectIndicatorBinding_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SubjectIndicatorBinding"
ADD CONSTRAINT "SubjectIndicatorBinding_detailSubjectId_fkey"
FOREIGN KEY ("detailSubjectId") REFERENCES "CostSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SubjectIndicatorBinding"
ADD CONSTRAINT "SubjectIndicatorBinding_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubjectIndicatorBinding"
ADD CONSTRAINT "SubjectIndicatorBinding_versionId_fkey"
FOREIGN KEY ("versionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SubjectIndicatorBinding_templateId_idx" ON "SubjectIndicatorBinding"("templateId");
CREATE INDEX IF NOT EXISTS "SubjectIndicatorBinding_versionId_idx" ON "SubjectIndicatorBinding"("versionId");
CREATE INDEX IF NOT EXISTS "SubjectIndicatorBinding_detailSubjectId_idx" ON "SubjectIndicatorBinding"("detailSubjectId");
CREATE INDEX IF NOT EXISTS "SubjectIndicatorBinding_costSubjectCode_idx" ON "SubjectIndicatorBinding"("costSubjectCode");
CREATE INDEX IF NOT EXISTS "SubjectIndicatorBinding_baseIndicatorCode_idx" ON "SubjectIndicatorBinding"("baseIndicatorCode");
CREATE INDEX IF NOT EXISTS "SubjectIndicatorBinding_contentRuleCode_idx" ON "SubjectIndicatorBinding"("contentRuleCode");
CREATE INDEX IF NOT EXISTS "SubjectIndicatorBinding_unitPriceSourceCode_idx" ON "SubjectIndicatorBinding"("unitPriceSourceCode");
CREATE INDEX IF NOT EXISTS "SubjectIndicatorBinding_isEnabled_idx" ON "SubjectIndicatorBinding"("isEnabled");

ALTER TABLE "CostLine"
ADD COLUMN IF NOT EXISTS "engineeringMetricQuantity" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "manualQuantity" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "excelImportedQuantity" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "drawingMeasuredQuantity" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "lockedQuantity" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "templateDefaultQuantity" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "quantitySource" TEXT,
ADD COLUMN IF NOT EXISTS "quantityStatus" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS "quantityFormula" TEXT,
ADD COLUMN IF NOT EXISTS "unitPriceSourceType" TEXT,
ADD COLUMN IF NOT EXISTS "pricingUnit" TEXT,
ADD COLUMN IF NOT EXISTS "amountStatus" TEXT,
ADD COLUMN IF NOT EXISTS "constructionStandardCode" TEXT,
ADD COLUMN IF NOT EXISTS "specialOptionCode" TEXT,
ADD COLUMN IF NOT EXISTS "buildingId" TEXT,
ADD COLUMN IF NOT EXISTS "unitId" TEXT,
ADD COLUMN IF NOT EXISTS "houseTypeId" TEXT,
ADD COLUMN IF NOT EXISTS "locationType" TEXT,
ADD COLUMN IF NOT EXISTS "buildingPart" TEXT,
ADD COLUMN IF NOT EXISTS "quantityPrecisionLevel" TEXT,
ADD COLUMN IF NOT EXISTS "pricePrecisionLevel" TEXT;

CREATE INDEX IF NOT EXISTS "CostLine_quantitySource_idx" ON "CostLine"("quantitySource");
CREATE INDEX IF NOT EXISTS "CostLine_quantityStatus_idx" ON "CostLine"("quantityStatus");
CREATE INDEX IF NOT EXISTS "CostLine_constructionStandardCode_idx" ON "CostLine"("constructionStandardCode");
CREATE INDEX IF NOT EXISTS "CostLine_buildingId_idx" ON "CostLine"("buildingId");
CREATE INDEX IF NOT EXISTS "CostLine_unitId_idx" ON "CostLine"("unitId");
CREATE INDEX IF NOT EXISTS "CostLine_houseTypeId_idx" ON "CostLine"("houseTypeId");
CREATE INDEX IF NOT EXISTS "CostLine_buildingPart_idx" ON "CostLine"("buildingPart");

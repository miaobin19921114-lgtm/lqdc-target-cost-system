ALTER TABLE "ProjectVersion" ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT '投拓阶段';

CREATE TABLE IF NOT EXISTS "ProjectCostRule" (
  "id" TEXT NOT NULL,
  "projectVersionId" TEXT NOT NULL,
  "costCode" TEXT,
  "category" TEXT,
  "subjectName" TEXT NOT NULL,
  "sourceTable" TEXT,
  "measureBasis" TEXT,
  "unit" TEXT,
  "defaultTaxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.09,
  "allocationMethod" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "remark" TEXT,
  CONSTRAINT "ProjectCostRule_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectCostRule_projectVersionId_fkey'
  ) THEN
    ALTER TABLE "ProjectCostRule"
    ADD CONSTRAINT "ProjectCostRule_projectVersionId_fkey"
    FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProjectCostRule_projectVersionId_idx" ON "ProjectCostRule"("projectVersionId");

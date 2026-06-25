CREATE TABLE IF NOT EXISTS "TaxEstimate" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "taxType" TEXT NOT NULL,
  "taxBase" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "deductibleInputTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "outputTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "payableVat" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "surtaxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "landVatDeductibleCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "landVatAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "incomeTaxPreTaxProfit" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "incomeTaxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "taxRemark" TEXT,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaxEstimate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaxEstimate_projectId_idx"
ON "TaxEstimate"("projectId");

CREATE INDEX IF NOT EXISTS "TaxEstimate_versionId_idx"
ON "TaxEstimate"("versionId");

CREATE INDEX IF NOT EXISTS "TaxEstimate_taxType_idx"
ON "TaxEstimate"("taxType");

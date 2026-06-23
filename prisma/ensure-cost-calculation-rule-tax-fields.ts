import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CostCalculationRule" (
      "ruleKey" TEXT PRIMARY KEY,
      "costCode" TEXT,
      "subjectName" TEXT NOT NULL,
      "subjectPath" TEXT,
      "subjectLevel" INTEGER DEFAULT 0,
      "dataSource" TEXT,
      "quantityField" TEXT,
      "configField" TEXT,
      "calculationMethod" TEXT,
      "defaultUnit" TEXT,
      "defaultUnitPrice" NUMERIC DEFAULT 0,
      "defaultCoefficient" NUMERIC DEFAULT 1,
      "costAttributionMethod" TEXT,
      "allocationMethod" TEXT,
      "taxDeductionMethod" TEXT,
      "allowQuantityOverride" BOOLEAN DEFAULT TRUE,
      "allowPriceOverride" BOOLEAN DEFAULT TRUE,
      "enabled" BOOLEAN DEFAULT TRUE,
      "priority" INTEGER DEFAULT 100,
      "remark" TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    )
  `);

  const statements = [
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "vatInputCreditAllowed" BOOLEAN DEFAULT TRUE',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "vatRate" NUMERIC DEFAULT 0.09',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "vatTreatment" TEXT DEFAULT \'按发票税率抵扣进项\'',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "nonDeductibleVatTreatment" TEXT DEFAULT \'不可抵扣部分计入成本\'',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "landVatDeductible" BOOLEAN DEFAULT TRUE',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "landVatDeductionCategory" TEXT DEFAULT \'开发成本\'',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "landVatAllocationMethod" TEXT DEFAULT \'按清算对象/建筑面积分摊\'',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "landVatClearanceObject" TEXT DEFAULT \'按成本归属对象\'',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "incomeTaxDeductible" BOOLEAN DEFAULT TRUE',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "incomeTaxTreatment" TEXT DEFAULT \'计入开发产品计税成本\'',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "incomeTaxCostObject" TEXT DEFAULT \'按成本对象归集\'',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "incomeTaxAllocationMethod" TEXT DEFAULT \'按所得税成本对象分摊\'',
    'ALTER TABLE "CostCalculationRule" ADD COLUMN IF NOT EXISTS "periodExpenseType" TEXT DEFAULT \'\''
  ];

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "CostCalculationRule" SET
      "vatInputCreditAllowed" = CASE
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%税%' THEN FALSE
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%土地价款%' THEN FALSE
        ELSE COALESCE("vatInputCreditAllowed", TRUE)
      END,
      "landVatDeductible" = CASE
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%所得税%' THEN FALSE
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%增值税%' THEN FALSE
        ELSE COALESCE("landVatDeductible", TRUE)
      END,
      "incomeTaxDeductible" = CASE
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%企业所得税%' THEN FALSE
        ELSE COALESCE("incomeTaxDeductible", TRUE)
      END,
      "landVatDeductionCategory" = CASE
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%土地%' THEN '土地成本'
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%开发间接%' THEN '开发费用/开发间接费'
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%销售%' THEN '谨慎处理/通常不作为开发成本扣除'
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%税%' THEN '税金或不扣除'
        ELSE COALESCE("landVatDeductionCategory", '开发成本')
      END,
      "incomeTaxTreatment" = CASE
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%销售%' THEN '期间费用或销售费用'
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%管理%' THEN '期间费用或管理费用'
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%财务%' THEN '期间费用或财务费用'
        ELSE COALESCE("incomeTaxTreatment", '计入开发产品计税成本')
      END,
      "periodExpenseType" = CASE
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%销售%' THEN '销售费用'
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%管理%' THEN '管理费用'
        WHEN COALESCE("subjectPath", "subjectName") LIKE '%财务%' THEN '财务费用'
        ELSE COALESCE("periodExpenseType", '')
      END,
      "updatedAt" = NOW()
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CostCalculationRule_vat_idx" ON "CostCalculationRule" ("vatInputCreditAllowed")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CostCalculationRule_landVat_idx" ON "CostCalculationRule" ("landVatDeductible")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CostCalculationRule_incomeTax_idx" ON "CostCalculationRule" ("incomeTaxDeductible")');

  console.log('Ensured tax fields for CostCalculationRule');
}

main().finally(async () => prisma.$disconnect());

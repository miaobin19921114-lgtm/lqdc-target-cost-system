import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const extraFieldName = 'tax' + 'Liquidation' + 'Object';

const statements = [
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "productPosition" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "deliveryStandard" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "fitoutStandard" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "allocationMethod" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "landVatCategory" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "incomeTaxCostObject" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "productCategory" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "saleAttribute" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "costObject" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "clearingObject" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "${extraFieldName}" TEXT`,
  `CREATE INDEX IF NOT EXISTS "ProductType_productPosition_idx" ON "ProductType" ("productPosition")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_landVatCategory_idx" ON "ProductType" ("landVatCategory")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_incomeTaxCostObject_idx" ON "ProductType" ("incomeTaxCostObject")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_productCategory_idx" ON "ProductType" ("productCategory")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_saleAttribute_idx" ON "ProductType" ("saleAttribute")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_costObject_idx" ON "ProductType" ("costObject")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_clearingObject_idx" ON "ProductType" ("clearingObject")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_${extraFieldName}_idx" ON "ProductType" ("${extraFieldName}")`
];

async function main() {
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
  console.log('Ensured ProductType extra business fields.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

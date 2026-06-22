import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "productPosition" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "deliveryStandard" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "fitoutStandard" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "allocationMethod" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "landVatCategory" TEXT`,
  `ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "incomeTaxCostObject" TEXT`,
  `CREATE INDEX IF NOT EXISTS "ProductType_productPosition_idx" ON "ProductType" ("productPosition")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_landVatCategory_idx" ON "ProductType" ("landVatCategory")`,
  `CREATE INDEX IF NOT EXISTS "ProductType_incomeTaxCostObject_idx" ON "ProductType" ("incomeTaxCostObject")`
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

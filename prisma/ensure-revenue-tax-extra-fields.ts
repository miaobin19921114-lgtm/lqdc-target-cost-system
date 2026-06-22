import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Field = { table: string; name: string; type: string; index?: boolean };

const fields: Field[] = [
  { table: 'RevenueLine', name: 'revenueType', type: "TEXT DEFAULT 'sale'", index: true },
  { table: 'RevenueLine', name: 'saleableQuantity', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'RevenueLine', name: 'soldQuantity', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'RevenueLine', name: 'averagePrice', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'RevenueLine', name: 'outputVat', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'RevenueLine', name: 'collectionRate', type: 'DECIMAL(18,4) DEFAULT 0', index: true },
  { table: 'RevenueLine', name: 'recognizedRevenue', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'RevenueLine', name: 'unrecognizedRevenue', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'TaxParameter', name: 'vatCalculationMethod', type: "TEXT DEFAULT 'general'", index: true },
  { table: 'TaxParameter', name: 'vatDeductibleInputTax', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'TaxParameter', name: 'vatPayable', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'TaxParameter', name: 'surchargeTaxRate', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'TaxParameter', name: 'landVatCalculationMethod', type: "TEXT DEFAULT 'pre_estimate'", index: true },
  { table: 'TaxParameter', name: 'landVatDeductibleCost', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'TaxParameter', name: 'landVatPayable', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'TaxParameter', name: 'citCalculationMethod', type: "TEXT DEFAULT 'pre_estimate'", index: true },
  { table: 'TaxParameter', name: 'citTaxableIncome', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'TaxParameter', name: 'citPayable', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SalesScheduleLine', name: 'periodType', type: "TEXT DEFAULT 'month'", index: true },
  { table: 'SalesScheduleLine', name: 'plannedSaleQuantity', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SalesScheduleLine', name: 'plannedSaleArea', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SalesScheduleLine', name: 'plannedSalesRevenue', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SalesScheduleLine', name: 'plannedCollectionAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SalesScheduleLine', name: 'actualCollectionAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SalesScheduleLine', name: 'collectionGap', type: 'DECIMAL(18,4) DEFAULT 0' }
];

async function main() {
  for (const field of fields) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${field.table}" ADD COLUMN IF NOT EXISTS "${field.name}" ${field.type}`);
    if (field.index) {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${field.table}_${field.name}_idx" ON "${field.table}" ("${field.name}")`);
    }
  }
  console.log('Ensured revenue, tax and sales schedule extra fields.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

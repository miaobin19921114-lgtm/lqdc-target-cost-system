import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Field = { table: string; name: string; type: string; index?: boolean };

const fields: Field[] = [
  { table: 'DynamicCostSnapshot', name: 'snapshotType', type: "TEXT DEFAULT 'monthly'", index: true },
  { table: 'DynamicCostSnapshot', name: 'snapshotDate', type: 'TEXT', index: true },
  { table: 'DynamicCostSnapshot', name: 'targetCostTotal', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostSnapshot', name: 'contractTotal', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostSnapshot', name: 'changeTotal', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostSnapshot', name: 'paymentTotal', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostSnapshot', name: 'settlementTotal', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostSnapshot', name: 'dynamicCostTotal', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostSnapshot', name: 'varianceTotal', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostSnapshot', name: 'varianceRate', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostSnapshot', name: 'riskLevel', type: "TEXT DEFAULT 'normal'", index: true },
  { table: 'DynamicCostSnapshot', name: 'approvedStatus', type: "TEXT DEFAULT 'draft'", index: true },
  { table: 'DynamicCostLine', name: 'costSubjectCode', type: 'TEXT', index: true },
  { table: 'DynamicCostLine', name: 'productTypeId', type: 'TEXT', index: true },
  { table: 'DynamicCostLine', name: 'targetCostAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostLine', name: 'contractAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostLine', name: 'changeAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostLine', name: 'paymentAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostLine', name: 'settlementAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostLine', name: 'pendingAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostLine', name: 'forecastFinalCost', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostLine', name: 'varianceAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostLine', name: 'varianceRate', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'DynamicCostLine', name: 'riskReason', type: 'TEXT' },
  { table: 'DynamicCostLine', name: 'correctionPlan', type: 'TEXT' },
  { table: 'RecalculationLog', name: 'recalculationType', type: "TEXT DEFAULT 'target_cost'", index: true },
  { table: 'RecalculationLog', name: 'sourceKind', type: "TEXT DEFAULT 'manual'", index: true },
  { table: 'RecalculationLog', name: 'beforeAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'RecalculationLog', name: 'afterAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'RecalculationLog', name: 'differenceAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'RecalculationLog', name: 'affectedLineCount', type: 'INTEGER DEFAULT 0' },
  { table: 'RecalculationLog', name: 'operatorName', type: 'TEXT' }
];

async function main() {
  for (const field of fields) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${field.table}" ADD COLUMN IF NOT EXISTS "${field.name}" ${field.type}`);
    if (field.index) {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${field.table}_${field.name}_idx" ON "${field.table}" ("${field.name}")`);
    }
  }
  console.log('Ensured dynamic cost extra fields.');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

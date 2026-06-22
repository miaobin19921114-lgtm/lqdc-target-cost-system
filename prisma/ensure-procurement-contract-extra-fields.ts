import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Field = { table: string; name: string; type: string; index?: boolean };

const fields: Field[] = [
  { table: 'ProcurementPackage', name: 'packageType', type: "TEXT DEFAULT 'general_contract'", index: true },
  { table: 'ProcurementPackage', name: 'procurementMethod', type: "TEXT DEFAULT 'tender'", index: true },
  { table: 'ProcurementPackage', name: 'plannedTenderDate', type: 'TEXT' },
  { table: 'ProcurementPackage', name: 'plannedAwardDate', type: 'TEXT' },
  { table: 'ProcurementPackage', name: 'controlPriceAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ProcurementPackage', name: 'winningAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ProcurementPackage', name: 'savingAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ProcurementPackage', name: 'savingRate', type: 'DECIMAL(18,4) DEFAULT 0' },

  { table: 'Contract', name: 'contractType', type: "TEXT DEFAULT 'construction'", index: true },
  { table: 'Contract', name: 'contractScope', type: 'TEXT' },
  { table: 'Contract', name: 'supplierName', type: 'TEXT', index: true },
  { table: 'Contract', name: 'taxRate', type: 'DECIMAL(18,4) DEFAULT 0.09' },
  { table: 'Contract', name: 'taxExclusiveAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'Contract', name: 'taxAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'Contract', name: 'taxInclusiveAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'Contract', name: 'signedDate', type: 'TEXT' },
  { table: 'Contract', name: 'startDate', type: 'TEXT' },
  { table: 'Contract', name: 'endDate', type: 'TEXT' },
  { table: 'Contract', name: 'paymentTerms', type: 'TEXT' },
  { table: 'Contract', name: 'settlementMethod', type: 'TEXT' },
  { table: 'Contract', name: 'contractStatus', type: "TEXT DEFAULT 'draft'", index: true },

  { table: 'ContractChange', name: 'changeType', type: "TEXT DEFAULT 'change'", index: true },
  { table: 'ContractChange', name: 'changeReason', type: 'TEXT' },
  { table: 'ContractChange', name: 'submittedAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractChange', name: 'approvedAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractChange', name: 'taxInclusiveAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractChange', name: 'taxExclusiveAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractChange', name: 'taxAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractChange', name: 'approvalStatus', type: "TEXT DEFAULT 'draft'", index: true },
  { table: 'ContractChange', name: 'impactOnDynamicCost', type: 'BOOLEAN DEFAULT TRUE', index: true },

  { table: 'ContractPayment', name: 'paymentType', type: "TEXT DEFAULT 'progress'", index: true },
  { table: 'ContractPayment', name: 'paymentNode', type: 'TEXT' },
  { table: 'ContractPayment', name: 'plannedPaymentDate', type: 'TEXT' },
  { table: 'ContractPayment', name: 'actualPaymentDate', type: 'TEXT' },
  { table: 'ContractPayment', name: 'plannedAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractPayment', name: 'actualAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractPayment', name: 'invoiceAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractPayment', name: 'unpaidAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractPayment', name: 'paymentStatus', type: "TEXT DEFAULT 'planned'", index: true },

  { table: 'ContractSettlement', name: 'submittedSettlementAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractSettlement', name: 'approvedSettlementAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractSettlement', name: 'deductionAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractSettlement', name: 'settlementRate', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'ContractSettlement', name: 'settlementDate', type: 'TEXT' },
  { table: 'ContractSettlement', name: 'settlementStatus', type: "TEXT DEFAULT 'draft'", index: true },
  { table: 'ContractSettlement', name: 'finalDynamicCost', type: 'DECIMAL(18,4) DEFAULT 0' }
];

async function main() {
  for (const field of fields) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${field.table}" ADD COLUMN IF NOT EXISTS "${field.name}" ${field.type}`);
    if (field.index) {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${field.table}_${field.name}_idx" ON "${field.table}" ("${field.name}")`);
    }
  }
  console.log('Ensured procurement, contract, change, payment and settlement extra fields.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

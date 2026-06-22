import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Field = { table: string; name: string; type: string; index?: boolean };

const fields: Field[] = [
  { table: 'FinancialEvaluationScenario', name: 'scenarioType', type: "TEXT DEFAULT 'base'", index: true },
  { table: 'FinancialEvaluationScenario', name: 'scenarioStatus', type: "TEXT DEFAULT 'draft'", index: true },
  { table: 'FinancialEvaluationScenario', name: 'baseScenarioId', type: 'TEXT', index: true },
  { table: 'FinancialEvaluationScenario', name: 'versionStage', type: 'TEXT', index: true },
  { table: 'FinancialEvaluationScenario', name: 'description', type: 'TEXT' },

  { table: 'FinancialEvaluation', name: 'totalRevenue', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'totalCost', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'totalTax', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'landCost', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'constructionCost', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'periodExpense', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'grossProfit', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'profitBeforeTax', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'incomeTax', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'netProfit', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'grossProfitRate', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'netProfitRate', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'irr', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'npv', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'paybackPeriod', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'peakFunding', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'FinancialEvaluation', name: 'capitalizedInterest', type: 'DECIMAL(18,4) DEFAULT 0' },

  { table: 'CashFlowLine', name: 'periodType', type: "TEXT DEFAULT 'month'", index: true },
  { table: 'CashFlowLine', name: 'periodIndex', type: 'INTEGER DEFAULT 0', index: true },
  { table: 'CashFlowLine', name: 'cashInflow', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'salesCollection', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'otherInflow', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'landPayment', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'constructionPayment', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'taxPayment', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'managementExpense', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'salesExpense', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'financeExpense', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'cashOutflow', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'netCashFlow', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'cumulativeCashFlow', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'financingAmount', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'CashFlowLine', name: 'interestExpense', type: 'DECIMAL(18,4) DEFAULT 0' },

  { table: 'SensitivityAnalysisLine', name: 'sensitivityType', type: "TEXT DEFAULT 'single_factor'", index: true },
  { table: 'SensitivityAnalysisLine', name: 'changeFactor', type: 'TEXT', index: true },
  { table: 'SensitivityAnalysisLine', name: 'changeRate', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SensitivityAnalysisLine', name: 'baseValue', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SensitivityAnalysisLine', name: 'changedValue', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SensitivityAnalysisLine', name: 'profitImpact', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SensitivityAnalysisLine', name: 'irrImpact', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SensitivityAnalysisLine', name: 'npvImpact', type: 'DECIMAL(18,4) DEFAULT 0' },
  { table: 'SensitivityAnalysisLine', name: 'riskLevel', type: "TEXT DEFAULT 'normal'", index: true }
];

async function main() {
  for (const field of fields) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${field.table}" ADD COLUMN IF NOT EXISTS "${field.name}" ${field.type}`);
    if (field.index) {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${field.table}_${field.name}_idx" ON "${field.table}" ("${field.name}")`);
    }
  }
  console.log('Ensured financial evaluation, cash flow and sensitivity extra fields.');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

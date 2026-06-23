import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function safeExecute(label: string, sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`OK: ${label}`);
  } catch (error) {
    console.warn(`Skipped: ${label}`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  await safeExecute('CostSubject name 土地成本 -> 土地费', `
    UPDATE "CostSubject"
    SET "name" = '土地费'
    WHERE "code" = '01' AND "name" = '土地成本'
  `);

  await safeExecute('CostSubject fullPath 土地成本 -> 土地费', `
    UPDATE "CostSubject"
    SET "fullPath" = regexp_replace("fullPath", '^土地成本', '土地费')
    WHERE "fullPath" LIKE '土地成本%'
  `);

  await safeExecute('CostCalculationRule subjectName 土地成本 -> 土地费', `
    UPDATE "CostCalculationRule"
    SET "subjectName" = '土地费'
    WHERE "costCode" = '01' AND "subjectName" = '土地成本'
  `);

  await safeExecute('CostCalculationRule subjectPath 土地成本 -> 土地费', `
    UPDATE "CostCalculationRule"
    SET "subjectPath" = regexp_replace("subjectPath", '^土地成本', '土地费')
    WHERE "subjectPath" LIKE '土地成本%'
  `);

  await safeExecute('CostDictionaryRow firstSubject 土地成本 -> 土地费', `
    UPDATE "CostDictionaryRow"
    SET "firstSubject" = '土地费'
    WHERE "firstSubject" = '土地成本'
  `);

  console.log('Normalized land cost subject naming safely. 成本科目统一显示为土地费；税务扣除类别仍可使用土地成本。');
}

main().finally(async () => prisma.$disconnect());

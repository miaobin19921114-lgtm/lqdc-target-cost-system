import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    UPDATE "CostSubject"
    SET "name" = '土地费', "updatedAt" = NOW()
    WHERE "code" = '01' AND "name" = '土地成本'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "CostSubject"
    SET "fullPath" = regexp_replace("fullPath", '^土地成本', '土地费'), "updatedAt" = NOW()
    WHERE "fullPath" LIKE '土地成本%'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "CostCalculationRule"
    SET "subjectName" = '土地费', "updatedAt" = NOW()
    WHERE "costCode" = '01' AND "subjectName" = '土地成本'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "CostCalculationRule"
    SET "subjectPath" = regexp_replace("subjectPath", '^土地成本', '土地费'), "updatedAt" = NOW()
    WHERE "subjectPath" LIKE '土地成本%'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "CostDictionaryRow"
    SET "firstSubject" = '土地费', "updatedAt" = NOW()
    WHERE "firstSubject" = '土地成本'
  `).catch(() => null);

  console.log('Normalized land cost subject naming: 土地成本 -> 土地费 for subject names and paths only');
}

main().finally(async () => prisma.$disconnect());

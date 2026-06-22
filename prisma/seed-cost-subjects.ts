import { PrismaClient } from '@prisma/client';
import { getV57CostDictionaryRows } from '../data/cost-dictionary-v57';

const prisma = new PrismaClient();

function parseTaxRate(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  if (raw.endsWith('%')) return Number(raw.replace('%', '')) / 100 || 0;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
}

function parseLevel(value?: string | null) {
  const level = Number(value || 0);
  return Number.isFinite(level) && level > 0 ? level : 4;
}

function subjectName(row: ReturnType<typeof getV57CostDictionaryRows>[number]) {
  return row.detailSubject || row.thirdSubject || row.secondSubject || row.firstSubject || row.costCode || '未命名科目';
}

function fullPath(row: ReturnType<typeof getV57CostDictionaryRows>[number]) {
  return [row.firstSubject, row.secondSubject, row.thirdSubject, row.detailSubject].filter(Boolean).join(' / ');
}

async function main() {
  const rows = getV57CostDictionaryRows().filter((row) => row.costCode);

  for (const [index, row] of rows.entries()) {
    const code = row.costCode!;
    await prisma.costSubject.upsert({
      where: { code },
      update: {
        name: subjectName(row),
        level: parseLevel(row.subjectLevel),
        parentCode: row.parentCode || null,
        fullPath: fullPath(row),
        defaultUnit: row.unit || null,
        defaultTaxRate: parseTaxRate(row.defaultTaxRate),
        defaultMeasureBasis: row.measureBasis || null,
        defaultAllocationMethod: row.targetAllocationMethod || null,
        enabled: row.enabled !== '否',
        sortOrder: row.rowIndex || index + 1
      },
      create: {
        code,
        name: subjectName(row),
        level: parseLevel(row.subjectLevel),
        parentCode: row.parentCode || null,
        fullPath: fullPath(row),
        defaultUnit: row.unit || null,
        defaultTaxRate: parseTaxRate(row.defaultTaxRate),
        defaultMeasureBasis: row.measureBasis || null,
        defaultAllocationMethod: row.targetAllocationMethod || null,
        enabled: row.enabled !== '否',
        sortOrder: row.rowIndex || index + 1
      }
    });
  }

  console.log(`Seeded ${rows.length} V60/V57 cost subjects.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import { buildV60LandRows } from '../data/cost-dictionary-v60-land';

const prisma = new PrismaClient();

function parseTaxRate(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  if (raw.endsWith('%')) return Number(raw.replace('%', '')) / 100 || 0;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
}

const landParents = [
  { code: '01', name: '土地费', level: 1, parentCode: null, fullPath: '土地费', defaultUnit: '万元', defaultTaxRate: 0, defaultMeasureBasis: '汇总金额', defaultAllocationMethod: '按受益对象归集；不能直接归集时按建筑面积、可售面积或销售收入等合理口径分摊', sortOrder: 1 },
  { code: '01.01', name: '土地价款', level: 2, parentCode: '01', fullPath: '土地费 / 土地价款', defaultUnit: '万元', defaultTaxRate: 0, defaultMeasureBasis: '汇总金额', defaultAllocationMethod: '按受益对象归集', sortOrder: 2 },
  { code: '01.01.01', name: '土地出让/转让及补偿', level: 3, parentCode: '01.01', fullPath: '土地费 / 土地价款 / 土地出让/转让及补偿', defaultUnit: '万元', defaultTaxRate: 0, defaultMeasureBasis: '土地价款/补偿协议/固定金额', defaultAllocationMethod: '按受益对象归集', sortOrder: 3 },
  { code: '01.02', name: '土地相关税费', level: 2, parentCode: '01', fullPath: '土地费 / 土地相关税费', defaultUnit: '万元', defaultTaxRate: 0, defaultMeasureBasis: '汇总金额', defaultAllocationMethod: '按受益对象归集', sortOrder: 20 },
  { code: '01.02.01', name: '土地交易税费', level: 3, parentCode: '01.02', fullPath: '土地费 / 土地相关税费 / 土地交易税费', defaultUnit: '万元', defaultTaxRate: 0, defaultMeasureBasis: '土地价款×费率', defaultAllocationMethod: '按受益对象归集', sortOrder: 21 },
  { code: '01.03', name: '土地交易及中介服务费', level: 2, parentCode: '01', fullPath: '土地费 / 土地交易及中介服务费', defaultUnit: '万元', defaultTaxRate: 0.06, defaultMeasureBasis: '汇总金额', defaultAllocationMethod: '按受益对象归集', sortOrder: 30 },
  { code: '01.03.01', name: '交易服务及尽调', level: 3, parentCode: '01.03', fullPath: '土地费 / 土地交易及中介服务费 / 交易服务及尽调', defaultUnit: '万元', defaultTaxRate: 0.06, defaultMeasureBasis: '固定金额/合同金额', defaultAllocationMethod: '按受益对象归集', sortOrder: 31 }
];

async function main() {
  for (const parent of landParents) {
    await prisma.costSubject.upsert({
      where: { code: parent.code },
      update: { ...parent, enabled: true },
      create: { ...parent, enabled: true }
    });
  }

  const rows = buildV60LandRows(1000);
  for (const [index, row] of rows.entries()) {
    if (!row.costCode) continue;
    const name = row.detailSubject || row.thirdSubject || row.secondSubject || row.firstSubject || row.costCode;
    const fullPath = [row.firstSubject, row.secondSubject, row.thirdSubject, row.detailSubject].filter(Boolean).join(' / ');
    await prisma.costSubject.upsert({
      where: { code: row.costCode },
      update: {
        name,
        level: 4,
        parentCode: row.parentCode || null,
        fullPath,
        defaultUnit: row.unit || null,
        defaultTaxRate: parseTaxRate(row.defaultTaxRate),
        defaultMeasureBasis: row.measureBasis || null,
        defaultAllocationMethod: row.targetAllocationMethod || null,
        enabled: row.enabled !== '否',
        sortOrder: 1000 + index
      },
      create: {
        code: row.costCode,
        name,
        level: 4,
        parentCode: row.parentCode || null,
        fullPath,
        defaultUnit: row.unit || null,
        defaultTaxRate: parseTaxRate(row.defaultTaxRate),
        defaultMeasureBasis: row.measureBasis || null,
        defaultAllocationMethod: row.targetAllocationMethod || null,
        enabled: row.enabled !== '否',
        sortOrder: 1000 + index
      }
    });
  }

  console.log(`Synced ${landParents.length + rows.length} V60 land cost subjects.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

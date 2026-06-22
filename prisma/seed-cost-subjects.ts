import { PrismaClient } from '@prisma/client';
import { getV57CostDictionaryRows } from '../data/cost-dictionary-v57';

const prisma = new PrismaClient();

type DictionaryRow = ReturnType<typeof getV57CostDictionaryRows>[number];

type SupplementalSubject = {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  fullPath: string;
  defaultUnit: string;
  defaultTaxRate: number;
  defaultMeasureBasis: string;
  defaultAllocationMethod: string;
  enabled?: boolean;
  sortOrder: number;
};

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

function subjectName(row: DictionaryRow) {
  return row.detailSubject || row.thirdSubject || row.secondSubject || row.firstSubject || row.costCode || '未命名科目';
}

function fullPath(row: DictionaryRow) {
  return [row.firstSubject, row.secondSubject, row.thirdSubject, row.detailSubject].filter(Boolean).join(' / ');
}

const supplementalSubjects: SupplementalSubject[] = [
  {
    code: '03.03.09',
    name: '门类工程',
    level: 4,
    parentCode: '03.03',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 门类工程',
    defaultUnit: '万元',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '汇总金额',
    defaultAllocationMethod: '按对应业态直接归集；不能直接归集时按建筑面积分摊',
    sortOrder: 30309
  },
  {
    code: '03.03.09.01',
    name: '入户门',
    level: 5,
    parentCode: '03.03.09',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 门类工程 / 入户门',
    defaultUnit: '樘',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '户数/入户门数量',
    defaultAllocationMethod: '按住宅业态直接归集',
    sortOrder: 3030901
  },
  {
    code: '03.03.09.02',
    name: '防火门',
    level: 5,
    parentCode: '03.03.09',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 门类工程 / 防火门',
    defaultUnit: '樘',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '防火门数量/图纸门表',
    defaultAllocationMethod: '按对应业态或地下室直接归集',
    sortOrder: 3030902
  },
  {
    code: '03.03.09.03',
    name: '防火卷帘',
    level: 5,
    parentCode: '03.03.09',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 门类工程 / 防火卷帘',
    defaultUnit: '㎡',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '卷帘面积/图纸门表',
    defaultAllocationMethod: '按地下室或商业业态直接归集',
    sortOrder: 3030903
  },
  {
    code: '03.03.09.04',
    name: '管井门',
    level: 5,
    parentCode: '03.03.09',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 门类工程 / 管井门',
    defaultUnit: '樘',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '管井门数量/楼栋层数×单层数量',
    defaultAllocationMethod: '按对应业态直接归集',
    sortOrder: 3030904
  },
  {
    code: '03.03.09.05',
    name: '设备房门',
    level: 5,
    parentCode: '03.03.09',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 门类工程 / 设备房门',
    defaultUnit: '樘',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '设备房门数量/图纸门表',
    defaultAllocationMethod: '按设备用房或地下室直接归集',
    sortOrder: 3030905
  },
  {
    code: '03.03.10',
    name: '栏杆工程细分',
    level: 4,
    parentCode: '03.03',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 栏杆工程细分',
    defaultUnit: '万元',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '汇总金额',
    defaultAllocationMethod: '按对应业态直接归集',
    sortOrder: 30310
  },
  {
    code: '03.03.10.01',
    name: '阳台栏杆',
    level: 5,
    parentCode: '03.03.10',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 栏杆工程细分 / 阳台栏杆',
    defaultUnit: 'm',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '户数×阳台栏杆含量/实际栏杆长度',
    defaultAllocationMethod: '按住宅业态直接归集',
    sortOrder: 3031001
  },
  {
    code: '03.03.10.02',
    name: '护窗栏杆',
    level: 5,
    parentCode: '03.03.10',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 栏杆工程细分 / 护窗栏杆',
    defaultUnit: 'm',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '户数×护窗栏杆含量/实际栏杆长度',
    defaultAllocationMethod: '按住宅业态直接归集',
    sortOrder: 3031002
  },
  {
    code: '03.03.10.03',
    name: '楼梯栏杆',
    level: 5,
    parentCode: '03.03.10',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 栏杆工程细分 / 楼梯栏杆',
    defaultUnit: 'm',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '楼栋层数×楼梯栏杆含量/实际栏杆长度',
    defaultAllocationMethod: '按对应业态直接归集',
    sortOrder: 3031003
  },
  {
    code: '03.03.10.04',
    name: '公区栏杆',
    level: 5,
    parentCode: '03.03.10',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 栏杆工程细分 / 公区栏杆',
    defaultUnit: 'm',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '公区面积×栏杆含量/实际栏杆长度',
    defaultAllocationMethod: '按对应公区受益业态归集',
    sortOrder: 3031004
  },
  {
    code: '03.03.11',
    name: '百叶工程细分',
    level: 4,
    parentCode: '03.03',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 百叶工程细分',
    defaultUnit: '万元',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '汇总金额',
    defaultAllocationMethod: '按对应业态直接归集',
    sortOrder: 30311
  },
  {
    code: '03.03.11.01',
    name: '空调百叶',
    level: 5,
    parentCode: '03.03.11',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 百叶工程细分 / 空调百叶',
    defaultUnit: '㎡',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '户数×空调百叶含量/实际百叶面积',
    defaultAllocationMethod: '按住宅业态直接归集',
    sortOrder: 3031101
  },
  {
    code: '03.03.11.02',
    name: '设备百叶',
    level: 5,
    parentCode: '03.03.11',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 百叶工程细分 / 设备百叶',
    defaultUnit: '㎡',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '设备百叶面积/设备机房数量×含量',
    defaultAllocationMethod: '按设备用房或对应业态归集',
    sortOrder: 3031102
  },
  {
    code: '03.03.11.03',
    name: '风井百叶',
    level: 5,
    parentCode: '03.03.11',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 百叶工程细分 / 风井百叶',
    defaultUnit: '㎡',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '风井百叶面积/风井数量×含量',
    defaultAllocationMethod: '按对应业态或地下室归集',
    sortOrder: 3031103
  },
  {
    code: '03.03.11.04',
    name: '商业百叶',
    level: 5,
    parentCode: '03.03.11',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 百叶工程细分 / 商业百叶',
    defaultUnit: '㎡',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '商业百叶面积/商业建筑面积×含量',
    defaultAllocationMethod: '按商业业态直接归集',
    sortOrder: 3031104
  },
  {
    code: '03.03.12',
    name: '防水工程细分',
    level: 4,
    parentCode: '03.03',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 防水工程细分',
    defaultUnit: '万元',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '汇总金额',
    defaultAllocationMethod: '按对应业态直接归集',
    sortOrder: 30312
  },
  {
    code: '03.03.12.01',
    name: '厨房防水',
    level: 5,
    parentCode: '03.03.12',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 防水工程细分 / 厨房防水',
    defaultUnit: '㎡',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '户数×厨房防水面积/实际防水面积',
    defaultAllocationMethod: '按住宅业态直接归集',
    sortOrder: 3031201
  },
  {
    code: '03.03.12.02',
    name: '水表井防水',
    level: 5,
    parentCode: '03.03.12',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 防水工程细分 / 水表井防水',
    defaultUnit: '㎡',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '水表井数量×单井防水面积/实际防水面积',
    defaultAllocationMethod: '按对应业态直接归集',
    sortOrder: 3031202
  },
  {
    code: '03.03.12.03',
    name: '消防水池防水',
    level: 5,
    parentCode: '03.03.12',
    fullPath: '建安工程费 / 土建工程 / 建筑围护工程 / 防水工程细分 / 消防水池防水',
    defaultUnit: '㎡',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '消防水池容积/消防水池防水面积',
    defaultAllocationMethod: '按地下室或配套设备用房归集',
    sortOrder: 3031203
  },
  {
    code: '03.16',
    name: '人防工程',
    level: 2,
    parentCode: '03',
    fullPath: '建安工程费 / 人防工程',
    defaultUnit: '万元',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '汇总金额',
    defaultAllocationMethod: '按人防面积/受益对象分摊',
    sortOrder: 31600
  },
  {
    code: '03.16.01',
    name: '人防门及人防设备',
    level: 3,
    parentCode: '03.16',
    fullPath: '建安工程费 / 人防工程 / 人防门及人防设备',
    defaultUnit: '万元',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '人防面积/人防门数量/设备清单',
    defaultAllocationMethod: '按人防工程直接归集',
    sortOrder: 31601
  },
  {
    code: '03.16.01.01',
    name: '人防门',
    level: 4,
    parentCode: '03.16.01',
    fullPath: '建安工程费 / 人防工程 / 人防门及人防设备 / 人防门',
    defaultUnit: '樘',
    defaultTaxRate: 0.09,
    defaultMeasureBasis: '人防门数量/人防门表',
    defaultAllocationMethod: '按人防工程直接归集',
    sortOrder: 3160101
  }
];

async function upsertSubject(subject: SupplementalSubject) {
  await prisma.costSubject.upsert({
    where: { code: subject.code },
    update: { ...subject, enabled: subject.enabled ?? true },
    create: { ...subject, enabled: subject.enabled ?? true }
  });
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

  for (const subject of supplementalSubjects) {
    await upsertSubject(subject);
  }

  console.log(`Seeded ${rows.length} base cost subjects and ${supplementalSubjects.length} supplemental subjects.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

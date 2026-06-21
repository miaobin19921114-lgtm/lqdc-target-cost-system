import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const landSubjects = [
  {
    code: '01',
    name: '土地费',
    level: 1,
    parentCode: null,
    fullPath: '土地费',
    defaultUnit: '万元',
    defaultTaxRate: 0,
    defaultMeasureBasis: '土地价款',
    defaultAllocationMethod: '按受益对象/成本归属组'
  },
  {
    code: '01.01',
    name: '土地获取费',
    level: 2,
    parentCode: '01',
    fullPath: '土地费 / 土地获取费',
    defaultUnit: '万元',
    defaultTaxRate: 0,
    defaultMeasureBasis: '土地价款',
    defaultAllocationMethod: '按受益对象/成本归属组'
  },
  {
    code: '01.01.01',
    name: '土地价款',
    level: 3,
    parentCode: '01.01',
    fullPath: '土地费 / 土地获取费 / 土地价款',
    defaultUnit: '万元',
    defaultTaxRate: 0,
    defaultMeasureBasis: '土地成交价款',
    defaultAllocationMethod: '按受益对象/成本归属组'
  },
  {
    code: '01.01.02',
    name: '契税',
    level: 3,
    parentCode: '01.01',
    fullPath: '土地费 / 土地获取费 / 契税',
    defaultUnit: '万元',
    defaultTaxRate: 0,
    defaultMeasureBasis: '土地价款',
    defaultAllocationMethod: '按受益对象/成本归属组'
  },
  {
    code: '01.01.03',
    name: '土地交易服务费',
    level: 3,
    parentCode: '01.01',
    fullPath: '土地费 / 土地获取费 / 土地交易服务费',
    defaultUnit: '万元',
    defaultTaxRate: 0,
    defaultMeasureBasis: '土地价款',
    defaultAllocationMethod: '按受益对象/成本归属组'
  },
  {
    code: '01.01.04',
    name: '土地评估费',
    level: 3,
    parentCode: '01.01',
    fullPath: '土地费 / 土地获取费 / 土地评估费',
    defaultUnit: '万元',
    defaultTaxRate: 0.06,
    defaultMeasureBasis: '合同金额',
    defaultAllocationMethod: '按受益对象/成本归属组'
  },
  {
    code: '01.01.05',
    name: '土地咨询/居间服务费',
    level: 3,
    parentCode: '01.01',
    fullPath: '土地费 / 土地获取费 / 土地咨询/居间服务费',
    defaultUnit: '万元',
    defaultTaxRate: 0.06,
    defaultMeasureBasis: '合同金额',
    defaultAllocationMethod: '按受益对象/成本归属组'
  },
  {
    code: '01.01.06',
    name: '土地尽调费',
    level: 3,
    parentCode: '01.01',
    fullPath: '土地费 / 土地获取费 / 土地尽调费',
    defaultUnit: '万元',
    defaultTaxRate: 0.06,
    defaultMeasureBasis: '合同金额',
    defaultAllocationMethod: '按受益对象/成本归属组'
  },
  {
    code: '01.01.07',
    name: '法务尽调费',
    level: 3,
    parentCode: '01.01',
    fullPath: '土地费 / 土地获取费 / 法务尽调费',
    defaultUnit: '万元',
    defaultTaxRate: 0.06,
    defaultMeasureBasis: '合同金额',
    defaultAllocationMethod: '按受益对象/成本归属组'
  },
  {
    code: '01.01.08',
    name: '财税尽调费',
    level: 3,
    parentCode: '01.01',
    fullPath: '土地费 / 土地获取费 / 财税尽调费',
    defaultUnit: '万元',
    defaultTaxRate: 0.06,
    defaultMeasureBasis: '合同金额',
    defaultAllocationMethod: '按受益对象/成本归属组'
  }
];

async function main() {
  for (const [index, subject] of landSubjects.entries()) {
    await prisma.costSubject.upsert({
      where: { code: subject.code },
      update: { ...subject, sortOrder: index + 1, enabled: true },
      create: { ...subject, sortOrder: index + 1, enabled: true }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const productTypePresets = [
  { key: 'highRiseResidential', name: '高层住宅', category: '住宅', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '普通高层住宅业态。', sortOrder: 10 },
  { key: 'midRiseResidential', name: '小高层住宅', category: '住宅', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '小高层住宅业态。', sortOrder: 20 },
  { key: 'gardenHouse', name: '洋房', category: '住宅', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '洋房/低密住宅业态。', sortOrder: 30 },
  { key: 'villaCourtyard', name: '别墅/合院', category: '住宅', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '别墅、合院、低密产品业态。', sortOrder: 40 },
  { key: 'streetRetail', name: '底商', category: '商业', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '商业销售收入', description: '沿街底商、社区底商业态。', sortOrder: 100 },
  { key: 'centralCommercial', name: '集中商业', category: '商业', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '商业销售/租赁收入', description: '集中商业、商业综合体业态。', sortOrder: 110 },
  { key: 'clubhouse', name: '会所', category: '配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '会所及展示配套。', sortOrder: 200 },
  { key: 'propertyManagement', name: '物业用房', category: '配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按建筑面积占比', defaultIncomeType: '无直接销售收入', description: '物业管理用房。', sortOrder: 210 },
  { key: 'communityService', name: '社区配套', category: '配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按建筑面积占比', defaultIncomeType: '无直接销售收入', description: '社区服务、养老、社区综合配套等。', sortOrder: 220 },
  { key: 'kindergarten', name: '幼儿园', category: '配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '配建幼儿园。', sortOrder: 230 },
  { key: 'undergroundGarage', name: '地下车库', category: '地下室/车位', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按地下建筑面积/车位数量分摊', defaultIncomeType: '车位收入', description: '地下车库整体业态。', sortOrder: 300 },
  { key: 'undergroundPropertyParking', name: '地下产权车位', category: '地下室/车位', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按车位数量分摊', defaultIncomeType: '车位销售收入', description: '可销售产权地下车位。', sortOrder: 310 },
  { key: 'undergroundUseRightParking', name: '地下使用权车位', category: '地下室/车位', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按车位数量分摊', defaultIncomeType: '车位使用权收入', description: '使用权转让或租赁型地下车位。', sortOrder: 320 },
  { key: 'civilDefenseParking', name: '人防车位', category: '地下室/车位', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按人防面积/车位数量分摊', defaultIncomeType: '人防车位使用收入', description: '人防区车位。', sortOrder: 330 },
  { key: 'aboveGroundParking', name: '地上车位', category: '地下室/车位', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按车位数量分摊', defaultIncomeType: '车位销售/租赁收入', description: '地上车位。', sortOrder: 340 },
  { key: 'equipmentRoom', name: '设备用房', category: '配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '配电房、水泵房、设备机房等。', sortOrder: 400 },
  { key: 'civilDefenseWorks', name: '人防工程', category: '地下室/人防', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按人防面积/受益对象分摊', defaultIncomeType: '无直接销售收入', description: '人防工程成本对象。', sortOrder: 410 }
];

async function main() {
  for (const preset of productTypePresets) {
    await prisma.productTypePreset.upsert({
      where: { key: preset.key },
      update: {
        name: preset.name,
        category: preset.category,
        isSaleable: preset.isSaleable,
        participateAllocation: preset.participateAllocation,
        defaultVatRate: preset.defaultVatRate,
        defaultAllocationMethod: preset.defaultAllocationMethod,
        defaultIncomeType: preset.defaultIncomeType,
        description: preset.description,
        enabled: true,
        sortOrder: preset.sortOrder
      },
      create: {
        key: preset.key,
        name: preset.name,
        category: preset.category,
        isSaleable: preset.isSaleable,
        participateAllocation: preset.participateAllocation,
        defaultVatRate: preset.defaultVatRate,
        defaultAllocationMethod: preset.defaultAllocationMethod,
        defaultIncomeType: preset.defaultIncomeType,
        description: preset.description,
        enabled: true,
        sortOrder: preset.sortOrder
      }
    });
  }

  console.log(`Seeded ${productTypePresets.length} product type presets.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

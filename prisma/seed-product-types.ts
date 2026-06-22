import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const productTypePresets = [
  // 住宅类
  { key: 'highRiseResidential', name: '高层住宅', category: '住宅类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '普通高层住宅业态。', sortOrder: 10 },
  { key: 'midRiseResidential', name: '小高层住宅', category: '住宅类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '小高层住宅业态。', sortOrder: 20 },
  { key: 'gardenHouse', name: '洋房', category: '住宅类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '洋房/低密住宅业态。', sortOrder: 30 },
  { key: 'stackedVilla', name: '叠拼', category: '住宅类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '叠拼住宅业态。', sortOrder: 40 },
  { key: 'townhouse', name: '联排', category: '住宅类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '联排住宅业态。', sortOrder: 50 },
  { key: 'courtyardHouse', name: '合院', category: '住宅类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '合院、院墅类住宅业态。', sortOrder: 60 },
  { key: 'villaCourtyard', name: '别墅', category: '住宅类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '住宅销售收入', description: '别墅、低密产品业态。', sortOrder: 70 },
  { key: 'affordableHousing', name: '保障房/人才房', category: '住宅类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '保障房/人才房销售收入', description: '保障性住房、人才公寓等政策性住宅。', sortOrder: 80 },

  // 商业类
  { key: 'streetRetail', name: '底商', category: '商业类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '商业销售收入', description: '沿街底商、社区底商业态。', sortOrder: 100 },
  { key: 'centralCommercial', name: '集中商业', category: '商业类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '商业销售/租赁收入', description: '集中商业、商业综合体业态。', sortOrder: 110 },
  { key: 'commercialStreet', name: '商业街', category: '商业类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '商业销售/租赁收入', description: '街区式商业、风情商业街。', sortOrder: 120 },
  { key: 'officeBuilding', name: '写字楼', category: '商业类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '办公销售/租赁收入', description: '办公楼、写字楼业态。', sortOrder: 130 },
  { key: 'apartment', name: '公寓', category: '商业类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按可售面积占比', defaultIncomeType: '公寓销售/租赁收入', description: '公寓、服务式公寓等。', sortOrder: 140 },
  { key: 'hotel', name: '酒店', category: '商业类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '酒店经营收入', description: '酒店及自持经营业态。', sortOrder: 150 },
  { key: 'clubhouse', name: '会所', category: '商业类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '会所及展示配套。', sortOrder: 160 },

  // 车位类
  { key: 'undergroundGarage', name: '地下车库', category: '车位类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按地下建筑面积/车位数量分摊', defaultIncomeType: '车位收入', description: '地下车库整体业态。', sortOrder: 300 },
  { key: 'undergroundPropertyParking', name: '地下产权车位', category: '车位类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按车位数量分摊', defaultIncomeType: '车位销售收入', description: '可销售产权地下车位。', sortOrder: 310 },
  { key: 'undergroundUseRightParking', name: '地下使用权车位', category: '车位类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按车位数量分摊', defaultIncomeType: '车位使用权收入', description: '使用权转让或租赁型地下车位。', sortOrder: 320 },
  { key: 'civilDefenseParking', name: '人防车位', category: '车位类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按人防面积/车位数量分摊', defaultIncomeType: '人防车位使用收入', description: '人防区车位。', sortOrder: 330 },
  { key: 'aboveGroundParking', name: '地上车位', category: '车位类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按车位数量分摊', defaultIncomeType: '车位销售/租赁收入', description: '地上车位。', sortOrder: 340 },
  { key: 'mechanicalParking', name: '机械车位', category: '车位类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按车位数量分摊', defaultIncomeType: '机械车位销售/租赁收入', description: '机械式停车位。', sortOrder: 350 },
  { key: 'chargingParking', name: '充电车位', category: '车位类', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按车位数量分摊', defaultIncomeType: '充电车位销售/租赁收入', description: '配置充电条件的车位；充电桩设备成本仍归安装/设备。', sortOrder: 360 },

  // 储藏及附属
  { key: 'storageRoom', name: '储藏室', category: '储藏及附属', isSaleable: true, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按建筑面积占比', defaultIncomeType: '储藏室销售收入', description: '储藏室、储物间。', sortOrder: 400 },
  { key: 'equipmentMezzanine', name: '设备夹层', category: '储藏及附属', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '设备夹层、转换层等。', sortOrder: 410 },
  { key: 'elevatedFloor', name: '架空层', category: '储藏及附属', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '住宅架空层及泛会所空间。', sortOrder: 420 },
  { key: 'roofMachineRoom', name: '屋顶机房', category: '储藏及附属', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '屋顶设备机房、楼梯间等。', sortOrder: 430 },
  { key: 'undergroundNonMotorGarage', name: '地下非机动车库', category: '储藏及附属', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按建筑面积占比', defaultIncomeType: '非机动车库收入', description: '地下非机动车停放区。', sortOrder: 440 },

  // 公建配套
  { key: 'propertyManagement', name: '物业用房', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按建筑面积占比', defaultIncomeType: '无直接销售收入', description: '物业管理用房。', sortOrder: 500 },
  { key: 'communityService', name: '社区用房', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按建筑面积占比', defaultIncomeType: '无直接销售收入', description: '社区服务、社区综合配套等。', sortOrder: 510 },
  { key: 'elderlyService', name: '养老服务用房', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按建筑面积占比', defaultIncomeType: '无直接销售收入', description: '养老服务设施。', sortOrder: 520 },
  { key: 'childcareService', name: '托育用房', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按建筑面积占比', defaultIncomeType: '无直接销售收入', description: '托育、婴幼儿照护服务用房。', sortOrder: 530 },
  { key: 'ownersCommitteeRoom', name: '业委会用房', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按建筑面积占比', defaultIncomeType: '无直接销售收入', description: '业主委员会用房。', sortOrder: 540 },
  { key: 'guardRoom', name: '门卫室', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '门卫室、岗亭等。', sortOrder: 550 },
  { key: 'garbageRoom', name: '垃圾房', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '垃圾收集房、环卫用房。', sortOrder: 560 },
  { key: 'switchingStation', name: '开闭所', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '开闭所、开关站等。', sortOrder: 570 },
  { key: 'powerDistributionRoom', name: '配电房', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '配电房、变配电室。', sortOrder: 580 },
  { key: 'pumpRoom', name: '水泵房', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '生活水泵房、消防泵房等。', sortOrder: 590 },
  { key: 'fireControlRoom', name: '消防控制室', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '消防控制室。', sortOrder: 600 },
  { key: 'equipmentRoom', name: '设备用房', category: '公建配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '各类设备机房总称。', sortOrder: 610 },

  // 教育配套
  { key: 'kindergarten', name: '幼儿园', category: '教育配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '配建幼儿园。', sortOrder: 700 },
  { key: 'primarySchoolSupport', name: '小学配套', category: '教育配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '小学或教育配建用房。', sortOrder: 710 },
  { key: 'trainingRoom', name: '培训用房', category: '教育配套', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '培训/租赁收入', description: '培训、教育服务用房。', sortOrder: 720 },

  // 示范区/营销
  { key: 'salesOffice', name: '售楼部', category: '示范区/营销', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '售楼部、营销中心。', sortOrder: 800 },
  { key: 'showFlat', name: '样板房', category: '示范区/营销', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '样板房整体。', sortOrder: 810 },
  { key: 'showRoom', name: '样板间', category: '示范区/营销', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '样板间、展示户型。', sortOrder: 820 },
  { key: 'demoLandscapeArea', name: '景观示范区', category: '示范区/营销', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '景观示范区。', sortOrder: 830 },
  { key: 'temporaryDisplayArea', name: '临时展示区', category: '示范区/营销', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '临时展示、临时包装区域。', sortOrder: 840 },

  // 地下室分类
  { key: 'ordinaryBasement', name: '普通地下室', category: '地下室分类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按地下建筑面积分摊', defaultIncomeType: '无直接销售收入', description: '普通地下室整体。', sortOrder: 900 },
  { key: 'civilDefenseBasement', name: '人防地下室', category: '地下室分类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按人防面积分摊', defaultIncomeType: '无直接销售收入', description: '人防地下室。', sortOrder: 910 },
  { key: 'nonCivilDefenseBasement', name: '非人防地下室', category: '地下室分类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按非人防地下室面积分摊', defaultIncomeType: '无直接销售收入', description: '非人防地下室。', sortOrder: 920 },
  { key: 'mainBuildingBasement', name: '主楼地下室', category: '地下室分类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按所属主楼/受益对象分摊', defaultIncomeType: '无直接销售收入', description: '主楼投影范围地下室。', sortOrder: 930 },
  { key: 'pureGarageBasement', name: '纯车库地下室', category: '地下室分类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按车位/地下建筑面积分摊', defaultIncomeType: '车位收入', description: '非主楼区域纯车库地下室。', sortOrder: 940 },
  { key: 'undergroundEquipmentArea', name: '地下设备区', category: '地下室分类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按受益对象分摊', defaultIncomeType: '无直接销售收入', description: '地下设备用房及设备区。', sortOrder: 950 },
  { key: 'civilDefenseWorks', name: '人防工程', category: '地下室分类', isSaleable: false, participateAllocation: true, defaultVatRate: 0.09, defaultAllocationMethod: '按人防面积/受益对象分摊', defaultIncomeType: '无直接销售收入', description: '人防工程成本对象。', sortOrder: 960 }
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

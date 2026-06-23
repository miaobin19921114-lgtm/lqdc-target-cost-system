import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SubjectRow = {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
  fullPath: string | null;
  defaultUnit: string | null;
  defaultTaxRate: unknown;
  defaultMeasureBasis: string | null;
  defaultAllocationMethod: string | null;
  sortOrder: number;
};

type RuleSeed = {
  ruleKey: string;
  costCode: string;
  subjectName: string;
  subjectPath: string;
  subjectLevel: number;
  dataSource: string;
  quantityField: string;
  configField: string;
  calculationMethod: string;
  defaultUnit: string;
  defaultUnitPrice: number;
  defaultCoefficient: number;
  costAttributionMethod: string;
  allocationMethod: string;
  taxDeductionMethod: string;
  allowQuantityOverride: boolean;
  allowPriceOverride: boolean;
  enabled: boolean;
  priority: number;
  remark: string;
};

function includes(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function normalizeUnit(unit: string | null | undefined, fallback: string) {
  return unit && unit.trim() ? unit.trim() : fallback;
}

function inferRule(subject: SubjectRow, leafIndex: number): RuleSeed {
  const path = subject.fullPath || subject.name;
  const text = `${subject.code} ${path} ${subject.name}`;
  const base: RuleSeed = {
    ruleKey: subject.code,
    costCode: subject.code,
    subjectName: subject.name,
    subjectPath: path,
    subjectLevel: subject.level,
    dataSource: '工程量指标 / 手工调整',
    quantityField: subject.defaultMeasureBasis || 'buildingArea',
    configField: '无',
    calculationMethod: `${subject.defaultMeasureBasis || '建筑面积'} × 单价`,
    defaultUnit: normalizeUnit(subject.defaultUnit, '元/㎡'),
    defaultUnitPrice: 0,
    defaultCoefficient: 1,
    costAttributionMethod: '按成本受益对象归集',
    allocationMethod: subject.defaultAllocationMethod || '按建筑面积分摊',
    taxDeductionMethod: '按成本性质进入开发成本/税前扣除',
    allowQuantityOverride: true,
    allowPriceOverride: true,
    enabled: true,
    priority: leafIndex + 1,
    remark: '由系统根据末级成本科目自动生成的初始测算规则，可后续人工维护。'
  };

  if (includes(text, ['土地', '契税', '土地价款', '交易服务费'])) {
    return { ...base, dataSource: '概况表 / 土地费明细', quantityField: 'landArea、landCostAmount', configField: '无', calculationMethod: '直接金额 或 土地面积 × 单价', defaultUnit: '万元', costAttributionMethod: '项目整体', allocationMethod: '按土地增值税/所得税清算口径分摊', taxDeductionMethod: '土地成本扣除项目', remark: '土地费以直接金额为主，工程量仅用于校验土地单方。' };
  }
  if (includes(text, ['三通一平', '场平', '临设', '围挡', '临时设施'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'siteLevelingArea、temporaryFacilityArea、sitePerimeter', configField: '项目阶段/临设标准', calculationMethod: '面积/长度 × 单价', costAttributionMethod: '项目整体', allocationMethod: '按建筑面积或可售面积分摊', remark: '三通一平、临设、围挡按面积或周界长度估算。' };
  }
  if (includes(text, ['勘察', '设计', '报批', '报建', '规费', '检测', '测绘', '咨询'])) {
    return { ...base, dataSource: '概况表 / 规则费率', quantityField: 'totalBuildingArea、capacityBuildingArea', configField: '城市区域、项目阶段', calculationMethod: '建面 × 单价 或 成本/收入 × 费率', costAttributionMethod: '项目整体', allocationMethod: '按建筑面积或受益对象分摊', remark: '前期费用地区差异较大，应保留费率和手工调整。' };
  }
  if (includes(text, ['土石方', '土方', '基坑', '支护', '降水'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'earthworkVolume、baseArea', configField: '地下室层数、基坑深度', calculationMethod: 'm³/㎡ × 单价', defaultUnit: '元/m³ 或 元/㎡', costAttributionMethod: '地下空间/项目整体', allocationMethod: '按地下建筑面积或建筑面积分摊', remark: '投拓阶段可按地下建面或基底面积估算，方案阶段用土方量。' };
  }
  if (includes(text, ['桩基', '基础'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'pileFoundationArea、baseArea', configField: '基础形式、地勘条件', calculationMethod: '基底面积 × 单价 或 桩数 × 单价', defaultUnit: '元/㎡ 或 元/根', costAttributionMethod: '对应楼栋/地下室', allocationMethod: '按受益对象或建筑面积分摊', remark: '当前先按基底面积估算，后续增加桩型、桩长、桩径。' };
  }
  if (includes(text, ['主体', '结构', '钢筋', '混凝土', '砌体', '模板'])) {
    return { ...base, dataSource: '概况表 + 工程量指标', quantityField: 'aboveGroundArea、undergroundArea、standardFloorArea', configField: '结构体系、装配式标准', calculationMethod: '建筑面积 × 结构单方', defaultUnit: '元/㎡', costAttributionMethod: '按业态/楼栋归集', allocationMethod: '按对应业态建筑面积分摊', remark: '住宅、商业、地下室应分别设置结构单方。' };
  }
  if (includes(text, ['防水'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'waterproofArea、roofArea、undergroundArea', configField: '防水等级、地下室品质', calculationMethod: '防水面积 × 单价', defaultUnit: '元/㎡', costAttributionMethod: '按防水受益对象归集', allocationMethod: '按对应建筑面积分摊', remark: '地下室、屋面、厨卫防水后续可分开取量。' };
  }
  if (includes(text, ['屋面'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'roofArea', configField: '屋面做法', calculationMethod: '屋面面积 × 单价', defaultUnit: '元/㎡', costAttributionMethod: '归属对应业态/楼栋', allocationMethod: '按屋面受益对象分摊', remark: '屋面工程应和防水、保温口径联动。' };
  }
  if (includes(text, ['保温'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'insulationArea', configField: '保温体系', calculationMethod: '保温面积 × 单价', defaultUnit: '元/㎡', costAttributionMethod: '按外墙/屋面受益对象归集', allocationMethod: '按建筑面积分摊', remark: '保温面积可由外墙面积、屋面面积派生。' };
  }
  if (includes(text, ['外立面', '外墙', '幕墙', '涂料', '真石漆', '石材', '铝板'])) {
    return { ...base, dataSource: '工程量指标 + 建造配置', quantityField: 'facadeArea', configField: '外立面档次', calculationMethod: '外立面面积 × 档次单价', defaultUnit: '元/㎡', costAttributionMethod: '按受益业态/楼栋归集', allocationMethod: '按建筑面积或外立面面积分摊', remark: '建造配置页后续补外立面档次：涂料、真石漆、铝板、石材等。' };
  }
  if (includes(text, ['门窗', '窗', '幕墙门', '铝合金'])) {
    return { ...base, dataSource: '工程量指标 + 建造配置', quantityField: 'windowArea', configField: '门窗系统', calculationMethod: '门窗面积 × 系统单价', defaultUnit: '元/㎡', costAttributionMethod: '按受益业态/楼栋归集', allocationMethod: '按建筑面积或门窗面积分摊', remark: '建造配置页后续补普通铝合金、断桥铝、系统窗等配置。' };
  }
  if (includes(text, ['栏杆', '栏板', '护栏'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'railingLength', configField: '栏杆材质/档次', calculationMethod: '长度 × 单价', defaultUnit: '元/m', costAttributionMethod: '归属对应业态/楼栋', allocationMethod: '按受益对象分摊', remark: '阳台栏杆、楼梯栏杆、护窗栏杆后续可分项。' };
  }
  if (includes(text, ['给排水', '强电', '弱电', '消防', '暖通', '智能化', '可视对讲', '门禁', '监控'])) {
    const configField = includes(text, ['暖通', '采暖', '地暖']) ? '采暖范围/采暖形式' : includes(text, ['弱电', '智能化', '可视对讲', '门禁', '监控']) ? '智能化档次' : '设备及安装标准';
    return { ...base, dataSource: '概况表 + 工程量指标 + 建造配置', quantityField: 'buildingArea、undergroundArea、householdCount', configField, calculationMethod: '建筑面积/户数 × 单价', defaultUnit: '元/㎡ 或 元/户', costAttributionMethod: '按专业和受益对象归集', allocationMethod: '按建筑面积或受益对象分摊', remark: '安装工程先按业态建面估算，后续按专业和区域细分。' };
  }
  if (includes(text, ['电梯'])) {
    return { ...base, dataSource: '工程量指标 + 建造配置', quantityField: 'elevatorCount、unitCount', configField: '电梯档次', calculationMethod: '台数 × 单价', defaultUnit: '万元/台', costAttributionMethod: '归属对应楼栋/业态', allocationMethod: '按楼栋或业态建筑面积分摊', remark: '电梯数量来自工程量指标，档次影响单价。' };
  }
  if (includes(text, ['变配电', '配电', '配电房', '电房'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'powerRoomCount、buildingArea', configField: '供配电标准', calculationMethod: '数量/容量/建筑面积 × 单价', defaultUnit: '万元/项 或 元/㎡', costAttributionMethod: '项目整体/地下室', allocationMethod: '按建筑面积或受益对象分摊', remark: '后续可加入容量、变压器台数、供电方案。' };
  }
  if (includes(text, ['水泵房', '泵房', '水泵'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'pumpRoomCount', configField: '泵房设备标准', calculationMethod: '数量 × 单价', defaultUnit: '万元/座', costAttributionMethod: '项目整体/地下室', allocationMethod: '按建筑面积分摊', remark: '水泵房数量影响设备和机房土建。' };
  }
  if (includes(text, ['消防水池', '水池'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'firePoolVolume', configField: '消防水池做法', calculationMethod: '容积 × 单价', defaultUnit: '元/m³', costAttributionMethod: '项目整体/地下室', allocationMethod: '按建筑面积分摊', remark: '消防水池同时影响土建、防水和设备。' };
  }
  if (includes(text, ['充电桩', '充电'])) {
    return { ...base, dataSource: '工程量指标 + 业态产品', quantityField: 'chargingPileCount、fastChargingPileCount、slowChargingPileCount', configField: '充电桩是否单独测算', calculationMethod: '桩数 × 单价', defaultUnit: '元/个', costAttributionMethod: '归属地下车位', allocationMethod: '不参与住宅分摊或按车位分摊', remark: '充电桩不作为业态，归属地下车位/安装设备成本。' };
  }
  if (includes(text, ['精装', '装修', '公区', '大堂', '归家'])) {
    let quantityField = 'publicArea、lobbyArea';
    let configField = '装修标准';
    let attribution = '按装修受益对象归集';
    if (includes(text, ['户内', '室内'])) { quantityField = 'saleableArea 或 精装面积'; configField = 'residentialFitoutDelivery、residentialFitoutStandard'; attribution = '住宅类'; }
    if (includes(text, ['售楼部'])) { quantityField = 'salesOfficeArea'; configField = 'hasSalesOffice、salesOfficeFitoutType'; attribution = '示范区/销售费用'; }
    if (includes(text, ['样板'])) { quantityField = 'showFlatArea'; configField = 'hasShowFlat、showFlatFitoutType'; attribution = '示范区/销售费用'; }
    return { ...base, dataSource: '工程量指标 + 建造配置', quantityField, configField, calculationMethod: '面积 × 装修标准单价', defaultUnit: '元/㎡', costAttributionMethod: attribution, allocationMethod: '按装修受益对象或销售费用口径分摊', remark: '精装类科目必须同时依赖面积和装修档次。' };
  }
  if (includes(text, ['景观', '绿化', '硬景', '软景', '水景', '儿童'])) {
    return { ...base, dataSource: '工程量指标 + 建造配置', quantityField: 'landscapeArea、hardscapeArea、softscapeArea、waterFeatureArea、childrenActivityArea', configField: '景观档次', calculationMethod: '面积 × 档次单价', defaultUnit: '元/㎡', costAttributionMethod: '项目整体', allocationMethod: '按建筑面积或可售面积分摊', remark: '硬景、软景、水景、儿童活动区应逐步拆分。' };
  }
  if (includes(text, ['道路', '消防车道', '沥青'])) {
    return { ...base, dataSource: '工程量指标', quantityField: 'roadArea、fireRoadArea、asphaltRoadArea', configField: '道路做法', calculationMethod: '面积 × 单价', defaultUnit: '元/㎡', costAttributionMethod: '项目整体', allocationMethod: '按建筑面积分摊', remark: '道路、消防车道、沥青面层建议分项。' };
  }
  if (includes(text, ['围墙', '大门', '出入口', '门岗'])) {
    const quantityField = includes(text, ['出入口', '大门', '门岗']) ? 'gateCount、formalGateCount、temporaryGateCount' : 'sitePerimeter';
    const unit = includes(text, ['出入口', '大门', '门岗']) ? '万元/个' : '元/m';
    return { ...base, dataSource: '工程量指标', quantityField, configField: '围墙及出入口档次', calculationMethod: '长度/数量 × 单价', defaultUnit: unit, costAttributionMethod: '项目整体', allocationMethod: '按建筑面积或可售面积分摊', remark: '围墙按周界长度，出入口按数量单独计算。' };
  }
  if (includes(text, ['管理费', '财务费', '销售费用', '营销费', '开发间接'])) {
    return { ...base, dataSource: '收入测算 / 成本汇总 / 费率参数', quantityField: '销售收入、目标成本、开发周期', configField: '费率参数', calculationMethod: '金额 × 费率', defaultUnit: '% 或 万元', costAttributionMethod: '项目整体', allocationMethod: '按经营口径分摊', remark: '开发间接费多按费率或直接金额测算。' };
  }
  if (includes(text, ['增值税', '附加', '土地增值税', '所得税', '税'])) {
    return { ...base, dataSource: '收入测算 + 成本测算 + 税务清算对象', quantityField: '收入、进项、可扣除成本、清算对象', configField: '税率、清算口径', calculationMethod: '税法公式', defaultUnit: '万元', costAttributionMethod: '清算对象/项目整体', allocationMethod: '按税务清算对象归集', taxDeductionMethod: '按税法规定', remark: '税金不是单价乘工程量，应单独按税务表计算。' };
  }

  return base;
}

function sql(value: string | number | boolean | null) {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CostCalculationRule" (
      "ruleKey" TEXT PRIMARY KEY,
      "costCode" TEXT,
      "subjectName" TEXT NOT NULL,
      "subjectPath" TEXT,
      "subjectLevel" INTEGER DEFAULT 0,
      "dataSource" TEXT,
      "quantityField" TEXT,
      "configField" TEXT,
      "calculationMethod" TEXT,
      "defaultUnit" TEXT,
      "defaultUnitPrice" NUMERIC DEFAULT 0,
      "defaultCoefficient" NUMERIC DEFAULT 1,
      "costAttributionMethod" TEXT,
      "allocationMethod" TEXT,
      "taxDeductionMethod" TEXT,
      "allowQuantityOverride" BOOLEAN DEFAULT TRUE,
      "allowPriceOverride" BOOLEAN DEFAULT TRUE,
      "enabled" BOOLEAN DEFAULT TRUE,
      "priority" INTEGER DEFAULT 100,
      "remark" TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CostCalculationRule_costCode_idx" ON "CostCalculationRule" ("costCode")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CostCalculationRule_enabled_idx" ON "CostCalculationRule" ("enabled")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CostCalculationRule_subjectLevel_idx" ON "CostCalculationRule" ("subjectLevel")');
}

async function seedRules() {
  const subjects = await prisma.costSubject.findMany({ where: { enabled: true }, orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }] });
  const parentCodes = new Set(subjects.map((subject) => subject.parentCode).filter(Boolean));
  const leaves = subjects.filter((subject) => !parentCodes.has(subject.code));

  for (let index = 0; index < leaves.length; index += 1) {
    const rule = inferRule(leaves[index] as SubjectRow, index);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "CostCalculationRule" (
        "ruleKey", "costCode", "subjectName", "subjectPath", "subjectLevel", "dataSource", "quantityField", "configField", "calculationMethod", "defaultUnit", "defaultUnitPrice", "defaultCoefficient", "costAttributionMethod", "allocationMethod", "taxDeductionMethod", "allowQuantityOverride", "allowPriceOverride", "enabled", "priority", "remark"
      ) VALUES (
        ${sql(rule.ruleKey)}, ${sql(rule.costCode)}, ${sql(rule.subjectName)}, ${sql(rule.subjectPath)}, ${sql(rule.subjectLevel)}, ${sql(rule.dataSource)}, ${sql(rule.quantityField)}, ${sql(rule.configField)}, ${sql(rule.calculationMethod)}, ${sql(rule.defaultUnit)}, ${sql(rule.defaultUnitPrice)}, ${sql(rule.defaultCoefficient)}, ${sql(rule.costAttributionMethod)}, ${sql(rule.allocationMethod)}, ${sql(rule.taxDeductionMethod)}, ${sql(rule.allowQuantityOverride)}, ${sql(rule.allowPriceOverride)}, ${sql(rule.enabled)}, ${sql(rule.priority)}, ${sql(rule.remark)}
      )
      ON CONFLICT ("ruleKey") DO UPDATE SET
        "costCode" = EXCLUDED."costCode",
        "subjectName" = EXCLUDED."subjectName",
        "subjectPath" = EXCLUDED."subjectPath",
        "subjectLevel" = EXCLUDED."subjectLevel",
        "dataSource" = EXCLUDED."dataSource",
        "quantityField" = EXCLUDED."quantityField",
        "configField" = EXCLUDED."configField",
        "calculationMethod" = EXCLUDED."calculationMethod",
        "defaultUnit" = EXCLUDED."defaultUnit",
        "costAttributionMethod" = EXCLUDED."costAttributionMethod",
        "allocationMethod" = EXCLUDED."allocationMethod",
        "taxDeductionMethod" = EXCLUDED."taxDeductionMethod",
        "priority" = EXCLUDED."priority",
        "remark" = EXCLUDED."remark",
        "updatedAt" = NOW()
    `);
  }
  console.log(`Ensured cost calculation rules: ${leaves.length}`);
}

async function main() {
  await ensureTable();
  await seedRules();
}

main().finally(async () => prisma.$disconnect());

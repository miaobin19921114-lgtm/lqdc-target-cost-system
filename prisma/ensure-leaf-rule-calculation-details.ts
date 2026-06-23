import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run(label: string, sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`OK: ${label}`);
  } catch (error) {
    console.warn(`Skipped: ${label}`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  await run('土地费规则细化', `
    UPDATE "TemplateUnifiedRule"
    SET "dataSourceTable" = '项目概况表,土地费用明细表,税费参数表',
        "requiredFields" = '土地成交价,土地面积,土地面积亩,计容建筑面积,契税税率,交易服务费,评估费,权籍测绘费,合作开发对价,土地付款节点',
        "measureBasis" = '土地合同及税费参数',
        "quantityFormula" = '按合同金额录入，或按土地面积/计容面积反算单方指标',
        "pricingUnit" = '元/项目,元/亩,元/㎡计容面积',
        "unitPriceSource" = '土地合同/成交确认书/税费参数表',
        "amountFormula" = '土地费 = 土地成交价 + 契税 + 交易服务费 + 评估费 + 权籍测绘费 + 合作开发相关成本',
        "costAttributionMethod" = '归属全项目，按土地增值税清算对象和可售/建筑面积分摊',
        "allocationMethod" = '直接归集优先；不能直接归集时按建筑面积或可售面积分摊',
        "vatTreatment" = '土地价款按税务口径处理，不简单作为进项抵扣',
        "landVatTreatment" = '按土地增值税清算对象和扣除类别处理',
        "incomeTaxTreatment" = '按企业所得税成本对象和税前扣除口径处理',
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "templateCode" = 'residential-v1' AND "precisionLevel" = 'L3 目标测算' AND "subjectCode" LIKE '01%'
  `);

  await run('建安工程规则细化', `
    UPDATE "TemplateUnifiedRule"
    SET "dataSourceTable" = '项目概况表,业态产品表,工程量指标表,建造配置标准,量价指标库',
        "requiredFields" = '地上建筑面积,地下建筑面积,可售面积,不可售面积,基底面积,桩基面积,人防面积,外立面面积,门窗面积,屋面面积,防水面积,保温面积,栏杆长度,土方量,结构形式,配置档次',
        "measureBasis" = '业态拆分 + 工程量含量法',
        "quantityFormula" = '工程量 = 业态面积 × 含量系数，或采用工程量指标表直接录入值',
        "pricingUnit" = '元/㎡,元/m,元/m³,元/项',
        "unitPriceSource" = '模板默认指标库 + 地区量价指标库 + 项目人工校正',
        "amountFormula" = '建安成本 = 工程量 × 综合单价 × 调整系数',
        "costAttributionMethod" = '主楼地下室归属对应业态；非主楼地库归属地下车位/地库',
        "allocationMethod" = '直接归属优先；公共成本按建筑面积/可售面积/清算对象分摊',
        "vatTreatment" = '含税金额拆分为不含税金额和进项税额，不可抵扣进项计入成本',
        "landVatTreatment" = '按土地增值税扣除类别归集',
        "incomeTaxTreatment" = '按企业所得税成本对象归集',
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "templateCode" = 'residential-v1' AND "precisionLevel" = 'L3 目标测算' AND "subjectCode" LIKE '03%'
  `);

  await run('充电桩规则归属地库', `
    UPDATE "TemplateUnifiedRule"
    SET "costAttributionMethod" = '充电桩归属地下车位/地库，不作为业态',
        "requiredFields" = '充电桩数量,快充数量,慢充数量,预留充电桩数量,车位数量,充电桩单价,预留管线长度',
        "measureBasis" = '充电桩数量/预留管线长度',
        "quantityFormula" = '充电桩工程量 = 快充数量 + 慢充数量 + 预留管线长度',
        "pricingUnit" = '元/个,元/m',
        "amountFormula" = '充电桩成本 = 充电桩数量 × 单价 + 预留管线长度 × 单价',
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "templateCode" = 'residential-v1' AND "precisionLevel" = 'L3 目标测算' AND "subjectName" LIKE '%充电桩%'
  `);

  await run('同步项目快照规则', `
    UPDATE "ProjectUnifiedRuleSnapshot" purs
    SET "dataSourceTable" = tur."dataSourceTable",
        "requiredFields" = tur."requiredFields",
        "measureBasis" = tur."measureBasis",
        "quantityFormula" = tur."quantityFormula",
        "pricingUnit" = tur."pricingUnit",
        "unitPriceSource" = tur."unitPriceSource",
        "amountFormula" = tur."amountFormula",
        "costAttributionMethod" = tur."costAttributionMethod",
        "allocationMethod" = tur."allocationMethod",
        "vatTreatment" = tur."vatTreatment",
        "landVatTreatment" = tur."landVatTreatment",
        "incomeTaxTreatment" = tur."incomeTaxTreatment",
        "updatedAt" = CURRENT_TIMESTAMP
    FROM "TemplateUnifiedRule" tur
    WHERE purs."sourceRuleId" = tur."id" AND purs."allowProjectOverride" = TRUE
  `);

  await run('同步版本快照规则', `
    UPDATE "VersionUnifiedRuleSnapshot" vurs
    SET "dataSourceTable" = purs."dataSourceTable",
        "requiredFields" = purs."requiredFields",
        "measureBasis" = purs."measureBasis",
        "quantityFormula" = purs."quantityFormula",
        "pricingUnit" = purs."pricingUnit",
        "unitPriceSource" = purs."unitPriceSource",
        "amountFormula" = purs."amountFormula",
        "costAttributionMethod" = purs."costAttributionMethod",
        "allocationMethod" = purs."allocationMethod",
        "vatTreatment" = purs."vatTreatment",
        "landVatTreatment" = purs."landVatTreatment",
        "incomeTaxTreatment" = purs."incomeTaxTreatment",
        "updatedAt" = CURRENT_TIMESTAMP
    FROM "ProjectUnifiedRuleSnapshot" purs
    WHERE vurs."sourceProjectRuleId" = purs."id" AND vurs."allowVersionOverride" = TRUE
  `);

  console.log('Leaf rule calculation details ensured.');
}

main().finally(async () => prisma.$disconnect());

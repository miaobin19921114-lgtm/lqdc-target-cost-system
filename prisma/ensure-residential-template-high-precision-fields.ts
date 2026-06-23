import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function q(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function safeExecute(label: string, sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`OK: ${label}`);
  } catch (error) {
    console.warn(`Skipped: ${label}`, error instanceof Error ? error.message : error);
  }
}

async function updateByCodePrefix(label: string, prefixes: string[], patch: Record<string, string>) {
  const where = prefixes.map((prefix) => `"subjectCode" LIKE ${q(`${prefix}%`)}`).join(' OR ');
  const setClause = Object.entries(patch).map(([key, value]) => `"${key}" = ${q(value)}`).join(',\n        ');
  await safeExecute(label, `
    UPDATE "TemplateUnifiedRule"
    SET ${setClause},
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "templateCode" = 'residential-v1'
      AND (${where})
  `);
}

async function main() {
  await updateByCodePrefix('土地费高精度字段', ['01'], {
    dataSourceTable: '项目概况表,土地费用明细表,税费参数表',
    requiredFields: '土地成交价,土地面积,土地面积亩,计容建筑面积,契税税率,交易服务费,土地评估费,权籍测绘费,合作开发对价,股权溢价,土地付款节点',
    measureBasis: '土地合同及税费参数',
    quantityFormula: '土地面积/计容建筑面积/土地成交总价',
    pricingUnit: '元/项目,元/亩,元/㎡计容面积',
    amountFormula: '土地成交价 + 契税 + 交易服务费 + 评估费 + 权籍测绘费 + 合作开发相关成本',
    costAttributionMethod: '归属全项目，按土地增值税清算对象和可售/建筑面积分摊',
    allocationMethod: '直接归集优先；不能直接归集时按建筑面积或可售面积分摊',
  });

  await updateByCodePrefix('前期工程费高精度字段', ['02'], {
    dataSourceTable: '项目概况表,工程量指标表,前期费用明细表,建造配置标准',
    requiredFields: '总建筑面积,计容建筑面积,土地面积,周界长度,出入口数量,临设面积,场地平整面积,临水容量,临电容量,勘察费单价,设计费单价,报规报建固定费用,三通一平单价,围墙单价,出入口单价',
    measureBasis: '参数化前期工程量',
    quantityFormula: '建筑面积/土地面积/周界长度/出入口数量/临设面积/场平面积',
    pricingUnit: '元/㎡,元/m,元/个,元/项',
    amountFormula: '各前期事项工程量 × 对应单价或固定费用',
    costAttributionMethod: '按受益对象归属，公共前期费用按建筑面积或可售面积分摊',
    allocationMethod: '直接归属优先；公共费用按建筑面积/可售面积/清算对象分摊',
  });

  await updateByCodePrefix('建安工程费高精度字段', ['03'], {
    dataSourceTable: '项目概况表,业态产品表,工程量指标表,建造配置标准,量价指标库',
    requiredFields: '地上建筑面积,地下建筑面积,可售面积,不可售面积,基底面积,桩基面积,标准层面积,户数,单元数,楼栋数,地下室层数,层高,人防面积,非人防面积,外立面面积,门窗面积,屋面面积,防水面积,保温面积,栏杆长度,土方量,结构形式,装配式范围,装配率,配置档次',
    measureBasis: '业态拆分 + 工程量含量法',
    quantityFormula: '业态面积 × 含量系数，或直接工程量指标',
    pricingUnit: '元/㎡,元/m,元/m³,元/项',
    amountFormula: '工程量 × 单价 × 系数',
    costAttributionMethod: '主楼地下室归属对应业态；非主楼地库归属地下车位/地下室',
    allocationMethod: '能直接归属则直接归属，不能直接归属按建筑面积/可售面积/受益对象分摊',
  });

  await updateByCodePrefix('室外景观及配套高精度字段', ['04'], {
    dataSourceTable: '项目概况表,工程量指标表,建造配置标准,量价指标库',
    requiredFields: '景观面积,硬景面积,软景面积,绿化面积,水景面积,儿童活动场地面积,架空层景观面积,道路面积,消防道路面积,沥青道路面积,综合管网面积,管线长度,周界长度,围墙长度,正式出入口数量,临时出入口数量,景观档次,道路做法,管网配置',
    measureBasis: '景观面积/道路面积/周界长度/出入口数量/管线长度',
    quantityFormula: '硬景面积 + 软景面积 + 道路面积 + 围墙长度 + 出入口数量',
    pricingUnit: '元/㎡,元/m,元/个,元/项',
    amountFormula: '分项工程量 × 对应单价',
    costAttributionMethod: '按受益区域归属；公共室外工程按可售面积或建筑面积分摊',
    allocationMethod: '直接归属优先，公共配套按受益对象分摊',
  });

  await updateByCodePrefix('设备工程高精度字段', ['05'], {
    dataSourceTable: '项目概况表,工程量指标表,建造配置标准,量价指标库',
    requiredFields: '电梯台数,单元数量,楼栋数量,充电桩数量,快充数量,慢充数量,预留充电桩数量,人防面积,防护单元数量,消防设备面积,配电房数量,水泵房数量,消防水池容量,停车场系统数量,弱电系统配置,设备档次',
    measureBasis: '设备数量 + 系统配置',
    quantityFormula: '设备数量 × 单价，或系统覆盖面积 × 单价',
    pricingUnit: '元/台,元/套,元/个,元/㎡',
    amountFormula: '设备数量 × 设备单价 + 系统面积 × 系统单价',
    costAttributionMethod: '电梯归属对应业态；充电桩归属地下车位/地库；人防设备归属人防区域',
    allocationMethod: '按设备服务对象直接归属，公共系统按建筑面积/受益对象分摊',
  });

  await updateByCodePrefix('精装修工程高精度字段', ['06'], {
    dataSourceTable: '项目概况表,业态产品表,工程量指标表,建造配置标准,量价指标库',
    requiredFields: '大堂面积,地下大堂面积,公区面积,售楼部面积,样板房面积,批量精装面积,物业用房面积,社区用房面积,商业公区面积,精装交付范围,精装标准,售楼部软装范围,样板房软装范围',
    measureBasis: '精装部位面积 + 配置档次',
    quantityFormula: '各精装部位面积 × 对应档次单价',
    pricingUnit: '元/㎡,元/项',
    amountFormula: '精装面积 × 精装单价 + 软装专项费用',
    costAttributionMethod: '按精装部位归属对应业态或营销展示费用',
    allocationMethod: '直接归属优先；公区按受益业态分摊',
  });

  await updateByCodePrefix('咨询顾问费高精度字段', ['07'], {
    dataSourceTable: '项目概况表,前期费用明细表,合同结算表',
    requiredFields: '总建筑面积,计容建筑面积,合同金额,服务范围,监理费率,造价咨询费率,设计咨询费率,招标代理费率,第三方检测费率,咨询服务周期',
    measureBasis: '面积/合同金额/费率/固定费用',
    quantityFormula: '建筑面积或合同金额作为计费基数',
    pricingUnit: '元/㎡,%,元/项',
    amountFormula: '计费基数 × 费率 或 固定费用',
    costAttributionMethod: '按服务对象归属；公共咨询费用按建筑面积分摊',
    allocationMethod: '直接归属优先，公共服务按受益对象分摊',
  });

  await updateByCodePrefix('开发间接费高精度字段', ['08'], {
    dataSourceTable: '项目概况表,财务测算表,合同结算表',
    requiredFields: '项目开发周期,项目人员配置,管理费率,办公费用,差旅费用,行政费用,工程管理费用,开发间接费分摊周期,建筑面积,可售面积',
    measureBasis: '开发周期 + 管理配置 + 面积分摊',
    quantityFormula: '项目周期 × 月度管理费用，或建筑面积 × 管理单方',
    pricingUnit: '元/月,元/㎡,元/项',
    amountFormula: '周期费用 + 固定管理费用 + 分摊费用',
    costAttributionMethod: '归属项目公共成本',
    allocationMethod: '按开发周期、建筑面积或可售面积分摊',
  });

  await updateByCodePrefix('营销费用高精度字段', ['09'], {
    dataSourceTable: '收入明细表,销售计划表,财务测算表',
    requiredFields: '销售收入,可售面积,销售周期,营销费率,渠道费率,案场费用,广告推广费用,示范区包装费用,销售代理费,销售节点,去化计划',
    measureBasis: '销售收入/可售面积/销售周期/费率',
    quantityFormula: '收入 × 费率 或 销售周期 × 月度费用',
    pricingUnit: '%,元/月,元/㎡,元/项',
    amountFormula: '销售收入 × 营销费率 + 固定营销费用 + 渠道费用',
    costAttributionMethod: '归属销售费用，可按业态或收入占比分摊',
    allocationMethod: '按销售收入占比、可售面积或业态直接归属',
  });

  await updateByCodePrefix('财务费用高精度字段', ['10'], {
    dataSourceTable: '财务测算表,现金流计划表,融资计划表',
    requiredFields: '融资金额,融资利率,融资周期,放款节点,还款节点,销售回款计划,资本化周期,费用化周期,资金占用额,资金峰值,现金流计划',
    measureBasis: '融资金额 + 利率 + 资金占用周期',
    quantityFormula: '资金占用额 × 利率 × 占用时间',
    pricingUnit: '%,元/天,元/月,元/年',
    amountFormula: '资本化利息 + 费用化利息 + 融资相关手续费',
    costAttributionMethod: '区分资本化和费用化，归属财务费用或开发成本',
    allocationMethod: '按资金占用、项目周期或业态收入占比分摊',
  });

  await updateByCodePrefix('预备费高精度字段', ['11'], {
    dataSourceTable: '目标成本汇总表,风险清单,动态成本表',
    requiredFields: '计费基数,预备费率,风险等级,未决事项金额,暂估价金额,待明确工程范围,成本偏差率,动态成本余额',
    measureBasis: '计费基数 + 风险等级 + 未决事项',
    quantityFormula: '成本基数 × 预备费率 + 未决事项金额',
    pricingUnit: '%,元/项',
    amountFormula: '计费基数 × 预备费率 + 风险专项预留',
    costAttributionMethod: '归属项目公共成本，后续动态成本发生时冲减或调整',
    allocationMethod: '按受益对象、建筑面积或可售面积分摊',
  });

  await updateByCodePrefix('税金高精度字段', ['12'], {
    dataSourceTable: '收入明细表,成本分摊测算表,税费参数表,土地增值税测算表,企业所得税测算表',
    requiredFields: '销售收入,不含税收入,销项税额,进项税额,不可抵扣进项税,附加税率,土地成本,开发成本,开发费用,加计扣除率,清算对象,可售面积,建筑面积,土地增值税税率,所得税税率,税前扣除口径',
    measureBasis: '收入、成本、税率、清算对象',
    quantityFormula: '按税种规则计算',
    pricingUnit: '%,元',
    amountFormula: '增值税及附加 + 土地增值税 + 企业所得税 + 其他税费',
    costAttributionMethod: '税金单独核算，按税种和清算对象归集',
    allocationMethod: '按税务清算对象、收入或成本归属口径分摊',
    landVatTreatment: '按土地增值税清算对象、扣除类别和加计扣除规则处理',
    incomeTaxTreatment: '按企业所得税成本对象和税前扣除口径处理',
  });

  await updateByCodePrefix('住宅销售收入高精度字段', ['R01'], {
    dataSourceTable: '收入明细表,业态产品表,销售计划表',
    requiredFields: '住宅可售面积,住宅销售单价,销售套数,户数,去化率,签约节奏,回款节奏,增值税税率,销售折扣,销售节点',
    measureBasis: '可售面积 × 销售单价 × 去化节奏',
    quantityFormula: '住宅可售面积 × 去化率',
    pricingUnit: '元/㎡,套,元',
    amountFormula: '可售面积 × 销售单价 × 去化率',
    revenueAttributionMethod: '归属住宅业态',
    vatTreatment: '按含税收入拆分不含税收入和销项税额',
  });

  await updateByCodePrefix('商业销售收入高精度字段', ['R02'], {
    dataSourceTable: '商业收入表,业态产品表,销售计划表',
    requiredFields: '商业可售面积,商业销售单价,商业租金,出租率,租期,销售比例,持有比例,增值税税率,招商周期,运营收入',
    measureBasis: '商业销售/租赁组合测算',
    quantityFormula: '商业面积 × 出售比例 或 出租面积 × 租金 × 租期',
    pricingUnit: '元/㎡,元/㎡/月,年',
    amountFormula: '销售收入 + 租赁收入 + 运营收入',
    revenueAttributionMethod: '归属商业业态',
    vatTreatment: '按销售/租赁不同税率拆分收入和税额',
  });

  await updateByCodePrefix('车位销售收入高精度字段', ['R03'], {
    dataSourceTable: '车位收入表,业态产品表,销售计划表',
    requiredFields: '地下产权车位数量,地下使用权车位数量,人防车位数量,地上车位数量,车位销售单价,车位租金,车位去化率,车位销售节点,增值税税率,充电桩是否含价',
    measureBasis: '车位数量 × 单价 × 去化率',
    quantityFormula: '各类车位数量 × 去化率',
    pricingUnit: '元/个,元/月',
    amountFormula: '可售车位数量 × 单价 × 去化率',
    revenueAttributionMethod: '归属地下车位/车位业态',
    vatTreatment: '按车位收入含税口径拆分销项税额',
  });

  await updateByCodePrefix('其他收入高精度字段', ['R04'], {
    dataSourceTable: '其他收入表,销售计划表,财务测算表',
    requiredFields: '收入类型,收入金额,确认条件,确认时间,是否含税,增值税税率,政策依据,确定性等级,现金流节点',
    measureBasis: '收入事项清单',
    quantityFormula: '按事项录入或按参数计算',
    pricingUnit: '元/项',
    amountFormula: '各项其他收入汇总',
    revenueAttributionMethod: '按收入事项归属业态或项目公共收入',
    vatTreatment: '按收入类型判断是否计税及对应税率',
  });

  await updateByCodePrefix('财务规则高精度字段', ['F01', 'F02', 'F03', 'F04', 'F05'], {
    dataSourceTable: '财务测算表,融资计划表,现金流计划表',
    requiredFields: '总投资,销售收入,回款计划,付款计划,融资金额,融资利率,融资周期,资本化周期,费用化周期,净现金流,IRR,净利润,净利率,资金峰值',
    measureBasis: '现金流 + 融资计划 + 利润表',
    quantityFormula: '按月度现金流滚动计算',
    pricingUnit: '元,%,月',
    amountFormula: '现金流、融资成本、IRR、净利润联动计算',
    financeTreatment: '区分资本化利息、费用化利息、现金流和财务评价指标',
  });

  await safeExecute('insert L5 settlement feedback rules for cost subjects', `
    INSERT INTO "TemplateUnifiedRule" (
      "id", "templateCode", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel",
      "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula",
      "costAttributionMethod", "allocationMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment",
      "isEnabled", "allowProjectOverride", "allowVersionOverride", "participateSettlementFeedback", "sortOrder"
    )
    SELECT
      'rule-' || trs."templateCode" || '-' || trs."ruleType" || '-' || trs."subjectCode" || '-L5-settlement',
      trs."templateCode",
      trs."ruleType",
      trs."subjectCode",
      trs."subjectName",
      '结算',
      'L5 结算复盘',
      '合同结算表,后评估指标库',
      '合同编号,合同名称,承包单位,原合同金额,补充协议金额,变更金额,签证金额,索赔金额,暂估价调整,甲供材扣减,结算申报金额,结算审核金额,审减金额,最终结算金额,已付款金额,未付款金额,结算日期,结算状态,对应成本科目,对应业态/楼栋/区域',
      '最终审定结算金额',
      '按合同结算最终审定金额归集',
      '元',
      '结算审核数据',
      '最终结算金额',
      '按合同对应成本科目、业态、楼栋、区域直接归属',
      '不能直接归属部分按受益对象、建筑面积或可售面积分摊',
      '结算金额按合同税率拆分不含税金额和进项税额',
      '按土地增值税扣除类别和清算对象归集',
      '按企业所得税税前扣除口径归集',
      NULL,
      TRUE,
      TRUE,
      TRUE,
      TRUE,
      trs."sortOrder"
    FROM "TemplateRuleSubject" trs
    WHERE trs."templateCode" = 'residential-v1' AND trs."ruleType" = 'COST'
    ON CONFLICT ("templateCode", "ruleType", "subjectCode", "applicableStage", "precisionLevel") DO UPDATE SET
      "subjectName" = EXCLUDED."subjectName",
      "dataSourceTable" = EXCLUDED."dataSourceTable",
      "requiredFields" = EXCLUDED."requiredFields",
      "measureBasis" = EXCLUDED."measureBasis",
      "quantityFormula" = EXCLUDED."quantityFormula",
      "pricingUnit" = EXCLUDED."pricingUnit",
      "unitPriceSource" = EXCLUDED."unitPriceSource",
      "amountFormula" = EXCLUDED."amountFormula",
      "costAttributionMethod" = EXCLUDED."costAttributionMethod",
      "allocationMethod" = EXCLUDED."allocationMethod",
      "vatTreatment" = EXCLUDED."vatTreatment",
      "landVatTreatment" = EXCLUDED."landVatTreatment",
      "incomeTaxTreatment" = EXCLUDED."incomeTaxTreatment",
      "participateSettlementFeedback" = TRUE,
      "sortOrder" = EXCLUDED."sortOrder",
      "updatedAt" = CURRENT_TIMESTAMP
  `);

  console.log('Residential template high precision field requirements ensured.');
}

main().finally(async () => prisma.$disconnect());

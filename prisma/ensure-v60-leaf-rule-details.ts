import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Rule = {
  id: string;
  ruleType: string;
  subjectCode: string;
  subjectName: string;
};

type Detail = {
  dataSourceTable: string;
  requiredFields: string;
  measureBasis: string;
  quantityFormula: string;
  pricingUnit: string;
  unitPriceSource: string;
  amountFormula: string;
  costAttributionMethod: string;
  allocationMethod: string;
  vatTreatment: string;
  landVatTreatment: string;
  incomeTaxTreatment: string;
  financeTreatment: string;
};

function commonByRoot(code: string): Detail {
  const root = code.split('.')[0];
  const base: Detail = {
    dataSourceTable: '项目概况表,工程量指标表,量价指标库',
    requiredFields: '建筑面积,可售面积,工程量,单价,税率,配置档次',
    measureBasis: '工程量指标',
    quantityFormula: '工程量 = 来源指标 × 含量系数',
    pricingUnit: '元/㎡',
    unitPriceSource: '模板默认指标库/地区量价指标库/项目手动调整',
    amountFormula: '含税金额 = 工程量 × 含税单价 × 调整系数',
    costAttributionMethod: '能直接归属则归属到业态/楼栋/区域；不能直接归属则作为公共成本',
    allocationMethod: '直接归属优先；公共成本按建筑面积、可售面积或受益对象分摊',
    vatTreatment: '含税金额拆分不含税金额和进项税额；进项税按税率计算',
    landVatTreatment: '按土地增值税清算对象和扣除类别归集',
    incomeTaxTreatment: '按企业所得税成本对象和税前扣除口径归集',
    financeTreatment: '进入目标成本和现金流付款计划',
  };

  const map: Record<string, Partial<Detail>> = {
    '01': {
      dataSourceTable: '项目概况表,土地费用明细表,税费参数表',
      requiredFields: '土地成交价,土地面积,土地面积亩,计容建筑面积,契税税率,交易服务费,土地评估费,权籍测绘费,合作开发对价,股权溢价,土地付款节点',
      measureBasis: '土地合同及税费参数',
      quantityFormula: '按土地合同、面积和付款节点录入',
      pricingUnit: '元/项目,元/亩,元/㎡计容面积',
      unitPriceSource: '土地合同/合作协议/土拍成交资料',
      amountFormula: '土地费 = 土地成交价 + 契税 + 交易服务费 + 评估费 + 测绘费 + 合作开发相关成本',
      costAttributionMethod: '归属项目土地费，按清算对象分摊到可售开发产品',
      allocationMethod: '直接归集优先；不能直接归集时按建筑面积或可售面积分摊',
      vatTreatment: '土地价款按可抵扣/不可抵扣规则处理，区分增值税扣除口径',
      landVatTreatment: '作为土地成本扣除项目，按清算对象分摊',
      incomeTaxTreatment: '计入开发产品计税成本',
    },
    '02': {
      dataSourceTable: '项目概况表,工程量指标表,前期费用明细表,建造配置标准',
      requiredFields: '总建筑面积,计容建筑面积,土地面积,周界长度,出入口数量,临设面积,场地平整面积,临水容量,临电容量,报建固定费用,三通一平单价,围墙单价,出入口单价',
      measureBasis: '前期专项工程量',
      quantityFormula: '按建筑面积、土地面积、周界长度、出入口数量、临设面积分别计算',
      pricingUnit: '元/㎡,元/m,元/个,元/项',
      amountFormula: '前期费 = 各专项工程量 × 对应单价 + 固定报建费用',
      costAttributionMethod: '按受益对象归属；公共前期费用归属项目公共成本',
    },
    '03': {
      dataSourceTable: '项目概况表,业态产品表,工程量指标表,建造配置标准,量价指标库',
      requiredFields: '地上建筑面积,地下建筑面积,可售面积,不可售面积,基底面积,桩基面积,标准层面积,户数,单元数,楼栋数,地下室层数,层高,人防面积,非人防面积,外立面面积,门窗面积,屋面面积,防水面积,保温面积,栏杆长度,土方量,结构形式,配置档次',
      measureBasis: '业态拆分 + 工程量含量法',
      quantityFormula: '工程量 = 业态面积 × 含量系数 或 直接工程量指标',
      pricingUnit: '元/㎡,元/m,元/m³,元/项',
      amountFormula: '建安金额 = 工程量 × 单价 × 配置系数',
      costAttributionMethod: '主楼地下室归属对应业态；非主楼地库归属地下车位/地下室',
    },
    '04': {
      dataSourceTable: '项目概况表,工程量指标表,建造配置标准,量价指标库',
      requiredFields: '景观面积,硬景面积,软景面积,绿化面积,水景面积,道路面积,消防道路面积,沥青道路面积,管线长度,周界长度,围墙长度,正式出入口数量,临时出入口数量,景观档次,道路做法,管网配置',
      measureBasis: '景观面积/道路面积/管网长度/周界长度/出入口数量',
      quantityFormula: '工程量 = 硬景面积 + 软景面积 + 道路面积 + 管网长度 + 围墙长度 + 出入口数量',
      pricingUnit: '元/㎡,元/m,元/个,元/项',
      amountFormula: '室外金额 = 分项工程量 × 对应单价',
      costAttributionMethod: '按受益区域归属；公共室外工程按可售面积或建筑面积分摊',
    },
    '05': {
      dataSourceTable: '项目概况表,工程量指标表,建造配置标准,量价指标库',
      requiredFields: '电梯台数,单元数量,楼栋数量,充电桩数量,快充数量,慢充数量,预留充电桩数量,人防面积,防护单元数量,消防设备面积,配电房数量,水泵房数量,消防水池容量,停车场系统数量,弱电系统配置,设备档次',
      measureBasis: '设备数量 + 系统配置',
      quantityFormula: '工程量 = 设备数量 或 系统覆盖面积',
      pricingUnit: '元/台,元/套,元/个,元/㎡',
      amountFormula: '设备金额 = 设备数量 × 设备单价 + 系统面积 × 系统单价',
      costAttributionMethod: '电梯归属对应业态；充电桩归属地下车位/地库；人防设备归属人防区域',
    },
    '06': {
      dataSourceTable: '项目概况表,业态产品表,工程量指标表,建造配置标准,量价指标库',
      requiredFields: '大堂面积,地下大堂面积,公区面积,售楼部面积,样板房面积,批量精装面积,物业用房面积,社区用房面积,商业公区面积,精装交付范围,精装标准,售楼部软装范围,样板房软装范围',
      measureBasis: '精装部位面积 + 配置档次',
      quantityFormula: '工程量 = 各精装部位面积',
      pricingUnit: '元/㎡,元/项',
      amountFormula: '精装金额 = 精装面积 × 精装单价 + 软装专项费用',
      costAttributionMethod: '按精装部位归属对应业态；示范区包装可转销售费用口径',
    },
    '07': {
      dataSourceTable: '项目概况表,前期费用明细表,合同结算表',
      requiredFields: '总建筑面积,计容建筑面积,合同金额,服务范围,监理费率,造价咨询费率,设计咨询费率,招标代理费率,第三方检测费率,咨询服务周期',
      measureBasis: '面积/合同金额/费率/固定费用',
      quantityFormula: '计费基数 = 建筑面积 或 合同金额',
      pricingUnit: '元/㎡,%,元/项',
      amountFormula: '咨询费 = 计费基数 × 费率 或 固定费用',
      costAttributionMethod: '按服务对象归属；公共咨询费用按建筑面积分摊',
    },
    '08': {
      dataSourceTable: '项目概况表,财务测算表,合同结算表',
      requiredFields: '项目开发周期,项目人员配置,管理费率,办公费用,差旅费用,行政费用,工程管理费用,开发间接费分摊周期,建筑面积,可售面积',
      measureBasis: '开发周期 + 管理配置 + 面积分摊',
      quantityFormula: '计费基数 = 项目周期 或 建筑面积',
      pricingUnit: '元/月,元/㎡,元/项',
      amountFormula: '开发间接费 = 周期费用 + 固定管理费用 + 分摊费用',
      costAttributionMethod: '归属项目公共成本',
    },
    '09': {
      dataSourceTable: '收入明细表,销售计划表,财务测算表',
      requiredFields: '销售收入,可售面积,销售周期,营销费率,渠道费率,案场费用,广告推广费用,示范区包装费用,销售代理费,销售节点,去化计划',
      measureBasis: '销售收入/可售面积/销售周期/费率',
      quantityFormula: '计费基数 = 销售收入 或 销售周期',
      pricingUnit: '%,元/月,元/㎡,元/项',
      amountFormula: '营销费用 = 销售收入 × 营销费率 + 固定营销费用 + 渠道费用',
      costAttributionMethod: '归属销售费用，可按业态或收入占比分摊',
      incomeTaxTreatment: '符合税前扣除条件的营销费用按期间费用处理',
    },
    '10': {
      dataSourceTable: '财务测算表,现金流计划表,融资计划表',
      requiredFields: '融资金额,融资利率,融资周期,放款节点,还款节点,销售回款计划,资本化周期,费用化周期,资金占用额,资金峰值,现金流计划',
      measureBasis: '融资金额 + 利率 + 资金占用周期',
      quantityFormula: '资金占用额按月度现金流滚动计算',
      pricingUnit: '%,元/月,元/年',
      amountFormula: '财务费用 = 资金占用额 × 融资利率 × 占用时间 + 融资手续费',
      costAttributionMethod: '区分资本化利息和费用化利息',
      financeTreatment: '进入现金流和财务评价指标',
    },
    '11': {
      dataSourceTable: '目标成本汇总表,风险清单,动态成本表',
      requiredFields: '计费基数,预备费率,风险等级,未决事项金额,暂估价金额,待明确工程范围,成本偏差率,动态成本余额',
      measureBasis: '计费基数 + 风险等级 + 未决事项',
      quantityFormula: '计费基数按目标成本范围确定',
      pricingUnit: '%,元/项',
      amountFormula: '预备费 = 计费基数 × 预备费率 + 风险专项预留',
      costAttributionMethod: '归属项目公共成本，动态成本发生后冲减或转入对应科目',
    },
    '12': {
      dataSourceTable: '收入明细表,成本分摊测算表,税费参数表,土地增值税测算表,企业所得税测算表',
      requiredFields: '销售收入,不含税收入,销项税额,进项税额,不可抵扣进项税,附加税率,土地成本,开发成本,开发费用,加计扣除率,清算对象,可售面积,建筑面积,土地增值税税率,所得税税率,税前扣除口径',
      measureBasis: '收入、成本、税率、清算对象',
      quantityFormula: '按税种规则分别计算',
      pricingUnit: '%,元',
      amountFormula: '税金 = 增值税及附加 + 土地增值税 + 企业所得税 + 其他税费',
      costAttributionMethod: '税金单独核算，按税种和清算对象归集',
      allocationMethod: '按税务清算对象、收入或成本归属口径分摊',
      vatTreatment: '销项税额 - 可抵扣进项税额，不含税收入 = 含税收入 / (1 + 税率)',
      landVatTreatment: '按土地增值税清算对象、扣除项目和加计扣除规则处理',
      incomeTaxTreatment: '按企业所得税成本对象和税前扣除口径处理',
    },
  };

  return { ...base, ...(map[root] || {}) };
}

function detailByName(rule: Rule): Detail {
  const detail = commonByRoot(rule.subjectCode);
  const name = rule.subjectName;

  if (/桩基/.test(name)) {
    detail.requiredFields = '桩基面积,基底面积,桩型,桩长,桩径,地勘条件,单价,税率';
    detail.measureBasis = '桩基面积/桩数/桩长';
    detail.quantityFormula = '桩基工程量 = 基底面积 × 桩基含量系数 或 桩数 × 桩长';
    detail.pricingUnit = '元/㎡基底面积,元/m,元/根';
  } else if (/土石方/.test(name)) {
    detail.requiredFields = '土方量,基坑深度,地下室面积,外运距离,弃土费,单价,税率';
    detail.measureBasis = '土方量';
    detail.quantityFormula = '土方量 = 开挖面积 × 开挖深度 × 放坡系数';
    detail.pricingUnit = '元/m³';
  } else if (/外墙|外立面/.test(name)) {
    detail.requiredFields = '外立面面积,外墙做法,幕墙比例,涂料面积,石材面积,铝板面积,单价,税率';
    detail.measureBasis = '外立面面积';
    detail.quantityFormula = '外立面工程量 = 外立面面积 × 做法比例';
    detail.pricingUnit = '元/㎡外立面';
  } else if (/门窗/.test(name)) {
    detail.requiredFields = '门窗面积,窗地比,型材档次,玻璃配置,单价,税率';
    detail.measureBasis = '门窗面积';
    detail.quantityFormula = '门窗面积 = 建筑面积 × 窗地比 或 门窗统计面积';
    detail.pricingUnit = '元/㎡门窗';
  } else if (/栏杆|栏板/.test(name)) {
    detail.requiredFields = '栏杆长度,栏板面积,栏杆类型,单价,税率';
    detail.measureBasis = '栏杆长度/栏板面积';
    detail.quantityFormula = '栏杆工程量 = 阳台栏杆长度 + 公区栏杆长度';
    detail.pricingUnit = '元/m,元/㎡';
  } else if (/防水/.test(name)) {
    detail.requiredFields = '防水面积,屋面面积,地下室面积,厨卫面积,水池面积,防水做法,单价,税率';
    detail.measureBasis = '防水面积';
    detail.quantityFormula = '防水面积 = 屋面面积 + 地下室防水面积 + 厨卫防水面积 + 水池防水面积';
    detail.pricingUnit = '元/㎡防水面积';
  } else if (/保温/.test(name)) {
    detail.requiredFields = '保温面积,外墙面积,屋面面积,保温厚度,保温材料,单价,税率';
    detail.measureBasis = '保温面积';
    detail.quantityFormula = '保温面积 = 外墙保温面积 + 屋面保温面积';
    detail.pricingUnit = '元/㎡保温面积';
  } else if (/电梯/.test(name)) {
    detail.requiredFields = '电梯台数,层站数,梯速,载重,装修档次,单价,税率';
    detail.measureBasis = '电梯台数';
    detail.quantityFormula = '电梯数量 = 单元数量 × 每单元电梯配置';
    detail.pricingUnit = '元/台';
  } else if (/充电桩/.test(name)) {
    detail.requiredFields = '充电桩数量,快充数量,慢充数量,预留数量,车位数量,配电容量,单价,税率';
    detail.measureBasis = '充电桩数量';
    detail.quantityFormula = '充电桩数量 = 快充数量 + 慢充数量 + 预留数量';
    detail.pricingUnit = '元/个';
    detail.costAttributionMethod = '归属地下车位/地库，不作为独立业态';
  } else if (/硬景/.test(name)) {
    detail.requiredFields = '硬景面积,铺装面积,小品数量,景观档次,单价,税率';
    detail.measureBasis = '硬景面积';
    detail.quantityFormula = '硬景工程量 = 硬景面积';
    detail.pricingUnit = '元/㎡硬景';
  } else if (/软景|绿化/.test(name)) {
    detail.requiredFields = '软景面积,绿化面积,乔木数量,灌木面积,草坪面积,景观档次,单价,税率';
    detail.measureBasis = '软景面积';
    detail.quantityFormula = '软景工程量 = 绿化面积 + 种植专项工程量';
    detail.pricingUnit = '元/㎡软景';
  } else if (/围墙/.test(name)) {
    detail.requiredFields = '周界长度,围墙长度,围墙高度,围墙做法,单价,税率';
    detail.measureBasis = '围墙长度';
    detail.quantityFormula = '围墙工程量 = 周界长度 - 出入口宽度';
    detail.pricingUnit = '元/m';
  } else if (/出入口|门禁|道闸/.test(name)) {
    detail.requiredFields = '出入口数量,正式出入口数量,临时出入口数量,门禁系统配置,道闸数量,单价,税率';
    detail.measureBasis = '出入口数量';
    detail.quantityFormula = '出入口工程量 = 正式出入口数量 + 临时出入口数量';
    detail.pricingUnit = '元/个,元/套';
  } else if (/精装|软装|样板|售楼/.test(name)) {
    detail.requiredFields = '精装面积,大堂面积,公区面积,售楼部面积,样板房面积,软装范围,精装标准,单价,税率';
    detail.measureBasis = '精装部位面积';
    detail.quantityFormula = '精装工程量 = 各精装部位面积';
    detail.pricingUnit = '元/㎡,元/项';
  }

  detail.amountFormula = `${name}金额 = ${detail.quantityFormula.replace('工程量 = ', '').replace('工程量=', '')} × 含税单价 × 调整系数`;
  return detail;
}

async function main() {
  const rules = await prisma.$queryRawUnsafe<Rule[]>(`
    SELECT "id", "ruleType", "subjectCode", "subjectName"
    FROM "TemplateUnifiedRule"
    WHERE "templateCode" = 'residential-v1'
      AND "applicableStage" = '目标成本'
      AND "precisionLevel" = 'L3 目标测算'
  `);

  for (const rule of rules) {
    const detail = detailByName(rule);
    await prisma.$executeRawUnsafe(`
      UPDATE "TemplateUnifiedRule"
      SET "dataSourceTable" = $1,
          "requiredFields" = $2,
          "measureBasis" = $3,
          "quantityFormula" = $4,
          "pricingUnit" = $5,
          "unitPriceSource" = $6,
          "amountFormula" = $7,
          "costAttributionMethod" = $8,
          "allocationMethod" = $9,
          "vatTreatment" = $10,
          "landVatTreatment" = $11,
          "incomeTaxTreatment" = $12,
          "financeTreatment" = $13,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $14
    `,
      detail.dataSourceTable,
      detail.requiredFields,
      detail.measureBasis,
      detail.quantityFormula,
      detail.pricingUnit,
      detail.unitPriceSource,
      detail.amountFormula,
      detail.costAttributionMethod,
      detail.allocationMethod,
      detail.vatTreatment,
      detail.landVatTreatment,
      detail.incomeTaxTreatment,
      detail.financeTreatment,
      rule.id,
    );
  }

  console.log(`V60 leaf rule details ensured: ${rules.length}`);
}

main().finally(async () => prisma.$disconnect());

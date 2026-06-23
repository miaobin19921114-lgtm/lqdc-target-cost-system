import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Rule = {
  id: string;
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  dataSourceTable: string | null;
  requiredFields: string | null;
  measureBasis: string | null;
  quantityFormula: string | null;
  pricingUnit: string | null;
  unitPriceSource: string | null;
  amountFormula: string | null;
  costAttributionMethod: string | null;
  allocationMethod: string | null;
  vatTreatment: string | null;
  landVatTreatment: string | null;
  incomeTaxTreatment: string | null;
  financeTreatment: string | null;
  sortOrder: number;
};

type PrecisionRule = {
  stage: string;
  level: string;
  table: string;
  fields: string;
  basis: string;
  quantityFormula: string;
  unit: string;
  unitPriceSource: string;
  amountFormula: string;
  financeTreatment: string;
  sortOffset: number;
};

function rootOf(code: string) {
  return code.startsWith('R') || code.startsWith('F') ? code : code.split('.')[0];
}

function precisionRules(rule: Rule): PrecisionRule[] {
  const root = rootOf(rule.subjectCode);
  const isRevenue = rule.ruleType === 'REVENUE';
  const isFinance = rule.ruleType === 'FINANCE';
  const isTax = rule.ruleType === 'TAX';
  const subject = rule.subjectName;
  const l3Basis = rule.measureBasis || '工程量指标';
  const l3Amount = rule.amountFormula || `${subject}金额 = 工程量 × 单价 × 系数`;

  const baseL1Fields = isRevenue
    ? '总可售面积,参考售价,去化率,收入单方,含税收入,税率'
    : isFinance
      ? '总投资,销售收入,现金流峰值,融资利率,开发周期'
      : isTax
        ? '含税销售收入,不含税销售收入,目标成本,税率,清算对象'
        : '土地面积,总建筑面积,可售面积,计容建筑面积,业态面积,配置档次,地区指标单价';

  const baseL2Fields = isRevenue
    ? '业态可售面积,业态售价,销售比例,去化节奏,回款节奏,税率'
    : isFinance
      ? '月度收入计划,月度成本计划,融资计划,回款节奏,付款节奏'
      : isTax
        ? '收入明细,成本分摊,清算对象,税率参数,扣除口径'
        : '业态面积,产品配置,工程量指标,配置档次,地区量价指标,调整系数';

  const baseL4Fields = isRevenue
    ? '已签约金额,已回款金额,未售面积,预计售价,剩余去化计划,收入动态调整'
    : isFinance
      ? '实际回款,实际付款,融资余额,资金峰值,动态现金流,预计完工成本'
      : isTax
        ? '实际收入,实际进项,动态成本,已缴税费,预计清算税费'
        : '合同金额,变更金额,签证金额,索赔金额,已发生金额,预计待发生,动态成本余额';

  const baseL5Fields = isRevenue
    ? '最终签约金额,最终回款金额,实际成交单价,实际去化率,收入后评估指标'
    : isFinance
      ? '最终现金流,实际融资成本,实际资金峰值,项目IRR,税后净利润'
      : isTax
        ? '最终收入,最终扣除成本,最终清算税费,所得税汇算结果,税务后评估'
        : '合同编号,合同名称,承包单位,原合同金额,补充协议金额,变更金额,签证金额,索赔金额,结算申报金额,结算审核金额,审减金额,最终结算金额,结算日期,后评估指标';

  return [
    {
      stage: '投前快测',
      level: 'L1 快速估算',
      table: isRevenue ? '项目概况表,业态产品表,地区收入指标库' : isFinance ? '项目概况表,财务测算表' : isTax ? '收入明细表,目标成本汇总表,税费参数表' : '项目概况表,业态产品表,地区成本指标库',
      fields: baseL1Fields,
      basis: isRevenue ? '业态可售面积 × 参考售价' : isFinance ? '投资现金流快速估算' : isTax ? '收入成本税率快速估算' : '面积/业态/配置档次快速估算',
      quantityFormula: isRevenue ? '收入基数 = 可售面积 × 参考售价 × 去化率' : isFinance ? '净现金流 = 收入流入 - 成本流出 - 税费 - 融资成本' : isTax ? '税费基数 = 不含税收入和可扣除成本快速估算' : '工程量 = 面积指标 × 含量系数',
      unit: isRevenue ? '元,元/㎡' : isFinance ? '元,%' : isTax ? '元,%' : '元/㎡',
      unitPriceSource: '地区指标库/历史项目后评估指标/人工校正',
      amountFormula: isRevenue ? `${subject} = 可售面积 × 参考单价 × 去化率` : isFinance ? `${subject} = 按快速现金流模型计算` : isTax ? `${subject} = 税基 × 税率 - 可抵扣/可扣除项目` : `${subject} = 面积指标 × 参考单方 × 配置系数`,
      financeTreatment: '进入投前投资测算和快速现金流',
      sortOffset: 1,
    },
    {
      stage: '方案估算',
      level: 'L2 方案估算',
      table: isRevenue ? '业态产品表,收入明细表,销售计划表' : isFinance ? '财务测算表,销售计划表,付款计划表' : isTax ? '收入明细表,成本分摊测算表,税费参数表' : '项目概况表,业态产品表,工程量指标表,建造配置标准,量价指标库',
      fields: baseL2Fields,
      basis: isRevenue ? '业态拆分 + 去化计划' : isFinance ? '月度现金流方案测算' : isTax ? '收入成本分摊税费估算' : '业态拆分 + 工程量含量法 + 配置档次',
      quantityFormula: isRevenue ? '收入基数 = 业态面积 × 业态单价 × 销售比例' : isFinance ? '月度净现金流 = 月度回款 - 月度付款 - 税费 - 融资成本' : isTax ? '税费基数 = 方案收入 - 方案可扣除成本' : '工程量 = 业态面积 × 方案含量指标',
      unit: isRevenue ? '元,元/㎡' : isFinance ? '元,%' : isTax ? '元,%' : '元/㎡,元/m,元/个',
      unitPriceSource: '方案阶段量价指标库/同类项目指标/人工校正',
      amountFormula: isRevenue ? `${subject} = 业态面积 × 业态价格 × 去化率` : isFinance ? `${subject} = 按方案现金流模型计算` : isTax ? `${subject} = 方案税基 × 税率` : `${subject} = 方案工程量 × 方案单价 × 配置系数`,
      financeTreatment: '进入方案版现金流和利润测算',
      sortOffset: 2,
    },
    {
      stage: '目标成本',
      level: 'L3 目标测算',
      table: rule.dataSourceTable || '项目概况表,工程量指标表,量价指标库',
      fields: rule.requiredFields || baseL2Fields,
      basis: l3Basis,
      quantityFormula: rule.quantityFormula || '工程量 = 来源指标 × 含量系数',
      unit: rule.pricingUnit || '元/㎡,元/项',
      unitPriceSource: rule.unitPriceSource || '模板指标库/项目调整',
      amountFormula: l3Amount,
      financeTreatment: rule.financeTreatment || '进入目标成本和现金流付款计划',
      sortOffset: 3,
    },
    {
      stage: '动态控制',
      level: 'L4 动态控制',
      table: isRevenue ? '销售台账,回款台账,动态收入预测表' : isFinance ? '现金流计划表,融资台账,动态成本表' : isTax ? '税费台账,动态成本表,收入台账' : '合同台账,变更签证台账,动态成本表,预计待发生清单',
      fields: baseL4Fields,
      basis: isRevenue ? '已售 + 未售动态预测' : isFinance ? '实际现金流 + 预计现金流' : isTax ? '已缴 + 预计税费' : '已发生 + 已签合同 + 变更签证 + 预计待发生',
      quantityFormula: isRevenue ? '动态收入 = 已签约收入 + 未售面积 × 最新预计售价' : isFinance ? '动态现金流 = 实际现金流 + 预计后续现金流' : isTax ? '动态税费 = 已缴税费 + 预计待缴税费' : '动态成本 = 已签合同 + 变更签证 + 索赔 + 预计待发生',
      unit: '元,%',
      unitPriceSource: '合同台账/动态成本台账/销售台账/人工调整',
      amountFormula: isRevenue ? `${subject}动态值 = 已实现 + 预计未实现` : isFinance ? `${subject}动态值 = 实际值 + 预计值` : isTax ? `${subject}动态值 = 已缴 + 预计待缴` : `${subject}动态成本 = 合同金额 + 变更签证 + 索赔 + 预计待发生`,
      financeTreatment: '进入动态现金流、动态利润和预警指标',
      sortOffset: 4,
    },
    {
      stage: '结算复盘',
      level: 'L5 结算复盘',
      table: isRevenue ? '销售结转表,收入后评估指标库' : isFinance ? '最终现金流表,财务后评估表' : isTax ? '税务清算表,所得税汇算表,税务后评估表' : '合同结算表,后评估指标库',
      fields: baseL5Fields,
      basis: isRevenue ? '最终实现收入和后评估指标' : isFinance ? '最终现金流和财务后评估' : isTax ? '最终清算税费和汇算结果' : '最终结算审核金额和后评估指标',
      quantityFormula: isRevenue ? '收入后评估指标 = 最终收入 ÷ 实际可售面积' : isFinance ? '财务后评估指标 = 最终现金流模型计算结果' : isTax ? '税务后评估 = 最终税费 ÷ 税基' : '结算单方 = 最终结算金额 ÷ 对应工程量',
      unit: '元,元/㎡,%',
      unitPriceSource: '最终结算审定数据/后评估指标库',
      amountFormula: isRevenue ? `${subject}复盘值 = 最终实现收入` : isFinance ? `${subject}复盘值 = 最终财务指标` : isTax ? `${subject}复盘值 = 最终清算/汇算税费` : `${subject}结算金额 = 最终审核结算金额`,
      financeTreatment: '进入后评估库，反哺模板指标和AI知识库',
      sortOffset: 5,
    },
  ];
}

async function main() {
  const baseRules = await prisma.$queryRawUnsafe<Rule[]>(`
    SELECT "id", "ruleType", "subjectCode", "subjectName", "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula",
           "pricingUnit", "unitPriceSource", "amountFormula", "costAttributionMethod", "allocationMethod", "vatTreatment",
           "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "sortOrder"
    FROM "TemplateUnifiedRule"
    WHERE "templateCode" = 'residential-v1'
      AND "applicableStage" = '目标成本'
      AND "precisionLevel" = 'L3 目标测算'
      AND "isEnabled" = TRUE
  `);

  for (const rule of baseRules) {
    for (const precision of precisionRules(rule)) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "TemplateUnifiedRule" (
          "id", "templateCode", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel",
          "dataSourceTable", "requiredFields", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "defaultCoefficient", "amountFormula",
          "costAttributionMethod", "allocationMethod", "revenueAttributionMethod", "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment",
          "isEnabled", "allowProjectOverride", "allowVersionOverride", "participateSettlementFeedback", "sortOrder"
        ) VALUES (
          $1, 'residential-v1', $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, 1.0000, $13,
          $14, $15, $16, $17, $18, $19, $20,
          TRUE, TRUE, TRUE, TRUE, $21
        )
        ON CONFLICT ("templateCode", "ruleType", "subjectCode", "applicableStage", "precisionLevel") DO UPDATE SET
          "subjectName" = EXCLUDED."subjectName",
          "dataSourceTable" = EXCLUDED."dataSourceTable",
          "requiredFields" = EXCLUDED."requiredFields",
          "measureBasis" = EXCLUDED."measureBasis",
          "quantityFormula" = EXCLUDED."quantityFormula",
          "pricingUnit" = EXCLUDED."pricingUnit",
          "unitPriceSource" = EXCLUDED."unitPriceSource",
          "defaultCoefficient" = EXCLUDED."defaultCoefficient",
          "amountFormula" = EXCLUDED."amountFormula",
          "costAttributionMethod" = EXCLUDED."costAttributionMethod",
          "allocationMethod" = EXCLUDED."allocationMethod",
          "revenueAttributionMethod" = EXCLUDED."revenueAttributionMethod",
          "vatTreatment" = EXCLUDED."vatTreatment",
          "landVatTreatment" = EXCLUDED."landVatTreatment",
          "incomeTaxTreatment" = EXCLUDED."incomeTaxTreatment",
          "financeTreatment" = EXCLUDED."financeTreatment",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = CURRENT_TIMESTAMP
      `,
        `precision-residential-v1-${rule.ruleType}-${rule.subjectCode}-${precision.level}`,
        rule.ruleType,
        rule.subjectCode,
        rule.subjectName,
        precision.stage,
        precision.level,
        precision.table,
        precision.fields,
        precision.basis,
        precision.quantityFormula,
        precision.unit,
        precision.unitPriceSource,
        precision.amountFormula,
        rule.costAttributionMethod || '按受益对象归属，无法直接归属时按面积或收入分摊',
        rule.allocationMethod || '直接归属优先；公共成本按建筑面积/可售面积/清算对象分摊',
        rule.ruleType === 'REVENUE' ? '按收入业态归属' : null,
        rule.vatTreatment || '按含税/不含税口径拆分增值税',
        rule.landVatTreatment || '按土地增值税清算对象和扣除类别处理',
        rule.incomeTaxTreatment || '按企业所得税成本对象和税前扣除口径处理',
        precision.financeTreatment,
        rule.sortOrder * 10 + precision.sortOffset,
      );
    }
  }

  console.log(`L1-L5 precision rules ensured from ${baseRules.length} L3 base rules.`);
}

main().finally(async () => prisma.$disconnect());

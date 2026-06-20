import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type DetailTuple = [string, string, string?];
type GroupInput = { section: string; group: string; code: string; measureBasis: string; unit: string; tax: string; details: DetailTuple[]; remark?: string };

const common = {
  sourceTable: '财务费用明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按V60财务费用科目、融资金额、计息周期、利率、费率或固定金额快速估算',
  conceptMethod: '按土地款资金占用、开发贷、股东借款、融资手续费、担保及资金管理费用估算',
  schemeMethod: '按V60财务费用明细表、融资计划、资金计划、合同、利率和计息周期拆分测算',
  drawingMethod: '财务费用通常不按施工图测算，需按融资合同、付款计划、计息台账和资金计划复核',
  tenderMethod: '按融资合同、授信协议、担保合同、保函合同和资金协议复核',
  dynamicMethod: '按动态融资余额、实际放款、还款、利率、计息天数和费用台账更新',
  specialAdjustment: '特殊事项可人工调整，需备注依据',
  costAttributionMethod: '项目整体财务费用',
  targetAllocationMethod: '按资金占用对象、可售面积、建筑面积或销售收入分摊；可直接归属的按受益对象归集',
  landVatAllocationMethod: '房地产开发费用-财务费用；按土增税清算口径及限额规则复核',
  incomeTaxDeductionCategory: '财务费用',
  preTaxDeduction: '是',
  taxRemark: '财务费用需以融资合同、发票、利息单、银行流水、计息台账和财税审核为准'
};

const groups: GroupInput[] = [
  {
    section: '融资利息费用',
    group: '土地款及开发建设资金利息',
    code: '05.03.01',
    measureBasis: '融资金额×利率×计息周期/固定金额',
    unit: '万元基数',
    tax: '0%',
    details: [
      ['05.03.01.01', '土地款资金占用利息', '从土地费剔出，归财务费用。'],
      ['05.03.01.02', '开发贷款利息'],
      ['05.03.01.03', '股东借款利息'],
      ['05.03.01.04', '关联方借款利息'],
      ['05.03.01.05', '委托贷款利息'],
      ['05.03.01.06', '信托/基金/资管融资利息'],
      ['05.03.01.07', '票据贴现利息']
    ]
  },
  {
    section: '融资手续费及服务费',
    group: '授信、融资安排及顾问服务费用',
    code: '05.03.02',
    measureBasis: '融资金额×费率/合同金额/固定金额',
    unit: '万元基数',
    tax: '6%',
    details: [
      ['05.03.02.01', '银行融资手续费'],
      ['05.03.02.02', '授信安排费/承诺费'],
      ['05.03.02.03', '融资顾问费'],
      ['05.03.02.04', '贷款评估费'],
      ['05.03.02.05', '资金监管服务费'],
      ['05.03.02.06', '融资资料及账户服务费']
    ]
  },
  {
    section: '担保抵押及保函费用',
    group: '融资担保、抵押登记、保函及保险费用',
    code: '05.03.03',
    measureBasis: '担保金额×费率/合同金额/固定金额',
    unit: '万元基数',
    tax: '6%',
    details: [
      ['05.03.03.01', '融资担保费'],
      ['05.03.03.02', '抵押登记及评估费'],
      ['05.03.03.03', '贷款保证保险费'],
      ['05.03.03.04', '融资保函手续费'],
      ['05.03.03.05', '担保服务费']
    ]
  },
  {
    section: '银行及资金管理费用',
    group: '银行账户、结算、资金划拨及监管费用',
    code: '05.03.04',
    measureBasis: '固定金额/发生金额×费率',
    unit: '项',
    tax: '6%',
    details: [
      ['05.03.04.01', '银行账户管理费'],
      ['05.03.04.02', '银行结算手续费'],
      ['05.03.04.03', '资金划拨手续费'],
      ['05.03.04.04', '按揭资金监管费']
    ]
  },
  {
    section: '其他财务费用',
    group: '其他融资及资金占用相关费用',
    code: '05.03.05',
    measureBasis: '固定金额/手工输入',
    unit: '项',
    tax: '0%',
    details: [
      ['05.03.05.01', '融资罚息及展期费用'],
      ['05.03.05.02', '未确认融资费用摊销'],
      ['05.03.05.03', '汇兑损益'],
      ['05.03.05.04', '其他财务费用']
    ]
  }
];

function previousCount(group: GroupInput) {
  return groups.slice(0, groups.indexOf(group)).reduce((sum, item) => sum + item.details.length, 0);
}

export function buildV60FinanceExpenseRows(offset: number): CostDictionaryPresetRow[] {
  return groups.flatMap((group) => group.details.map(([code, detail, detailRemark], detailIndex) => ({
    ...common,
    rowIndex: offset + previousCount(group) + detailIndex,
    costCode: code,
    parentCode: group.code,
    subjectLevel: '4',
    firstSubject: '开发间接及期间费用',
    secondSubject: group.section,
    thirdSubject: group.group,
    detailSubject: detail,
    subjectDefinition: `${detail}，来源于V60财务费用明细表B列明细项目，用于财务费用明细测算。`,
    targetMappingCode: group.code,
    measureBasis: group.measureBasis,
    unit: group.unit,
    defaultTaxRate: group.tax,
    applicableProductType: '全项目专项/室外工程',
    remark: detailRemark || group.remark || 'V60财务费用明细科目，按融资合同、利息单、银行流水和计息台账复核。',
    landVatAllocationMethod: common.landVatAllocationMethod,
    incomeTaxDeductionCategory: common.incomeTaxDeductionCategory
  })));
}

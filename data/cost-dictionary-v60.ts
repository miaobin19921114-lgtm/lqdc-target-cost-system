import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

const common = {
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按指标、单方、含量或固定金额快速估算',
  conceptMethod: '按方案指标和地区经验参数估算',
  schemeMethod: '按产品、面积、部位和含量系数拆分测算',
  drawingMethod: '按施工图工程量、清单和合同边界复核',
  tenderMethod: '按招采清单、中标价和合同价复核',
  dynamicMethod: '按动态成本、签证变更和结算更新',
  specialAdjustment: '特殊事项可人工调整',
  costAttributionMethod: '按受益对象/业态归集',
  targetAllocationMethod: '按受益对象直接归集；不能单独归集时按建筑面积/可售面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本/期间费用',
  preTaxDeduction: '是',
  taxRemark: '按项目测算口径归集，最终以财税审核为准'
};

const rows = [] as const;

export function getV60CostDictionaryRows(): CostDictionaryPresetRow[] {
  return rows.map(([rowIndex, costCode, parentCode, subjectLevel, firstSubject, secondSubject, thirdSubject, detailSubject, sourceTable, enabled, writeBackToTarget, targetMappingCode, measureBasis, unit, defaultTaxRate, applicableProductType, remark]) => ({
    rowIndex,
    costCode,
    parentCode,
    subjectLevel,
    firstSubject,
    secondSubject,
    thirdSubject,
    detailSubject,
    subjectDefinition: `${detailSubject}，来源于V60定稿模板，用于目标成本明细测算。`,
    sourceTable,
    enabled,
    writeBackToTarget,
    targetMappingCode,
    measureBasis,
    unit,
    defaultTaxRate,
    applicableProductType,
    remark,
    ...common
  }));
}

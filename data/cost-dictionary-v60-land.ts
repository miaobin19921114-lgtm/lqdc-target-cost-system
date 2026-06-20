import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type RowInput = {
  code: string;
  parent: string;
  second: string;
  third: string;
  detail: string;
  measureBasis: string;
  unit: string;
  tax: string;
  product: string;
  remark: string;
  targetCode?: string;
  targetSubject?: string;
};

const common = {
  sourceTable: '土地费用明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按V60明细科目、面积指标、合同金额、费率或固定金额快速估算',
  conceptMethod: '按V60目标成本口径、项目方案和合同边界估算',
  schemeMethod: '按V60明细表、项目概况指标、合同及专项资料拆分测算',
  drawingMethod: '按V60科目、施工图指标、合同清单和专项成果复核',
  tenderMethod: '按V60科目、招采合同、中标价和合同边界复核',
  dynamicMethod: '按动态成本、合同付款、签证变更、台账和结算更新',
  specialAdjustment: '特殊事项可人工调整，需备注依据',
  costAttributionMethod: '项目整体共用',
  targetAllocationMethod: '按受益对象归集；不能直接归集时按建筑面积、可售面积或销售收入等合理口径分摊',
  landVatAllocationMethod: '取得土地使用权所支付金额及相关税费',
  incomeTaxDeductionCategory: '土地成本',
  preTaxDeduction: '是',
  taxRemark: '需以合同、发票、付款凭证、专项成果和财税审核为准'
};

const rows: RowInput[] = [{"code":"01.01.01.01","parent":"01.01.01","second":"土地价款","third":"土地出让/转让及补偿","detail":"土地出让金","measureBasis":"用地面积（亩）/成交单价/固定金额","unit":"万元/亩","tax":"0%","product":"项目整体共用","remark":"按土地面积×万元/亩或合同金额测算。","targetCode":"01.01.01.01","targetSubject":"土地价款"},{"code":"01.01.01.02","parent":"01.01.01","second":"土地价款","third":"土地出让/转让及补偿","detail":"土地成交价款","measureBasis":"用地面积（亩）/成交单价/固定金额","unit":"万元/亩","tax":"0%","product":"项目整体共用","remark":"按土地转让、合作拿地或收并购成交价款录入。","targetCode":"01.01.01.01","targetSubject":"土地价款"},{"code":"01.01.01.03","parent":"01.01.01","second":"土地价款","third":"土地出让/转让及补偿","detail":"土地价款补缴","measureBasis":"补缴通知金额/固定金额","unit":"元/项","tax":"0%","product":"项目整体共用","remark":"对应V60补缴地价/补价款。","targetCode":"01.01.01.02","targetSubject":"补缴地价/补价款"},{"code":"01.01.01.04","parent":"01.01.01","second":"土地价款","third":"土地出让/转让及补偿","detail":"拆迁补偿及安置补偿","measureBasis":"协议金额/固定金额","unit":"元/项","tax":"0%","product":"项目整体共用","remark":"按拆迁补偿协议、安置补偿协议和付款凭证复核。","targetCode":"01.01.01.03","targetSubject":"拆迁补偿及安置补偿"},{"code":"01.01.01.05","parent":"01.01.01","second":"土地价款","third":"土地出让/转让及补偿","detail":"青苗及地上附着物补偿","measureBasis":"协议金额/固定金额","unit":"元/项","tax":"0%","product":"项目整体共用","remark":"按补偿协议、确认单和付款凭证复核。","targetCode":"01.01.01.04","targetSubject":"青苗及地上附着物补偿"},{"code":"01.01.01.06","parent":"01.01.01","second":"土地价款","third":"土地出让/转让及补偿","detail":"配建移交折抵土地价款","measureBasis":"协议金额/固定金额","unit":"元/项","tax":"0%","product":"项目整体共用","remark":"按你的口径保留，实质对应土地取得条件中的配建、移交、折抵。","targetCode":"01.01.01.01","targetSubject":"土地价款"},{"code":"01.01.01.07","parent":"01.01.01","second":"土地价款","third":"土地出让/转让及补偿","detail":"合作开发土地投入","measureBasis":"合作协议金额/固定金额","unit":"元/项","tax":"0%","product":"项目整体共用","remark":"按你的口径保留，适用于合作开发、代垫土地款、股权合作形成的土地投入。","targetCode":"01.01.01.01","targetSubject":"土地价款"},{"code":"01.02.01.01","parent":"01.02.01","second":"土地相关税费","third":"土地交易税费","detail":"契税","measureBasis":"土地价款","unit":"费率","tax":"0%","product":"项目整体共用","remark":"按土地价款×费率测算；默认不拆可抵扣进项税。","targetCode":"01.02.01.01","targetSubject":"契税"},{"code":"01.02.01.02","parent":"01.02.01","second":"土地相关税费","third":"土地交易税费","detail":"土地合同印花税","measureBasis":"土地价款","unit":"费率","tax":"0%","product":"项目整体共用","remark":"按土地合同金额×费率测算。","targetCode":"01.02.01.02","targetSubject":"土地合同印花税"},{"code":"01.03.01.01","parent":"01.03.01","second":"土地交易及中介服务费","third":"交易服务及尽调","detail":"土地交易服务费","measureBasis":"合同金额/固定金额","unit":"元/项","tax":"6%","product":"项目整体共用","remark":"服务类费用，有专票时按税率拆分不含税金额及可抵扣税额。","targetCode":"01.03.01.01","targetSubject":"土地交易服务费"},{"code":"01.03.01.02","parent":"01.03.01","second":"土地交易及中介服务费","third":"交易服务及尽调","detail":"土地评估费","measureBasis":"合同金额/固定金额","unit":"元/项","tax":"6%","product":"项目整体共用","remark":"服务类费用，有专票时按税率拆分不含税金额及可抵扣税额。","targetCode":"01.03.01.02","targetSubject":"土地评估费"},{"code":"01.03.01.03","parent":"01.03.01","second":"土地交易及中介服务费","third":"交易服务及尽调","detail":"土地咨询/居间服务费","measureBasis":"合同金额/固定金额","unit":"元/项","tax":"6%","product":"项目整体共用","remark":"按你的口径合并咨询与居间，需合同、发票、服务成果和付款证据完整。","targetCode":"01.03.01.03","targetSubject":"土地咨询/居间服务费"},{"code":"01.03.01.04","parent":"01.03.01","second":"土地交易及中介服务费","third":"交易服务及尽调","detail":"土地尽调费","measureBasis":"合同金额/固定金额","unit":"元/项","tax":"6%","product":"项目整体共用","remark":"服务类费用，有专票时按税率拆分。","targetCode":"01.03.01.04","targetSubject":"土地尽调费"},{"code":"01.03.01.05","parent":"01.03.01","second":"土地交易及中介服务费","third":"交易服务及尽调","detail":"法务尽调费","measureBasis":"合同金额/固定金额","unit":"元/项","tax":"6%","product":"项目整体共用","remark":"土地取得相关法务尽调，不归管理费用。","targetCode":"01.03.01.05","targetSubject":"法务尽调费"},{"code":"01.03.01.06","parent":"01.03.01","second":"土地交易及中介服务费","third":"交易服务及尽调","detail":"财税尽调费","measureBasis":"合同金额/固定金额","unit":"元/项","tax":"6%","product":"项目整体共用","remark":"土地取得相关财税尽调，不归管理费用。","targetCode":"01.03.01.06","targetSubject":"财税尽调费"}];

export function buildV60LandRows(offset: number): CostDictionaryPresetRow[] {
  return rows.map((row, index) => ({
    ...common,
    rowIndex: offset + index,
    costCode: row.code,
    parentCode: row.parent,
    subjectLevel: '4',
    firstSubject: '土地费',
    secondSubject: row.second,
    thirdSubject: row.third,
    detailSubject: row.detail,
    subjectDefinition: `${row.detail}，来源于V60土地费用明细表B列明细项目，用于目标成本明细测算。`,
    targetMappingCode: row.targetCode || row.code,
    measureBasis: row.measureBasis || '固定金额/手工输入',
    unit: row.unit || '项',
    defaultTaxRate: row.tax || '0%',
    applicableProductType: row.product || '项目整体共用',
    remark: row.remark || '按你的土地费口径及V60土地费用明细表复核。',
    landVatAllocationMethod: common.landVatAllocationMethod,
    incomeTaxDeductionCategory: common.incomeTaxDeductionCategory
  }));
}

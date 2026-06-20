import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type DetailTuple = [string, string, string?];
type GroupInput = { section: string; group: string; code: string; measureBasis: string; unit: string; tax: string; product: string; details: DetailTuple[]; remark?: string };

const common = {
  sourceTable: '销售费用明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按V60销售费用科目、销售收入、固定金额、费率或合同金额快速估算',
  conceptMethod: '按营销设施、推广宣传、渠道佣金、案场运营、销售管理和其他销售费用估算',
  schemeMethod: '按V60销售费用明细表、营销计划、渠道策略、合同和销售收入拆分测算',
  drawingMethod: '销售费用通常不按施工图测算，需按营销方案、合同、台账和执行情况复核',
  tenderMethod: '按V60科目、营销合同、代理合同、推广合同和中标价复核',
  dynamicMethod: '按动态费用、合同付款、渠道结佣、活动执行台账和结算更新',
  specialAdjustment: '特殊事项可人工调整，需备注依据',
  costAttributionMethod: '项目整体营销费用',
  targetAllocationMethod: '按销售收入、可售面积或受益业态分摊；能直接归属业态的按业态归集',
  landVatAllocationMethod: '房地产开发费用-销售费用；按土增税清算口径及限额规则复核',
  incomeTaxDeductionCategory: '销售费用',
  preTaxDeduction: '是',
  taxRemark: '销售费用需以合同、发票、结佣单、营销执行台账和财税审核为准'
};

const groups: GroupInput[] = [
  { section: '全项目营销设施及展示费用', group: '营销展示包装费用（临时展示，不含售楼部/样板间装修）', code: '05.02.01', measureBasis: '固定金额/手工输入', unit: '项', tax: '6%', product: '全项目', details: [['05.02.01.01','看房通道包装'],['05.02.01.02','示范区围挡包装'],['05.02.01.03','临时导视包装'],['05.02.01.04','临时精神堡垒/形象展示'],['05.02.01.05','临时广告画面/喷绘'],['05.02.01.06','临时道旗/灯箱'],['05.02.01.07','临时围挡美化'],['05.02.01.08','营销动线包装'],['05.02.01.09','临时停车场包装'],['05.02.01.10','临时接待区包装']], remark: '临时营销展示包装归销售费用；永久景观、永久围墙、永久出入口按对应工程明细归集。' },
  { section: '推广宣传费用', group: '广告推广及活动费用', code: '05.02.02', measureBasis: '销售收入/固定金额/手工输入', unit: '项', tax: '6%', product: '全项目', details: [['05.02.02.01','线上广告投放'],['05.02.02.02','户外广告'],['05.02.02.03','短视频/新媒体推广'],['05.02.02.04','物料印刷'],['05.02.02.05','宣传片/效果图/沙盘内容制作'],['05.02.02.06','活动推广费用'],['05.02.02.07','房展会/巡展费用'],['05.02.02.08','品牌整合推广/公关']] },
  { section: '渠道及销售佣金', group: '高层住宅销售佣金', code: '05.02.03', measureBasis: '销售收入×费率/固定金额', unit: '元', tax: '6%', product: '高层住宅', details: [['05.02.03.01','高层渠道分销费'],['05.02.03.02','高层代理销售佣金'],['05.02.03.03','高层全民经纪人佣金'],['05.02.03.04','高层老带新奖励']] },
  { section: '渠道及销售佣金', group: '洋房住宅销售佣金', code: '05.02.03', measureBasis: '销售收入×费率/固定金额', unit: '元', tax: '6%', product: '洋房住宅', details: [['05.02.03.05','洋房渠道分销费'],['05.02.03.06','洋房代理销售佣金'],['05.02.03.07','洋房全民经纪人佣金'],['05.02.03.08','洋房老带新奖励']] },
  { section: '渠道及销售佣金', group: '商业销售/招商费用', code: '05.02.03', measureBasis: '销售收入/固定金额/手工输入', unit: '元', tax: '6%', product: '底商', details: [['05.02.03.09','商业招商推广费'],['05.02.03.10','商业代理/招商佣金'],['05.02.03.11','商业开业活动推广']] },
  { section: '渠道及销售佣金', group: '车位销售费用', code: '05.02.03', measureBasis: '销售收入×费率/固定金额', unit: '元', tax: '6%', product: '地下车库-非主楼纯车位', details: [['05.02.03.12','车位推广费'],['05.02.03.13','车位代理/渠道佣金']] },
  { section: '案场运营费用', group: '案场物业及客户接待费用', code: '05.02.04', measureBasis: '固定金额/手工输入', unit: '项', tax: '6%', product: '全项目', details: [['05.02.04.01','案场物业服务费'],['05.02.04.02','案场保洁'],['05.02.04.03','案场保安'],['05.02.04.04','水吧服务'],['05.02.04.05','礼宾服务'],['05.02.04.06','案场日常物料'],['05.02.04.07','客户接待用品'],['05.02.04.08','样板区/案场保养维护']] },
  { section: '销售管理费用', group: '销售管理及后台支持', code: '05.02.05', measureBasis: '固定金额/手工输入', unit: '项', tax: '6%', product: '全项目', details: [['05.02.05.01','销售人员薪酬'],['05.02.05.02','销售办公费用'],['05.02.05.03','销售差旅费用'],['05.02.05.04','销售系统软件费'],['05.02.05.05','销售培训费'],['05.02.05.06','销售合同/按揭服务资料费']] },
  { section: '其他销售费用', group: '不可预见及临时费用', code: '05.02.06', measureBasis: '固定金额/手工输入', unit: '项', tax: '6%', product: '全项目', details: [['05.02.06.01','销售不可预见费'],['05.02.06.02','销售临时费用'],['05.02.06.03','其他营销费用']] }
];

function previousCount(group: GroupInput) {
  return groups.slice(0, groups.indexOf(group)).reduce((sum, item) => sum + item.details.length, 0);
}

export function buildV60SalesExpenseRows(offset: number): CostDictionaryPresetRow[] {
  return groups.flatMap((group) => group.details.map(([code, detail], detailIndex) => ({
    ...common,
    rowIndex: offset + previousCount(group) + detailIndex,
    costCode: code,
    parentCode: group.code,
    subjectLevel: '4',
    firstSubject: '开发间接及期间费用',
    secondSubject: group.section,
    thirdSubject: group.group,
    detailSubject: detail,
    subjectDefinition: `${detail}，来源于V60销售费用明细表B列明细项目，用于销售费用明细测算。`,
    targetMappingCode: code,
    measureBasis: group.measureBasis,
    unit: group.unit,
    defaultTaxRate: group.tax,
    applicableProductType: group.product,
    remark: group.remark || 'V60销售费用明细科目，按营销合同、结佣单、发票和执行台账复核。',
    landVatAllocationMethod: common.landVatAllocationMethod,
    incomeTaxDeductionCategory: common.incomeTaxDeductionCategory
  })));
}

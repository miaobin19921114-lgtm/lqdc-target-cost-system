import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type DetailTuple = [string, string];
type GroupInput = { section: string; group: string; code: string; measureBasis: string; unit: string; tax: string; details: DetailTuple[]; remark?: string };

const common = {
  sourceTable: '管理费用明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按V60管理费用科目、开发周期、人员月费用、固定金额或合同金额快速估算',
  conceptMethod: '按项目人员、办公行政、后勤、法税审计、物业前介交付和其他管理费估算',
  schemeMethod: '按V60管理费用明细表、组织架构、开发周期、合同及分摊依据拆分测算',
  drawingMethod: '管理费用通常不按施工图测算，需按组织架构、预算、合同和实际台账复核',
  tenderMethod: '按V60科目、服务合同、预算审批和实际执行复核',
  dynamicMethod: '按动态费用、合同付款、报销台账、薪酬台账和分摊台账更新',
  specialAdjustment: '特殊事项可人工调整，需备注依据',
  costAttributionMethod: '项目整体管理费用',
  targetAllocationMethod: '按建筑面积、可售面积或受益对象分摊；能直接归属的按受益对象归集',
  landVatAllocationMethod: '房地产开发费用-管理费用；按土增税清算口径及限额规则复核',
  incomeTaxDeductionCategory: '管理费用',
  preTaxDeduction: '是',
  taxRemark: '管理费用需以合同、发票、薪酬台账、报销台账、分摊依据和财税审核为准'
};

const groups: GroupInput[] = [
  { section: '全项目共用管理费用', group: '项目管理人员费用', code: '05.01.02.01', measureBasis: '开发周期（月）/固定金额/手工输入', unit: '项', tax: '0%', details: [['05.01.02.01.01','项目管理人员薪酬'],['05.01.02.01.02','项目管理人员社保公积金及福利'],['05.01.02.01.03','项目临聘人员及奖金']] },
  { section: '全项目共用管理费用', group: '办公及行政费用', code: '05.01.02.02', measureBasis: '开发周期（月）/固定金额/手工输入', unit: '项', tax: '6%', details: [['05.01.02.02.01','项目办公费及办公用品'],['05.01.02.02.02','通讯、网络及办公软件费'],['05.01.02.02.03','差旅交通及车辆使用费'],['05.01.02.02.04','会议及行政接待费']] },
  { section: '全项目共用管理费用', group: '项目后勤费用', code: '05.01.02.02', measureBasis: '开发周期（月）/固定金额/手工输入', unit: '项', tax: '6%', details: [['05.01.02.02.05','项目临时办公场地租赁'],['05.01.02.02.06','项目办公区水电及物业费'],['05.01.02.02.07','食堂、宿舍及生活后勤费']] },
  { section: '全项目共用管理费用', group: '法税审计及管理咨询', code: '05.01.02.03', measureBasis: '固定金额/手工输入', unit: '项', tax: '6%', details: [['05.01.02.03.01','法务咨询费'],['05.01.02.03.02','税务咨询费'],['05.01.02.03.03','审计服务费'],['05.01.02.03.04','管理咨询费']], remark: '不含监理、造价咨询、招标代理；这些按前期咨询顾问费归集。' },
  { section: '全项目共用管理费用', group: '物业前介及交付费用', code: '05.01.01.03', measureBasis: '可售面积/固定金额/手工输入', unit: '项', tax: '6%', details: [['05.01.01.03.01','物业前介服务'],['05.01.01.02.01','业主开放日及交付活动'],['05.01.01.02.02','交付资料制作及现场服务']] },
  { section: '全项目共用管理费用', group: '其他管理费用', code: '05.01.01.02', measureBasis: '固定金额/手工输入', unit: '项', tax: '6%', details: [['05.01.01.02.03','项目保险费'],['05.01.01.02.04','印花税及零星税费'],['05.01.01.02.05','不可预见管理费用']] }
];

function previousCount(group: GroupInput) {
  return groups.slice(0, groups.indexOf(group)).reduce((sum, item) => sum + item.details.length, 0);
}

export function buildV60AdminExpenseRows(offset: number): CostDictionaryPresetRow[] {
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
    subjectDefinition: `${detail}，来源于V60管理费用明细表B列明细项目，用于管理费用明细测算。`,
    targetMappingCode: group.code,
    measureBasis: group.measureBasis,
    unit: group.unit,
    defaultTaxRate: detail === '印花税及零星税费' ? '0%' : group.tax,
    applicableProductType: '全项目专项/室外工程',
    remark: group.remark || 'V60管理费用明细科目，按合同、发票、台账、分摊依据和财税审核复核。',
    landVatAllocationMethod: common.landVatAllocationMethod,
    incomeTaxDeductionCategory: common.incomeTaxDeductionCategory
  })));
}

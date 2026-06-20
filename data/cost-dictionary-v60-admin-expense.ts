import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type DetailInput = string | { name: string; unit?: string; measureBasis?: string; tax?: string; remark?: string; landVatMethod?: string; incomeTaxCategory?: string };
type GroupInput = { section: string; group: string; code: string; details: DetailInput[]; measureBasis?: string; unit?: string; tax?: string; remark?: string; landVatMethod?: string; incomeTaxCategory?: string };

const common = {
  sourceTable: '管理费用明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按开发周期、人员配置、建筑面积、合同金额或固定金额快速估算',
  conceptMethod: '按项目组织架构、开发周期、公司平台分摊和项目管理强度估算',
  schemeMethod: '按项目管理团队、行政办公、差旅招待、后台分摊和专项管理服务拆分测算',
  drawingMethod: '管理费用通常不按施工图测算，需按组织架构、费用预算、合同和实际发生台账复核',
  tenderMethod: '按服务合同、管理协议、预算审批和实际执行复核',
  dynamicMethod: '按动态费用、合同付款、报销台账、薪酬台账和分摊台账更新',
  specialAdjustment: '特殊事项可人工调整，需备注依据',
  costAttributionMethod: '项目整体管理费用',
  targetAllocationMethod: '原则上项目整体共用；可按建筑面积、可售面积或受益对象分摊',
  landVatAllocationMethod: '房地产开发费用-管理费用；按土增税清算口径及限额规则复核',
  incomeTaxDeductionCategory: '管理费用',
  preTaxDeduction: '是',
  taxRemark: '管理费用需以合同、发票、薪酬台账、报销台账、分摊依据和财税审核为准'
};

function normalizeDetail(detail: DetailInput) {
  return typeof detail === 'string' ? { name: detail } : detail;
}

const adminExpenseGroups: GroupInput[] = [
  {
    section: '项目管理人员费用',
    group: '项目管理团队薪酬、福利及社保费用',
    code: '08.02.01',
    measureBasis: '开发周期×人员月费用/固定金额',
    unit: '月',
    tax: '0%',
    details: ['项目管理人员工资', '项目管理人员社保公积金', '项目管理人员福利费', '项目管理人员奖金及绩效', '项目临聘及外包管理人员'],
    remark: '项目管理人员费用归管理费用，不进入建安成本。'
  },
  {
    section: '办公行政费用',
    group: '办公、通讯、车辆、低值易耗及行政费用',
    code: '08.02.02',
    measureBasis: '开发周期×月度费用/固定金额',
    unit: '月',
    tax: '6%',
    details: ['项目办公租赁费', '项目办公水电物业费', '办公用品及低值易耗品', '通讯及网络费', '车辆使用及油费', '证照年检及行政杂费']
  },
  {
    section: '差旅招待及会议培训',
    group: '差旅、招待、会议、培训及团队管理费用',
    code: '08.02.03',
    measureBasis: '开发周期×月度费用/固定金额',
    unit: '项',
    tax: '6%',
    details: ['项目差旅费', '项目业务招待费', '项目会议费', '项目培训费', '团队建设费']
  },
  {
    section: '项目公司运营费用',
    group: '项目公司注册、运营、档案及基础运营费用',
    code: '08.02.04',
    measureBasis: '开发周期/固定金额/合同金额',
    unit: '项',
    tax: '6%',
    details: ['项目公司注册及变更费', '项目公司年审服务费', '档案管理及资料整理费', '证照及公文管理费', '项目行政外包服务费']
  },
  {
    section: '后台管理分摊',
    group: '公司平台后台管理及共享服务分摊',
    code: '08.02.05',
    measureBasis: '建筑面积/销售收入/项目预算/分摊协议',
    unit: '项',
    tax: '6%',
    details: ['公司平台管理费分摊', '总部财务共享分摊', '总部人力行政分摊', '信息化系统分摊', '集团品牌及管理支持分摊'],
    remark: '后台管理分摊需有明确分摊规则，不应挤入建安、前期或销售费用。'
  },
  {
    section: '管理专项服务费用',
    group: '审计、财税、合规、管理咨询及项目内控服务费',
    code: '08.02.06',
    measureBasis: '合同金额/固定金额',
    unit: '项',
    tax: '6%',
    details: ['年度审计服务费', '财税咨询服务费', '合规顾问服务费', '管理咨询服务费', '项目内控服务费'],
    remark: '工程造价、监理、设计类咨询不放管理费，应归对应前期费或咨询顾问/工程成本。'
  },
  {
    section: '其他管理费用',
    group: '项目经营保险、管理备用及其他管理费用',
    code: '08.02.07',
    measureBasis: '合同金额/固定金额/项目预算',
    unit: '项',
    tax: '6%',
    details: ['项目经营保险费', '资料公证及认证费', '项目管理备用金', '其他管理费用'],
    remark: '其他管理费用仅兜底，定稿阶段应尽量拆分到明确科目。'
  }
];

export function buildV60AdminExpenseRows(offset: number): CostDictionaryPresetRow[] {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  for (const input of adminExpenseGroups) {
    for (const detailInput of input.details) {
      const detail = normalizeDetail(detailInput);
      const sequenceKey = `${input.code}__${input.section}`;
      const next = (sequence.get(sequenceKey) || 0) + 1;
      sequence.set(sequenceKey, next);
      result.push({
        ...common,
        rowIndex: rowIndex++,
        costCode: `${input.code}.${String(next).padStart(2, '0')}`,
        parentCode: input.code,
        subjectLevel: '4',
        firstSubject: '开发间接及期间费用',
        secondSubject: input.section,
        thirdSubject: input.group,
        detailSubject: detail.name,
        subjectDefinition: `${detail.name}，来源于V60管理费用明细表B列明细项目，用于管理费用明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: detail.tax || input.tax || '6%',
        applicableProductType: '项目整体共用',
        remark: detail.remark || input.remark || 'V60管理费用明细科目，按合同、发票、台账、分摊依据和财税审核复核。',
        landVatAllocationMethod: detail.landVatMethod || input.landVatMethod || common.landVatAllocationMethod,
        incomeTaxDeductionCategory: detail.incomeTaxCategory || input.incomeTaxCategory || common.incomeTaxDeductionCategory
      });
    }
  }

  return result;
}

import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type DetailInput = string | { name: string; unit?: string; measureBasis?: string; tax?: string; remark?: string; landVatMethod?: string; incomeTaxCategory?: string };
type GroupInput = {
  section: string;
  group: string;
  code: string;
  details: DetailInput[];
  measureBasis?: string;
  unit?: string;
  tax?: string;
  remark?: string;
  landVatMethod?: string;
  incomeTaxCategory?: string;
};

const common = {
  sourceTable: '销售费用明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按销售收入、可售面积、销售周期、合同金额或固定金额快速估算',
  conceptMethod: '按营销策略、销售周期、项目定位和渠道比例估算',
  schemeMethod: '按营销推广计划、案场配置、渠道策略、示范区包装和合同边界拆分测算',
  drawingMethod: '销售费用通常不按施工图测算，需按营销方案、合同、预算和执行台账复核',
  tenderMethod: '按营销合同、代理合同、广告合同、物料合同和中标价复核',
  dynamicMethod: '按动态费用、合同付款、营销活动执行、渠道结佣和结算更新',
  specialAdjustment: '特殊事项可人工调整，需备注依据',
  costAttributionMethod: '项目整体营销费用',
  targetAllocationMethod: '原则上按可售面积或销售收入分摊至可售产品；能直接归属的按受益对象归集',
  landVatAllocationMethod: '房地产开发费用-销售费用；按土增税清算口径及限额规则复核',
  incomeTaxDeductionCategory: '销售费用',
  preTaxDeduction: '是',
  taxRemark: '销售费用需以合同、发票、结佣单、营销执行台账和财税审核为准'
};

function normalizeDetail(detail: DetailInput) {
  return typeof detail === 'string' ? { name: detail } : detail;
}

const salesExpenseGroups: GroupInput[] = [
  {
    section: '销售代理及佣金',
    group: '销售代理、渠道分销及佣金费用',
    code: '08.01.01',
    measureBasis: '销售收入×费率/成交金额×费率/固定金额',
    unit: '万元基数',
    tax: '6%',
    details: [
      { name: '销售代理服务费', measureBasis: '销售收入×费率/代理合同金额', unit: '万元基数', remark: '按代理合同、成交台账和结佣规则复核。' },
      { name: '渠道分销佣金', measureBasis: '渠道成交金额×佣金率', unit: '万元基数', remark: '按渠道合同、带看确认、成交确认和结佣单复核。' },
      { name: '全民营销佣金', measureBasis: '成交金额×佣金率/固定金额', unit: '万元基数' },
      { name: '电商平台服务费', measureBasis: '销售收入×费率/合同金额', unit: '万元基数' },
      { name: '老带新奖励', measureBasis: '成交套数×单套奖励/固定金额', unit: '套' },
      { name: '分销结佣税费附加', measureBasis: '结佣金额/固定金额', unit: '万元' }
    ]
  },
  {
    section: '广告推广费用',
    group: '线上线下广告、媒体及品牌推广费',
    code: '08.01.02',
    measureBasis: '合同金额/销售收入×费率/固定金额',
    unit: '项',
    tax: '6%',
    details: [
      '线上广告投放费',
      '户外广告投放费',
      '新媒体推广费',
      '媒体发布费',
      '品牌推广费',
      '推广设计制作费',
      '视频拍摄及宣传片制作费',
      '案名及VI系统设计费'
    ]
  },
  {
    section: '案场包装及物料',
    group: '案场包装、模型物料及销售道具费',
    code: '08.01.03',
    measureBasis: '案场面积/合同金额/固定金额',
    unit: '项',
    tax: '6%',
    details: [
      { name: '售楼部营销包装', measureBasis: '售楼部面积/合同金额/固定金额', unit: '项', remark: '作为营销展示包装时计入销售费用；若作为永久资产或公区装修需按合同边界复核。' },
      { name: '样板间营销包装', measureBasis: '样板间面积/合同金额/固定金额', unit: '项', remark: '作为营销展示包装时计入销售费用；硬装形成可交付实体时需与精装修边界区分。' },
      { name: '示范区包装', measureBasis: '示范区面积/合同金额/固定金额', unit: '项', remark: '示范区营销包装转销售费用，不与永久景观、道路、围墙混算。' },
      { name: '沙盘模型制作费', measureBasis: '合同金额/固定金额', unit: '项' },
      { name: '户型模型及区位模型费', measureBasis: '合同金额/固定金额', unit: '项' },
      { name: '销售物料印刷费', measureBasis: '印刷数量/合同金额/固定金额', unit: '项' },
      { name: '案场导视及展板', measureBasis: '合同金额/固定金额', unit: '项' },
      { name: '样板间家具软装展示费', measureBasis: '样板间数量/合同金额/固定金额', unit: '项' }
    ]
  },
  {
    section: '营销活动费用',
    group: '蓄客、开盘、暖场及客户活动费',
    code: '08.01.04',
    measureBasis: '活动场次/客户数量/合同金额/固定金额',
    unit: '场',
    tax: '6%',
    details: [
      { name: '蓄客活动费', measureBasis: '活动场次/固定金额', unit: '场' },
      { name: '开放活动费', measureBasis: '活动场次/固定金额', unit: '场' },
      { name: '开盘活动费', measureBasis: '活动场次/固定金额', unit: '场' },
      { name: '客户暖场活动费', measureBasis: '活动场次/固定金额', unit: '场' },
      { name: '业主维系活动费', measureBasis: '活动场次/固定金额', unit: '场' },
      { name: '礼品及伴手礼费用', measureBasis: '客户数量/固定金额', unit: '份' }
    ]
  },
  {
    section: '案场运营费用',
    group: '案场物业、保洁、客服及销售现场运营费',
    code: '08.01.05',
    measureBasis: '销售周期/月度费用/合同金额/固定金额',
    unit: '月',
    tax: '6%',
    details: [
      { name: '案场物业服务费', measureBasis: '销售周期×月度费用/合同金额', unit: '月' },
      { name: '案场保洁服务费', measureBasis: '销售周期×月度费用/合同金额', unit: '月' },
      { name: '案场客服服务费', measureBasis: '销售周期×月度费用/合同金额', unit: '月' },
      { name: '案场安保服务费', measureBasis: '销售周期×月度费用/合同金额', unit: '月' },
      { name: '案场水电及日常消耗', measureBasis: '销售周期×月度费用/固定金额', unit: '月' },
      { name: '案场办公及低值易耗品', measureBasis: '固定金额/销售周期', unit: '项' }
    ]
  },
  {
    section: '销售人员及行政支持',
    group: '销售团队、驻场人员及营销行政费用',
    code: '08.01.06',
    measureBasis: '销售周期×人员费用/合同金额/固定金额',
    unit: '月',
    tax: '6%',
    details: [
      { name: '销售人员工资及提成', measureBasis: '销售周期×人员费用/固定金额', unit: '月' },
      { name: '驻场销售管理费', measureBasis: '销售周期×人员费用/固定金额', unit: '月' },
      { name: '营销人员培训费', measureBasis: '培训场次/固定金额', unit: '场' },
      { name: '销售差旅及接待费', measureBasis: '固定金额/销售周期', unit: '项' },
      { name: '销售系统及软件服务费', measureBasis: '销售周期×月度费用/合同金额', unit: '月' }
    ],
    remark: '项目销售团队相关费用归销售费用；项目公司行政后台费用归管理费用。'
  },
  {
    section: '销售手续及交付配合',
    group: '网签、办证、按揭、交付配合及客户服务费',
    code: '08.01.07',
    measureBasis: '成交套数/客户数量/合同金额/固定金额',
    unit: '套',
    tax: '6%',
    details: [
      { name: '网签备案服务费', measureBasis: '成交套数/固定金额', unit: '套' },
      { name: '按揭服务及银行协调费', measureBasis: '成交套数/固定金额', unit: '套' },
      { name: '客户资料及档案费', measureBasis: '成交套数/固定金额', unit: '套' },
      { name: '交付活动及客户服务费', measureBasis: '交付户数/固定金额', unit: '户' },
      { name: '销售违约及客户补偿预留', measureBasis: '固定金额/专项测算', unit: '项', remark: '谨慎列示，需与销售折扣、赔付、合同违约责任区分。' }
    ]
  }
];

export function buildV60SalesExpenseRows(offset: number): CostDictionaryPresetRow[] {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  for (const input of salesExpenseGroups) {
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
        subjectDefinition: `${detail.name}，来源于V60销售费用明细表B列明细项目，用于销售费用明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: detail.tax || input.tax || '6%',
        applicableProductType: '项目整体共用',
        remark: detail.remark || input.remark || 'V60销售费用明细科目，按营销合同、结佣单、发票和执行台账复核。',
        landVatAllocationMethod: detail.landVatMethod || input.landVatMethod || common.landVatAllocationMethod,
        incomeTaxDeductionCategory: detail.incomeTaxCategory || input.incomeTaxCategory || common.incomeTaxDeductionCategory
      });
    }
  }

  return result;
}

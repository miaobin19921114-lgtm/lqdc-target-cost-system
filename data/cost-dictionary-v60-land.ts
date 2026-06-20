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
  sourceTable: '土地费用明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按土地面积、成交价、土地价款基数、费率或固定金额快速估算',
  conceptMethod: '按土地成交条件、合作协议、税费政策和合同边界估算',
  schemeMethod: '按土地合同、出让公告、交易资料、政府缴款通知书和土地交易资料拆分测算',
  drawingMethod: '土地费通常不随施工图变化，按合同、票据、付款计划和权属文件复核',
  tenderMethod: '按土地合同/合作协议/政府缴款通知书/第三方服务合同复核',
  dynamicMethod: '按付款、票据、补缴、返还和调差动态更新',
  specialAdjustment: '特殊事项按合作协议、财税审核和项目实际单独调整',
  targetAllocationMethod: '原则上按可售开发产品或受益对象归集；不能直接归集时按可售面积或建筑面积分摊',
  costAttributionMethod: '项目整体共用',
  preTaxDeduction: '是',
  taxRemark: '土地费税务口径需以合同、票据、付款凭证和财税审核为准'
};

function normalizeDetail(detail: DetailInput) {
  return typeof detail === 'string' ? { name: detail } : detail;
}

// 注意：权籍测绘登记归前期费；资金占用归财务费用；清场/移交归前期工程费。
// 土地费用明细仅保留土地价款、取得土地直接税费和与土地交易直接相关的服务费。
const landGroups: GroupInput[] = [
  {
    section: '土地取得价款',
    group: '土地出让金及成交价款',
    code: '01.01.01',
    measureBasis: '土地面积/成交单价/固定金额',
    unit: '万元',
    tax: '0%',
    landVatMethod: '取得土地使用权所支付金额',
    incomeTaxCategory: '土地成本',
    details: [
      { name: '土地出让金', measureBasis: '土地面积/成交单价/固定金额', unit: '万元', remark: '按土地成交价或出让合同金额录入。' },
      { name: '土地成交价款', measureBasis: '土地面积/成交单价/固定金额', unit: '万元', remark: '用于合作拿地或收并购项目时记录成交价款。' },
      { name: '土地价款补缴', measureBasis: '补缴通知金额/固定金额', unit: '万元', remark: '容积率调整、规划条件调整、补缴土地价款等单独列示。' },
      { name: '配建移交折抵土地价款', measureBasis: '协议金额/固定金额', unit: '万元', remark: '如存在政府配建、移交、折抵，应单独记录便于税务复核。' },
      { name: '合作开发土地投入', measureBasis: '合作协议金额/固定金额', unit: '万元', remark: '合作方投入、代垫土地款、股权合作形成的土地投入单独列示。' }
    ]
  },
  {
    section: '土地相关税费',
    group: '土地取得税费及交易费用',
    code: '01.01.02',
    measureBasis: '土地价款/成交价×费率',
    unit: '万元基数',
    tax: '0%',
    landVatMethod: '取得土地使用权相关税费',
    incomeTaxCategory: '土地成本',
    details: [
      { name: '契税', measureBasis: '土地价款/成交价×费率', unit: '万元基数', remark: '默认可按土地价款基数×3%测算，实际按当地政策及缴款书复核。' },
      { name: '土地交易服务费', measureBasis: '土地价款/成交价×费率/固定金额', unit: '万元基数', remark: '按交易中心收费标准或实际合同金额录入。' },
      { name: '土地印花税', measureBasis: '土地合同金额×费率/固定金额', unit: '万元基数', remark: '按合同及税法口径复核。' }
    ]
  },
  {
    section: '土地取得服务费',
    group: '土地交易直接服务费用',
    code: '01.01.03',
    measureBasis: '土地价款/合同金额/固定金额',
    unit: '万元基数',
    tax: '6%',
    landVatMethod: '取得土地使用权直接相关费用；需以合同、发票和成果文件复核',
    incomeTaxCategory: '土地成本',
    details: [
      { name: '土地评估费', measureBasis: '土地价款/评估合同金额/固定金额', unit: '万元基数', remark: '仅保留与土地取得直接相关的评估费；一般测绘、权籍类转前期费。' },
      { name: '土地咨询服务费', measureBasis: '土地价款/咨询合同金额/固定金额', unit: '万元基数', remark: '需合同、发票、成果文件完整。' },
      { name: '居间服务费', measureBasis: '土地价款/居间协议金额/固定金额', unit: '万元基数', remark: '高风险费用，需合同、发票、服务成果和付款证据完整；不可与土地价款混同。' },
      { name: '土地取得专项法律服务费', measureBasis: '合同金额/固定金额', unit: '项', remark: '仅限与土地取得直接相关的专项法律服务。' }
    ]
  }
];

export function buildV60LandRows(offset: number): CostDictionaryPresetRow[] {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  for (const input of landGroups) {
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
        firstSubject: '土地费',
        secondSubject: input.section,
        thirdSubject: input.group,
        detailSubject: detail.name,
        subjectDefinition: `${detail.name}，来源于V60土地费用明细表B列明细项目，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: detail.tax || input.tax || '0%',
        applicableProductType: '项目整体',
        remark: detail.remark || input.remark || 'V60土地费明细科目，按合同、票据、付款凭证和财税审核复核。',
        landVatAllocationMethod: detail.landVatMethod || input.landVatMethod || '取得土地使用权相关成本',
        incomeTaxDeductionCategory: detail.incomeTaxCategory || input.incomeTaxCategory || '土地成本'
      });
    }
  }

  return result;
}

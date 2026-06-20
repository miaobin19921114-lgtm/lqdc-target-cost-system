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
  sourceTable: '前期费用明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按建筑面积、土地面积、红线面积、宗地数量、合同金额或固定金额快速估算',
  conceptMethod: '按报批报建、权籍测绘、专项评价、三通一平和场地准备范围估算',
  schemeMethod: '按专项报告、设计任务、场平范围、临水临电和清场移交条件拆分测算',
  drawingMethod: '按报建资料、合同清单、专项成果、总图和现场移交条件复核',
  tenderMethod: '按咨询服务合同、专项合同、中标价和政府缴费通知复核',
  dynamicMethod: '按动态成本、合同付款、签证变更和结算更新',
  specialAdjustment: '特殊事项可人工调整，需备注依据',
  targetAllocationMethod: '原则上项目整体共用；可按受益对象归集，不能直接归集时按建筑面积/可售面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本-前期工程费',
  preTaxDeduction: '是',
  taxRemark: '前期费需以合同、发票、专项成果、政府缴款通知和财税审核为准'
};

function normalizeDetail(detail: DetailInput) {
  return typeof detail === 'string' ? { name: detail } : detail;
}

const preCostGroups: GroupInput[] = [
  {
    section: '报批报建及行政规费',
    group: '政府规费及行政事业性收费',
    code: '02.01.01',
    measureBasis: '建筑面积/固定金额/政府收费文件',
    unit: '项',
    tax: '0%',
    details: [
      { name: '规划报建费', measureBasis: '建筑面积/固定金额/政府收费文件', unit: '项' },
      { name: '施工许可证相关费', measureBasis: '建筑面积/固定金额/政府收费文件', unit: '项' },
      { name: '规划验收费', measureBasis: '建筑面积/固定金额', unit: '项' },
      { name: '消防审查相关费', measureBasis: '建筑面积/固定金额', unit: '项' },
      { name: '节能审查相关费', measureBasis: '建筑面积/固定金额', unit: '项' },
      { name: '人防报建相关费', measureBasis: '人防面积/固定金额', unit: '项' }
    ]
  },
  {
    section: '权籍测绘及登记',
    group: '土地、房产测绘及权籍服务费',
    code: '02.01.02',
    measureBasis: '土地面积/建筑面积/宗地数量/合同金额',
    unit: '项',
    tax: '6%',
    details: [
      { name: '土地勘测定界费', measureBasis: '土地面积/固定金额', unit: '项', remark: '从土地费剔出，归前期费。' },
      { name: '土地权籍调查费', measureBasis: '土地面积/宗地数量/固定金额', unit: '项', remark: '从土地费剔出，归前期费。' },
      { name: '宗地图测绘费', measureBasis: '土地面积/宗地数量/固定金额', unit: '项', remark: '从土地费剔出，归前期费。' },
      { name: '不动产登记费', measureBasis: '宗地数量/固定金额', unit: '项', remark: '权籍登记类归前期费。' },
      { name: '制图晒图费', measureBasis: '图纸数量/固定金额', unit: '项', remark: '归前期费，不放土地费。' },
      { name: '房产面积预测绘费', measureBasis: '建筑面积/合同金额', unit: '项' },
      { name: '房产面积实测绘费', measureBasis: '建筑面积/合同金额', unit: '项' },
      { name: '权证专项服务费', measureBasis: '宗地数量/建筑面积/固定金额', unit: '项' }
    ]
  },
  {
    section: '前期专项评价及咨询',
    group: '环评、水保、交评、节能及专项咨询费',
    code: '02.01.03',
    measureBasis: '建筑面积/合同金额/专项报告费用',
    unit: '项',
    tax: '6%',
    details: [
      '环评费', '水土保持方案及验收费', '交通影响评价费', '节能评估费', '日照分析费', '地灾评估费', '土壤污染调查费', '社会稳定风险评估费', '绿色建筑咨询费', '海绵城市专项咨询费'
    ]
  },
  {
    section: '勘察设计及技术咨询',
    group: '勘察、方案、施工图及专项设计费',
    code: '02.02.01',
    measureBasis: '建筑面积/合同金额/设计面积',
    unit: '项',
    tax: '6%',
    details: [
      '岩土工程勘察费', '规划方案设计费', '建筑方案设计费', '施工图设计费', '基坑支护设计费', '幕墙/门窗深化设计费', '景观方案及施工图设计费', '室内精装设计费', '综合管网设计费', '绿色建筑设计咨询费'
    ]
  },
  {
    section: '三通一平工程',
    group: '临水、临电、临路、网络通信及场地平整',
    code: '02.03.01',
    measureBasis: '红线面积/场平面积/接入点数量/固定金额',
    unit: '按末级科目',
    tax: '9%',
    details: [
      { name: '临时用水接入', unit: '项', measureBasis: '接入点数量/固定金额' },
      { name: '临时用电接入', unit: '项', measureBasis: '接入容量/固定金额' },
      { name: '临时道路', unit: '㎡', measureBasis: '道路面积/固定金额' },
      { name: '临时网络通信接入', unit: '项', measureBasis: '接入点数量/固定金额' },
      { name: '场地平整', unit: '㎡', measureBasis: '场平面积/红线面积/固定金额' },
      { name: '临时排水及沉淀池', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '清场及土地移交配合',
    group: '土地清场、看护、移交及历史遗留处理',
    code: '02.03.02',
    measureBasis: '土地面积/协议金额/固定金额',
    unit: '项',
    tax: '6%',
    details: [
      { name: '土地清场费', measureBasis: '土地面积/固定金额', unit: '项', remark: '从土地费剔出，归前期费；如形成拆迁补偿性质需单独复核。' },
      { name: '土地临时看护费', measureBasis: '土地面积/看护周期/固定金额', unit: '项', remark: '从土地费剔出，归前期费。' },
      { name: '土地移交配合费', measureBasis: '协议金额/固定金额', unit: '项', remark: '从土地费剔出，归前期费。' },
      { name: '历史遗留问题处理费', measureBasis: '协议金额/固定金额', unit: '项', remark: '需合同及审批依据完整。' },
      { name: '场地临时围护及安全维护', measureBasis: '固定金额', unit: '项', remark: '不含正式围墙；正式围墙归围墙出入口明细。' }
    ]
  },
  {
    section: '临设及现场准备',
    group: '临时办公、生活区及现场准备费',
    code: '02.03.03',
    measureBasis: '临设面积/固定金额',
    unit: '项',
    tax: '9%',
    details: [
      { name: '临时办公区搭建', unit: '㎡', measureBasis: '临设面积/固定金额' },
      { name: '临时生活区搭建', unit: '㎡', measureBasis: '临设面积/固定金额' },
      { name: '施工现场临时设施', unit: '项', measureBasis: '临设面积/固定金额' },
      { name: '临时消防及安全设施', unit: '项', measureBasis: '固定金额' },
      { name: '临设拆除及恢复', unit: '项', measureBasis: '固定金额' }
    ]
  }
];

export function buildV60PreCostRows(offset: number): CostDictionaryPresetRow[] {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  for (const input of preCostGroups) {
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
        firstSubject: '前期工程费',
        secondSubject: input.section,
        thirdSubject: input.group,
        detailSubject: detail.name,
        subjectDefinition: `${detail.name}，来源于V60前期费用明细表B列明细项目，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: detail.tax || input.tax || '6%',
        applicableProductType: '项目整体共用',
        remark: detail.remark || input.remark || 'V60前期费明细科目，按合同、政府文件、专项成果和财税审核复核。',
        landVatAllocationMethod: detail.landVatMethod || input.landVatMethod || common.landVatAllocationMethod,
        incomeTaxDeductionCategory: detail.incomeTaxCategory || input.incomeTaxCategory || common.incomeTaxDeductionCategory
      });
    }
  }

  return result;
}

import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type DetailInput = string | { name: string; unit?: string; measureBasis?: string; remark?: string };
type GroupInput = {
  section: string;
  group: string;
  code: string;
  details: DetailInput[];
  measureBasis?: string;
  unit?: string;
  tax?: string;
  remark?: string;
};

const common = {
  sourceTable: '道路总平明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按道路面积、消防道路面积、沥青道路面积、车位数量或固定金额快速估算',
  conceptMethod: '按总平方案、道路等级、消防环道和交通组织估算',
  schemeMethod: '按道路做法、基层厚度、面层材料、交通标识和车行组织拆分测算',
  drawingMethod: '按总平施工图、道路结构、交安图纸、标线标牌和合同边界复核',
  tenderMethod: '按招采清单、中标价和合同价复核',
  dynamicMethod: '按动态成本、签证变更和结算更新',
  specialAdjustment: '特殊事项可人工调整',
  targetAllocationMethod: '原则上项目整体共用；可按受益对象归集，不能直接归集时按建筑面积/可售面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本',
  preTaxDeduction: '是',
  taxRemark: '按项目测算口径归集，最终以财税审核为准'
};

function normalizeDetail(detail: DetailInput) {
  return typeof detail === 'string' ? { name: detail } : detail;
}

const roadGroups: GroupInput[] = [
  {
    section: '道路土方及基层工程',
    group: '道路场地整理、土方及基层工程',
    code: '04.04.01',
    measureBasis: '道路面积/消防道路面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '道路场地清理', unit: '㎡', measureBasis: '道路面积/固定金额' },
      { name: '道路土方开挖', unit: 'm³', measureBasis: '道路面积/土方量/固定金额' },
      { name: '道路土方回填及压实', unit: 'm³', measureBasis: '道路面积/土方量/固定金额' },
      { name: '道路级配碎石基层', unit: '㎡', measureBasis: '道路面积/固定金额' },
      { name: '道路水稳基层', unit: '㎡', measureBasis: '道路面积/固定金额' },
      { name: '道路基层养护及检测', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '车行道路面层工程',
    group: '园区车行道路及沥青面层工程',
    code: '04.04.02',
    measureBasis: '道路面积/沥青道路面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '沥青混凝土下面层', unit: '㎡', measureBasis: '沥青道路面积/道路面积/固定金额' },
      { name: '沥青混凝土上面层', unit: '㎡', measureBasis: '沥青道路面积/道路面积/固定金额' },
      { name: '混凝土车行道路面', unit: '㎡', measureBasis: '道路面积/固定金额' },
      { name: '道路面层切缝及灌缝', unit: 'm', measureBasis: '道路面积/长度/固定金额' },
      { name: '道路接顺及收口处理', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '消防道路及登高场地',
    group: '消防车道及消防登高场地工程',
    code: '04.04.03',
    measureBasis: '消防道路面积/道路面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '消防道路基层', unit: '㎡', measureBasis: '消防道路面积/固定金额' },
      { name: '消防道路面层', unit: '㎡', measureBasis: '消防道路面积/固定金额' },
      { name: '消防登高场地基层', unit: '㎡', measureBasis: '消防道路面积/固定金额' },
      { name: '消防登高场地面层', unit: '㎡', measureBasis: '消防道路面积/固定金额' },
      { name: '消防车道隐形基层加强', unit: '㎡', measureBasis: '消防道路面积/固定金额' },
      { name: '消防道路验收配合', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '地面停车及车行组织',
    group: '地面停车位及车行组织工程',
    code: '04.04.04',
    measureBasis: '地上停车位数量/道路面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '地面停车位基层', unit: '㎡', measureBasis: '地上停车位数量/道路面积/固定金额' },
      { name: '地面停车位面层', unit: '㎡', measureBasis: '地上停车位数量/道路面积/固定金额' },
      { name: '植草砖停车位', unit: '㎡', measureBasis: '地上停车位数量/固定金额' },
      { name: '车行出入口接驳路面', unit: '㎡', measureBasis: '出入口数量/道路面积/固定金额' },
      { name: '减速带', unit: 'm', measureBasis: '数量/长度/固定金额' },
      { name: '道闸基础及岛台', unit: '项', measureBasis: '出入口数量/固定金额' }
    ]
  },
  {
    section: '路缘石及道路附属',
    group: '路缘石、排水沟及道路附属工程',
    code: '04.04.05',
    measureBasis: '道路面积/道路长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '混凝土路缘石', unit: 'm', measureBasis: '道路面积/长度/固定金额' },
      { name: '石材路缘石', unit: 'm', measureBasis: '道路面积/长度/固定金额' },
      { name: '道路边沟', unit: 'm', measureBasis: '道路长度/固定金额' },
      { name: '截水沟及排水沟盖板', unit: 'm', measureBasis: '道路长度/固定金额' },
      { name: '道路挡墙及护坡', unit: 'm³', measureBasis: '固定金额/工程量' }
    ]
  },
  {
    section: '交通标识标线工程',
    group: '园区交通标识、标线及安全设施工程',
    code: '04.04.06',
    measureBasis: '道路面积/车位数量/固定金额',
    unit: '按末级科目',
    details: [
      { name: '道路交通标线', unit: '㎡', measureBasis: '道路面积/车位数量/固定金额' },
      { name: '地面车位划线', unit: '个', measureBasis: '地上停车位数量/固定金额' },
      { name: '交通标识牌', unit: '块', measureBasis: '数量/固定金额' },
      { name: '反光镜及安全柱', unit: '套', measureBasis: '数量/固定金额' },
      { name: '防撞柱及车挡', unit: '套', measureBasis: '车位数量/固定金额' },
      { name: '限高限速标识', unit: '套', measureBasis: '数量/固定金额' }
    ]
  },
  {
    section: '市政接驳及红线外配合',
    group: '红线内外道路接驳及市政配合工程',
    code: '04.04.07',
    measureBasis: '出入口数量/固定金额',
    unit: '按末级科目',
    details: [
      { name: '红线外道路接驳', unit: '项', measureBasis: '出入口数量/固定金额' },
      { name: '市政道路开口及恢复', unit: '项', measureBasis: '出入口数量/固定金额' },
      { name: '人行道恢复', unit: '㎡', measureBasis: '固定金额/恢复面积' },
      { name: '路口交通组织配合', unit: '项', measureBasis: '固定金额' },
      { name: '市政验收及移交配合', unit: '项', measureBasis: '固定金额' }
    ],
    remark: '红线外工程需结合合同边界、政府要求及市政接驳条件单独复核。'
  }
];

export function buildV60RoadRows(offset: number): CostDictionaryPresetRow[] {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  for (const input of roadGroups) {
    for (const detailInput of input.details) {
      const detail = normalizeDetail(detailInput);
      const sequenceKey = `${input.code}__${input.section}`;
      const next = (sequence.get(sequenceKey) || 0) + 1;
      sequence.set(sequenceKey, next);
      result.push({
        rowIndex: rowIndex++,
        costCode: `${input.code}.${String(next).padStart(2, '0')}`,
        parentCode: input.code,
        subjectLevel: '4',
        firstSubject: '室外景观及配套工程',
        secondSubject: input.section,
        thirdSubject: input.group,
        detailSubject: detail.name,
        subjectDefinition: `${detail.name}，来源于V60道路总平明细表B列明细项目，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '道路面积/固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: input.tax || '9%',
        applicableProductType: '项目整体共用',
        remark: detail.remark || input.remark || 'V60道路总平明细科目，原则上项目整体共用；可按受益对象分摊。',
        costAttributionMethod: '项目整体共用',
        ...common
      });
    }
  }

  return result;
}

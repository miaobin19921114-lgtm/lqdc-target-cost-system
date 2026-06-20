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
  sourceTable: '室外管网明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按景观面积、红线面积、管线长度、户数、供电容量或固定金额快速估算',
  conceptMethod: '按总图方案、管网综合范围和地区经验参数估算',
  schemeMethod: '按系统、管线长度、井室数量和场地面积拆分测算',
  drawingMethod: '按室外综合管线施工图、管径、长度、井室和合同边界复核',
  tenderMethod: '按招采清单、中标价和合同价复核',
  dynamicMethod: '按动态成本、签证变更和结算更新',
  specialAdjustment: '特殊事项可人工调整',
  targetAllocationMethod: '原则上项目整体共用；能直接归属受益对象时直接归集，不能直接归集时按建筑面积/可售面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本',
  preTaxDeduction: '是',
  taxRemark: '按项目测算口径归集，最终以财税审核为准'
};

function normalizeDetail(detail: DetailInput) {
  return typeof detail === 'string' ? { name: detail } : detail;
}

const outdoorPipeGroups: GroupInput[] = [
  {
    section: '室外综合管网工程',
    group: '室外综合管网及管沟工程',
    code: '04.02.01',
    measureBasis: '景观面积/红线面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '室外综合管网土方开挖', unit: 'm³', measureBasis: '景观面积/管线长度/固定金额' },
      { name: '室外综合管网土方回填', unit: 'm³', measureBasis: '景观面积/管线长度/固定金额' },
      { name: '管沟垫层及基础', unit: 'm', measureBasis: '管线长度/固定金额' },
      { name: '综合管沟', unit: 'm', measureBasis: '管沟长度/固定金额' },
      { name: '管线交叉保护及加固', unit: '项', measureBasis: '固定金额/交叉点数量' },
      { name: '管线迁改及保护', unit: '项', measureBasis: '固定金额' }
    ],
    remark: '室外综合管网原则上项目整体共用，按景观面积或红线面积快速估算。'
  },
  {
    section: '室外给水工程',
    group: '室外给水管网工程',
    code: '04.02.02',
    measureBasis: '建筑面积/管线长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '室外生活给水管', unit: 'm', measureBasis: '建筑面积/管线长度/固定金额' },
      { name: '室外中水管', unit: 'm', measureBasis: '建筑面积/管线长度/固定金额' },
      { name: '阀门井', unit: '座', measureBasis: '井室数量/固定金额' },
      { name: '水表井', unit: '座', measureBasis: '井室数量/固定金额' },
      { name: '给水接驳及碰口', unit: '项', measureBasis: '接驳点数量/固定金额' },
      { name: '给水系统试压冲洗', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '室外雨水工程',
    group: '室外雨水管网工程',
    code: '04.02.03',
    measureBasis: '景观面积/红线面积/管线长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '室外雨水管', unit: 'm', measureBasis: '景观面积/管线长度/固定金额' },
      { name: '雨水检查井', unit: '座', measureBasis: '井室数量/固定金额' },
      { name: '雨水口', unit: '个', measureBasis: '雨水口数量/固定金额' },
      { name: '雨水篦子及连接管', unit: '个', measureBasis: '雨水口数量/固定金额' },
      { name: '雨水调蓄池土建配合', unit: '项', measureBasis: '固定金额/调蓄容积' },
      { name: '雨水管网闭水/通球试验', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '室外污水工程',
    group: '室外污水管网工程',
    code: '04.02.04',
    measureBasis: '户数/建筑面积/管线长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '室外污水管', unit: 'm', measureBasis: '户数/管线长度/固定金额' },
      { name: '污水检查井', unit: '座', measureBasis: '井室数量/固定金额' },
      { name: '化粪池', unit: '座', measureBasis: '户数/座数/固定金额' },
      { name: '隔油池', unit: '座', measureBasis: '商业面积/座数/固定金额' },
      { name: '污水提升接驳', unit: '项', measureBasis: '固定金额' },
      { name: '污水管网闭水/通球试验', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '室外消防管网工程',
    group: '室外消防给水及消火栓工程',
    code: '04.02.05',
    measureBasis: '建筑面积/管线长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '室外消防给水管', unit: 'm', measureBasis: '建筑面积/管线长度/固定金额' },
      { name: '室外消火栓', unit: '套', measureBasis: '消火栓数量/固定金额' },
      { name: '消防水泵接合器', unit: '套', measureBasis: '套数/固定金额' },
      { name: '消防阀门井', unit: '座', measureBasis: '井室数量/固定金额' },
      { name: '消防管网接驳及试压', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '室外强电工程',
    group: '室外强电外线及电力管网工程',
    code: '04.02.06',
    measureBasis: '建筑面积/供电容量/管线长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '室外电力排管', unit: 'm', measureBasis: '管线长度/固定金额' },
      { name: '室外强电电缆', unit: 'm', measureBasis: '供电容量/电缆长度/固定金额' },
      { name: '电缆井', unit: '座', measureBasis: '井室数量/固定金额' },
      { name: '室外照明电源管线', unit: 'm', measureBasis: '景观面积/管线长度/固定金额' },
      { name: '箱变/配电房外线接驳', unit: '项', measureBasis: '接驳点数量/固定金额' }
    ]
  },
  {
    section: '室外弱电工程',
    group: '室外弱电外线及智能化管网工程',
    code: '04.02.07',
    measureBasis: '建筑面积/管线长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '室外弱电排管', unit: 'm', measureBasis: '管线长度/固定金额' },
      { name: '通信管道', unit: 'm', measureBasis: '管线长度/固定金额' },
      { name: '弱电井', unit: '座', measureBasis: '井室数量/固定金额' },
      { name: '园区监控管线', unit: 'm', measureBasis: '景观面积/点位数量/固定金额' },
      { name: '门禁及道闸管线', unit: 'm', measureBasis: '出入口数量/管线长度/固定金额' },
      { name: '运营商接入配合', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '燃气工程',
    group: '室外燃气管网工程',
    code: '04.02.08',
    measureBasis: '户数/建筑面积/管线长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '室外燃气管道', unit: 'm', measureBasis: '户数/管线长度/固定金额' },
      { name: '燃气调压箱/柜', unit: '台', measureBasis: '台数/固定金额' },
      { name: '燃气阀门井', unit: '座', measureBasis: '井室数量/固定金额' },
      { name: '燃气接驳及通气配合', unit: '项', measureBasis: '固定金额' },
      { name: '燃气检测及验收配合', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '海绵城市及雨水回收',
    group: '海绵城市及雨水回收工程',
    code: '04.02.09',
    measureBasis: '景观面积/红线面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '透水铺装基层配合', unit: '㎡', measureBasis: '硬景面积/固定金额' },
      { name: '下凹绿地及雨水花园', unit: '㎡', measureBasis: '软景面积/固定金额' },
      { name: '植草沟', unit: 'm', measureBasis: '景观面积/长度/固定金额' },
      { name: '雨水收集模块', unit: 'm³', measureBasis: '红线面积/调蓄容积/固定金额' },
      { name: '雨水回用管线', unit: 'm', measureBasis: '管线长度/固定金额' },
      { name: '海绵城市检测及验收', unit: '项', measureBasis: '固定金额' }
    ]
  }
];

export function buildV60OutdoorPipeRows(offset: number): CostDictionaryPresetRow[] {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  for (const input of outdoorPipeGroups) {
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
        subjectDefinition: `${detail.name}，来源于V60室外管网明细表B列明细项目，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '景观面积/固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: input.tax || '9%',
        applicableProductType: '项目整体共用',
        remark: detail.remark || input.remark || 'V60室外管网明细科目，原则上项目整体共用；可按受益对象分摊。',
        costAttributionMethod: '项目整体共用',
        ...common
      });
    }
  }

  return result;
}

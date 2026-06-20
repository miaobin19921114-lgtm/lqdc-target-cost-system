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
  sourceTable: '围墙出入口明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '围墙按周界长度，出入口按数量，临设围挡按临设范围或周界长度快速估算',
  conceptMethod: '按总图红线、周界长度、正式出入口和临时出入口数量估算',
  schemeMethod: '按围墙形式、基础做法、门岗面积、道闸数量和出入口档次拆分测算',
  drawingMethod: '按围墙施工图、门岗建筑图、出入口详图和合同边界复核',
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

const wallGateGroups: GroupInput[] = [
  {
    section: '正式围墙工程',
    group: '正式围墙及围墙基础工程',
    code: '04.05.01',
    measureBasis: '周界长度/围墙长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '正式围墙基础', unit: 'm', measureBasis: '周界长度/围墙长度/固定金额' },
      { name: '正式围墙墙身', unit: 'm', measureBasis: '周界长度/围墙长度/固定金额' },
      { name: '正式围墙饰面', unit: 'm', measureBasis: '周界长度/围墙长度/固定金额' },
      { name: '正式围墙压顶', unit: 'm', measureBasis: '周界长度/围墙长度/固定金额' },
      { name: '围墙栏杆/铁艺格栅', unit: 'm', measureBasis: '周界长度/围墙长度/固定金额' },
      { name: '围墙防水防潮及排水', unit: 'm', measureBasis: '周界长度/围墙长度/固定金额' }
    ],
    remark: '正式围墙单独测算，不与出入口、临设围挡混算。'
  },
  {
    section: '围墙附属工程',
    group: '围墙照明、监控及附属工程',
    code: '04.05.02',
    measureBasis: '周界长度/固定金额',
    unit: '按末级科目',
    details: [
      { name: '围墙照明管线及灯具', unit: 'm', measureBasis: '周界长度/固定金额' },
      { name: '围墙监控预留管线', unit: 'm', measureBasis: '周界长度/固定金额' },
      { name: '周界报警预留管线', unit: 'm', measureBasis: '周界长度/固定金额' },
      { name: '围墙标识及警示牌', unit: '项', measureBasis: '固定金额' },
      { name: '围墙周边收边及恢复', unit: 'm', measureBasis: '周界长度/固定金额' }
    ]
  },
  {
    section: '正式出入口工程',
    group: '正式出入口、门头及门岗工程',
    code: '04.05.03',
    measureBasis: '正式出入口数量/出入口数量/固定金额',
    unit: '按末级科目',
    details: [
      { name: '正式出入口门头', unit: '个', measureBasis: '正式出入口数量/固定金额' },
      { name: '正式出入口门岗土建', unit: '个', measureBasis: '正式出入口数量/固定金额' },
      { name: '正式出入口门岗装修', unit: '个', measureBasis: '正式出入口数量/固定金额' },
      { name: '正式出入口地面铺装', unit: '㎡', measureBasis: '正式出入口数量/固定金额/出入口铺装面积' },
      { name: '正式出入口雨棚', unit: '个', measureBasis: '正式出入口数量/固定金额' },
      { name: '正式出入口景观包装', unit: '个', measureBasis: '正式出入口数量/固定金额' }
    ],
    remark: '正式出入口按数量单独测算，不并入围墙长度。'
  },
  {
    section: '车辆出入口及道闸',
    group: '车辆出入口、道闸及门禁基础工程',
    code: '04.05.04',
    measureBasis: '出入口数量/正式出入口数量/固定金额',
    unit: '按末级科目',
    details: [
      { name: '道闸基础及岛台', unit: '个', measureBasis: '出入口数量/正式出入口数量/固定金额' },
      { name: '车牌识别基础及预埋', unit: '套', measureBasis: '出入口数量/固定金额' },
      { name: '人行门禁基础及预埋', unit: '套', measureBasis: '出入口数量/固定金额' },
      { name: '出入口减速带及防撞设施', unit: '项', measureBasis: '出入口数量/固定金额' },
      { name: '出入口交通标识标线', unit: '项', measureBasis: '出入口数量/固定金额' }
    ]
  },
  {
    section: '临设围挡工程',
    group: '临时围挡及临时大门工程',
    code: '04.05.05',
    measureBasis: '临设面积/周界长度/临时出入口数量/固定金额',
    unit: '按末级科目',
    details: [
      { name: '临时施工围挡', unit: 'm', measureBasis: '周界长度/临设面积/固定金额' },
      { name: '临时围挡基础及加固', unit: 'm', measureBasis: '周界长度/临设面积/固定金额' },
      { name: '临时围挡喷绘包装', unit: '㎡', measureBasis: '周界长度/固定金额' },
      { name: '临时施工大门', unit: '个', measureBasis: '临时出入口数量/固定金额' },
      { name: '临时门卫及门禁配合', unit: '个', measureBasis: '临时出入口数量/固定金额' },
      { name: '临时围挡拆改及恢复', unit: '项', measureBasis: '固定金额' }
    ],
    remark: '临设围挡属于临设体系，单独列示，不与正式围墙混算。'
  },
  {
    section: '围墙出入口验收及移交',
    group: '验收、移交及专项配合',
    code: '04.05.06',
    measureBasis: '固定金额/出入口数量/周界长度',
    unit: '按末级科目',
    details: [
      { name: '围墙出入口专项验收配合', unit: '项', measureBasis: '固定金额' },
      { name: '围墙出入口移交及整改', unit: '项', measureBasis: '固定金额' },
      { name: '红线外协调及恢复配合', unit: '项', measureBasis: '固定金额' }
    ]
  }
];

export function buildV60WallGateRows(offset: number): CostDictionaryPresetRow[] {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  for (const input of wallGateGroups) {
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
        subjectDefinition: `${detail.name}，来源于V60围墙出入口明细表B列明细项目，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '周界长度/固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: input.tax || '9%',
        applicableProductType: '项目整体共用',
        remark: detail.remark || input.remark || 'V60围墙出入口明细科目；围墙、出入口、临设围挡分开测算。',
        costAttributionMethod: '项目整体共用',
        ...common
      });
    }
  }

  return result;
}

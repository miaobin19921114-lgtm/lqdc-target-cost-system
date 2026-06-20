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
  sourceTable: '景观工程明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按景观面积、硬景面积、软景面积、水景面积、儿童活动场地面积或固定金额快速估算',
  conceptMethod: '按景观概念方案、景观档次和面积指标估算',
  schemeMethod: '按景观方案分区、材料做法、软硬景比例和专项面积拆分测算',
  drawingMethod: '按景观施工图、铺装做法、苗木清单和小品设备数量复核',
  tenderMethod: '按景观招采清单、中标价和合同价复核',
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

const landscapeGroups: GroupInput[] = [
  {
    section: '景观前期及土方工程',
    group: '景观场地整理及土方工程',
    code: '04.03.01',
    measureBasis: '景观面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '景观场地清理', unit: '㎡', measureBasis: '景观面积/固定金额' },
      { name: '景观土方开挖', unit: 'm³', measureBasis: '景观面积/土方量/固定金额' },
      { name: '景观土方回填及造坡', unit: 'm³', measureBasis: '景观面积/土方量/固定金额' },
      { name: '种植土回填', unit: 'm³', measureBasis: '软景面积/种植土厚度/固定金额' },
      { name: '场地排水及临时措施', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '硬景铺装工程',
    group: '硬景铺装及基层工程',
    code: '04.03.02',
    measureBasis: '硬景面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '硬景基层', unit: '㎡', measureBasis: '硬景面积/固定金额' },
      { name: '石材铺装', unit: '㎡', measureBasis: '硬景面积/石材铺装面积/固定金额' },
      { name: '透水砖铺装', unit: '㎡', measureBasis: '硬景面积/透水铺装面积/固定金额' },
      { name: '烧结砖/陶砖铺装', unit: '㎡', measureBasis: '硬景面积/铺装面积/固定金额' },
      { name: '沥青园路', unit: '㎡', measureBasis: '道路面积/硬景面积/固定金额' },
      { name: '路缘石及收边', unit: 'm', measureBasis: '硬景面积/长度/固定金额' },
      { name: '台阶及坡道铺装', unit: '㎡', measureBasis: '硬景面积/固定金额' }
    ]
  },
  {
    section: '软景绿化工程',
    group: '乔灌草及地被绿化工程',
    code: '04.03.03',
    measureBasis: '软景面积/绿化面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '乔木种植', unit: '株', measureBasis: '软景面积/乔木数量/固定金额' },
      { name: '灌木种植', unit: '㎡', measureBasis: '软景面积/灌木面积/固定金额' },
      { name: '地被及花境', unit: '㎡', measureBasis: '软景面积/地被面积/固定金额' },
      { name: '草坪铺植', unit: '㎡', measureBasis: '绿化面积/草坪面积/固定金额' },
      { name: '树池及树篦子', unit: '套', measureBasis: '乔木数量/固定金额' },
      { name: '绿化养护期费用', unit: '㎡', measureBasis: '软景面积/固定金额' }
    ]
  },
  {
    section: '水景工程',
    group: '水景及循环水处理工程',
    code: '04.03.04',
    measureBasis: '水景面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '水景结构及防水', unit: '㎡', measureBasis: '水景面积/固定金额' },
      { name: '水景饰面', unit: '㎡', measureBasis: '水景面积/固定金额' },
      { name: '水景循环泵及过滤设备', unit: '套', measureBasis: '水景面积/设备套数/固定金额' },
      { name: '喷泉喷头及管线', unit: '项', measureBasis: '水景面积/固定金额' },
      { name: '水景补水及排水', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '儿童活动及康体设施',
    group: '儿童活动场地及健身设施工程',
    code: '04.03.05',
    measureBasis: '儿童活动场地面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '儿童活动场地EPDM地面', unit: '㎡', measureBasis: '儿童活动场地面积/固定金额' },
      { name: '儿童游乐设施', unit: '套', measureBasis: '设施套数/儿童活动场地面积/固定金额' },
      { name: '健身器材', unit: '套', measureBasis: '设施套数/固定金额' },
      { name: '活动场地围护及安全设施', unit: '项', measureBasis: '儿童活动场地面积/固定金额' },
      { name: '活动场地遮阳及休憩设施', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '架空层及灰空间景观',
    group: '架空层景观及灰空间提升工程',
    code: '04.03.06',
    measureBasis: '架空层景观面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '架空层景观地面', unit: '㎡', measureBasis: '架空层景观面积/固定金额' },
      { name: '架空层休闲设施', unit: '项', measureBasis: '固定金额' },
      { name: '架空层绿化及花箱', unit: '项', measureBasis: '架空层景观面积/固定金额' },
      { name: '架空层灯光及氛围', unit: '项', measureBasis: '架空层景观面积/固定金额' }
    ]
  },
  {
    section: '景观小品及构筑物',
    group: '景观小品、景墙及构筑物工程',
    code: '04.03.07',
    measureBasis: '景观面积/固定金额/数量',
    unit: '按末级科目',
    details: [
      { name: '景墙', unit: '㎡', measureBasis: '景观面积/墙面面积/固定金额' },
      { name: '廊架', unit: '项', measureBasis: '数量/固定金额' },
      { name: '花池及树池', unit: 'm', measureBasis: '景观面积/长度/固定金额' },
      { name: '坐凳及成品座椅', unit: '套', measureBasis: '数量/固定金额' },
      { name: '垃圾桶及成品设施', unit: '套', measureBasis: '数量/固定金额' },
      { name: '景观雕塑及艺术小品', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '景观照明及电气',
    group: '景观照明及园林电气工程',
    code: '04.03.08',
    measureBasis: '景观面积/硬景面积/固定金额',
    unit: '按末级科目',
    details: [
      { name: '庭院灯', unit: '套', measureBasis: '景观面积/灯具数量/固定金额' },
      { name: '草坪灯及地埋灯', unit: '套', measureBasis: '景观面积/灯具数量/固定金额' },
      { name: '景观灯带', unit: 'm', measureBasis: '硬景面积/长度/固定金额' },
      { name: '景观配电箱', unit: '台', measureBasis: '台数/固定金额' },
      { name: '景观照明电缆及管线', unit: 'm', measureBasis: '景观面积/管线长度/固定金额' },
      { name: '景观照明调试', unit: '项', measureBasis: '固定金额' }
    ]
  },
  {
    section: '标识导视及泛光配合',
    group: '景观标识导视及泛光配合工程',
    code: '04.03.09',
    measureBasis: '景观面积/固定金额/数量',
    unit: '按末级科目',
    details: [
      { name: '园区标识导视牌', unit: '块', measureBasis: '数量/固定金额' },
      { name: '楼栋及单元导视', unit: '套', measureBasis: '楼栋数量/单元数量/固定金额' },
      { name: '景观精神堡垒', unit: '座', measureBasis: '数量/固定金额' },
      { name: '泛光预留及景观配合', unit: '项', measureBasis: '固定金额' }
    ]
  }
];

export function buildV60LandscapeRows(offset: number): CostDictionaryPresetRow[] {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  for (const input of landscapeGroups) {
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
        subjectDefinition: `${detail.name}，来源于V60景观工程明细表B列明细项目，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '景观面积/固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: input.tax || '9%',
        applicableProductType: '项目整体共用',
        remark: detail.remark || input.remark || 'V60景观工程明细科目，原则上项目整体共用；可按受益对象分摊。',
        costAttributionMethod: '项目整体共用',
        ...common
      });
    }
  }

  return result;
}

import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type DetailInput = { name: string; unit?: string; measureBasis?: string; remark?: string };
type GroupInput = {
  scope: string;
  scopePrefix: string;
  section: string;
  group: string;
  code: string;
  details: DetailInput[];
  measureBasis: string;
  remark?: string;
};

const common = {
  sourceTable: '土建明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按装配式适用范围、装配率和经验增量指标估算',
  conceptMethod: '按装配式建筑面积、装配率和构件类型估算',
  schemeMethod: '按PC构件、运输、吊装、灌浆、连接件和专项检测拆分测算',
  drawingMethod: '按装配式深化设计、构件清单和施工图工程量复核',
  tenderMethod: '按PC构件采购、吊装措施和专项分包招标价复核',
  dynamicMethod: '按动态成本、构件变更、吊装措施和结算更新',
  specialAdjustment: '按项目所在地装配式政策、装配率要求和构件供应条件调整',
  targetAllocationMethod: '按装配式受益业态直接归集；不能直接归集时按建筑面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本',
  preTaxDeduction: '是',
  taxRemark: '装配式专项成本按工程合同和财税审核口径确定'
} as const;

const componentDetails: DetailInput[] = [
  { name: 'PC预制构件', unit: 'm³', measureBasis: '装配式建筑面积/构件体积/固定金额' },
  { name: '叠合板', unit: '㎡', measureBasis: '装配式楼板面积/固定金额' },
  { name: '预制楼梯', unit: '跑', measureBasis: '楼梯跑数/固定金额' },
  { name: '预制外墙板', unit: '㎡', measureBasis: '预制外墙面积/固定金额' },
  { name: '预制内墙板', unit: '㎡', measureBasis: '预制内墙面积/固定金额' },
  { name: '预制阳台', unit: '个', measureBasis: '阳台数量/固定金额' },
  { name: '预制空调板', unit: '个', measureBasis: '空调板数量/固定金额' }
];

const installationDetails: DetailInput[] = [
  { name: '预制构件运输', unit: 'm³', measureBasis: '构件体积/运输距离/固定金额' },
  { name: '预制构件吊装', unit: 'm³', measureBasis: '构件体积/吊装数量/固定金额' },
  { name: '构件堆场及二次倒运', unit: '㎡', measureBasis: '堆场面积/构件数量/固定金额' },
  { name: '临时支撑体系', unit: '㎡', measureBasis: '装配式建筑面积/固定金额' },
  { name: '灌浆套筒及灌浆料', unit: '套', measureBasis: '套筒数量/固定金额' },
  { name: '连接件及预埋件', unit: '套', measureBasis: '连接件数量/固定金额' },
  { name: '后浇节点处理', unit: 'm', measureBasis: '节点长度/固定金额' }
];

const serviceDetails: DetailInput[] = [
  { name: '装配式深化设计配合', unit: '项', measureBasis: '装配式建筑面积/固定金额' },
  { name: 'BIM及构件深化碰撞配合', unit: '项', measureBasis: '装配式建筑面积/固定金额' },
  { name: '装配式专项检测', unit: '项', measureBasis: '检测批次/固定金额' },
  { name: '首件验收及样板引路', unit: '项', measureBasis: '固定金额' },
  { name: '构件驻厂监造配合', unit: '项', measureBasis: '构件采购金额/固定金额' }
];

const scopes = [
  { scope: '高层住宅', scopePrefix: '高层' },
  { scope: '洋房', scopePrefix: '洋房' },
  { scope: '商业', scopePrefix: '商业' },
  { scope: '物业/社区/配套用房', scopePrefix: '配套' },
  { scope: '地下车位 / 非主楼纯地下车库', scopePrefix: '地下室' }
];

function prefixDetail(detail: DetailInput, prefix: string): DetailInput {
  return { ...detail, name: detail.name.startsWith(prefix) ? detail.name : `${prefix}${detail.name}` };
}

function makeGroups(): GroupInput[] {
  return scopes.flatMap(({ scope, scopePrefix }) => [
    {
      scope,
      scopePrefix,
      section: '装配式工程',
      group: '装配式构件工程',
      code: '03.16.01',
      details: componentDetails,
      measureBasis: '装配式建筑面积/构件工程量/固定金额',
      remark: '是否装配式=是时生成；按装配率、适用范围和构件类型测算。'
    },
    {
      scope,
      scopePrefix,
      section: '装配式工程',
      group: '装配式安装及措施工程',
      code: '03.16.02',
      details: installationDetails,
      measureBasis: '装配式建筑面积/构件数量/固定金额',
      remark: '装配式构件运输、吊装、支撑、灌浆、连接件等专项措施。'
    },
    {
      scope,
      scopePrefix,
      section: '装配式工程',
      group: '装配式专项配合及检测',
      code: '03.16.03',
      details: serviceDetails,
      measureBasis: '装配式建筑面积/固定金额',
      remark: '装配式深化设计、BIM配合、专项检测、首件验收和驻厂监造。'
    }
  ]);
}

export function buildV60PrefabricatedRows(offset: number): CostDictionaryPresetRow[] {
  const rows: CostDictionaryPresetRow[] = [];
  let rowIndex = offset;
  for (const group of makeGroups()) {
    group.details.forEach((detail, index) => {
      const prefixed = prefixDetail(detail, group.scopePrefix);
      rows.push({
        rowIndex: rowIndex++,
        costCode: `${group.code}.${String(index + 1).padStart(2, '0')}`,
        parentCode: group.code,
        subjectLevel: '4',
        firstSubject: '建安工程费',
        secondSubject: group.section,
        thirdSubject: group.group,
        detailSubject: prefixed.name,
        subjectDefinition: `${prefixed.name}，用于装配式建筑专项成本测算。`,
        targetMappingCode: group.code,
        measureBasis: prefixed.measureBasis || group.measureBasis,
        unit: prefixed.unit || '项',
        defaultTaxRate: '9%',
        applicableProductType: group.scope,
        remark: prefixed.remark || group.remark || '装配式专项成本。',
        costAttributionMethod: group.scope,
        ...common
      });
    });
  }
  return rows;
}

import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type DetailInput = string | { name: string; unit?: string; measureBasis?: string; remark?: string };
type GroupInput = {
  scope: string;
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
  sourceTable: '设备明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按台套数量、单元数量、车位数量或设备清单快速估算',
  conceptMethod: '按方案设备配置、业态规模和地区经验参数估算',
  schemeMethod: '按业态、专业系统、设备类型和台套数量拆分测算',
  drawingMethod: '按施工图设备表、设备参数和合同边界复核',
  tenderMethod: '按招采设备清单、中标价和合同价复核',
  dynamicMethod: '按动态成本、签证变更和结算更新',
  specialAdjustment: '特殊事项可人工调整',
  targetAllocationMethod: '按受益对象直接归集；不能单独归集时按建筑面积/可售面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本',
  preTaxDeduction: '是',
  taxRemark: '按项目测算口径归集，最终以财税审核为准'
};

function normalizeDetail(detail: DetailInput) {
  return typeof detail === 'string' ? { name: detail } : detail;
}

function prefixDetail(detail: DetailInput, prefix: string) {
  const item = normalizeDetail(detail);
  const name = item.name.startsWith(prefix) ? item.name : `${prefix}${item.name}`;
  return { ...item, name };
}

const overallEquipmentGroups: GroupInput[] = [
  { scope: '项目整体共用', section: '供配电设备', group: '项目共用供配电设备', code: '03.08.00', details: [
    { name: '变压器', unit: '台' },
    { name: '高压柜', unit: '台' },
    { name: '低压柜', unit: '台' },
    { name: '环网柜', unit: '台' },
    { name: '直流屏/UPS', unit: '套' },
    { name: '柴油发电机组', unit: '台' },
    { name: '电能计量设备', unit: '套' },
    { name: '配电监控设备', unit: '套' }
  ], measureBasis: '供电容量/配电房数量/设备清单/固定金额', unit: '按末级科目', tax: '13%' },
  { scope: '项目整体共用', section: '水泵及给排水设备', group: '项目共用水泵及给排水设备', code: '03.08.01', details: [
    { name: '生活给水泵组', unit: '套' },
    { name: '消防水泵', unit: '套' },
    { name: '喷淋水泵', unit: '套' },
    { name: '稳压设备', unit: '套' },
    { name: '生活水箱/水池附属设备', unit: '套' },
    { name: '消防水池液位及控制设备', unit: '套' },
    { name: '潜污泵/排水泵', unit: '台' },
    { name: '泵房控制柜', unit: '台' }
  ], measureBasis: '泵房数量/水池数量/设备清单/固定金额', unit: '按末级科目', tax: '13%' },
  { scope: '项目整体共用', section: '消防主机及控制设备', group: '项目共用消防设备', code: '03.08.02', details: [
    { name: '火灾报警主机', unit: '台' },
    { name: '消防联动控制柜', unit: '台' },
    { name: '消防广播主机', unit: '台' },
    { name: '消防电话主机', unit: '台' },
    { name: '电气火灾监控主机', unit: '台' },
    { name: '消防电源监控主机', unit: '台' },
    { name: '防火门监控主机', unit: '台' },
    { name: '气体灭火控制设备', unit: '套' }
  ], measureBasis: '消防控制室设备清单/固定金额', unit: '按末级科目', tax: '13%' },
  { scope: '项目整体共用', section: '弱电智能化设备', group: '项目共用弱电智能化设备', code: '03.08.03', details: [
    { name: '监控中心设备', unit: '套' },
    { name: '视频监控主机及存储', unit: '套' },
    { name: '门禁控制设备', unit: '套' },
    { name: '可视对讲管理机', unit: '套' },
    { name: '周界报警主机', unit: '套' },
    { name: '电子巡更设备', unit: '套' },
    { name: '机房交换机及网络设备', unit: '套' },
    { name: '背景音乐/广播主机', unit: '套' },
    { name: '机电设备监控主机', unit: '套' }
  ], measureBasis: '弱电机房设备清单/点位数量/固定金额', unit: '按末级科目', tax: '13%' },
  { scope: '项目整体共用', section: '暖通及通风设备', group: '项目共用暖通通风设备', code: '03.08.04', details: [
    { name: '送排风机', unit: '台' },
    { name: '排烟风机', unit: '台' },
    { name: '补风机', unit: '台' },
    { name: '风机控制箱', unit: '台' },
    { name: '排烟防火阀执行机构', unit: '套' },
    { name: '新风机组', unit: '台' },
    { name: '空调主机/室外机', unit: '台' }
  ], measureBasis: '设备清单/风机数量/固定金额', unit: '按末级科目', tax: '13%' }
];

const productElevatorGroups: GroupInput[] = [
  { scope: '', section: '垂直交通设备', group: '电梯设备', code: '03.08.10', details: [
    { name: '客梯设备', unit: '台', measureBasis: '单元数量/电梯台数' },
    { name: '消防电梯/担架电梯', unit: '台', measureBasis: '单元数量/电梯台数' },
    { name: '无障碍电梯', unit: '台', measureBasis: '电梯台数' },
    { name: '电梯轿厢装修', unit: '台', measureBasis: '电梯台数' },
    { name: '电梯门套及配套设备', unit: '台', measureBasis: '电梯台数' },
    { name: '电梯五方通话设备', unit: '台', measureBasis: '电梯台数' }
  ], measureBasis: '单元数量/电梯台数/固定金额', unit: '按末级科目', tax: '13%' }
];

const commercialEquipmentGroups: GroupInput[] = [
  { scope: '商业', section: '商业垂直交通设备', group: '商业电梯扶梯设备', code: '03.08.20', details: [
    { name: '商业客梯设备', unit: '台' },
    { name: '商业货梯设备', unit: '台' },
    { name: '商业扶梯设备', unit: '台' },
    { name: '商业观光梯设备', unit: '台' },
    { name: '商业电梯轿厢装修', unit: '台' },
    { name: '扶梯装饰及附属设备', unit: '台' }
  ], measureBasis: '商业电梯/扶梯台数/固定金额', unit: '按末级科目', tax: '13%' },
  { scope: '商业', section: '商业暖通及专项设备', group: '商业空调新风及排油烟设备', code: '03.08.21', details: [
    { name: '商业新风机组', unit: '台' },
    { name: '商业空调室外机/主机', unit: '台' },
    { name: '商业排油烟风机', unit: '台' },
    { name: '商业油烟净化设备', unit: '套' },
    { name: '商业补风设备', unit: '台' },
    { name: '商业厨房排烟配套设备', unit: '套' }
  ], measureBasis: '商业面积/设备清单/固定金额', unit: '按末级科目', tax: '13%' }
];

const basementEquipmentGroups: GroupInput[] = [
  { scope: '地下车位 / 非主楼纯地下车库', section: '地库通风及防排烟设备', group: '地库通风防排烟设备', code: '03.08.30', details: [
    { name: '地库送风机', unit: '台' },
    { name: '地库排风机', unit: '台' },
    { name: '地库排烟风机', unit: '台' },
    { name: '地库补风机', unit: '台' },
    { name: '风机控制箱', unit: '台' },
    { name: '防排烟阀门执行机构', unit: '套' }
  ], measureBasis: '地库面积/风机数量/设备清单/固定金额', unit: '按末级科目', tax: '13%' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '地库排水设备', group: '地库排水及集水坑设备', code: '03.08.31', details: [
    { name: '地库潜污泵', unit: '台' },
    { name: '集水坑排水泵', unit: '台' },
    { name: '排水泵控制柜', unit: '台' },
    { name: '液位控制器', unit: '套' },
    { name: '排水设备配套附件', unit: '套' }
  ], measureBasis: '集水坑数量/排水泵数量/固定金额', unit: '按末级科目', tax: '13%' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '停车场及车库智能化设备', group: '地库停车场设备', code: '03.08.32', details: [
    { name: '车牌识别设备', unit: '套' },
    { name: '道闸设备', unit: '套' },
    { name: '停车场管理主机', unit: '套' },
    { name: '车位引导设备', unit: '套' },
    { name: '寻车系统设备', unit: '套' },
    { name: '地库监控摄像机', unit: '点' },
    { name: '地库门禁设备', unit: '套' }
  ], measureBasis: '出入口数量/车位数量/点位数量/固定金额', unit: '按末级科目', tax: '13%' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '充电桩设备', group: '充电桩设备本体', code: '03.09.01', details: [
    { name: '慢充设备本体', unit: '台', measureBasis: '慢充数量' },
    { name: '快充设备本体', unit: '台', measureBasis: '快充数量' },
    { name: '充电控制箱', unit: '台', measureBasis: '控制箱数量' },
    { name: '计量表箱', unit: '台', measureBasis: '计量表箱数量' },
    { name: '充电后台管理设备', unit: '套', measureBasis: '系统数量' },
    { name: '充电桩通信网关', unit: '套', measureBasis: '系统数量' },
    { name: '其他充电设备', unit: '项', measureBasis: '固定金额' }
  ], measureBasis: '快充数量/慢充数量/车位数量/固定金额', unit: '按末级科目', tax: '13%', remark: '充电桩设备本体进设备明细表；管线、桥架、配电接入和安装调试进安装明细表。' }
];

const civilDefenseEquipmentGroups: GroupInput[] = [
  { scope: '人防', section: '人防设备', group: '人防专用设备', code: '03.08.40', details: [
    { name: '人防风机设备', unit: '台' },
    { name: '滤毒设备', unit: '套' },
    { name: '防爆波阀门', unit: '个' },
    { name: '人防给排水设备', unit: '套' },
    { name: '人防电气控制箱', unit: '台' },
    { name: '三防控制箱', unit: '台' },
    { name: '人防通信报警设备', unit: '套' },
    { name: '人防通风方式信号设备', unit: '套' },
    { name: '人防设备调试', unit: '项' }
  ], measureBasis: '人防面积/人防设备清单/固定金额', unit: '按末级科目', tax: '13%' }
];

function prefixedProductEquipmentGroups(scope: string, prefix: string): GroupInput[] {
  return productElevatorGroups.map((item) => ({ ...item, scope, details: item.details.map((detail) => prefixDetail(detail, prefix)) }));
}

export function buildV60EquipmentRows(offset: number): CostDictionaryPresetRow[] {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  function addGroup(input: GroupInput) {
    for (const detailInput of input.details) {
      const detail = normalizeDetail(detailInput);
      const sequenceKey = `${input.scope}__${input.code}__${input.section}`;
      const next = (sequence.get(sequenceKey) || 0) + 1;
      sequence.set(sequenceKey, next);
      result.push({
        rowIndex: rowIndex++,
        costCode: `${input.code}.${String(next).padStart(2, '0')}`,
        parentCode: input.code,
        subjectLevel: '4',
        firstSubject: '建安工程费',
        secondSubject: input.section,
        thirdSubject: input.group,
        detailSubject: detail.name,
        subjectDefinition: `${detail.name}，来源于V60设备明细表B列明细项目，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '设备数量/固定金额',
        unit: detail.unit || input.unit || '台/套',
        defaultTaxRate: input.tax || '13%',
        applicableProductType: input.scope,
        remark: detail.remark || input.remark || 'V60定稿设备明细科目。',
        costAttributionMethod: input.scope,
        ...common
      });
    }
  }

  [
    ...overallEquipmentGroups,
    ...prefixedProductEquipmentGroups('高层住宅', '高层'),
    ...prefixedProductEquipmentGroups('洋房', '洋房'),
    ...commercialEquipmentGroups,
    ...basementEquipmentGroups,
    ...civilDefenseEquipmentGroups
  ].forEach(addGroup);

  return result;
}

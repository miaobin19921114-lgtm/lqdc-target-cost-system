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
  sourceTable: '安装明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按业态、建筑面积、点位、管线长度或设备数量快速估算',
  conceptMethod: '按方案指标、系统标准和地区经验参数估算',
  schemeMethod: '按业态、专业系统、工程部位和含量系数拆分测算',
  drawingMethod: '按施工图系统工程量、点位和合同边界复核',
  tenderMethod: '按招采清单、中标价和合同价复核',
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

const productInstallCommon: GroupInput[] = [
  { scope: '', section: '给排水工程', group: '给排水安装工程', code: '03.05.01', details: [
    { name: '室内给水管道', unit: 'm' },
    { name: '室内排水管道', unit: 'm' },
    { name: '雨水系统', unit: 'm' },
    { name: '冷凝水系统', unit: 'm' },
    { name: '水表及阀门', unit: '套' },
    { name: '卫生器具给排水预留', unit: '点' },
    { name: '管道保温', unit: 'm' },
    { name: '套管及预留预埋', unit: '个' },
    { name: '系统试压冲洗', unit: '项' }
  ], measureBasis: '建筑面积/管线长度/点位数量/固定金额', unit: '按末级科目' },
  { scope: '', section: '强电工程', group: '强电安装工程', code: '03.06.01', details: [
    { name: '低压配电干线', unit: 'm' },
    { name: '户内强电管线', unit: '㎡' },
    { name: '公区照明及动力', unit: '㎡' },
    { name: '配电箱柜', unit: '台' },
    { name: '电线电缆', unit: 'm' },
    { name: '电缆桥架', unit: 'm' },
    { name: '防雷接地', unit: '㎡' },
    { name: '电气预留预埋', unit: '㎡' },
    { name: '系统调试', unit: '项' }
  ], measureBasis: '建筑面积/管线长度/箱柜数量/固定金额', unit: '按末级科目' },
  { scope: '', section: '弱电工程', group: '弱电及智能化预埋工程', code: '03.06.02', details: [
    { name: '可视对讲预埋', unit: '户' },
    { name: '网络通信预埋', unit: '户' },
    { name: '有线电视预埋', unit: '户' },
    { name: '安防监控预埋', unit: '点' },
    { name: '门禁预埋', unit: '点' },
    { name: '弱电桥架', unit: 'm' },
    { name: '弱电管线', unit: 'm' },
    { name: '弱电机房至户内管线', unit: 'm' },
    { name: '系统调试', unit: '项' }
  ], measureBasis: '户数/点位数量/管线长度/固定金额', unit: '按末级科目' },
  { scope: '', section: '消防工程', group: '消防安装工程', code: '03.07.01', details: [
    { name: '消火栓系统', unit: '㎡' },
    { name: '喷淋系统', unit: '㎡' },
    { name: '火灾报警系统', unit: '点' },
    { name: '消防广播系统', unit: '点' },
    { name: '消防联动控制', unit: '项' },
    { name: '防火封堵', unit: '项' },
    { name: '消防电源监控', unit: '点' },
    { name: '消防系统调试', unit: '项' }
  ], measureBasis: '建筑面积/点位数量/固定金额', unit: '按末级科目' },
  { scope: '', section: '暖通工程', group: '暖通及通风安装工程', code: '03.07.02', details: [
    { name: '通风系统', unit: '㎡' },
    { name: '防排烟系统', unit: '㎡' },
    { name: '风管及风口', unit: '㎡' },
    { name: '风阀及支吊架', unit: '项' },
    { name: '风机安装配套', unit: '台' },
    { name: '空调冷媒及冷凝水预留', unit: 'm' },
    { name: '暖通系统调试', unit: '项' }
  ], measureBasis: '建筑面积/风管面积/设备数量/固定金额', unit: '按末级科目' }
];

const basementInstallGroups: GroupInput[] = [
  { scope: '地下车位 / 非主楼纯地下车库', section: '给排水工程', group: '地库给排水安装工程', code: '03.05.01', details: [
    { name: '地库给水管道', unit: 'm' }, { name: '地库排水管道', unit: 'm' }, { name: '压力排水系统', unit: '套' }, { name: '集水坑排水接入', unit: '个' }, { name: '排水泵管线接驳', unit: '套' }, { name: '阀门仪表', unit: '套' }, { name: '管道保温', unit: 'm' }, { name: '系统试压冲洗', unit: '项' }
  ], measureBasis: '地库面积/管线长度/设备数量/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '强电工程', group: '地库强电安装工程', code: '03.06.01', details: [
    { name: '地库照明及动力', unit: '㎡' }, { name: '地库配电箱柜', unit: '台' }, { name: '电线电缆', unit: 'm' }, { name: '电缆桥架', unit: 'm' }, { name: '设备房配电接入', unit: '项' }, { name: '防雷接地', unit: '㎡' }, { name: '电气预留预埋', unit: '㎡' }, { name: '系统调试', unit: '项' }
  ], measureBasis: '地库面积/管线长度/箱柜数量/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '弱电工程', group: '地库弱电及智能化预埋工程', code: '03.06.02', details: [
    { name: '地库监控预埋', unit: '点' }, { name: '车库门禁预埋', unit: '点' }, { name: '停车场系统预埋', unit: '点' }, { name: '弱电桥架', unit: 'm' }, { name: '弱电管线', unit: 'm' }, { name: '机房至地库管线', unit: 'm' }, { name: '系统调试', unit: '项' }
  ], measureBasis: '地库面积/点位数量/管线长度/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '消防工程', group: '地库消防安装工程', code: '03.07.01', details: [
    { name: '地库消火栓系统', unit: '㎡' }, { name: '地库喷淋系统', unit: '㎡' }, { name: '地库火灾报警系统', unit: '点' }, { name: '消防广播系统', unit: '点' }, { name: '消防联动控制', unit: '项' }, { name: '防火封堵', unit: '项' }, { name: '消防系统调试', unit: '项' }
  ], measureBasis: '地库面积/点位数量/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '暖通工程', group: '地库暖通及通风安装工程', code: '03.07.02', details: [
    { name: '地库通风系统', unit: '㎡' }, { name: '地库防排烟系统', unit: '㎡' }, { name: '风管及风口', unit: '㎡' }, { name: '风阀及支吊架', unit: '项' }, { name: '排烟风机安装配套', unit: '台' }, { name: '暖通系统调试', unit: '项' }
  ], measureBasis: '地库面积/风管面积/设备数量/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '充电桩预留及配套', group: '充电桩安装及预留工程', code: '03.07.03', details: [
    { name: '充电桩管线预埋', unit: 'm', measureBasis: '充电桩数量/管线长度/固定金额' },
    { name: '充电桩电缆桥架', unit: 'm', measureBasis: '充电桩数量/桥架长度/固定金额' },
    { name: '充电桩配电箱柜', unit: '台', measureBasis: '配电箱柜数量/固定金额' },
    { name: '充电桩配电接入', unit: '项', measureBasis: '充电桩数量/固定金额' },
    { name: '计量表箱预留', unit: '台', measureBasis: '计量表箱数量/固定金额' },
    { name: '桥架支吊架及防火封堵', unit: '项', measureBasis: '桥架长度/固定金额' },
    { name: '充电桩安装调试', unit: '台', measureBasis: '充电桩数量' }
  ], measureBasis: '充电桩数量/管线长度/固定金额', unit: '按末级科目', remark: '充电桩设备本体进设备明细表，安装明细只计管线、桥架、配电接入和安装调试。' }
];

const civilDefenseInstallGroups: GroupInput[] = [
  { scope: '人防', section: '人防安装配合', group: '人防安装配合工程', code: '03.07.04', details: [
    { name: '人防给排水预留预埋', unit: '㎡' },
    { name: '人防电气预留预埋', unit: '㎡' },
    { name: '人防通风预留预埋', unit: '㎡' },
    { name: '人防消防安装配合', unit: '㎡' },
    { name: '人防套管及封堵配合', unit: '项' },
    { name: '人防安装系统调试配合', unit: '项' }
  ], measureBasis: '人防面积/固定金额', unit: '按末级科目' }
];

function prefixedProductInstallGroups(scope: string, prefix: string): GroupInput[] {
  return productInstallCommon.map((item) => ({ ...item, scope, details: item.details.map((detail) => prefixDetail(detail, prefix)) }));
}

function commercialInstallGroups(): GroupInput[] {
  return productInstallCommon.map((item) => ({ ...item, scope: '商业', details: item.details.map((detail) => prefixDetail(detail, '商业')) }));
}

export function buildV60InstallationRows(offset: number): CostDictionaryPresetRow[] {
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
        subjectDefinition: `${detail.name}，来源于V60安装明细表B列明细项目，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '建筑面积/固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: input.tax || '9%',
        applicableProductType: input.scope,
        remark: detail.remark || input.remark || 'V60定稿安装明细科目。',
        costAttributionMethod: input.scope,
        ...common
      });
    }
  }

  [
    ...prefixedProductInstallGroups('高层住宅', '高层'),
    ...prefixedProductInstallGroups('洋房', '洋房'),
    ...commercialInstallGroups(),
    ...basementInstallGroups,
    ...civilDefenseInstallGroups
  ].forEach(addGroup);

  return result;
}

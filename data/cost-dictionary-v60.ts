import { getV57CostDictionaryRows, type CostDictionaryPresetRow } from './cost-dictionary-v57';

export const V60_COST_DICTIONARY_VERSION = 'V60_TARGET_COST_DETAIL_2026_06_19';

type GroupInput = {
  scope: string;
  group: string;
  code: string;
  targetName?: string;
  details: string[];
  measureBasis?: string;
  unit?: string;
  tax?: string;
  remark?: string;
};

const common = {
  sourceTable: '土建明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按指标、单方、含量或固定金额快速估算',
  conceptMethod: '按方案指标和地区经验参数估算',
  schemeMethod: '按产品、面积、部位和含量系数拆分测算',
  drawingMethod: '按施工图工程量、清单和合同边界复核',
  tenderMethod: '按招采清单、中标价和合同价复核',
  dynamicMethod: '按动态成本、签证变更和结算更新',
  specialAdjustment: '特殊事项可人工调整',
  targetAllocationMethod: '按受益对象直接归集；不能单独归集时按建筑面积/可售面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本',
  preTaxDeduction: '是',
  taxRemark: '按项目测算口径归集，最终以财税审核为准'
};

const overallGroups: GroupInput[] = [
  { scope: '项目整体共摊土建', group: '土石方及基坑工程', code: '03.01.01', details: ['场地清表', '土方开挖', '土方回填', '土方外运', '弃土消纳费', '软弱土挖除', '砂石换填', '级配砂石换填', '灰土换填', '换填压实/碾压', '换填检测', '基坑支护', '基坑降排水'], measureBasis: '基底面积/用地面积/固定金额', unit: '㎡/m³/项', remark: 'V60土建明细：土石方、换填、基坑支护、降排水分开测算。' },
  { scope: '项目整体共摊土建', group: '水井、水表间及水池防水工程', code: '03.05.99', details: ['水井及水表间防水', '水表井防水', '消防水池防水', '生活水池防水', '水泵房集水坑防水', '穿墙套管防水封堵'], measureBasis: '防水面积/固定金额', unit: '㎡/项', remark: '电房不默认做防水；水井、水表井、消防水池单独列项。' },
  { scope: '项目整体共摊土建', group: '设备房粗装及防潮处理', code: '03.13.99', details: ['配电房防潮处理', '配电房门槛/挡水坎'], measureBasis: '设备房面积/固定金额', unit: '㎡/项', remark: '设备房特殊土建处理单独列项，避免漏计。' }
];

const residentialCommon = [
  { group: '桩基及基础工程', code: '03.02.01', details: ['试桩工程', '工程桩', '截桩头', '桩基检测', '基础垫层', '承台/筏板基础'], measureBasis: '基底面积', unit: '按明细单位', remark: '桩基按基底面积×含量系数测算，检测与截桩头单独列项。' },
  { group: '地上主体结构工程', code: '03.03.01', details: ['地上主体结构', '砌体工程', '二次结构', '结构加强费'], measureBasis: '地上建筑面积', unit: '㎡/m³/t', remark: '主体、砌体、二次结构分开，便于方案深化。' },
  { group: '地上粗装工程', code: '03.04.01', details: ['内墙抹灰', '天棚腻子/粗装', '楼地面找平', '公区粗装', '楼梯间粗装'], measureBasis: '地上建筑面积/公区面积', unit: '㎡' },
  { group: '屋面、防水及保温工程', code: '03.05.01', details: ['屋面工程', '屋面防水', '屋面保温', '卫生间防水', '厨房防水', '阳台防水', '外墙保温'], measureBasis: '屋面/防水/外墙面积', unit: '㎡', remark: '厨房防水单独列项，避免漏计。' },
  { group: '烟道及排气道工程', code: '03.06.01', details: ['厨房烟道', '卫生间排气道', '成品烟道安装', '屋面风帽', '防火止回阀', '烟道洞口封堵修补'], measureBasis: '户数/楼栋数量', unit: '户/套/项' },
  { group: '门窗、百叶、栏杆工程', code: '03.07.01', details: ['铝合金窗', '铝合金门', '空调百叶', '设备百叶', '百叶栏杆/格栅栏杆', '阳台栏杆', '阳台栏板', '护窗栏杆', '楼梯栏杆/扶手', '连廊栏杆'], measureBasis: '门窗面积/栏杆长度', unit: '㎡/m' },
  { group: '门类及防火门工程', code: '03.08.01', details: ['住宅入户门', '单元门/大堂门', '管井门', '楼梯间防火门', '前室防火门', '设备房防火门'], measureBasis: '门樘数/固定金额', unit: '樘/项' },
  { group: '主楼地下室结构工程', code: '03.09.01', details: ['主楼地下室结构', '主楼地下室结构加强费', '主楼地下室基础', '主楼地下室设备用房结构'], measureBasis: '主楼地下室建筑面积/基底面积', unit: '㎡/m³' },
  { group: '主楼地下室防水工程', code: '03.10.01', details: ['主楼地下室底板防水', '主楼地下室外墙防水', '主楼地下室顶板防水', '后浇带防水加强', '施工缝/变形缝防水', '集水坑/电梯基坑防水', '穿墙套管防水封堵'], measureBasis: '地下室防水面积', unit: '㎡/m' },
  { group: '主楼地下室顶板工程', code: '03.11.01', details: ['顶板保护层', '顶板排水板', '顶板滤水层/土工布', '顶板覆土', '消防车道顶板加强'], measureBasis: '地下室顶板面积', unit: '㎡/m³' },
  { group: '主楼地下室地坪工程', code: '03.12.01', details: ['地坪基层', '地库找平层', '耐磨地坪', '环氧/固化地坪', '设备房地坪'], measureBasis: '地下室地坪面积', unit: '㎡' },
  { group: '主楼地下室粗装工程', code: '03.13.01', details: ['地下室砌体', '地下室内墙抹灰', '地下室天棚腻子/涂料', '地下室墙面防霉涂料', '设备房粗装', '楼梯间粗装'], measureBasis: '地下室建筑面积/设备房面积', unit: '㎡' },
  { group: '主楼地下室排水沟及集水坑', code: '03.14.01', details: ['排水沟', '集水坑土建', '排水沟盖板', '电梯基坑排水处理'], measureBasis: '排水沟长度/集水坑数量', unit: 'm/个' },
  { group: '主楼地下室门类及防火分隔', code: '03.15.01', details: ['地下室防火门', '设备房防火门', '管井防火门', '防火窗'], measureBasis: '门窗樘数/面积', unit: '樘/㎡' }
];

const commercialGroups: GroupInput[] = [
  { scope: '商业', group: '商业桩基及基础工程', code: '03.02.01', details: ['商业试桩工程', '商业工程桩', '商业基础垫层', '商业承台/筏板基础'], measureBasis: '商业基底面积', unit: '按明细单位' },
  { scope: '商业', group: '商业主体结构工程', code: '03.03.01', details: ['商业主体结构', '商业砌体工程', '商业二次结构', '商业结构加强费'], measureBasis: '商业地上建筑面积', unit: '㎡/m³/t' },
  { scope: '商业', group: '商业粗装工程', code: '03.04.01', details: ['商业内墙抹灰', '商业天棚粗装', '商业楼地面找平', '商业公区粗装'], measureBasis: '商业建筑面积', unit: '㎡' },
  { scope: '商业', group: '商业屋面、防水及保温工程', code: '03.05.01', details: ['商业屋面工程', '商业屋面防水', '商业卫生间防水', '商业外墙保温'], measureBasis: '商业屋面/防水面积', unit: '㎡' },
  { scope: '商业', group: '商业门窗栏杆工程', code: '03.07.01', details: ['商业门窗', '商业玻璃幕墙', '商业百叶', '商业栏杆'], measureBasis: '门窗/幕墙面积/栏杆长度', unit: '㎡/m' }
];

const basementGroups: GroupInput[] = [
  { scope: '地下车位 / 非主楼纯地下车库', group: '地下车库结构工程', code: '03.03.01', details: ['地下车库结构', '地下车库结构加强费', '坡道结构', '设备房结构'], measureBasis: '非主楼地下室面积', unit: '㎡/m³' },
  { scope: '地下车位 / 非主楼纯地下车库', group: '地下室防水工程', code: '03.04.01', details: ['地下室底板防水', '地下室外墙防水', '地下室顶板防水', '后浇带防水加强', '施工缝/变形缝防水'], measureBasis: '地下室防水面积', unit: '㎡/m' },
  { scope: '地下车位 / 非主楼纯地下车库', group: '地下室顶板工程', code: '03.05.01', details: ['顶板保护层', '顶板排水板', '顶板滤水层/土工布', '顶板覆土', '消防车道顶板加强'], measureBasis: '地下室顶板面积', unit: '㎡/m³' },
  { scope: '地下车位 / 非主楼纯地下车库', group: '地下室地坪工程', code: '03.06.01', details: ['地坪基层', '耐磨地坪', '环氧/固化地坪', '车位地坪', '设备房地坪'], measureBasis: '地下室地坪面积', unit: '㎡' },
  { scope: '地下车位 / 非主楼纯地下车库', group: '地下车库交通安全及标识标牌工程', code: '03.12.01', details: ['导向箭头及文字标识', '车位编号', '车挡/轮挡', '墙柱护角', '防撞柱', '减速带', '广角镜', '限高杆/限高架', '地库分区导视牌', '地库墙柱面导视喷涂'], measureBasis: '车位数量/地库面积', unit: '个/㎡/项' },
  { scope: '地下车位 / 非主楼纯地下车库', group: '地下室防火门窗及防火分隔工程', code: '03.11.01', details: ['地下室防火门', '设备房防火门', '管井防火门', '防火窗', '防火卷帘', '防火卷帘电机及控制', '挡烟垂壁'], measureBasis: '樘数/面积/固定金额', unit: '樘/㎡/项' }
];

const civilDefenseGroups: GroupInput[] = [
  { scope: '人防', group: '人防土建工程', code: '03.03.01', details: ['人防结构增加费', '人防墙体及门框墙', '人防口部土建', '人防验收配合'], measureBasis: '人防面积', unit: '㎡/项' },
  { scope: '人防', group: '人防防水及粗装工程', code: '03.04.01', details: ['人防外墙防水', '人防顶板防水', '人防区地坪', '人防区天棚粗装'], measureBasis: '人防面积/防水面积', unit: '㎡' },
  { scope: '人防', group: '人防门及土建配合', code: '03.05.01', details: ['人防门门框墙', '人防封堵板土建配合'], measureBasis: '人防门数量/固定金额', unit: '樘/项' }
];

const supportGroups: GroupInput[] = [
  { scope: '物业/社区/配套用房', group: '配套用房桩基及基础工程', code: '03.02.01', details: ['配套用房基础垫层'], measureBasis: '配套用房基底面积', unit: '㎡' },
  { scope: '物业/社区/配套用房', group: '配套用房主体结构工程', code: '03.03.01', details: ['配套用房主体结构', '配套用房砌体工程', '配套用房二次结构'], measureBasis: '配套用房建筑面积', unit: '㎡/m³' },
  { scope: '物业/社区/配套用房', group: '配套用房粗装工程', code: '03.04.01', details: ['配套用房内墙抹灰', '配套用房天棚粗装', '配套用房楼地面找平'], measureBasis: '配套用房建筑面积', unit: '㎡' },
  { scope: '物业/社区/配套用房', group: '配套用房屋面、防水及保温工程', code: '03.05.01', details: ['配套用房屋面工程', '配套用房屋面防水', '配套用房卫生间防水', '配套用房外墙保温'], measureBasis: '配套用房防水/外墙面积', unit: '㎡' },
  { scope: '物业/社区/配套用房', group: '配套用房门窗栏杆工程', code: '03.07.01', details: ['配套用房门窗', '配套用房防火门', '配套用房百叶', '配套用房栏杆'], measureBasis: '门窗面积/栏杆长度', unit: '㎡/m' }
];

function prefixedGroups(scope: string, prefix: string): GroupInput[] {
  const unprefixed = new Set(['内墙抹灰', '天棚腻子/粗装', '楼地面找平', '公区粗装', '楼梯间粗装', '屋面工程', '屋面防水', '屋面保温', '卫生间防水', '厨房防水', '阳台防水', '外墙保温', '厨房烟道', '卫生间排气道', '成品烟道安装', '屋面风帽', '防火止回阀', '烟道洞口封堵修补', '铝合金窗', '铝合金门', '空调百叶', '设备百叶', '百叶栏杆/格栅栏杆', '阳台栏杆', '阳台栏板', '护窗栏杆', '楼梯栏杆/扶手', '连廊栏杆', '住宅入户门', '单元门/大堂门', '管井门', '楼梯间防火门', '前室防火门', '设备房防火门', '主楼地下室底板防水', '主楼地下室外墙防水', '主楼地下室顶板防水', '后浇带防水加强', '施工缝/变形缝防水', '集水坑/电梯基坑防水', '穿墙套管防水封堵', '顶板保护层', '顶板排水板', '顶板滤水层/土工布', '顶板覆土', '消防车道顶板加强', '地坪基层', '地库找平层', '耐磨地坪', '环氧/固化地坪', '设备房地坪', '地下室砌体', '地下室内墙抹灰', '地下室天棚腻子/涂料', '地下室墙面防霉涂料', '设备房粗装', '楼梯间粗装', '排水沟', '集水坑土建', '排水沟盖板', '电梯基坑排水处理', '地下室防火门', '管井防火门', '防火窗']);
  return residentialCommon.map((item) => ({
    scope,
    group: item.group,
    code: item.code,
    details: item.details.map((name) => name.startsWith(prefix) || unprefixed.has(name) ? name : `${prefix}${name}`),
    measureBasis: item.measureBasis,
    unit: item.unit,
    remark: item.remark
  }));
}

function buildV60BuildingRows(offset: number) {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  function addGroup(input: GroupInput) {
    for (const detail of input.details) {
      const next = (sequence.get(input.code) || 0) + 1;
      sequence.set(input.code, next);
      result.push({
        rowIndex: rowIndex++,
        costCode: `${input.code}.${String(next).padStart(2, '0')}`,
        parentCode: input.code,
        subjectLevel: '4',
        firstSubject: '建安工程费',
        secondSubject: input.group,
        thirdSubject: input.targetName || input.group,
        detailSubject: detail,
        subjectDefinition: `${detail}，来源于V60土建明细表，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: input.measureBasis || '建筑面积/固定金额',
        unit: input.unit || '㎡/项',
        defaultTaxRate: input.tax || '9%',
        applicableProductType: input.scope,
        remark: input.remark || 'V60定稿土建明细科目。',
        costAttributionMethod: input.scope,
        ...common
      });
    }
  }

  [...overallGroups, ...prefixedGroups('高层住宅', '高层'), ...prefixedGroups('洋房', '洋房'), ...commercialGroups, ...basementGroups, ...civilDefenseGroups, ...supportGroups].forEach(addGroup);
  return result;
}

export function getV60CostDictionaryRows(): CostDictionaryPresetRow[] {
  const baseRows = getV57CostDictionaryRows().filter((row) => row.sourceTable !== '土建明细表');
  const offset = Math.max(0, ...baseRows.map((row) => row.rowIndex || 0)) + 1;
  return [...baseRows, ...buildV60BuildingRows(offset)];
}

import { getV57CostDictionaryRows, type CostDictionaryPresetRow } from './cost-dictionary-v57';

export const V60_COST_DICTIONARY_VERSION = 'V60_TARGET_COST_DETAIL_2026_06_19_SECTION_SPLIT';

type DetailInput = string | { name: string; unit?: string; measureBasis?: string; remark?: string };
type GroupInput = {
  scope: string;
  section?: string;
  group: string;
  code: string;
  targetName?: string;
  details: DetailInput[];
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

const pileDetails: DetailInput[] = [
  { name: '试桩工程', unit: '根' },
  { name: '工程桩', unit: 'm' },
  { name: '截桩头', unit: '个' },
  { name: '桩基检测', unit: '点' },
  { name: '基础垫层', unit: '㎡' },
  { name: '承台/筏板基础', unit: 'm³' }
];

const deviceRoomDetails: DetailInput[] = [
  { name: '设备房结构', unit: '㎡', measureBasis: '设备房面积/固定金额' },
  { name: '设备房粗装', unit: '㎡', measureBasis: '设备房面积/固定金额' },
  { name: '设备房地坪', unit: '㎡', measureBasis: '设备房面积/固定金额' },
  { name: '设备房防潮处理', unit: '㎡', measureBasis: '设备房面积/固定金额' },
  { name: '设备房防火门', unit: '樘', measureBasis: '门樘数/固定金额' },
  { name: '配电房门槛/挡水坎', unit: 'm', measureBasis: '挡水坎长度/固定金额' },
  { name: '水井及水表间防水', unit: '㎡', measureBasis: '防水面积/固定金额' },
  { name: '水表井防水', unit: '㎡', measureBasis: '防水面积/固定金额' },
  { name: '消防水池防水', unit: '㎡', measureBasis: '防水面积/固定金额' },
  { name: '生活水池防水', unit: '㎡', measureBasis: '防水面积/固定金额' },
  { name: '水泵房集水坑防水', unit: '㎡', measureBasis: '防水面积/固定金额' },
  { name: '穿墙套管防水封堵', unit: '个', measureBasis: '套管数量/固定金额' }
];

const overallGroups: GroupInput[] = [
  { scope: '项目整体共摊土建', section: '土石方及基坑工程', group: '土石方及基坑工程', code: '03.01.01', details: [
    { name: '场地清表', unit: '㎡' }, { name: '土方开挖', unit: 'm³' }, { name: '土方回填', unit: 'm³' }, { name: '土方外运', unit: 'm³' }, { name: '弃土消纳费', unit: 'm³' },
    { name: '软弱土挖除', unit: 'm³' }, { name: '砂石换填', unit: 'm³' }, { name: '级配砂石换填', unit: 'm³' }, { name: '灰土换填', unit: 'm³' }, { name: '换填压实/碾压', unit: '㎡' }, { name: '换填检测', unit: '点' },
    { name: '基坑支护', unit: '㎡' }, { name: '基坑降排水', unit: '项' }
  ], measureBasis: '基底面积/用地面积/固定金额', unit: '按末级科目', remark: 'V60土建明细：项目整体共摊仅保留场地、土方、基坑类，设备房水井水池按位置归属。' },
  { scope: '项目整体共摊土建', section: '三通一平及临设土建', group: '三通一平及临设土建', code: '03.01.02', details: [
    { name: '场地平整', unit: '㎡' }, { name: '临时道路', unit: '㎡' }, { name: '临时硬化', unit: '㎡' }, { name: '临时排水沟', unit: 'm' }, { name: '临设基础', unit: '㎡' }, { name: '临时围挡基础', unit: 'm' }
  ], measureBasis: '用地面积/临时设施面积/周界长度/固定金额', unit: '按末级科目', remark: '三通一平及临设土建按全项目场地口径测算。' }
];

const residentialCommon: GroupInput[] = [
  { scope: '', section: '基础工程', group: '桩基及基础工程', code: '03.02.01', details: pileDetails, measureBasis: '基底面积/桩基面积/固定金额', unit: '按末级科目', remark: '桩基按基底面积×含量系数测算，检测与截桩头单独列项。' },
  { scope: '', section: '地上工程', group: '地上主体结构工程', code: '03.03.01', details: [{ name: '地上主体结构', unit: '㎡' }, { name: '砌体工程', unit: 'm³' }, { name: '二次结构', unit: '㎡' }, { name: '结构加强费', unit: '㎡' }], measureBasis: '地上建筑面积/建筑面积/固定金额', unit: '按末级科目', remark: '主体、砌体、二次结构分开，便于方案深化。' },
  { scope: '', section: '地上工程', group: '地上粗装工程', code: '03.04.01', details: ['内墙抹灰', '天棚腻子/粗装', '楼地面找平', '公区粗装', '楼梯间粗装'], measureBasis: '地上建筑面积/公区面积/固定金额', unit: '㎡' },
  { scope: '', section: '地上工程', group: '屋面、防水及保温工程', code: '03.05.01', details: ['屋面工程', '屋面防水', '屋面保温', '卫生间防水', '厨房防水', '阳台防水', '外墙保温'], measureBasis: '屋面面积/防水面积/外墙面积/固定金额', unit: '㎡', remark: '厨房防水单独列项，避免漏计。' },
  { scope: '', section: '地上工程', group: '烟道及排气道工程', code: '03.06.01', details: [{ name: '厨房烟道', unit: '户' }, { name: '卫生间排气道', unit: '户' }, { name: '成品烟道安装', unit: 'm' }, { name: '屋面风帽', unit: '个' }, { name: '防火止回阀', unit: '个' }, { name: '烟道洞口封堵修补', unit: '个' }], measureBasis: '户数/楼栋数量/固定金额', unit: '按末级科目' },
  { scope: '', section: '地上工程', group: '门窗、百叶、栏杆工程', code: '03.07.01', details: [{ name: '铝合金窗', unit: '㎡' }, { name: '铝合金门', unit: '㎡' }, { name: '空调百叶', unit: '㎡' }, { name: '设备百叶', unit: '㎡' }, { name: '百叶栏杆/格栅栏杆', unit: 'm' }, { name: '阳台栏杆', unit: 'm' }, { name: '阳台栏板', unit: 'm' }, { name: '护窗栏杆', unit: 'm' }, { name: '楼梯栏杆/扶手', unit: 'm' }, { name: '连廊栏杆', unit: 'm' }], measureBasis: '门窗面积/栏杆长度/固定金额', unit: '按末级科目' },
  { scope: '', section: '地上工程', group: '门类及防火门工程', code: '03.08.01', details: ['住宅入户门', '单元门/大堂门', '管井门', '楼梯间防火门', '前室防火门', '设备房防火门'].map((name) => ({ name, unit: '樘' })), measureBasis: '门樘数/固定金额', unit: '樘' },
  { scope: '', section: '主楼地下室工程', group: '主楼地下室结构工程', code: '03.09.01', details: [{ name: '主楼地下室结构', unit: '㎡' }, { name: '主楼地下室结构加强费', unit: '㎡' }, { name: '主楼地下室基础', unit: 'm³' }, { name: '主楼地下室设备用房结构', unit: '㎡' }], measureBasis: '主楼地下室建筑面积/基底面积/固定金额', unit: '按末级科目' },
  { scope: '', section: '主楼地下室工程', group: '主楼地下室防水工程', code: '03.10.01', details: ['主楼地下室底板防水', '主楼地下室外墙防水', '主楼地下室顶板防水', '后浇带防水加强', '施工缝/变形缝防水', '集水坑/电梯基坑防水', '穿墙套管防水封堵'], measureBasis: '地下室防水面积/固定金额', unit: '㎡' },
  { scope: '', section: '主楼地下室工程', group: '主楼地下室顶板工程', code: '03.11.01', details: [{ name: '顶板保护层', unit: '㎡' }, { name: '顶板排水板', unit: '㎡' }, { name: '顶板滤水层/土工布', unit: '㎡' }, { name: '顶板覆土', unit: 'm³' }, { name: '消防车道顶板加强', unit: '㎡' }], measureBasis: '地下室顶板面积/固定金额', unit: '按末级科目' },
  { scope: '', section: '主楼地下室工程', group: '主楼地下室地坪工程', code: '03.12.01', details: ['地坪基层', '地库找平层', '耐磨地坪', '环氧/固化地坪', '设备房地坪'], measureBasis: '地下室地坪面积/固定金额', unit: '㎡' },
  { scope: '', section: '主楼地下室工程', group: '主楼地下室粗装工程', code: '03.13.01', details: ['地下室砌体', '地下室内墙抹灰', '地下室天棚腻子/涂料', '地下室墙面防霉涂料', '设备房粗装', '楼梯间粗装'], measureBasis: '地下室建筑面积/设备房面积/固定金额', unit: '㎡' },
  { scope: '', section: '主楼地下室工程', group: '主楼地下室设备房水井水池工程', code: '03.13.02', details: deviceRoomDetails, measureBasis: '设备房面积/防水面积/固定金额', unit: '按末级科目', remark: '位于主楼地下室内的设备房、水井、水池、泵房按所在业态主楼地下室归集。' },
  { scope: '', section: '主楼地下室工程', group: '主楼地下室排水沟及集水坑', code: '03.14.01', details: [{ name: '排水沟', unit: 'm' }, { name: '集水坑土建', unit: '个' }, { name: '排水沟盖板', unit: 'm' }, { name: '电梯基坑排水处理', unit: '个' }], measureBasis: '排水沟长度/集水坑数量/固定金额', unit: '按末级科目' },
  { scope: '', section: '主楼地下室工程', group: '主楼地下室门类及防火分隔', code: '03.15.01', details: [{ name: '地下室防火门', unit: '樘' }, { name: '设备房防火门', unit: '樘' }, { name: '管井防火门', unit: '樘' }, { name: '防火窗', unit: '㎡' }], measureBasis: '门窗樘数/面积/固定金额', unit: '按末级科目' }
];

const commercialGroups: GroupInput[] = [
  { scope: '商业', section: '基础工程', group: '商业桩基及基础工程', code: '03.02.01', details: [{ name: '商业试桩工程', unit: '根' }, { name: '商业工程桩', unit: 'm' }, { name: '商业基础垫层', unit: '㎡' }, { name: '商业承台/筏板基础', unit: 'm³' }], measureBasis: '商业基底面积/固定金额', unit: '按末级科目' },
  { scope: '商业', section: '地上工程', group: '商业主体结构工程', code: '03.03.01', details: [{ name: '商业主体结构', unit: '㎡' }, { name: '商业砌体工程', unit: 'm³' }, { name: '商业二次结构', unit: '㎡' }, { name: '商业结构加强费', unit: '㎡' }], measureBasis: '商业地上建筑面积/固定金额', unit: '按末级科目' },
  { scope: '商业', section: '地上工程', group: '商业粗装工程', code: '03.04.01', details: ['商业内墙抹灰', '商业天棚粗装', '商业楼地面找平', '商业公区粗装'], measureBasis: '商业建筑面积/固定金额', unit: '㎡' },
  { scope: '商业', section: '地上工程', group: '商业屋面、防水及保温工程', code: '03.05.01', details: ['商业屋面工程', '商业屋面防水', '商业卫生间防水', '商业外墙保温'], measureBasis: '商业屋面/防水面积/固定金额', unit: '㎡' },
  { scope: '商业', section: '地上工程', group: '商业门窗及外立面工程', code: '03.07.01', details: [{ name: '商业门窗', unit: '㎡' }, { name: '商业玻璃幕墙', unit: '㎡' }, { name: '商业百叶', unit: '㎡' }, { name: '商业栏杆', unit: 'm' }], measureBasis: '门窗/幕墙面积/栏杆长度/固定金额', unit: '按末级科目' },
  { scope: '商业', section: '地上工程', group: '商业防火门窗及防火分隔工程', code: '03.08.01', details: [{ name: '商业防火门', unit: '樘' }, { name: '商业防火窗', unit: '㎡' }, { name: '商业防火卷帘', unit: '㎡' }, { name: '商业挡烟垂壁', unit: 'm' }], measureBasis: '门窗樘数/面积/固定金额', unit: '按末级科目' },
  { scope: '商业', section: '地上工程', group: '商业排烟及专项预留', code: '03.09.01', details: [{ name: '商业排烟井土建', unit: '项' }, { name: '商业烟道洞口封堵修补', unit: '个' }, { name: '商业专项结构预留预埋', unit: '项' }], measureBasis: '商业面积/固定金额', unit: '按末级科目' },
  { scope: '商业', section: '商业地下室工程', group: '商业地下室工程', code: '03.10.01', details: [
    { name: '商业地下结构', unit: '㎡' }, { name: '商业地下防水', unit: '㎡' }, { name: '商业地下粗装', unit: '㎡' }, ...deviceRoomDetails
  ], measureBasis: '商业地下建筑面积/设备房面积/防水面积/固定金额', unit: '按末级科目' }
];

const basementGroups: GroupInput[] = [
  { scope: '地下车位 / 非主楼纯地下车库', section: '基础工程', group: '纯地库桩基及基础工程', code: '03.02.01', details: [{ name: '纯地库试桩工程', unit: '根' }, { name: '纯地库工程桩', unit: 'm' }, { name: '纯地库基础垫层', unit: '㎡' }, { name: '纯地库承台/筏板基础', unit: 'm³' }, { name: '抗浮锚杆/抗浮桩', unit: 'm' }], measureBasis: '非主楼地下室基底面积/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '地下室结构工程', group: '地下车库结构工程', code: '03.03.01', details: ['地下车库结构', '地下车库结构加强费', '坡道结构', '设备房结构'], measureBasis: '非主楼地下室面积/固定金额', unit: '㎡' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '防水工程', group: '地下室防水工程', code: '03.04.01', details: ['地下室底板防水', '地下室外墙防水', '地下室顶板防水', '后浇带防水加强', '施工缝/变形缝防水'], measureBasis: '地下室防水面积/固定金额', unit: '㎡' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '顶板工程', group: '地下室顶板工程', code: '03.05.01', details: [{ name: '顶板保护层', unit: '㎡' }, { name: '顶板排水板', unit: '㎡' }, { name: '顶板滤水层/土工布', unit: '㎡' }, { name: '顶板覆土', unit: 'm³' }, { name: '消防车道顶板加强', unit: '㎡' }], measureBasis: '地下室顶板面积/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '地坪工程', group: '地下室地坪工程', code: '03.06.01', details: ['地坪基层', '耐磨地坪', '环氧/固化地坪', '车位地坪', '设备房地坪'], measureBasis: '地下室地坪面积/固定金额', unit: '㎡' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '坡道工程', group: '地下室坡道工程', code: '03.07.01', details: [{ name: '汽车坡道结构', unit: '㎡' }, { name: '坡道防滑面层', unit: '㎡' }, { name: '坡道截水沟', unit: 'm' }, { name: '坡道栏杆/扶手', unit: 'm' }], measureBasis: '坡道面积/坡道长度/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '粗装工程', group: '地下室砌体及粗装工程', code: '03.08.01', details: ['地下室砌体', '地下室内墙抹灰', '地下室天棚腻子/涂料', '地下室墙面防霉涂料', '设备房粗装'], measureBasis: '地下室面积/设备房面积/固定金额', unit: '㎡' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '排水沟及集水坑', group: '地下室排水沟及集水坑', code: '03.09.01', details: [{ name: '排水沟', unit: 'm' }, { name: '集水坑土建', unit: '个' }, { name: '排水沟盖板', unit: 'm' }, { name: '截水沟', unit: 'm' }], measureBasis: '排水沟长度/集水坑数量/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '出入口及附属构筑物', group: '地下室出入口及附属构筑物', code: '03.10.01', details: [{ name: '地下室出入口雨棚/结构', unit: '㎡' }, { name: '出入口挡墙', unit: 'm³' }, { name: '采光井/通风井土建', unit: '个' }, { name: '室外楼梯土建', unit: '㎡' }], measureBasis: '出入口数量/面积/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '防火门窗及防火分隔', group: '地下室防火门窗及防火分隔工程', code: '03.11.01', details: [{ name: '地下室防火门', unit: '樘' }, { name: '设备房防火门', unit: '樘' }, { name: '管井防火门', unit: '樘' }, { name: '防火窗', unit: '㎡' }, { name: '防火卷帘', unit: '㎡' }, { name: '防火卷帘电机及控制', unit: '套' }, { name: '挡烟垂壁', unit: 'm' }], measureBasis: '樘数/面积/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '交安标识工程', group: '地下车库交通安全及标识标牌工程', code: '03.12.01', details: [{ name: '导向箭头及文字标识', unit: '项' }, { name: '车位编号', unit: '个' }, { name: '车挡/轮挡', unit: '个' }, { name: '墙柱护角', unit: '个' }, { name: '防撞柱', unit: '个' }, { name: '减速带', unit: 'm' }, { name: '广角镜', unit: '个' }, { name: '限高杆/限高架', unit: '套' }, { name: '地库分区导视牌', unit: '块' }, { name: '地库墙柱面导视喷涂', unit: '㎡' }], measureBasis: '车位数量/地库面积/固定金额', unit: '按末级科目' },
  { scope: '地下车位 / 非主楼纯地下车库', section: '设备房水井水池工程', group: '地库设备房水井水池工程', code: '03.13.01', details: deviceRoomDetails, measureBasis: '设备房面积/防水面积/固定金额', unit: '按末级科目', remark: '设备房、水井、水池、泵房默认归非主楼地下室/地下车库；若明确位于主楼地下室则按所在业态归集。' }
];

const civilDefenseGroups: GroupInput[] = [
  { scope: '人防', section: '人防土建工程', group: '人防土建工程', code: '03.03.01', details: ['人防结构增加费', '人防墙体及门框墙', '人防口部土建', '人防验收配合'], measureBasis: '人防面积/固定金额', unit: '㎡' },
  { scope: '人防', section: '人防防水及粗装工程', group: '人防防水及粗装工程', code: '03.04.01', details: ['人防外墙防水', '人防顶板防水', '人防区地坪', '人防区天棚粗装'], measureBasis: '人防面积/防水面积/固定金额', unit: '㎡' },
  { scope: '人防', section: '人防门及土建配合', group: '人防门及土建配合', code: '03.05.01', details: [{ name: '人防门门框墙', unit: '樘' }, { name: '人防封堵板土建配合', unit: '项' }], measureBasis: '人防门数量/固定金额', unit: '按末级科目' }
];

const supportGroups: GroupInput[] = [
  { scope: '物业/社区/配套用房', section: '基础工程', group: '配套用房桩基及基础工程', code: '03.02.01', details: [{ name: '配套用房试桩工程', unit: '根' }, { name: '配套用房工程桩', unit: 'm' }, { name: '配套用房基础垫层', unit: '㎡' }, { name: '配套用房承台/筏板基础', unit: 'm³' }], measureBasis: '配套用房基底面积/固定金额', unit: '按末级科目' },
  { scope: '物业/社区/配套用房', section: '地上工程', group: '配套用房主体结构工程', code: '03.03.01', details: [{ name: '配套用房主体结构', unit: '㎡' }, { name: '配套用房砌体工程', unit: 'm³' }, { name: '配套用房二次结构', unit: '㎡' }], measureBasis: '配套用房建筑面积/固定金额', unit: '按末级科目' },
  { scope: '物业/社区/配套用房', section: '地上工程', group: '配套用房粗装工程', code: '03.04.01', details: ['配套用房内墙抹灰', '配套用房天棚粗装', '配套用房楼地面找平'], measureBasis: '配套用房建筑面积/固定金额', unit: '㎡' },
  { scope: '物业/社区/配套用房', section: '地上工程', group: '配套用房屋面、防水及保温工程', code: '03.05.01', details: ['配套用房屋面工程', '配套用房屋面防水', '配套用房卫生间防水', '配套用房外墙保温'], measureBasis: '配套用房防水/外墙面积/固定金额', unit: '㎡' },
  { scope: '物业/社区/配套用房', section: '地上工程', group: '配套用房门窗栏杆工程', code: '03.07.01', details: [{ name: '配套用房门窗', unit: '㎡' }, { name: '配套用房防火门', unit: '樘' }, { name: '配套用房百叶', unit: '㎡' }, { name: '配套用房栏杆', unit: 'm' }], measureBasis: '门窗面积/栏杆长度/固定金额', unit: '按末级科目' }
];

function normalizeDetail(detail: DetailInput) {
  return typeof detail === 'string' ? { name: detail } : detail;
}

function withPrefix(detail: DetailInput, prefix: string) {
  const item = normalizeDetail(detail);
  const unprefixed = new Set(['内墙抹灰', '天棚腻子/粗装', '楼地面找平', '公区粗装', '楼梯间粗装', '屋面工程', '屋面防水', '屋面保温', '卫生间防水', '厨房防水', '阳台防水', '外墙保温', '厨房烟道', '卫生间排气道', '成品烟道安装', '屋面风帽', '防火止回阀', '烟道洞口封堵修补', '铝合金窗', '铝合金门', '空调百叶', '设备百叶', '百叶栏杆/格栅栏杆', '阳台栏杆', '阳台栏板', '护窗栏杆', '楼梯栏杆/扶手', '连廊栏杆', '住宅入户门', '单元门/大堂门', '管井门', '楼梯间防火门', '前室防火门', '设备房防火门', '主楼地下室底板防水', '主楼地下室外墙防水', '主楼地下室顶板防水', '后浇带防水加强', '施工缝/变形缝防水', '集水坑/电梯基坑防水', '穿墙套管防水封堵', '顶板保护层', '顶板排水板', '顶板滤水层/土工布', '顶板覆土', '消防车道顶板加强', '地坪基层', '地库找平层', '耐磨地坪', '环氧/固化地坪', '设备房地坪', '地下室砌体', '地下室内墙抹灰', '地下室天棚腻子/涂料', '地下室墙面防霉涂料', '设备房粗装', '楼梯间粗装', '排水沟', '集水坑土建', '排水沟盖板', '电梯基坑排水处理', '地下室防火门', '管井防火门', '防火窗', ...deviceRoomDetails.map((detailItem) => normalizeDetail(detailItem).name)]);
  return { ...item, name: item.name.startsWith(prefix) || unprefixed.has(item.name) ? item.name : `${prefix}${item.name}` };
}

function prefixedGroups(scope: string, prefix: string): GroupInput[] {
  return residentialCommon.map((item) => ({ ...item, scope, details: item.details.map((detail) => withPrefix(detail, prefix)) }));
}

function buildV60BuildingRows(offset: number) {
  const result: CostDictionaryPresetRow[] = [];
  const sequence = new Map<string, number>();
  let rowIndex = offset;

  function addGroup(input: GroupInput) {
    for (const detailInput of input.details) {
      const detail = normalizeDetail(detailInput);
      const sequenceKey = `${input.scope}__${input.code}__${input.section || input.group}`;
      const next = (sequence.get(sequenceKey) || 0) + 1;
      sequence.set(sequenceKey, next);
      result.push({
        rowIndex: rowIndex++,
        costCode: `${input.code}.${String(next).padStart(2, '0')}`,
        parentCode: input.code,
        subjectLevel: '4',
        firstSubject: '建安工程费',
        secondSubject: input.section || input.group,
        thirdSubject: input.targetName || input.group,
        detailSubject: detail.name,
        subjectDefinition: `${detail.name}，来源于V60土建明细表B列明细项目，用于目标成本明细测算。`,
        targetMappingCode: input.code,
        measureBasis: detail.measureBasis || input.measureBasis || '建筑面积/固定金额',
        unit: detail.unit || input.unit || '项',
        defaultTaxRate: input.tax || '9%',
        applicableProductType: input.scope,
        remark: detail.remark || input.remark || 'V60定稿土建明细科目。',
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

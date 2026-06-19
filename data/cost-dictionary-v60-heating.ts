import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type HeatingSourceTable = '安装明细表' | '设备明细表' | '精装修明细表';
type HeatingPresetInput = {
  sourceTable: HeatingSourceTable;
  product: string;
  section: string;
  group: string;
  code: string;
  detailSubject: string;
  location: string;
  measureBasis: string;
  unit: string;
  tax: string;
  remark?: string;
};

const shared = {
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按地区配置、建筑面积、系统形式、设备数量或管线长度快速估算',
  conceptMethod: '按采暖地区标准、业态规模和系统方案估算',
  schemeMethod: '按热源、换热站、户内/公区管网、计量控制、地面构造和调试拆分测算',
  drawingMethod: '按施工图设备表、管线工程量、地暖构造做法和合同边界复核',
  tenderMethod: '按招采清单、中标价和合同价复核',
  dynamicMethod: '按动态成本、签证变更和结算更新',
  specialAdjustment: '特殊事项可人工调整',
  targetAllocationMethod: '地区性可选配置；按受益对象直接归集，不能单独归集时按采暖面积/建筑面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本',
  preTaxDeduction: '是',
  taxRemark: '采暖为地区性配置项，最终以项目所在地规范、设计方案和财税审核为准'
};

const optionalHeatingRemark = '采暖为地区性可选配置，适用于北方、川西高海拔或项目所在地要求配置采暖的项目；无采暖地区可不填金额。';
const fitoutHeatingRemark = '户内地暖盘管、保温板、反射膜、钢丝网和豆石回填属于户内地面精装构造，归入精装修明细；采暖立管、接驳、热计量和系统调试仍归安装明细。';

const heatingRows: HeatingPresetInput[] = [
  // 项目整体共用：热源、换热站、一次侧和总控
  { sourceTable: '设备明细表', product: '项目整体共用', section: '采暖设备', group: '热源及换热站设备', code: '03.08.50', detailSubject: '换热机组', location: '项目整体 / 换热站', measureBasis: '换热机组数量/供热面积', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '项目整体共用', section: '采暖设备', group: '热源及换热站设备', code: '03.08.50', detailSubject: '板式换热器', location: '项目整体 / 换热站', measureBasis: '换热器数量/换热量', unit: '台', tax: '13%' },
  { sourceTable: '设备明细表', product: '项目整体共用', section: '采暖设备', group: '热源及换热站设备', code: '03.08.50', detailSubject: '采暖循环泵', location: '项目整体 / 换热站', measureBasis: '循环泵数量', unit: '台', tax: '13%' },
  { sourceTable: '设备明细表', product: '项目整体共用', section: '采暖设备', group: '热源及换热站设备', code: '03.08.50', detailSubject: '补水定压设备', location: '项目整体 / 换热站', measureBasis: '设备套数', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '项目整体共用', section: '采暖设备', group: '热源及换热站设备', code: '03.08.50', detailSubject: '软化水处理设备', location: '项目整体 / 换热站', measureBasis: '设备套数', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '项目整体共用', section: '采暖设备', group: '热源及换热站设备', code: '03.08.50', detailSubject: '换热站控制柜', location: '项目整体 / 换热站', measureBasis: '控制柜数量', unit: '台', tax: '13%' },
  { sourceTable: '设备明细表', product: '项目整体共用', section: '采暖设备', group: '热计量及控制设备', code: '03.08.51', detailSubject: '总热量表', location: '项目整体 / 热力入口', measureBasis: '热力入口数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '项目整体共用', section: '采暖设备', group: '热计量及控制设备', code: '03.08.51', detailSubject: '采暖自控设备', location: '项目整体 / 换热站', measureBasis: '系统套数', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '项目整体共用', section: '采暖设备', group: '热计量及控制设备', code: '03.08.51', detailSubject: '远传抄表设备', location: '项目整体 / 热计量系统', measureBasis: '系统套数/表具数量', unit: '套', tax: '13%' },

  { sourceTable: '安装明细表', product: '项目整体共用', section: '采暖安装工程', group: '热源及换热站安装工程', code: '03.07.50', detailSubject: '换热站设备安装', location: '项目整体 / 换热站', measureBasis: '设备套数/固定金额', unit: '项', tax: '9%' },
  { sourceTable: '安装明细表', product: '项目整体共用', section: '采暖安装工程', group: '热源及换热站安装工程', code: '03.07.50', detailSubject: '换热站管道及阀件安装', location: '项目整体 / 换热站', measureBasis: '管道长度/阀件数量', unit: '项', tax: '9%' },
  { sourceTable: '安装明细表', product: '项目整体共用', section: '采暖安装工程', group: '热源及换热站安装工程', code: '03.07.50', detailSubject: '热力入口装置安装', location: '项目整体 / 热力入口', measureBasis: '热力入口数量', unit: '套', tax: '9%' },
  { sourceTable: '安装明细表', product: '项目整体共用', section: '采暖安装工程', group: '室外至换热站采暖接口', code: '03.07.51', detailSubject: '一次侧管线接驳', location: '项目整体 / 热源接入', measureBasis: '接驳点数量/管线长度', unit: '项', tax: '9%' },
  { sourceTable: '安装明细表', product: '项目整体共用', section: '采暖安装工程', group: '室外至换热站采暖接口', code: '03.07.51', detailSubject: '二次侧主干管接驳', location: '项目整体 / 换热站出口', measureBasis: '管线长度/固定金额', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '项目整体共用', section: '采暖安装工程', group: '采暖系统调试', code: '03.07.52', detailSubject: '采暖系统冲洗试压', location: '项目整体 / 采暖系统', measureBasis: '采暖面积/系统数量', unit: '项', tax: '9%' },
  { sourceTable: '安装明细表', product: '项目整体共用', section: '采暖安装工程', group: '采暖系统调试', code: '03.07.52', detailSubject: '采暖系统联合调试', location: '项目整体 / 采暖系统', measureBasis: '系统数量', unit: '项', tax: '9%' },

  // 高层住宅：安装只放管井、接驳、计量和调试；地暖盘管等地面构造进精装
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层户内采暖接口工程', code: '03.07.53', detailSubject: '高层户内采暖支管接驳', location: '高层户内', measureBasis: '户数/接驳点数量', unit: '户', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层户内采暖接口工程', code: '03.07.53', detailSubject: '高层散热器安装', location: '高层户内', measureBasis: '散热器数量', unit: '组', tax: '9%', remark: '散热器系统适用；若采用地暖，户内地暖盘管及地面构造进入精装修明细。' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层户内采暖接口工程', code: '03.07.53', detailSubject: '高层分集水器安装', location: '高层户内', measureBasis: '户数/分集水器数量', unit: '套', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层公区及管井采暖工程', code: '03.07.54', detailSubject: '高层采暖立管', location: '高层管井', measureBasis: '楼层数/立管长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层公区及管井采暖工程', code: '03.07.54', detailSubject: '高层公区采暖支管', location: '高层公区', measureBasis: '公区面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层热计量及控制工程', code: '03.07.55', detailSubject: '高层户用热量表安装', location: '高层户表间', measureBasis: '户数', unit: '套', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层热计量及控制工程', code: '03.07.55', detailSubject: '高层温控阀及控制面板安装', location: '高层户内', measureBasis: '户数/点位数量', unit: '套', tax: '9%' },

  { sourceTable: '精装修明细表', product: '高层住宅', section: '户内采暖地面精装工程', group: '高层地暖构造工程', code: '06.04.50', detailSubject: '高层地暖保温板', location: '高层户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '高层住宅', section: '户内采暖地面精装工程', group: '高层地暖构造工程', code: '06.04.50', detailSubject: '高层地暖反射膜', location: '高层户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '高层住宅', section: '户内采暖地面精装工程', group: '高层地暖构造工程', code: '06.04.50', detailSubject: '高层地暖钢丝网', location: '高层户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '高层住宅', section: '户内采暖地面精装工程', group: '高层地暖构造工程', code: '06.04.50', detailSubject: '高层地暖盘管', location: '高层户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '高层住宅', section: '户内采暖地面精装工程', group: '高层地暖构造工程', code: '06.04.50', detailSubject: '高层边界保温条及伸缩缝', location: '高层户内地面', measureBasis: '户数/地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '高层住宅', section: '户内采暖地面精装工程', group: '高层地暖构造工程', code: '06.04.50', detailSubject: '高层豆石混凝土回填保护层', location: '高层户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },

  { sourceTable: '设备明细表', product: '高层住宅', section: '采暖设备', group: '高层采暖末端及计量设备', code: '03.08.52', detailSubject: '高层户用热量表', location: '高层户表间', measureBasis: '户数', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '高层住宅', section: '采暖设备', group: '高层采暖末端及计量设备', code: '03.08.52', detailSubject: '高层温控阀', location: '高层户内', measureBasis: '户数/点位数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '高层住宅', section: '采暖设备', group: '高层采暖末端及计量设备', code: '03.08.52', detailSubject: '高层分集水器', location: '高层户内', measureBasis: '户数/分集水器数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '高层住宅', section: '采暖设备', group: '高层采暖末端及计量设备', code: '03.08.52', detailSubject: '高层散热器', location: '高层户内', measureBasis: '散热器数量', unit: '组', tax: '13%' },

  // 洋房
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房户内采暖接口工程', code: '03.07.56', detailSubject: '洋房户内采暖支管接驳', location: '洋房户内', measureBasis: '户数/接驳点数量', unit: '户', tax: '9%' },
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房户内采暖接口工程', code: '03.07.56', detailSubject: '洋房散热器安装', location: '洋房户内', measureBasis: '散热器数量', unit: '组', tax: '9%', remark: '散热器系统适用；若采用地暖，户内地暖盘管及地面构造进入精装修明细。' },
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房户内采暖接口工程', code: '03.07.56', detailSubject: '洋房分集水器安装', location: '洋房户内', measureBasis: '户数/分集水器数量', unit: '套', tax: '9%' },
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房热计量及控制工程', code: '03.07.57', detailSubject: '洋房户用热量表安装', location: '洋房户表间', measureBasis: '户数', unit: '套', tax: '9%' },
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房热计量及控制工程', code: '03.07.57', detailSubject: '洋房温控阀及控制面板安装', location: '洋房户内', measureBasis: '户数/点位数量', unit: '套', tax: '9%' },

  { sourceTable: '精装修明细表', product: '洋房', section: '户内采暖地面精装工程', group: '洋房地暖构造工程', code: '06.04.51', detailSubject: '洋房地暖保温板', location: '洋房户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '洋房', section: '户内采暖地面精装工程', group: '洋房地暖构造工程', code: '06.04.51', detailSubject: '洋房地暖反射膜', location: '洋房户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '洋房', section: '户内采暖地面精装工程', group: '洋房地暖构造工程', code: '06.04.51', detailSubject: '洋房地暖钢丝网', location: '洋房户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '洋房', section: '户内采暖地面精装工程', group: '洋房地暖构造工程', code: '06.04.51', detailSubject: '洋房地暖盘管', location: '洋房户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '洋房', section: '户内采暖地面精装工程', group: '洋房地暖构造工程', code: '06.04.51', detailSubject: '洋房边界保温条及伸缩缝', location: '洋房户内地面', measureBasis: '户数/地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },
  { sourceTable: '精装修明细表', product: '洋房', section: '户内采暖地面精装工程', group: '洋房地暖构造工程', code: '06.04.51', detailSubject: '洋房豆石混凝土回填保护层', location: '洋房户内地面', measureBasis: '地暖铺设面积', unit: '㎡', tax: '9%', remark: fitoutHeatingRemark },

  { sourceTable: '设备明细表', product: '洋房', section: '采暖设备', group: '洋房采暖末端及计量设备', code: '03.08.53', detailSubject: '洋房户用热量表', location: '洋房户表间', measureBasis: '户数', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '洋房', section: '采暖设备', group: '洋房采暖末端及计量设备', code: '03.08.53', detailSubject: '洋房温控阀', location: '洋房户内', measureBasis: '户数/点位数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '洋房', section: '采暖设备', group: '洋房采暖末端及计量设备', code: '03.08.53', detailSubject: '洋房分集水器', location: '洋房户内', measureBasis: '户数/分集水器数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '洋房', section: '采暖设备', group: '洋房采暖末端及计量设备', code: '03.08.53', detailSubject: '洋房散热器', location: '洋房户内', measureBasis: '散热器数量', unit: '组', tax: '13%' },

  // 商业
  { sourceTable: '安装明细表', product: '商业', section: '采暖安装工程', group: '商业采暖安装工程', code: '03.07.58', detailSubject: '商业采暖主干管', location: '商业公区/商铺', measureBasis: '商业采暖面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '商业', section: '采暖安装工程', group: '商业采暖安装工程', code: '03.07.58', detailSubject: '商业采暖支管', location: '商业公区/商铺', measureBasis: '商业采暖面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '商业', section: '采暖安装工程', group: '商业采暖安装工程', code: '03.07.58', detailSubject: '商业散热器/末端安装', location: '商业公区/商铺', measureBasis: '末端数量/采暖面积', unit: '组', tax: '9%' },
  { sourceTable: '安装明细表', product: '商业', section: '采暖安装工程', group: '商业采暖安装工程', code: '03.07.58', detailSubject: '商业热计量表安装', location: '商业热计量', measureBasis: '商铺数量/计量点数量', unit: '套', tax: '9%' },
  { sourceTable: '设备明细表', product: '商业', section: '采暖设备', group: '商业采暖末端及计量设备', code: '03.08.54', detailSubject: '商业热量表', location: '商业热计量', measureBasis: '商铺数量/计量点数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '商业', section: '采暖设备', group: '商业采暖末端及计量设备', code: '03.08.54', detailSubject: '商业温控阀', location: '商业公区/商铺', measureBasis: '温控点数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '商业', section: '采暖设备', group: '商业采暖末端及计量设备', code: '03.08.54', detailSubject: '商业散热器/采暖末端设备', location: '商业公区/商铺', measureBasis: '末端数量/采暖面积', unit: '组', tax: '13%' },

  // 地库、配套可选
  { sourceTable: '安装明细表', product: '地下车位 / 非主楼纯地下车库', section: '采暖安装工程', group: '地库采暖及防冻安装工程', code: '03.07.59', detailSubject: '地库值班室/设备房采暖管线', location: '地库设备房/值班室', measureBasis: '采暖面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '地下车位 / 非主楼纯地下车库', section: '采暖安装工程', group: '地库采暖及防冻安装工程', code: '03.07.59', detailSubject: '地库采暖防冻伴热', location: '地库坡道/管道防冻区域', measureBasis: '伴热长度', unit: 'm', tax: '9%' },
  { sourceTable: '设备明细表', product: '地下车位 / 非主楼纯地下车库', section: '采暖设备', group: '地库采暖及防冻设备', code: '03.08.55', detailSubject: '地库采暖温控设备', location: '地库设备房/值班室', measureBasis: '温控点数量', unit: '套', tax: '13%' },

  { sourceTable: '安装明细表', product: '物业/社区/配套用房', section: '采暖安装工程', group: '配套用房采暖安装工程', code: '03.07.60', detailSubject: '配套用房采暖管道', location: '配套用房', measureBasis: '配套采暖面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '物业/社区/配套用房', section: '采暖安装工程', group: '配套用房采暖安装工程', code: '03.07.60', detailSubject: '配套用房采暖末端安装', location: '配套用房', measureBasis: '末端数量/采暖面积', unit: '组', tax: '9%' },
  { sourceTable: '设备明细表', product: '物业/社区/配套用房', section: '采暖设备', group: '配套用房采暖末端及计量设备', code: '03.08.56', detailSubject: '配套用房热量表', location: '配套用房热计量', measureBasis: '计量点数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '物业/社区/配套用房', section: '采暖设备', group: '配套用房采暖末端及计量设备', code: '03.08.56', detailSubject: '配套用房温控设备', location: '配套用房', measureBasis: '温控点数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '物业/社区/配套用房', section: '采暖设备', group: '配套用房采暖末端及计量设备', code: '03.08.56', detailSubject: '配套用房散热器/采暖末端设备', location: '配套用房', measureBasis: '末端数量/采暖面积', unit: '组', tax: '13%' }
];

function firstSubjectFor(sourceTable: HeatingSourceTable) {
  if (sourceTable === '精装修明细表') return '精装修工程费';
  if (sourceTable === '设备明细表') return '设备工程费';
  return '建安工程费';
}

export function buildV60HeatingRows(offset: number): CostDictionaryPresetRow[] {
  return heatingRows.map((input, index) => ({
    rowIndex: offset + index,
    costCode: `${input.code}.${String(index + 1).padStart(2, '0')}`,
    parentCode: input.code,
    subjectLevel: '4',
    firstSubject: firstSubjectFor(input.sourceTable),
    secondSubject: input.section,
    thirdSubject: input.group,
    detailSubject: input.detailSubject,
    subjectDefinition: `${input.detailSubject}，为V60补充采暖地区可选配置项，用于采暖安装、设备或精装修目标成本明细测算。`,
    targetMappingCode: input.code,
    measureBasis: input.measureBasis,
    unit: input.unit,
    defaultTaxRate: input.tax,
    applicableProductType: input.product,
    remark: input.remark || optionalHeatingRemark,
    costAttributionMethod: input.product,
    sourceTable: input.sourceTable,
    ...shared
  }));
}

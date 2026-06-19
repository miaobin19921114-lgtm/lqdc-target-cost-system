import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type HeatingPresetInput = {
  sourceTable: '安装明细表' | '设备明细表';
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
  schemeMethod: '按热源、换热站、户内/公区管网、计量控制和调试拆分测算',
  drawingMethod: '按施工图设备表、管线工程量、阀件和合同边界复核',
  tenderMethod: '按招采清单、中标价和合同价复核',
  dynamicMethod: '按动态成本、签证变更和结算更新',
  specialAdjustment: '特殊事项可人工调整',
  targetAllocationMethod: '地区性可选配置；按受益对象直接归集，不能单独归集时按采暖面积/建筑面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本',
  preTaxDeduction: '是',
  taxRemark: '采暖为地区性配置项，最终以项目所在地规范、设计方案和财税审核为准'
};

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

  // 高层住宅：户内、公区、管井和计量
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层户内采暖安装工程', code: '03.07.53', detailSubject: '高层户内采暖管道', location: '高层户内', measureBasis: '高层采暖面积/户数', unit: '㎡', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层户内采暖安装工程', code: '03.07.53', detailSubject: '高层地暖盘管', location: '高层户内', measureBasis: '地暖面积', unit: '㎡', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层户内采暖安装工程', code: '03.07.53', detailSubject: '高层散热器安装', location: '高层户内', measureBasis: '散热器数量', unit: '组', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层户内采暖安装工程', code: '03.07.53', detailSubject: '高层分集水器安装', location: '高层户内', measureBasis: '户数/分集水器数量', unit: '套', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层公区及管井采暖工程', code: '03.07.54', detailSubject: '高层采暖立管', location: '高层管井', measureBasis: '楼层数/立管长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层公区及管井采暖工程', code: '03.07.54', detailSubject: '高层公区采暖支管', location: '高层公区', measureBasis: '公区面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层热计量及控制工程', code: '03.07.55', detailSubject: '高层户用热量表安装', location: '高层户表间', measureBasis: '户数', unit: '套', tax: '9%' },
  { sourceTable: '安装明细表', product: '高层住宅', section: '采暖安装工程', group: '高层热计量及控制工程', code: '03.07.55', detailSubject: '高层温控阀及控制面板安装', location: '高层户内', measureBasis: '户数/点位数量', unit: '套', tax: '9%' },

  { sourceTable: '设备明细表', product: '高层住宅', section: '采暖设备', group: '高层采暖末端及计量设备', code: '03.08.52', detailSubject: '高层户用热量表', location: '高层户表间', measureBasis: '户数', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '高层住宅', section: '采暖设备', group: '高层采暖末端及计量设备', code: '03.08.52', detailSubject: '高层温控阀', location: '高层户内', measureBasis: '户数/点位数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '高层住宅', section: '采暖设备', group: '高层采暖末端及计量设备', code: '03.08.52', detailSubject: '高层分集水器', location: '高层户内', measureBasis: '户数/分集水器数量', unit: '套', tax: '13%' },

  // 洋房
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房户内采暖安装工程', code: '03.07.56', detailSubject: '洋房户内采暖管道', location: '洋房户内', measureBasis: '洋房采暖面积/户数', unit: '㎡', tax: '9%' },
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房户内采暖安装工程', code: '03.07.56', detailSubject: '洋房地暖盘管', location: '洋房户内', measureBasis: '地暖面积', unit: '㎡', tax: '9%' },
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房户内采暖安装工程', code: '03.07.56', detailSubject: '洋房散热器安装', location: '洋房户内', measureBasis: '散热器数量', unit: '组', tax: '9%' },
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房户内采暖安装工程', code: '03.07.56', detailSubject: '洋房分集水器安装', location: '洋房户内', measureBasis: '户数/分集水器数量', unit: '套', tax: '9%' },
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房热计量及控制工程', code: '03.07.57', detailSubject: '洋房户用热量表安装', location: '洋房户表间', measureBasis: '户数', unit: '套', tax: '9%' },
  { sourceTable: '安装明细表', product: '洋房', section: '采暖安装工程', group: '洋房热计量及控制工程', code: '03.07.57', detailSubject: '洋房温控阀及控制面板安装', location: '洋房户内', measureBasis: '户数/点位数量', unit: '套', tax: '9%' },

  { sourceTable: '设备明细表', product: '洋房', section: '采暖设备', group: '洋房采暖末端及计量设备', code: '03.08.53', detailSubject: '洋房户用热量表', location: '洋房户表间', measureBasis: '户数', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '洋房', section: '采暖设备', group: '洋房采暖末端及计量设备', code: '03.08.53', detailSubject: '洋房温控阀', location: '洋房户内', measureBasis: '户数/点位数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '洋房', section: '采暖设备', group: '洋房采暖末端及计量设备', code: '03.08.53', detailSubject: '洋房分集水器', location: '洋房户内', measureBasis: '户数/分集水器数量', unit: '套', tax: '13%' },

  // 商业
  { sourceTable: '安装明细表', product: '商业', section: '采暖安装工程', group: '商业采暖安装工程', code: '03.07.58', detailSubject: '商业采暖主干管', location: '商业公区/商铺', measureBasis: '商业采暖面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '商业', section: '采暖安装工程', group: '商业采暖安装工程', code: '03.07.58', detailSubject: '商业采暖支管', location: '商业公区/商铺', measureBasis: '商业采暖面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '商业', section: '采暖安装工程', group: '商业采暖安装工程', code: '03.07.58', detailSubject: '商业散热器/末端安装', location: '商业公区/商铺', measureBasis: '末端数量/采暖面积', unit: '组', tax: '9%' },
  { sourceTable: '安装明细表', product: '商业', section: '采暖安装工程', group: '商业采暖安装工程', code: '03.07.58', detailSubject: '商业热计量表安装', location: '商业热计量', measureBasis: '商铺数量/计量点数量', unit: '套', tax: '9%' },
  { sourceTable: '设备明细表', product: '商业', section: '采暖设备', group: '商业采暖末端及计量设备', code: '03.08.54', detailSubject: '商业热量表', location: '商业热计量', measureBasis: '商铺数量/计量点数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '商业', section: '采暖设备', group: '商业采暖末端及计量设备', code: '03.08.54', detailSubject: '商业温控阀', location: '商业公区/商铺', measureBasis: '温控点数量', unit: '套', tax: '13%' },

  // 地库、配套可选
  { sourceTable: '安装明细表', product: '地下车位 / 非主楼纯地下车库', section: '采暖安装工程', group: '地库采暖及防冻安装工程', code: '03.07.59', detailSubject: '地库值班室/设备房采暖管线', location: '地库设备房/值班室', measureBasis: '采暖面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '地下车位 / 非主楼纯地下车库', section: '采暖安装工程', group: '地库采暖及防冻安装工程', code: '03.07.59', detailSubject: '地库采暖防冻伴热', location: '地库坡道/管道防冻区域', measureBasis: '伴热长度', unit: 'm', tax: '9%' },
  { sourceTable: '设备明细表', product: '地下车位 / 非主楼纯地下车库', section: '采暖设备', group: '地库采暖及防冻设备', code: '03.08.55', detailSubject: '地库采暖温控设备', location: '地库设备房/值班室', measureBasis: '温控点数量', unit: '套', tax: '13%' },

  { sourceTable: '安装明细表', product: '物业/社区/配套用房', section: '采暖安装工程', group: '配套用房采暖安装工程', code: '03.07.60', detailSubject: '配套用房采暖管道', location: '配套用房', measureBasis: '配套采暖面积/管线长度', unit: 'm', tax: '9%' },
  { sourceTable: '安装明细表', product: '物业/社区/配套用房', section: '采暖安装工程', group: '配套用房采暖安装工程', code: '03.07.60', detailSubject: '配套用房采暖末端安装', location: '配套用房', measureBasis: '末端数量/采暖面积', unit: '组', tax: '9%' },
  { sourceTable: '设备明细表', product: '物业/社区/配套用房', section: '采暖设备', group: '配套用房采暖末端及计量设备', code: '03.08.56', detailSubject: '配套用房热量表', location: '配套用房热计量', measureBasis: '计量点数量', unit: '套', tax: '13%' },
  { sourceTable: '设备明细表', product: '物业/社区/配套用房', section: '采暖设备', group: '配套用房采暖末端及计量设备', code: '03.08.56', detailSubject: '配套用房温控设备', location: '配套用房', measureBasis: '温控点数量', unit: '套', tax: '13%' }
];

export function buildV60HeatingRows(offset: number): CostDictionaryPresetRow[] {
  return heatingRows.map((input, index) => ({
    rowIndex: offset + index,
    costCode: `${input.code}.${String(index + 1).padStart(2, '0')}`,
    parentCode: input.code,
    subjectLevel: '4',
    firstSubject: '建安工程费',
    secondSubject: input.section,
    thirdSubject: input.group,
    detailSubject: input.detailSubject,
    subjectDefinition: `${input.detailSubject}，为V60补充采暖地区可选配置项，用于采暖安装/设备目标成本明细测算。`,
    targetMappingCode: input.code,
    measureBasis: input.measureBasis,
    unit: input.unit,
    defaultTaxRate: input.tax,
    applicableProductType: input.product,
    remark: input.remark || '采暖为地区性可选配置，适用于北方、川西高海拔或项目所在地要求配置采暖的项目；无采暖地区可不填金额。',
    costAttributionMethod: input.product,
    sourceTable: input.sourceTable,
    ...shared
  }));
}

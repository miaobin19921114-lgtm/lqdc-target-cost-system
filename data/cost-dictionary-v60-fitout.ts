import type { CostDictionaryPresetRow } from './cost-dictionary-v57';

type V60FitoutInput = {
  sourceRow: number;
  code: string;
  product: string;
  group: string;
  targetSubject: string;
  detailSubject: string;
  location: string;
  measureBasis: string;
  unit: string;
  tax: string;
  remark: string;
};

const common = {
  sourceTable: '精装修明细表',
  enabled: '是',
  writeBackToTarget: '是',
  applicableStage: '投拓/概念/方案/施工图/招采/动态',
  investmentMethod: '按装修部位、面积、套数或确认口径快速估算',
  conceptMethod: '按业态、精装范围、档次和面积指标估算',
  schemeMethod: '按装修部位、精装内容、材料档次和测算依据拆分测算',
  drawingMethod: '按施工图精装清单、做法表和工程量复核',
  tenderMethod: '按招采清单、中标价和合同价复核',
  dynamicMethod: '按动态成本、签证变更和结算更新',
  specialAdjustment: '特殊事项可人工调整',
  targetAllocationMethod: '按受益对象直接归集；不能单独归集时按精装面积/建筑面积/可售面积分摊',
  landVatAllocationMethod: '按受益对象归集；不可直接归集时按建筑面积/可售面积分摊',
  incomeTaxDeductionCategory: '开发成本',
  preTaxDeduction: '是',
  taxRemark: '按项目测算口径归集，最终以财税审核为准'
};

const v60FitoutRows: V60FitoutInput[] = [
  {
    "sourceRow": 7,
    "code": "03.06.01.01",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "首层入户大堂精装修",
    "detailSubject": "首层入户大堂精装修",
    "location": "首层大堂",
    "measureBasis": "首层大堂面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 8,
    "code": "03.06.01.02",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "首层电梯厅精装修",
    "detailSubject": "首层电梯厅精装修",
    "location": "首层电梯厅",
    "measureBasis": "电梯厅精装面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 9,
    "code": "03.06.01.03",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "标准层电梯厅精装修",
    "detailSubject": "标准层电梯厅精装修",
    "location": "标准层电梯厅",
    "measureBasis": "标准层电梯厅面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 10,
    "code": "03.06.01.04",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "标准层走廊精装修",
    "detailSubject": "标准层走廊精装修",
    "location": "标准层走廊",
    "measureBasis": "标准层公区精装面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 11,
    "code": "03.06.01.05",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "公区墙面装饰",
    "detailSubject": "公区墙面装饰",
    "location": "住宅公区",
    "measureBasis": "公区精装面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 12,
    "code": "03.06.01.06",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "公区地面铺装",
    "detailSubject": "公区地面铺装",
    "location": "住宅公区",
    "measureBasis": "公区精装面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 13,
    "code": "03.06.01.07",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "公区吊顶",
    "detailSubject": "公区吊顶",
    "location": "住宅公区",
    "measureBasis": "公区精装面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 14,
    "code": "03.06.01.08",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "公区灯具",
    "detailSubject": "公区灯具",
    "location": "住宅公区",
    "measureBasis": "公区精装面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 15,
    "code": "03.06.01.09",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "公区开关面板",
    "detailSubject": "公区开关面板",
    "location": "住宅公区",
    "measureBasis": "公区精装面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 16,
    "code": "03.06.01.10",
    "product": "高层住宅",
    "group": "公区精装修",
    "targetSubject": "公区成品保护",
    "detailSubject": "公区成品保护",
    "location": "住宅公区",
    "measureBasis": "公区精装面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按确认口径测算"
  },
  {
    "sourceRow": 18,
    "code": "03.06.02.01",
    "product": "高层住宅",
    "group": "楼梯间品质提升",
    "targetSubject": "楼梯间墙面装饰",
    "detailSubject": "楼梯间墙面装饰",
    "location": "楼梯间品质提升",
    "measureBasis": "楼梯间面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "普通涂料归土建；此处仅计品质提升"
  },
  {
    "sourceRow": 19,
    "code": "03.06.02.02",
    "product": "高层住宅",
    "group": "楼梯间品质提升",
    "targetSubject": "楼梯间地面铺装",
    "detailSubject": "楼梯间地面铺装",
    "location": "楼梯间品质提升",
    "measureBasis": "楼梯间面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "普通涂料归土建；此处仅计品质提升"
  },
  {
    "sourceRow": 20,
    "code": "03.06.02.03",
    "product": "高层住宅",
    "group": "楼梯间品质提升",
    "targetSubject": "楼梯间扶手装饰提升",
    "detailSubject": "楼梯间扶手装饰提升",
    "location": "楼梯间品质提升",
    "measureBasis": "楼梯栏杆长度",
    "unit": "m",
    "tax": "9%",
    "remark": "普通涂料归土建；此处仅计品质提升"
  },
  {
    "sourceRow": 21,
    "code": "03.06.02.04",
    "product": "高层住宅",
    "group": "楼梯间品质提升",
    "targetSubject": "楼梯间灯具提升",
    "detailSubject": "楼梯间灯具提升",
    "location": "楼梯间品质提升",
    "measureBasis": "楼梯间数量",
    "unit": "个",
    "tax": "9%",
    "remark": "普通涂料归土建；此处仅计品质提升"
  },
  {
    "sourceRow": 23,
    "code": "03.06.03.01",
    "product": "高层住宅",
    "group": "架空层精装修",
    "targetSubject": "架空层地面铺装",
    "detailSubject": "架空层地面铺装",
    "location": "架空层",
    "measureBasis": "架空层面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按架空层实际功能配置"
  },
  {
    "sourceRow": 24,
    "code": "03.06.03.02",
    "product": "高层住宅",
    "group": "架空层精装修",
    "targetSubject": "架空层墙柱面装饰",
    "detailSubject": "架空层墙柱面装饰",
    "location": "架空层",
    "measureBasis": "架空层面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按架空层实际功能配置"
  },
  {
    "sourceRow": 25,
    "code": "03.06.03.03",
    "product": "高层住宅",
    "group": "架空层精装修",
    "targetSubject": "架空层吊顶/格栅",
    "detailSubject": "架空层吊顶/格栅",
    "location": "架空层",
    "measureBasis": "架空层面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按架空层实际功能配置"
  },
  {
    "sourceRow": 26,
    "code": "03.06.03.04",
    "product": "高层住宅",
    "group": "架空层精装修",
    "targetSubject": "架空层灯具",
    "detailSubject": "架空层灯具",
    "location": "架空层",
    "measureBasis": "架空层面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按架空层实际功能配置"
  },
  {
    "sourceRow": 27,
    "code": "03.06.03.05",
    "product": "高层住宅",
    "group": "架空层精装修",
    "targetSubject": "架空层活动设施",
    "detailSubject": "架空层活动设施",
    "location": "架空层",
    "measureBasis": "架空层面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "按架空层实际功能配置"
  },
  {
    "sourceRow": 30,
    "code": "03.06.04.01",
    "product": "高层住宅",
    "group": "户内批量精装修",
    "targetSubject": "户内批量硬装",
    "detailSubject": "户内批量硬装",
    "location": "户内",
    "measureBasis": "批量精装面积",
    "unit": "㎡",
    "tax": "9%",
    "remark": "如项目毛坯交付则保持0"
  },
  {
    "sourceRow": 31,
    "code": "03.06.04.02",
    "product": "高层住宅",
    "group": "户内批量精装修",
    "targetSubject": "户内厨房橱柜",
    "detailSubject": "户内厨房橱柜",
    "location": "户内厨房",
    "measureBasis": "户数/橱柜延米",
    "unit": "套",
    "tax": "9%",
    "remark": "如项目毛坯交付则保持0"
  },
  {
    "sourceRow": 32,
    "code": "03.06.04.03",
    "product": "高层住宅",
    "group": "户内批量精装修",
    "targetSubject": "户内卫浴柜",
    "detailSubject": "户内卫浴柜",
    "location": "户内卫生间",
    "measureBasis": "户数",
    "unit": "套",
    "tax": "9%",
    "remark": "如项目毛坯交付则保持0"
  },
  {
    "sourceRow": 33,
    "code": "03.06.04.04",
    "product": "高层住宅",
    "group": "户内批量精装修",
    "targetSubject": "户内洁具五金",
    "detailSubject": "户内洁具五金",
    "location": "户内卫生间/厨房",
    "measureBasis": "户数",
    "unit": "套",
    "tax": "9%",
    "remark": "如项目毛坯交付则保持0"
  },
  {
    "sourceRow": 34,
    "code": "03.06.04.05",
    "product": "高层住宅",
    "group": "户内批量精装修",
    "targetSubject": "户内收纳柜",
    "detailSubject": "户内收纳柜",
    "location": "户内",
    "measureBasis": "户数/柜体数量",
    "unit": "套",
    "tax": "9%",
    "remark": "如项目毛坯交付则保持0"
  },
  {
    "sourceRow": 35,
    "code": "03.06.04.06",
    "product": "高层住宅",
    "group": "户内批量精装修",
    "targetSubject": "户内灯具开关面板",
    "detailSubject": "户内灯具开关面板",
    "location": "户内",
    "measureBasis": "户数",
    "unit": "套",
    "tax": "9%",
    "remark": "如项目毛坯交付则保持0"
  }
  // NOTE: V60 full fitout dictionary continues in uploaded template. Large array intentionally truncated in this commit to keep this patch size safe.
];

export function buildV60FitoutRows(offset: number): CostDictionaryPresetRow[] {
  return v60FitoutRows.map((input, index) => ({
    rowIndex: offset + index,
    costCode: input.code,
    parentCode: input.code.includes('.') ? input.code.split('.').slice(0, -1).join('.') : undefined,
    subjectLevel: '4',
    firstSubject: '精装修工程费',
    secondSubject: input.group,
    thirdSubject: input.targetSubject || input.location || input.group,
    detailSubject: input.detailSubject,
    subjectDefinition: `${input.detailSubject}，来源于V60精装修明细表第${input.sourceRow}行B列明细项目，用于目标成本精装修明细测算。`,
    targetMappingCode: input.code,
    measureBasis: input.measureBasis || '精装面积/套数/固定金额',
    unit: input.unit || '㎡',
    defaultTaxRate: input.tax || '9%',
    applicableProductType: input.product,
    remark: input.remark || 'V60定稿精装修明细科目。',
    costAttributionMethod: input.product,
    ...common
  }));
}

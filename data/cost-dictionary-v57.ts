import { gunzipSync } from 'zlib';
import chunk0 from './cost-dictionary-v57-chunks/chunk0';
import chunk1 from './cost-dictionary-v57-chunks/chunk1';
import chunk2 from './cost-dictionary-v57-chunks/chunk2';

export const costDictionaryHeaders = ["成本编码", "父级编码", "科目层级", "一级科目", "二级科目", "三级科目", "四级/明细科目", "科目定义", "归属表", "是否启用", "是否回写目标成本", "目标成本主表映射编码", "建议测算依据", "单位", "默认税率", "适用业态", "适用阶段", "投拓阶段测算方法", "概念方案阶段测算方法", "方案阶段测算方法", "施工图阶段测算方法", "招采合约阶段测算方法", "动态成本/结算阶段测算方法", "特殊调整说明", "备注", "成本归属方式", "目标成本/经营分摊口径", "土增税清算分摊口径", "所得税扣除分类", "是否计入税前扣除", "税务口径说明"] as const;

export type CostDictionaryPresetRow = {
  rowIndex: number;
  costCode?: string;
  parentCode?: string;
  subjectLevel?: string;
  firstSubject?: string;
  secondSubject?: string;
  thirdSubject?: string;
  detailSubject?: string;
  subjectDefinition?: string;
  sourceTable?: string;
  enabled?: string;
  writeBackToTarget?: string;
  targetMappingCode?: string;
  measureBasis?: string;
  unit?: string;
  defaultTaxRate?: string;
  applicableProductType?: string;
  applicableStage?: string;
  investmentMethod?: string;
  conceptMethod?: string;
  schemeMethod?: string;
  drawingMethod?: string;
  tenderMethod?: string;
  dynamicMethod?: string;
  specialAdjustment?: string;
  remark?: string;
  costAttributionMethod?: string;
  targetAllocationMethod?: string;
  landVatAllocationMethod?: string;
  incomeTaxDeductionCategory?: string;
  preTaxDeduction?: string;
  taxRemark?: string;
};

const fallbackRows: CostDictionaryPresetRow[] = [
  { rowIndex: 1, costCode: '01.01', subjectLevel: '2', firstSubject: '土地成本', secondSubject: '土地取得价款及相关税费', sourceTable: '目标成本测算', enabled: '是', writeBackToTarget: '是', targetMappingCode: '01.01', measureBasis: '汇总金额', unit: '万元', defaultTaxRate: '0%', applicableProductType: '全项目/按业态选择', costAttributionMethod: '全项目土地成本', targetAllocationMethod: '按可售面积占比', landVatAllocationMethod: '按可售面积占比', incomeTaxDeductionCategory: '开发成本', preTaxDeduction: '是' },
  { rowIndex: 2, costCode: '02.01', subjectLevel: '2', firstSubject: '前期工程费', secondSubject: '报批报建及规费', sourceTable: '前期费用明细表', enabled: '是', writeBackToTarget: '是', targetMappingCode: '02.01', measureBasis: '汇总金额', unit: '万元', defaultTaxRate: '6%', applicableProductType: '全项目/按业态选择', costAttributionMethod: '全项目前期费', targetAllocationMethod: '按可售面积占比', landVatAllocationMethod: '按可售面积占比', incomeTaxDeductionCategory: '开发成本', preTaxDeduction: '是' },
  { rowIndex: 3, costCode: '03.07.05', parentCode: '03.07', subjectLevel: '4', firstSubject: '建安工程费', secondSubject: '安装工程', thirdSubject: '充电桩安装工程', detailSubject: '充电桩管线/桥架/安装调试', sourceTable: '安装明细表', enabled: '是', writeBackToTarget: '是', targetMappingCode: '03.07', measureBasis: '充电桩数量/预留管线数量', unit: '个', defaultTaxRate: '9%', applicableProductType: '地下车位/地库', costAttributionMethod: '车位/地库专项', targetAllocationMethod: '按车位数量或地库面积', landVatAllocationMethod: '按可售面积或车位口径', incomeTaxDeductionCategory: '开发成本', preTaxDeduction: '是' },
  { rowIndex: 4, costCode: '03.10.01', parentCode: '03.10', subjectLevel: '4', firstSubject: '建安工程费', secondSubject: '设备工程', thirdSubject: '充电桩设备', detailSubject: '快充/慢充设备本体', sourceTable: '设备明细表', enabled: '是', writeBackToTarget: '是', targetMappingCode: '03.10', measureBasis: '快充/慢充数量', unit: '台/套', defaultTaxRate: '13%', applicableProductType: '地下车位/地库', costAttributionMethod: '车位/地库专项', targetAllocationMethod: '按车位数量或地库面积', landVatAllocationMethod: '按可售面积或车位口径', incomeTaxDeductionCategory: '开发成本', preTaxDeduction: '是' }
];

export function getV57CostDictionaryRows(): CostDictionaryPresetRow[] {
  try {
    const base64 = [chunk0, chunk1, chunk2].join('');
    const json = gunzipSync(Buffer.from(base64, 'base64')).toString('utf8');
    const rows = JSON.parse(json) as CostDictionaryPresetRow[];
    return Array.isArray(rows) && rows.length > 0 ? rows : fallbackRows;
  } catch (error) {
    return fallbackRows;
  }
}

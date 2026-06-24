import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EXCEL_FILE_NAME = 'LQDC_TargetCost_Final_V60_chargepile_v57_only.xlsx';
const EXCEL_FILE_VERSION = 'V60_chargepile_v57_only';
const SYSTEM_PROJECT_ID = 'SYSTEM_SEED_PROJECT';
const SYSTEM_VERSION_ID = 'SYSTEM_SEED_VERSION';
const SYSTEM_TEMPLATE_ID = 'tpl-system-residential-v60';
const SYSTEM_METADATA = 'source=system_seed;locked=true;copyable=true;editable=false;excel=' + EXCEL_FILE_NAME + ';task=04-10A';
const IMPORT_BATCH = 'seed-04-10A-v1';

type BatchResult = {
  batchNo: number;
  batchName: string;
  status: '通过' | '失败';
  message?: string;
};

type DictionarySeed = {
  type: string;
  code: string;
  name: string;
  precision?: string;
  depth?: string;
  sortOrder: number;
  remark?: string;
};

type ProductPresetSeed = {
  key: string;
  name: string;
  category: string;
  isSaleable: boolean;
  participateAllocation: boolean;
  defaultIncomeType: string;
  sortOrder: number;
  description?: string;
};

type MetricDefinitionSeed = {
  key: string;
  name: string;
  unit?: string;
  metricGroup: string;
  scope: string;
  sortOrder: number;
  description?: string;
};

type UnitSeed = {
  unitType: 'quantity' | 'pricing' | 'ratio' | 'currency';
  unitName: string;
  description?: string;
  sortOrder: number;
};

type CostSubjectSeed = {
  code: string;
  name: string;
  level: number;
  parentCode?: string | null;
  fullPath: string;
  defaultUnit?: string | null;
  defaultTaxRate?: number;
  defaultMeasureBasis?: string | null;
  defaultAllocationMethod?: string | null;
  sortOrder: number;
};

type DetailSubjectSeed = {
  id: string;
  costSubjectCode: string;
  detailSubjectCode: string;
  detailSubjectName: string;
  subjectFullPath: string;
  measurementBasis: string;
  defaultIndicatorSource: string;
  defaultQuantityUnit: string;
  defaultPricingUnit: string;
  defaultTaxRate: number;
  defaultProductType?: string;
  defaultCostObject?: string;
  participateAllocation: boolean;
  defaultAllocationBasis?: string;
  enterLandVatDeduction: boolean;
  enterIncomeTaxCost: boolean;
  remark?: string;
};

type ExcelMappingSeed = {
  id: string;
  sheetName: string;
  row: number;
  column: number;
  excelFieldName: string;
  excelSubjectCode?: string;
  excelSubjectName?: string;
  excelFormula?: string;
  excelUnit?: string;
  excelTaxRate?: string;
  excelAllocationBasis?: string;
  systemModule: string;
  systemField: string;
  remark?: string;
};

type CalculationRuleSeed = {
  code: string;
  name: string;
  level: 'blocker' | 'warning';
};

const dictionaryItems: DictionarySeed[] = [
  { type: 'project_type', code: 'residential', name: '住宅开发', sortOrder: 10 },
  { type: 'project_type', code: 'commercial', name: '商业开发', sortOrder: 20 },
  { type: 'project_type', code: 'culture_tourism_antique', name: '文旅古建', sortOrder: 30 },
  { type: 'project_type', code: 'industrial_park', name: '产业园 / 工业厂房', sortOrder: 40 },
  { type: 'project_type', code: 'urban_renewal', name: '城市更新', sortOrder: 50 },
  { type: 'project_type', code: 'holding_operation', name: '持有运营', sortOrder: 60 },
  { type: 'project_type', code: 'co_development_agent', name: '合作开发 / 代建', sortOrder: 70 },

  { type: 'development_mode', code: 'self_development', name: '自主开发', sortOrder: 10 },
  { type: 'development_mode', code: 'co_development', name: '合作开发', sortOrder: 20 },
  { type: 'development_mode', code: 'minority_operator', name: '小股操盘', sortOrder: 30 },
  { type: 'development_mode', code: 'agent_construction', name: '代建', sortOrder: 40 },
  { type: 'development_mode', code: 'entrusted_management', name: '委托管理', sortOrder: 50 },
  { type: 'development_mode', code: 'holding_operation', name: '持有运营', sortOrder: 60 },
  { type: 'development_mode', code: 'sales_development', name: '销售型开发', sortOrder: 70 },
  { type: 'development_mode', code: 'rent_sale_mix', name: '租售并举', sortOrder: 80 },
  { type: 'development_mode', code: 'urban_renewal', name: '城市更新', sortOrder: 85 },
  { type: 'development_mode', code: 'government_platform', name: '政府平台项目', sortOrder: 90 },
  { type: 'development_mode', code: 'epc_general_contract_agent', name: 'EPC / 总包代建项目', sortOrder: 100 },

  { type: 'estimate_stage', code: 'concept_plan', name: '强排版', precision: 'L1', depth: '二级/三级', sortOrder: 10 },
  { type: 'estimate_stage', code: 'land_acquisition', name: '拿地测算版', precision: 'L1', depth: '二级/三级', sortOrder: 20 },
  { type: 'estimate_stage', code: 'initial_estimate', name: '初测版', precision: 'L2', depth: '三级', sortOrder: 30 },
  { type: 'estimate_stage', code: 'scheme', name: '方案版', precision: 'L3', depth: '三级/四级', sortOrder: 40 },
  { type: 'estimate_stage', code: 'approval', name: '报批版', precision: 'L4', depth: '四级/明细', sortOrder: 50 },
  { type: 'estimate_stage', code: 'target_cost', name: '目标成本版', precision: 'L5', depth: '明细科目', sortOrder: 60 },
  { type: 'estimate_stage', code: 'dynamic_cost', name: '动态成本版', precision: 'L5', depth: '第二阶段预留', sortOrder: 70, remark: '第二阶段预留，本阶段只登记枚举' },
  { type: 'estimate_stage', code: 'contract_plan', name: '合约规划版', precision: 'L5', depth: '第二阶段预留', sortOrder: 80, remark: '第二阶段预留，本阶段只登记枚举' },
  { type: 'estimate_stage', code: 'settlement', name: '结算版', precision: 'L5', depth: '第二阶段预留', sortOrder: 90, remark: '第二阶段预留，本阶段只登记枚举' },
  { type: 'estimate_stage', code: 'tax_clearance', name: '税务清算版', precision: 'L5', depth: '第二阶段预留', sortOrder: 100, remark: '第二阶段预留，本阶段只登记枚举' },

  { type: 'precision_level', code: 'L1', name: '粗测精度', depth: '二级/三级', sortOrder: 10 },
  { type: 'precision_level', code: 'L2', name: '初测精度', depth: '三级', sortOrder: 20 },
  { type: 'precision_level', code: 'L3', name: '方案精度', depth: '三级/四级', sortOrder: 30 },
  { type: 'precision_level', code: 'L4', name: '报批精度', depth: '四级/明细', sortOrder: 40 },
  { type: 'precision_level', code: 'L5', name: '目标成本精度', depth: '明细科目', sortOrder: 50 },

  { type: 'special_option', code: 'civil_defense', name: '人防', sortOrder: 10 },
  { type: 'special_option', code: 'prefabricated', name: '装配式', sortOrder: 20 },
  { type: 'special_option', code: 'heating', name: '采暖', sortOrder: 30 },
  { type: 'special_option', code: 'antique_building', name: '古建', sortOrder: 40 },
  { type: 'special_option', code: 'charging_pile', name: '充电桩', sortOrder: 50, remark: '充电桩只作为项目概况指标和条件性科目开关，不作为业态' },
  { type: 'special_option', code: 'fine_decoration', name: '精装修', sortOrder: 60 },
  { type: 'special_option', code: 'show_area', name: '示范区', sortOrder: 70 },
  { type: 'special_option', code: 'club', name: '会所', sortOrder: 80 },
  { type: 'special_option', code: 'mechanical_parking', name: '立体车库', sortOrder: 90 },
  { type: 'special_option', code: 'kindergarten', name: '幼儿园', sortOrder: 100 },
  { type: 'special_option', code: 'urban_renewal', name: '城市更新', sortOrder: 110 },
  { type: 'special_option', code: 'agent_cooperation', name: '代建合作', sortOrder: 120 },
  { type: 'special_option', code: 'holding_operation', name: '持有运营', sortOrder: 130 },

  { type: 'measurement_basis', code: 'land_price', name: '土地价款', sortOrder: 10 },
  { type: 'measurement_basis', code: 'land_area', name: '占地面积', sortOrder: 20 },
  { type: 'measurement_basis', code: 'base_area', name: '基底面积', sortOrder: 25 },
  { type: 'measurement_basis', code: 'building_area', name: '建筑面积', sortOrder: 30 },
  { type: 'measurement_basis', code: 'above_ground_area', name: '地上建筑面积', sortOrder: 35 },
  { type: 'measurement_basis', code: 'saleable_area', name: '可售面积', sortOrder: 40 },
  { type: 'measurement_basis', code: 'capacity_area', name: '计容面积', sortOrder: 50 },
  { type: 'measurement_basis', code: 'underground_area', name: '地下建筑面积', sortOrder: 60 },
  { type: 'measurement_basis', code: 'basement_parking_area', name: '地下车库面积', sortOrder: 70 },
  { type: 'measurement_basis', code: 'parking_count', name: '车位数量', sortOrder: 80 },
  { type: 'measurement_basis', code: 'charging_pile_count', name: '充电桩数量', sortOrder: 90 },
  { type: 'measurement_basis', code: 'unit_count', name: '单元数量', sortOrder: 100 },
  { type: 'measurement_basis', code: 'household_count', name: '户数', sortOrder: 110 },
  { type: 'measurement_basis', code: 'building_count', name: '楼栋数量', sortOrder: 115 },
  { type: 'measurement_basis', code: 'site_perimeter', name: '周界长度', sortOrder: 120 },
  { type: 'measurement_basis', code: 'gate_count', name: '出入口数量', sortOrder: 130 },
  { type: 'measurement_basis', code: 'landscape_area', name: '景观面积', sortOrder: 140 },
  { type: 'measurement_basis', code: 'hardscape_area', name: '硬景面积', sortOrder: 150 },
  { type: 'measurement_basis', code: 'softscape_area', name: '软景面积', sortOrder: 160 },
  { type: 'measurement_basis', code: 'road_area', name: '道路面积', sortOrder: 165 },
  { type: 'measurement_basis', code: 'pipe_length', name: '管线长度', sortOrder: 166 },
  { type: 'measurement_basis', code: 'pit_perimeter', name: '基坑周长', sortOrder: 167 },
  { type: 'measurement_basis', code: 'civil_defense_area', name: '人防面积', sortOrder: 170 },
  { type: 'measurement_basis', code: 'heating_area', name: '采暖面积', sortOrder: 180 },
  { type: 'measurement_basis', code: 'prefabricated_area', name: '装配式面积', sortOrder: 190 },
  { type: 'measurement_basis', code: 'antique_building_area', name: '古建面积', sortOrder: 200 },
  { type: 'measurement_basis', code: 'facade_area', name: '外立面面积', sortOrder: 210 },
  { type: 'measurement_basis', code: 'window_area', name: '门窗面积', sortOrder: 220 },
  { type: 'measurement_basis', code: 'shutter_area', name: '百叶窗面积', sortOrder: 225 },
  { type: 'measurement_basis', code: 'railing_length', name: '栏杆长度', sortOrder: 230 },
  { type: 'measurement_basis', code: 'contract_amount', name: '合同金额', sortOrder: 240 },
  { type: 'measurement_basis', code: 'construction_cost_ratio', name: '建安成本比例', sortOrder: 250 },
  { type: 'measurement_basis', code: 'sales_revenue', name: '销售收入', sortOrder: 260 },
  { type: 'measurement_basis', code: 'vat_amount', name: '增值税', sortOrder: 270 },
  { type: 'measurement_basis', code: 'pre_tax_profit', name: '税前利润', sortOrder: 280 },
  { type: 'measurement_basis', code: 'income_tax_base', name: '所得税计税基础', sortOrder: 290 },
  { type: 'measurement_basis', code: 'land_vat_base', name: '土增税清算基础', sortOrder: 300 },
  { type: 'measurement_basis', code: 'manual_amount', name: '手工金额', sortOrder: 310 },

  { type: 'tax_rate', code: 'vat_0', name: '0%', sortOrder: 10, remark: '0.00' },
  { type: 'tax_rate', code: 'vat_1', name: '1%', sortOrder: 20, remark: '0.01' },
  { type: 'tax_rate', code: 'vat_3', name: '3%', sortOrder: 30, remark: '0.03' },
  { type: 'tax_rate', code: 'vat_5', name: '5%', sortOrder: 35, remark: '0.05' },
  { type: 'tax_rate', code: 'vat_6', name: '6%', sortOrder: 40, remark: '0.06' },
  { type: 'tax_rate', code: 'vat_9', name: '9%', sortOrder: 50, remark: '0.09' },
  { type: 'tax_rate', code: 'surtax_12', name: '附加税 12%', sortOrder: 55, remark: '0.12' },
  { type: 'tax_rate', code: 'income_tax_25', name: '企业所得税 25%', sortOrder: 60, remark: '0.25' },

  { type: 'allocation_basis', code: 'building_area', name: '按建筑面积', sortOrder: 10 },
  { type: 'allocation_basis', code: 'saleable_area', name: '按可售面积', sortOrder: 20 },
  { type: 'allocation_basis', code: 'capacity_area', name: '按计容面积', sortOrder: 30 },
  { type: 'allocation_basis', code: 'land_area', name: '按占地面积', sortOrder: 40 },
  { type: 'allocation_basis', code: 'underground_area', name: '按地下建筑面积', sortOrder: 50 },
  { type: 'allocation_basis', code: 'civil_defense_area', name: '按人防面积', sortOrder: 60 },
  { type: 'allocation_basis', code: 'heating_area', name: '按采暖面积', sortOrder: 70 },
  { type: 'allocation_basis', code: 'prefabricated_area', name: '按装配式面积', sortOrder: 75 },
  { type: 'allocation_basis', code: 'antique_building_area', name: '按古建面积', sortOrder: 76 },
  { type: 'allocation_basis', code: 'landscape_area', name: '按景观面积', sortOrder: 80 },
  { type: 'allocation_basis', code: 'basement_parking_area', name: '按地下车库面积', sortOrder: 90 },
  { type: 'allocation_basis', code: 'parking_count', name: '按车位数量', sortOrder: 100 },
  { type: 'allocation_basis', code: 'charging_pile_count', name: '按充电桩数量', sortOrder: 110 },
  { type: 'allocation_basis', code: 'household_count', name: '按户数', sortOrder: 120 },
  { type: 'allocation_basis', code: 'sales_revenue', name: '按销售收入', sortOrder: 130 },
  { type: 'allocation_basis', code: 'construction_cost', name: '按建安成本', sortOrder: 140 },
  { type: 'allocation_basis', code: 'beneficiary_object', name: '按受益对象', sortOrder: 150 },
  { type: 'allocation_basis', code: 'manual_ratio', name: '手工指定比例', sortOrder: 160 },

  { type: 'tax_aggregation_basis', code: 'land_vat_cost', name: '土增税扣除成本', sortOrder: 10 },
  { type: 'tax_aggregation_basis', code: 'income_tax_cost', name: '所得税计税成本', sortOrder: 20 },
  { type: 'tax_aggregation_basis', code: 'vat_input', name: '增值税进项税', sortOrder: 30 },
  { type: 'tax_aggregation_basis', code: 'vat_output', name: '增值税销项税', sortOrder: 40 },
  { type: 'tax_aggregation_basis', code: 'land_vat_clearance_object', name: '土增税清算对象', sortOrder: 45 },
  { type: 'tax_aggregation_basis', code: 'income_tax_cost_object', name: '所得税计税成本对象', sortOrder: 46 },
  { type: 'tax_aggregation_basis', code: 'non_deductible', name: '不可扣除', sortOrder: 50 },

  { type: 'revenue_type', code: 'residential_sale', name: '住宅销售收入', sortOrder: 10, remark: 'measurementMode=area;measurementUnit=㎡;pricingUnit=元/㎡' },
  { type: 'revenue_type', code: 'commercial_sale', name: '商业销售收入', sortOrder: 20, remark: 'measurementMode=area;measurementUnit=㎡;pricingUnit=元/㎡' },
  { type: 'revenue_type', code: 'apartment_sale', name: '公寓销售收入', sortOrder: 30, remark: 'measurementMode=area;measurementUnit=㎡;pricingUnit=元/㎡' },
  { type: 'revenue_type', code: 'office_sale', name: '办公销售收入', sortOrder: 40, remark: 'measurementMode=area;measurementUnit=㎡;pricingUnit=元/㎡' },
  { type: 'revenue_type', code: 'hotel_sale', name: '酒店销售收入', sortOrder: 50, remark: 'measurementMode=area;measurementUnit=㎡;pricingUnit=元/㎡' },
  { type: 'revenue_type', code: 'parking_sale', name: '车位销售收入', sortOrder: 60, remark: 'measurementMode=quantity;measurementUnit=个;pricingUnit=元/个' },
  { type: 'revenue_type', code: 'underground_parking_sale', name: '地下车位收入', sortOrder: 61, remark: 'measurementMode=quantity;measurementUnit=个;pricingUnit=元/个' },
  { type: 'revenue_type', code: 'civil_defense_parking_sale', name: '人防车位收入', sortOrder: 62, remark: 'measurementMode=quantity;measurementUnit=个;pricingUnit=元/个' },
  { type: 'revenue_type', code: 'non_civil_defense_parking_sale', name: '非人防车位收入', sortOrder: 63, remark: 'measurementMode=quantity;measurementUnit=个;pricingUnit=元/个' },
  { type: 'revenue_type', code: 'mechanical_parking_sale', name: '立体车位收入', sortOrder: 64, remark: 'measurementMode=quantity;measurementUnit=个;pricingUnit=元/个' },
  { type: 'revenue_type', code: 'charging_pile_parking_sale', name: '充电桩车位收入', sortOrder: 65, remark: 'measurementMode=quantity;measurementUnit=个;pricingUnit=元/个;chargingPileNotProductType=true' },
  { type: 'revenue_type', code: 'deposit_recovery', name: '押金 / 保证金收回', sortOrder: 70, remark: 'measurementMode=amount;measurementUnit=元;pricingUnit=元/项' },
  { type: 'revenue_type', code: 'fixed_asset_recovery', name: '可作固定资产的配套设施回收', sortOrder: 80, remark: 'measurementMode=amount;measurementUnit=元;pricingUnit=元/项' },
  { type: 'revenue_type', code: 'tax_refund', name: '税收返还', sortOrder: 90, remark: 'measurementMode=amount;measurementUnit=元;pricingUnit=元/项' },
  { type: 'revenue_type', code: 'other_income', name: '其他收入', sortOrder: 100, remark: 'measurementMode=amount;measurementUnit=元;pricingUnit=元/项' },

  { type: 'target_cost_summary_metric', code: 'sales_revenue', name: '销售收入', sortOrder: 10 },
  { type: 'target_cost_summary_metric', code: 'development_cost_tax_included', name: '开发成本及费用合计（含税）', sortOrder: 20 },
  { type: 'target_cost_summary_metric', code: 'development_cost_tax_excluded', name: '开发成本及费用合计（不含税）', sortOrder: 30 },
  { type: 'target_cost_summary_metric', code: 'total_tax_amount', name: '税金合计', sortOrder: 40 },
  { type: 'target_cost_summary_metric', code: 'pre_tax_operating_profit', name: '税前经营利润', sortOrder: 50 },
  { type: 'target_cost_summary_metric', code: 'pre_tax_sales_profit_rate', name: '税前销售利润率', sortOrder: 60 },
  { type: 'target_cost_summary_metric', code: 'income_tax', name: '所得税', sortOrder: 70 },
  { type: 'target_cost_summary_metric', code: 'net_profit_after_tax', name: '税后净利', sortOrder: 80 },
  { type: 'target_cost_summary_metric', code: 'net_sales_profit_rate', name: '销售净利率', sortOrder: 90 },
  { type: 'target_cost_summary_metric', code: 'building_unit_cost', name: '建面单方', sortOrder: 100 },
  { type: 'target_cost_summary_metric', code: 'saleable_unit_cost', name: '可售单方', sortOrder: 110 },
  { type: 'target_cost_summary_metric', code: 'product_unit_cost', name: '分业态单方', sortOrder: 120 },
  { type: 'target_cost_summary_metric', code: 'second_level_subject_unit_cost', name: '二级科目单方', sortOrder: 130 }
];

const productPresets: ProductPresetSeed[] = [
  { key: 'high_rise_residential', name: '高层住宅', category: '住宅', isSaleable: true, participateAllocation: true, defaultIncomeType: '住宅销售收入', sortOrder: 10 },
  { key: 'mid_high_rise_residential', name: '小高层住宅', category: '住宅', isSaleable: true, participateAllocation: true, defaultIncomeType: '住宅销售收入', sortOrder: 20 },
  { key: 'garden_house', name: '洋房', category: '住宅', isSaleable: true, participateAllocation: true, defaultIncomeType: '住宅销售收入', sortOrder: 30 },
  { key: 'stacked_villa', name: '叠拼', category: '住宅', isSaleable: true, participateAllocation: true, defaultIncomeType: '住宅销售收入', sortOrder: 40 },
  { key: 'courtyard_house', name: '合院', category: '住宅', isSaleable: true, participateAllocation: true, defaultIncomeType: '住宅销售收入', sortOrder: 50 },
  { key: 'villa', name: '别墅', category: '住宅', isSaleable: true, participateAllocation: true, defaultIncomeType: '住宅销售收入', sortOrder: 60 },
  { key: 'street_shop', name: '底商', category: '商业', isSaleable: true, participateAllocation: true, defaultIncomeType: '商业销售收入', sortOrder: 70 },
  { key: 'centralized_commercial', name: '集中商业', category: '商业', isSaleable: true, participateAllocation: true, defaultIncomeType: '商业销售收入', sortOrder: 80 },
  { key: 'commercial_street', name: '商业街', category: '商业', isSaleable: true, participateAllocation: true, defaultIncomeType: '商业销售收入', sortOrder: 90 },
  { key: 'apartment', name: '公寓', category: '商业', isSaleable: true, participateAllocation: true, defaultIncomeType: '公寓销售收入', sortOrder: 100 },
  { key: 'office', name: '办公', category: '商业', isSaleable: true, participateAllocation: true, defaultIncomeType: '办公销售收入', sortOrder: 110 },
  { key: 'hotel', name: '酒店', category: '商业', isSaleable: false, participateAllocation: true, defaultIncomeType: '酒店销售收入', sortOrder: 120 },
  { key: 'underground_parking', name: '地下车位', category: '车位', isSaleable: true, participateAllocation: true, defaultIncomeType: '地下车位收入', sortOrder: 130 },
  { key: 'civil_defense_parking', name: '人防车位', category: '车位', isSaleable: true, participateAllocation: true, defaultIncomeType: '人防车位收入', sortOrder: 140 },
  { key: 'non_civil_defense_parking', name: '非人防车位', category: '车位', isSaleable: true, participateAllocation: true, defaultIncomeType: '非人防车位收入', sortOrder: 150 },
  { key: 'mechanical_parking', name: '立体车位', category: '车位', isSaleable: true, participateAllocation: true, defaultIncomeType: '立体车位收入', sortOrder: 160 },
  { key: 'property_management_room', name: '物业用房', category: '配套', isSaleable: false, participateAllocation: true, defaultIncomeType: '其他收入', sortOrder: 170 },
  { key: 'community_service_room', name: '社区用房', category: '配套', isSaleable: false, participateAllocation: true, defaultIncomeType: '其他收入', sortOrder: 180 },
  { key: 'club', name: '会所', category: '配套', isSaleable: false, participateAllocation: true, defaultIncomeType: '其他收入', sortOrder: 190 },
  { key: 'elevated_floor', name: '架空层', category: '配套', isSaleable: false, participateAllocation: true, defaultIncomeType: '其他收入', sortOrder: 200 },
  { key: 'kindergarten', name: '幼儿园', category: '配套', isSaleable: false, participateAllocation: true, defaultIncomeType: '其他收入', sortOrder: 210 },
  { key: 'antique_building', name: '古建/仿古建筑', category: '特殊对象', isSaleable: true, participateAllocation: true, defaultIncomeType: '商业销售收入', sortOrder: 220 },
  { key: 'show_area', name: '示范区', category: '特殊对象', isSaleable: false, participateAllocation: true, defaultIncomeType: '其他收入', sortOrder: 230 },
  { key: 'sales_office', name: '售楼处', category: '特殊对象', isSaleable: false, participateAllocation: true, defaultIncomeType: '其他收入', sortOrder: 240 },
  { key: 'show_flat', name: '样板间', category: '特殊对象', isSaleable: false, participateAllocation: true, defaultIncomeType: '其他收入', sortOrder: 250 }
];

const metricDefinitions: MetricDefinitionSeed[] = [
  { key: 'land_area', name: '占地面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 10 },
  { key: 'capacity_area', name: '计容面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 20 },
  { key: 'total_building_area', name: '总建筑面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 30 },
  { key: 'above_ground_area', name: '地上建筑面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 40 },
  { key: 'underground_area', name: '地下建筑面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 50 },
  { key: 'saleable_area', name: '可售面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 60 },
  { key: 'parking_count', name: '车位数量', unit: '个', metricGroup: '项目概况', scope: 'project', sortOrder: 70 },
  { key: 'charging_pile_count', name: '充电桩数量', unit: '个', metricGroup: '项目概况', scope: 'project', sortOrder: 80, description: '充电桩为项目概况指标，不作为业态' },
  { key: 'household_count', name: '户数', unit: '户', metricGroup: '项目概况', scope: 'project', sortOrder: 90 },
  { key: 'building_count', name: '楼栋数', unit: '栋', metricGroup: '项目概况', scope: 'project', sortOrder: 100 },
  { key: 'unit_count', name: '单元数量', unit: '个', metricGroup: '项目概况', scope: 'project', sortOrder: 110 },
  { key: 'site_perimeter', name: '周界长度', unit: 'm', metricGroup: '项目概况', scope: 'project', sortOrder: 120 },
  { key: 'gate_count', name: '出入口数量', unit: '个', metricGroup: '项目概况', scope: 'project', sortOrder: 130 },
  { key: 'landscape_area', name: '景观面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 140 },
  { key: 'hardscape_area', name: '硬景面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 150 },
  { key: 'softscape_area', name: '软景面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 160 },
  { key: 'road_area', name: '道路面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 165 },
  { key: 'green_area', name: '绿地面积', unit: '㎡', metricGroup: '项目概况', scope: 'project', sortOrder: 166 },
  { key: 'civil_defense_area', name: '人防面积', unit: '㎡', metricGroup: '条件性指标', scope: 'project', sortOrder: 170 },
  { key: 'heating_area', name: '采暖面积', unit: '㎡', metricGroup: '条件性指标', scope: 'project', sortOrder: 180 },
  { key: 'prefabricated_area', name: '装配式面积', unit: '㎡', metricGroup: '条件性指标', scope: 'project', sortOrder: 190 },
  { key: 'antique_building_area', name: '古建面积', unit: '㎡', metricGroup: '条件性指标', scope: 'project', sortOrder: 200 },
  { key: 'product_building_area', name: '业态建筑面积', unit: '㎡', metricGroup: '总图业态指标', scope: 'product_type', sortOrder: 210 },
  { key: 'product_saleable_area', name: '业态可售面积', unit: '㎡', metricGroup: '总图业态指标', scope: 'product_type', sortOrder: 220 },
  { key: 'facade_area', name: '外立面面积', unit: '㎡', metricGroup: '工程量指标', scope: 'project', sortOrder: 230 },
  { key: 'window_area', name: '门窗面积', unit: '㎡', metricGroup: '工程量指标', scope: 'project', sortOrder: 240 },
  { key: 'shutter_area', name: '百叶窗面积', unit: '㎡', metricGroup: '工程量指标', scope: 'project', sortOrder: 245 },
  { key: 'railing_length', name: '栏杆长度', unit: 'm', metricGroup: '工程量指标', scope: 'project', sortOrder: 250 },
  { key: 'base_area', name: '基底面积', unit: '㎡', metricGroup: '工程量指标', scope: 'project', sortOrder: 260 },
  { key: 'pipe_length', name: '管线长度', unit: 'm', metricGroup: '工程量指标', scope: 'project', sortOrder: 270 },
  { key: 'pit_perimeter', name: '基坑周长', unit: 'm', metricGroup: '工程量指标', scope: 'project', sortOrder: 280 }
];

const units: UnitSeed[] = [
  { unitType: 'quantity', unitName: '㎡', sortOrder: 10 },
  { unitType: 'quantity', unitName: 'm', sortOrder: 20 },
  { unitType: 'quantity', unitName: 'm³', sortOrder: 30 },
  { unitType: 'quantity', unitName: '个', sortOrder: 40 },
  { unitType: 'quantity', unitName: '台', sortOrder: 50 },
  { unitType: 'quantity', unitName: '套', sortOrder: 60 },
  { unitType: 'quantity', unitName: '户', sortOrder: 70 },
  { unitType: 'quantity', unitName: '樘', sortOrder: 80 },
  { unitType: 'quantity', unitName: '座', sortOrder: 90 },
  { unitType: 'quantity', unitName: '点位', sortOrder: 100 },
  { unitType: 'quantity', unitName: 'kVA', sortOrder: 110 },
  { unitType: 'quantity', unitName: '项', sortOrder: 120 },
  { unitType: 'quantity', unitName: '元', sortOrder: 130 },
  { unitType: 'ratio', unitName: '%', sortOrder: 140 },
  { unitType: 'pricing', unitName: '元/㎡', sortOrder: 210 },
  { unitType: 'pricing', unitName: '元/m', sortOrder: 220 },
  { unitType: 'pricing', unitName: '元/m³', sortOrder: 230 },
  { unitType: 'pricing', unitName: '元/个', sortOrder: 240 },
  { unitType: 'pricing', unitName: '元/台', sortOrder: 250 },
  { unitType: 'pricing', unitName: '元/套', sortOrder: 260 },
  { unitType: 'pricing', unitName: '元/户', sortOrder: 270 },
  { unitType: 'pricing', unitName: '元/樘', sortOrder: 280 },
  { unitType: 'pricing', unitName: '元/座', sortOrder: 290 },
  { unitType: 'pricing', unitName: '元/点位', sortOrder: 300 },
  { unitType: 'pricing', unitName: '元/kVA', sortOrder: 310 },
  { unitType: 'pricing', unitName: '元/项', sortOrder: 320 },
  { unitType: 'pricing', unitName: '按合同金额%', sortOrder: 330 },
  { unitType: 'pricing', unitName: '按建安成本%', sortOrder: 340 },
  { unitType: 'pricing', unitName: '按销售收入%', sortOrder: 350 },
  { unitType: 'currency', unitName: '元', sortOrder: 410 }
];

const costSubjects: CostSubjectSeed[] = [
  { code: '01', name: '土地费', level: 1, fullPath: '土地费', defaultMeasureBasis: '土地价款', defaultAllocationMethod: '按可售面积', sortOrder: 10 },
  { code: '01.01', name: '土地取得价款', parentCode: '01', level: 2, fullPath: '土地费 > 土地取得价款', defaultMeasureBasis: '土地价款', defaultAllocationMethod: '按可售面积', sortOrder: 11 },
  { code: '01.01.01', name: '土地出让金', parentCode: '01.01', level: 3, fullPath: '土地费 > 土地取得价款 > 土地出让金', defaultMeasureBasis: '土地价款', defaultUnit: '元', defaultTaxRate: 0, defaultAllocationMethod: '按可售面积', sortOrder: 111 },
  { code: '01.01.02', name: '契税', parentCode: '01.01', level: 3, fullPath: '土地费 > 土地取得价款 > 契税', defaultMeasureBasis: '土地价款', defaultUnit: '元', defaultTaxRate: 0, defaultAllocationMethod: '按可售面积', sortOrder: 112 },
  { code: '01.01.03', name: '土地交易服务费', parentCode: '01.01', level: 3, fullPath: '土地费 > 土地取得价款 > 土地交易服务费', defaultMeasureBasis: '土地价款', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按可售面积', sortOrder: 113 },
  { code: '01.01.04', name: '土地评估费', parentCode: '01.01', level: 3, fullPath: '土地费 > 土地取得价款 > 土地评估费', defaultMeasureBasis: '土地价款', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按可售面积', sortOrder: 114 },
  { code: '01.01.05', name: '土地咨询/居间服务费', parentCode: '01.01', level: 3, fullPath: '土地费 > 土地取得价款 > 土地咨询/居间服务费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按可售面积', sortOrder: 115 },
  { code: '01.01.06', name: '土地尽调费', parentCode: '01.01', level: 3, fullPath: '土地费 > 土地取得价款 > 土地尽调费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按可售面积', sortOrder: 116 },
  { code: '01.01.07', name: '法务及财税尽调费', parentCode: '01.01', level: 3, fullPath: '土地费 > 土地取得价款 > 法务及财税尽调费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按可售面积', sortOrder: 117 },

  { code: '02', name: '前期工程费', level: 1, fullPath: '前期工程费', defaultAllocationMethod: '按建筑面积', sortOrder: 20 },
  { code: '02.01', name: '前期规费及专项服务费', parentCode: '02', level: 2, fullPath: '前期工程费 > 前期规费及专项服务费', defaultAllocationMethod: '按建筑面积', sortOrder: 21 },
  { code: '02.01.01', name: '政府规费及行政事业性收费', parentCode: '02.01', level: 3, fullPath: '前期工程费 > 前期规费及专项服务费 > 政府规费及行政事业性收费', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0, defaultAllocationMethod: '按建筑面积', sortOrder: 211 },
  { code: '02.01.01.01', name: '城市基础设施配套费', parentCode: '02.01.01', level: 4, fullPath: '前期工程费 > 前期规费及专项服务费 > 政府规费及行政事业性收费 > 城市基础设施配套费', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0, defaultAllocationMethod: '按建筑面积', sortOrder: 2111 },
  { code: '02.01.01.02', name: '不动产登记费', parentCode: '02.01.01', level: 4, fullPath: '前期工程费 > 前期规费及专项服务费 > 政府规费及行政事业性收费 > 不动产登记费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0, defaultAllocationMethod: '按建筑面积', sortOrder: 2112 },
  { code: '02.01.02', name: '勘察测绘及权证专项服务费', parentCode: '02.01', level: 3, fullPath: '前期工程费 > 前期规费及专项服务费 > 勘察测绘及权证专项服务费', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 212 },
  { code: '02.01.02.01', name: '权籍调查及宗地测绘', parentCode: '02.01.02', level: 4, fullPath: '前期工程费 > 前期规费及专项服务费 > 勘察测绘及权证专项服务费 > 权籍调查及宗地测绘', defaultMeasureBasis: '占地面积', defaultUnit: '㎡', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 2121 },
  { code: '02.01.02.02', name: '制图晒图及规划测绘', parentCode: '02.01.02', level: 4, fullPath: '前期工程费 > 前期规费及专项服务费 > 勘察测绘及权证专项服务费 > 制图晒图及规划测绘', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 2122 },
  { code: '02.01.03', name: '前期专项评价及咨询费', parentCode: '02.01', level: 3, fullPath: '前期工程费 > 前期规费及专项服务费 > 前期专项评价及咨询费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 213 },
  { code: '02.01.03.01', name: '环评及水保评价', parentCode: '02.01.03', level: 4, fullPath: '前期工程费 > 前期规费及专项服务费 > 前期专项评价及咨询费 > 环评及水保评价', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 2131 },
  { code: '02.01.03.02', name: '交通影响及节能评价', parentCode: '02.01.03', level: 4, fullPath: '前期工程费 > 前期规费及专项服务费 > 前期专项评价及咨询费 > 交通影响及节能评价', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 2132 },
  { code: '02.01.04', name: '市政专项接入及配套费', parentCode: '02.01', level: 3, fullPath: '前期工程费 > 前期规费及专项服务费 > 市政专项接入及配套费', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 214 },
  { code: '02.01.04.01', name: '临水临电及市政接入费', parentCode: '02.01.04', level: 4, fullPath: '前期工程费 > 前期规费及专项服务费 > 市政专项接入及配套费 > 临水临电及市政接入费', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 2141 },
  { code: '02.01.04.02', name: '四网合一及通信接入费', parentCode: '02.01.04', level: 4, fullPath: '前期工程费 > 前期规费及专项服务费 > 市政专项接入及配套费 > 四网合一及通信接入费', defaultMeasureBasis: '户数', defaultUnit: '户', defaultTaxRate: 0.09, defaultAllocationMethod: '按户数', sortOrder: 2142 },
  { code: '02.02', name: '勘察设计费', parentCode: '02', level: 2, fullPath: '前期工程费 > 勘察设计费', defaultAllocationMethod: '按建筑面积', sortOrder: 22 },
  { code: '02.02.01', name: '地质勘察费', parentCode: '02.02', level: 3, fullPath: '前期工程费 > 勘察设计费 > 地质勘察费', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 221 },
  { code: '02.02.02', name: '方案及施工图设计费', parentCode: '02.02', level: 3, fullPath: '前期工程费 > 勘察设计费 > 方案及施工图设计费', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 222 },
  { code: '02.02.03', name: '专项设计费', parentCode: '02.02', level: 3, fullPath: '前期工程费 > 勘察设计费 > 专项设计费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 223 },
  { code: '02.02.04', name: 'BIM 及专项顾问服务费', parentCode: '02.02', level: 3, fullPath: '前期工程费 > 勘察设计费 > BIM 及专项顾问服务费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 224 },
  { code: '02.03', name: '三通一平', parentCode: '02', level: 2, fullPath: '前期工程费 > 三通一平', defaultAllocationMethod: '按占地面积', sortOrder: 23 },
  { code: '02.03.01', name: '场地清表及平整', parentCode: '02.03', level: 3, fullPath: '前期工程费 > 三通一平 > 场地清表及平整', defaultMeasureBasis: '占地面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按占地面积', sortOrder: 231 },
  { code: '02.03.02', name: '临时水电路网', parentCode: '02.03', level: 3, fullPath: '前期工程费 > 三通一平 > 临时水电路网', defaultMeasureBasis: '占地面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按占地面积', sortOrder: 232 },
  { code: '02.03.03', name: '网络及通信临时接入', parentCode: '02.03', level: 3, fullPath: '前期工程费 > 三通一平 > 网络及通信临时接入', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.09, defaultAllocationMethod: '按占地面积', sortOrder: 233 },
  { code: '02.04', name: '临设围墙及出入口', parentCode: '02', level: 2, fullPath: '前期工程费 > 临设围墙及出入口', defaultAllocationMethod: '按占地面积', sortOrder: 24 },
  { code: '02.04.01', name: '临时设施', parentCode: '02.04', level: 3, fullPath: '前期工程费 > 临设围墙及出入口 > 临时设施', defaultMeasureBasis: '占地面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按占地面积', sortOrder: 241 },
  { code: '02.04.02', name: '围墙工程', parentCode: '02.04', level: 3, fullPath: '前期工程费 > 临设围墙及出入口 > 围墙工程', defaultMeasureBasis: '周界长度', defaultUnit: 'm', defaultTaxRate: 0.09, defaultAllocationMethod: '按占地面积', sortOrder: 242 },
  { code: '02.04.03', name: '出入口工程', parentCode: '02.04', level: 3, fullPath: '前期工程费 > 临设围墙及出入口 > 出入口工程', defaultMeasureBasis: '出入口数量', defaultUnit: '个', defaultTaxRate: 0.09, defaultAllocationMethod: '按占地面积', sortOrder: 243 },
  { code: '02.05', name: '工程保险及担保费用', parentCode: '02', level: 2, fullPath: '前期工程费 > 工程保险及担保费用', defaultAllocationMethod: '按建筑面积', sortOrder: 25 },
  { code: '02.05.01', name: '工程保险费', parentCode: '02.05', level: 3, fullPath: '前期工程费 > 工程保险及担保费用 > 工程保险费', defaultMeasureBasis: '建安成本比例', defaultUnit: '%', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 251 },
  { code: '02.05.02', name: '农民工工资保证金', parentCode: '02.05', level: 3, fullPath: '前期工程费 > 工程保险及担保费用 > 农民工工资保证金', defaultMeasureBasis: '建安成本比例', defaultUnit: '%', defaultTaxRate: 0, defaultAllocationMethod: '按建筑面积', sortOrder: 252 },
  { code: '02.05.03', name: '工程款支付担保', parentCode: '02.05', level: 3, fullPath: '前期工程费 > 工程保险及担保费用 > 工程款支付担保', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 253 },
  { code: '02.05.04', name: '保函手续费', parentCode: '02.05', level: 3, fullPath: '前期工程费 > 工程保险及担保费用 > 保函手续费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 254 },

  { code: '03', name: '建安工程费', level: 1, fullPath: '建安工程费', defaultAllocationMethod: '按建筑面积', sortOrder: 30 },
  { code: '03.01', name: '土石方及基坑工程', parentCode: '03', level: 2, fullPath: '建安工程费 > 土石方及基坑工程', sortOrder: 31 },
  { code: '03.01.01', name: '土石方工程', parentCode: '03.01', level: 3, fullPath: '建安工程费 > 土石方及基坑工程 > 土石方工程', defaultMeasureBasis: '占地面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 311 },
  { code: '03.01.02', name: '基坑支护', parentCode: '03.01', level: 3, fullPath: '建安工程费 > 土石方及基坑工程 > 基坑支护', defaultMeasureBasis: '基坑周长', defaultUnit: 'm', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 312 },
  { code: '03.02', name: '桩基及地基处理', parentCode: '03', level: 2, fullPath: '建安工程费 > 桩基及地基处理', sortOrder: 32 },
  { code: '03.02.01', name: '桩基工程', parentCode: '03.02', level: 3, fullPath: '建安工程费 > 桩基及地基处理 > 桩基工程', defaultMeasureBasis: '基底面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 321 },
  { code: '03.02.02', name: '地基处理工程', parentCode: '03.02', level: 3, fullPath: '建安工程费 > 桩基及地基处理 > 地基处理工程', defaultMeasureBasis: '基底面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 322 },
  { code: '03.03', name: '主体结构工程', parentCode: '03', level: 2, fullPath: '建安工程费 > 主体结构工程', sortOrder: 33 },
  { code: '03.03.01', name: '地上主体结构', parentCode: '03.03', level: 3, fullPath: '建安工程费 > 主体结构工程 > 地上主体结构', defaultMeasureBasis: '地上建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 331 },
  { code: '03.03.02', name: '地下室结构', parentCode: '03.03', level: 3, fullPath: '建安工程费 > 主体结构工程 > 地下室结构', defaultMeasureBasis: '地下建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按地下建筑面积', sortOrder: 332 },
  { code: '03.03.03', name: '人防结构', parentCode: '03.03', level: 3, fullPath: '建安工程费 > 主体结构工程 > 人防结构', defaultMeasureBasis: '人防面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按人防面积', sortOrder: 333 },
  { code: '03.03.04', name: '装配式构件增量', parentCode: '03.03', level: 3, fullPath: '建安工程费 > 主体结构工程 > 装配式构件增量', defaultMeasureBasis: '装配式面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按装配式面积', sortOrder: 334 },
  { code: '03.04', name: '建筑及粗装修工程', parentCode: '03', level: 2, fullPath: '建安工程费 > 建筑及粗装修工程', sortOrder: 34 },
  { code: '03.04.01', name: '砌体及抹灰工程', parentCode: '03.04', level: 3, fullPath: '建安工程费 > 建筑及粗装修工程 > 砌体及抹灰工程', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 341 },
  { code: '03.04.02', name: '防水工程', parentCode: '03.04', level: 3, fullPath: '建安工程费 > 建筑及粗装修工程 > 防水工程', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 342 },
  { code: '03.04.02.01', name: '厨房卫生间防水', parentCode: '03.04.02', level: 4, fullPath: '建安工程费 > 建筑及粗装修工程 > 防水工程 > 厨房卫生间防水', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 3421 },
  { code: '03.04.02.02', name: '屋面及地下室防水', parentCode: '03.04.02', level: 4, fullPath: '建安工程费 > 建筑及粗装修工程 > 防水工程 > 屋面及地下室防水', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 3422 },
  { code: '03.04.03', name: '外墙及保温工程', parentCode: '03.04', level: 3, fullPath: '建安工程费 > 建筑及粗装修工程 > 外墙及保温工程', defaultMeasureBasis: '外立面面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 343 },
  { code: '03.04.04', name: '门窗工程', parentCode: '03.04', level: 3, fullPath: '建安工程费 > 建筑及粗装修工程 > 门窗工程', defaultMeasureBasis: '门窗面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 344 },
  { code: '03.04.05', name: '栏杆百叶工程', parentCode: '03.04', level: 3, fullPath: '建安工程费 > 建筑及粗装修工程 > 栏杆百叶工程', defaultMeasureBasis: '栏杆长度', defaultUnit: 'm', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 345 },
  { code: '03.04.06', name: '入户门及防火门', parentCode: '03.04', level: 3, fullPath: '建安工程费 > 建筑及粗装修工程 > 入户门及防火门', defaultMeasureBasis: '户数', defaultUnit: '樘', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 346 },
  { code: '03.04.07', name: '烟道及通风井', parentCode: '03.04', level: 3, fullPath: '建安工程费 > 建筑及粗装修工程 > 烟道及通风井', defaultMeasureBasis: '户数', defaultUnit: '户', defaultTaxRate: 0.09, defaultAllocationMethod: '按户数', sortOrder: 347 },
  { code: '03.05', name: '安装工程', parentCode: '03', level: 2, fullPath: '建安工程费 > 安装工程', sortOrder: 35 },
  { code: '03.05.01', name: '给排水工程', parentCode: '03.05', level: 3, fullPath: '建安工程费 > 安装工程 > 给排水工程', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 351 },
  { code: '03.05.02', name: '强电工程', parentCode: '03.05', level: 3, fullPath: '建安工程费 > 安装工程 > 强电工程', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 352 },
  { code: '03.05.03', name: '弱电智能化工程', parentCode: '03.05', level: 3, fullPath: '建安工程费 > 安装工程 > 弱电智能化工程', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 353 },
  { code: '03.05.04', name: '消防工程', parentCode: '03.05', level: 3, fullPath: '建安工程费 > 安装工程 > 消防工程', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 354 },
  { code: '03.05.05', name: '采暖工程', parentCode: '03.05', level: 3, fullPath: '建安工程费 > 安装工程 > 采暖工程', defaultMeasureBasis: '采暖面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按采暖面积', sortOrder: 355 },
  { code: '03.05.06', name: '防雷接地工程', parentCode: '03.05', level: 3, fullPath: '建安工程费 > 安装工程 > 防雷接地工程', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 356 },
  { code: '03.06', name: '设备工程', parentCode: '03', level: 2, fullPath: '建安工程费 > 设备工程', sortOrder: 36 },
  { code: '03.06.01', name: '电梯工程', parentCode: '03.06', level: 3, fullPath: '建安工程费 > 设备工程 > 电梯工程', defaultMeasureBasis: '单元数量', defaultUnit: '台', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 361 },
  { code: '03.06.02', name: '人防设备', parentCode: '03.06', level: 3, fullPath: '建安工程费 > 设备工程 > 人防设备', defaultMeasureBasis: '人防面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按人防面积', sortOrder: 362 },
  { code: '03.06.03', name: '充电桩工程', parentCode: '03.06', level: 3, fullPath: '建安工程费 > 设备工程 > 充电桩工程', defaultMeasureBasis: '充电桩数量', defaultUnit: '个', defaultTaxRate: 0.09, defaultAllocationMethod: '按充电桩数量', sortOrder: 363 },
  { code: '03.06.04', name: '消防设备', parentCode: '03.06', level: 3, fullPath: '建安工程费 > 设备工程 > 消防设备', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 364 },
  { code: '03.06.05', name: '立体车库设备', parentCode: '03.06', level: 3, fullPath: '建安工程费 > 设备工程 > 立体车库设备', defaultMeasureBasis: '车位数量', defaultUnit: '个', defaultTaxRate: 0.09, defaultAllocationMethod: '按车位数量', sortOrder: 365 },

  { code: '04', name: '室外景观及配套工程', level: 1, fullPath: '室外景观及配套工程', defaultAllocationMethod: '按建筑面积', sortOrder: 40 },
  { code: '04.01', name: '室外综合管网', parentCode: '04', level: 2, fullPath: '室外景观及配套工程 > 室外综合管网', sortOrder: 41 },
  { code: '04.01.01', name: '综合管网工程', parentCode: '04.01', level: 3, fullPath: '室外景观及配套工程 > 室外综合管网 > 综合管网工程', defaultMeasureBasis: '景观面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 411 },
  { code: '04.01.02', name: '给水及消防外网', parentCode: '04.01', level: 3, fullPath: '室外景观及配套工程 > 室外综合管网 > 给水及消防外网', defaultMeasureBasis: '管线长度', defaultUnit: 'm', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 412 },
  { code: '04.01.03', name: '雨污水外网', parentCode: '04.01', level: 3, fullPath: '室外景观及配套工程 > 室外综合管网 > 雨污水外网', defaultMeasureBasis: '管线长度', defaultUnit: 'm', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 413 },
  { code: '04.01.04', name: '强弱电外网', parentCode: '04.01', level: 3, fullPath: '室外景观及配套工程 > 室外综合管网 > 强弱电外网', defaultMeasureBasis: '管线长度', defaultUnit: 'm', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 414 },
  { code: '04.02', name: '景观工程', parentCode: '04', level: 2, fullPath: '室外景观及配套工程 > 景观工程', sortOrder: 42 },
  { code: '04.02.01', name: '硬景工程', parentCode: '04.02', level: 3, fullPath: '室外景观及配套工程 > 景观工程 > 硬景工程', defaultMeasureBasis: '硬景面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 421 },
  { code: '04.02.02', name: '软景工程', parentCode: '04.02', level: 3, fullPath: '室外景观及配套工程 > 景观工程 > 软景工程', defaultMeasureBasis: '软景面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 422 },
  { code: '04.02.03', name: '景观小品及构筑物', parentCode: '04.02', level: 3, fullPath: '室外景观及配套工程 > 景观工程 > 景观小品及构筑物', defaultMeasureBasis: '景观面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 423 },
  { code: '04.02.04', name: '景观照明及亮化', parentCode: '04.02', level: 3, fullPath: '室外景观及配套工程 > 景观工程 > 景观照明及亮化', defaultMeasureBasis: '景观面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 424 },
  { code: '04.03', name: '道路及总平工程', parentCode: '04', level: 2, fullPath: '室外景观及配套工程 > 道路及总平工程', sortOrder: 43 },
  { code: '04.03.01', name: '道路工程', parentCode: '04.03', level: 3, fullPath: '室外景观及配套工程 > 道路及总平工程 > 道路工程', defaultMeasureBasis: '道路面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 431 },
  { code: '04.03.02', name: '交安及标识标牌', parentCode: '04.03', level: 3, fullPath: '室外景观及配套工程 > 道路及总平工程 > 交安及标识标牌', defaultMeasureBasis: '景观面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按景观面积', sortOrder: 432 },
  { code: '04.04', name: '古建及文旅配套', parentCode: '04', level: 2, fullPath: '室外景观及配套工程 > 古建及文旅配套', sortOrder: 44 },
  { code: '04.04.01', name: '古建木作工程', parentCode: '04.04', level: 3, fullPath: '室外景观及配套工程 > 古建及文旅配套 > 古建木作工程', defaultMeasureBasis: '古建面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按古建面积', sortOrder: 441 },
  { code: '04.04.02', name: '古建瓦作工程', parentCode: '04.04', level: 3, fullPath: '室外景观及配套工程 > 古建及文旅配套 > 古建瓦作工程', defaultMeasureBasis: '古建面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按古建面积', sortOrder: 442 },

  { code: '05', name: '精装修工程', level: 1, fullPath: '精装修工程', defaultAllocationMethod: '按建筑面积', sortOrder: 50 },
  { code: '05.01', name: '公区精装修', parentCode: '05', level: 2, fullPath: '精装修工程 > 公区精装修', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 51 },
  { code: '05.01.01', name: '大堂精装修', parentCode: '05.01', level: 3, fullPath: '精装修工程 > 公区精装修 > 大堂精装修', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 511 },
  { code: '05.01.02', name: '电梯厅及公区精装修', parentCode: '05.01', level: 3, fullPath: '精装修工程 > 公区精装修 > 电梯厅及公区精装修', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 512 },
  { code: '05.02', name: '户内精装修', parentCode: '05', level: 2, fullPath: '精装修工程 > 户内精装修', defaultMeasureBasis: '可售面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按可售面积', sortOrder: 52 },
  { code: '05.03', name: '售楼处及样板间精装修', parentCode: '05', level: 2, fullPath: '精装修工程 > 售楼处及样板间精装修', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 53 },
  { code: '05.03.01', name: '售楼处精装修', parentCode: '05.03', level: 3, fullPath: '精装修工程 > 售楼处及样板间精装修 > 售楼处精装修', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 531 },
  { code: '05.03.02', name: '样板间精装修', parentCode: '05.03', level: 3, fullPath: '精装修工程 > 售楼处及样板间精装修 > 样板间精装修', defaultMeasureBasis: '建筑面积', defaultUnit: '㎡', defaultTaxRate: 0.09, defaultAllocationMethod: '按建筑面积', sortOrder: 532 },

  { code: '06', name: '销售费用', level: 1, fullPath: '销售费用', defaultAllocationMethod: '按销售收入', sortOrder: 60 },
  { code: '06.01', name: '营销推广费', parentCode: '06', level: 2, fullPath: '销售费用 > 营销推广费', defaultMeasureBasis: '销售收入', defaultUnit: '%', defaultTaxRate: 0.06, defaultAllocationMethod: '按销售收入', sortOrder: 61 },
  { code: '06.02', name: '渠道分销及代理费', parentCode: '06', level: 2, fullPath: '销售费用 > 渠道分销及代理费', defaultMeasureBasis: '销售收入', defaultUnit: '%', defaultTaxRate: 0.06, defaultAllocationMethod: '按销售收入', sortOrder: 62 },
  { code: '06.03', name: '案场物业及销售服务费', parentCode: '06', level: 2, fullPath: '销售费用 > 案场物业及销售服务费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按销售收入', sortOrder: 63 },
  { code: '06.04', name: '售楼处/样板间/示范区包装', parentCode: '06', level: 2, fullPath: '销售费用 > 售楼处/样板间/示范区包装', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按销售收入', sortOrder: 64 },

  { code: '07', name: '开发间接费', level: 1, fullPath: '开发间接费', defaultAllocationMethod: '按建筑面积', sortOrder: 70 },
  { code: '07.01', name: '项目人员薪酬', parentCode: '07', level: 2, fullPath: '开发间接费 > 项目人员薪酬', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0, defaultAllocationMethod: '按建筑面积', sortOrder: 71 },
  { code: '07.02', name: '办公差旅及综合管理费', parentCode: '07', level: 2, fullPath: '开发间接费 > 办公差旅及综合管理费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 72 },
  { code: '07.03', name: '审计及综合咨询费', parentCode: '07', level: 2, fullPath: '开发间接费 > 审计及综合咨询费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按建筑面积', sortOrder: 73 },

  { code: '08', name: '财务费用', level: 1, fullPath: '财务费用', defaultAllocationMethod: '按销售收入', sortOrder: 80 },
  { code: '08.01', name: '融资利息', parentCode: '08', level: 2, fullPath: '财务费用 > 融资利息', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按销售收入', sortOrder: 81 },
  { code: '08.02', name: '融资手续费', parentCode: '08', level: 2, fullPath: '财务费用 > 融资手续费', defaultMeasureBasis: '合同金额', defaultUnit: '元', defaultTaxRate: 0.06, defaultAllocationMethod: '按销售收入', sortOrder: 82 },

  { code: '09', name: '税金及附加', level: 1, fullPath: '税金及附加', defaultAllocationMethod: '按销售收入', sortOrder: 90 },
  { code: '09.01', name: '增值税', parentCode: '09', level: 2, fullPath: '税金及附加 > 增值税', defaultMeasureBasis: '销售收入', defaultUnit: '元', defaultTaxRate: 0.09, defaultAllocationMethod: '按销售收入', sortOrder: 91 },
  { code: '09.02', name: '附加税', parentCode: '09', level: 2, fullPath: '税金及附加 > 附加税', defaultMeasureBasis: '增值税', defaultUnit: '元', defaultTaxRate: 0.12, defaultAllocationMethod: '按销售收入', sortOrder: 92 },
  { code: '09.02.01', name: '城建税', parentCode: '09.02', level: 3, fullPath: '税金及附加 > 附加税 > 城建税', defaultMeasureBasis: '增值税', defaultUnit: '元', defaultTaxRate: 0.07, defaultAllocationMethod: '按销售收入', sortOrder: 921 },
  { code: '09.02.02', name: '教育费附加', parentCode: '09.02', level: 3, fullPath: '税金及附加 > 附加税 > 教育费附加', defaultMeasureBasis: '增值税', defaultUnit: '元', defaultTaxRate: 0.03, defaultAllocationMethod: '按销售收入', sortOrder: 922 },
  { code: '09.02.03', name: '地方教育附加', parentCode: '09.02', level: 3, fullPath: '税金及附加 > 附加税 > 地方教育附加', defaultMeasureBasis: '增值税', defaultUnit: '元', defaultTaxRate: 0.02, defaultAllocationMethod: '按销售收入', sortOrder: 923 },
  { code: '09.02.04', name: '水利建设基金', parentCode: '09.02', level: 3, fullPath: '税金及附加 > 附加税 > 水利建设基金', defaultMeasureBasis: '销售收入', defaultUnit: '元', defaultTaxRate: 0, defaultAllocationMethod: '按销售收入', sortOrder: 924 },
  { code: '09.03', name: '土地增值税', parentCode: '09', level: 2, fullPath: '税金及附加 > 土地增值税', defaultMeasureBasis: '土增税清算基础', defaultUnit: '元', defaultTaxRate: 0, defaultAllocationMethod: '按受益对象', sortOrder: 93 },
  { code: '09.04', name: '企业所得税', parentCode: '09', level: 2, fullPath: '税金及附加 > 企业所得税', defaultMeasureBasis: '所得税计税基础', defaultUnit: '元', defaultTaxRate: 0.25, defaultAllocationMethod: '按销售收入', sortOrder: 94 }
];

function defaultPricingUnit(defaultUnit?: string | null) {
  if (defaultUnit === 'm') return '元/m';
  if (defaultUnit === 'm³') return '元/m³';
  if (defaultUnit === '个') return '元/个';
  if (defaultUnit === '台') return '元/台';
  if (defaultUnit === '套') return '元/套';
  if (defaultUnit === '户') return '元/户';
  if (defaultUnit === '樘') return '元/樘';
  if (defaultUnit === '座') return '元/座';
  if (defaultUnit === '点位') return '元/点位';
  if (defaultUnit === 'kVA') return '元/kVA';
  if (defaultUnit === '元') return '元/项';
  if (defaultUnit === '%') return '按合同金额%';
  return '元/㎡';
}

const detailSubjects: DetailSubjectSeed[] = costSubjects
  .filter((subject) => subject.level >= 2 && !subject.code.startsWith('09'))
  .filter((subject) => !costSubjects.some((child) => child.parentCode === subject.code))
  .map((subject) => ({
    id: 'detail-' + subject.code.replace(/\./g, '-'),
    costSubjectCode: subject.code,
    detailSubjectCode: subject.code + '.D01',
    detailSubjectName: subject.name,
    subjectFullPath: subject.fullPath,
    measurementBasis: subject.defaultMeasureBasis || '建筑面积',
    defaultIndicatorSource: subject.defaultMeasureBasis || '建筑面积',
    defaultQuantityUnit: subject.defaultUnit || '㎡',
    defaultPricingUnit: defaultPricingUnit(subject.defaultUnit),
    defaultTaxRate: subject.defaultTaxRate ?? 0.09,
    defaultProductType: subject.code === '03.06.03' ? '地下车位' : undefined,
    defaultCostObject: subject.code === '03.06.03' ? '地下车位/地库' : undefined,
    participateAllocation: subject.defaultAllocationMethod ? !subject.defaultAllocationMethod.includes('直接') : true,
    defaultAllocationBasis: subject.defaultAllocationMethod || '按建筑面积',
    enterLandVatDeduction: !subject.code.startsWith('06') && !subject.code.startsWith('08') && !subject.code.startsWith('09'),
    enterIncomeTaxCost: true,
    remark: subject.code === '03.06.03' ? '充电桩成本归属地下车位/地库，充电桩不作为业态' : undefined
  }));

const excelMappings: ExcelMappingSeed[] = [
  { id: 'excel-map-project-overview-land-area', sheetName: '项目概况', row: 8, column: 2, excelFieldName: '占地面积', excelUnit: '㎡', systemModule: 'ProjectOverviewIndicator', systemField: 'landArea' },
  { id: 'excel-map-project-overview-base-area', sheetName: '项目概况', row: 9, column: 2, excelFieldName: '基底面积', excelUnit: '㎡', systemModule: 'ProjectOverviewIndicator', systemField: 'baseArea' },
  { id: 'excel-map-project-overview-total-area', sheetName: '项目概况', row: 10, column: 2, excelFieldName: '总建筑面积', excelUnit: '㎡', systemModule: 'ProjectOverviewIndicator', systemField: 'totalBuildingArea' },
  { id: 'excel-map-project-overview-above-area', sheetName: '项目概况', row: 11, column: 2, excelFieldName: '地上建筑面积', excelUnit: '㎡', systemModule: 'ProjectOverviewIndicator', systemField: 'aboveGroundArea' },
  { id: 'excel-map-project-overview-underground-area', sheetName: '项目概况', row: 12, column: 2, excelFieldName: '地下建筑面积', excelUnit: '㎡', systemModule: 'ProjectOverviewIndicator', systemField: 'undergroundArea' },
  { id: 'excel-map-project-overview-saleable-area', sheetName: '项目概况', row: 13, column: 2, excelFieldName: '可售面积', excelUnit: '㎡', systemModule: 'ProjectOverviewIndicator', systemField: 'saleableArea' },
  { id: 'excel-map-project-overview-parking-count', sheetName: '项目概况', row: 14, column: 2, excelFieldName: '车位数量', excelUnit: '个', systemModule: 'ProjectOverviewIndicator', systemField: 'parkingCount' },
  { id: 'excel-map-project-overview-charging-pile-count', sheetName: '项目概况', row: 15, column: 2, excelFieldName: '充电桩数量', excelUnit: '个', systemModule: 'ProjectOverviewIndicator', systemField: 'chargingPileCount', remark: '充电桩数量为概况指标，不映射为业态' },
  { id: 'excel-map-project-overview-households', sheetName: '项目概况', row: 16, column: 2, excelFieldName: '户数', excelUnit: '户', systemModule: 'ProjectOverviewIndicator', systemField: 'householdCount' },
  { id: 'excel-map-project-overview-unit-count', sheetName: '项目概况', row: 17, column: 2, excelFieldName: '单元数量', excelUnit: '个', systemModule: 'ProjectOverviewIndicator', systemField: 'unitCount' },
  { id: 'excel-map-project-overview-site-perimeter', sheetName: '项目概况', row: 18, column: 2, excelFieldName: '周界长度', excelUnit: 'm', systemModule: 'ProjectOverviewIndicator', systemField: 'sitePerimeter' },
  { id: 'excel-map-project-overview-gate-count', sheetName: '项目概况', row: 19, column: 2, excelFieldName: '出入口数量', excelUnit: '个', systemModule: 'ProjectOverviewIndicator', systemField: 'gateCount' },
  { id: 'excel-map-project-overview-landscape-area', sheetName: '项目概况', row: 20, column: 2, excelFieldName: '景观面积', excelUnit: '㎡', systemModule: 'ProjectOverviewIndicator', systemField: 'landscapeArea' },
  { id: 'excel-map-project-overview-hardscape-area', sheetName: '项目概况', row: 21, column: 2, excelFieldName: '硬景面积', excelUnit: '㎡', systemModule: 'ProjectOverviewIndicator', systemField: 'hardscapeArea' },
  { id: 'excel-map-project-overview-softscape-area', sheetName: '项目概况', row: 22, column: 2, excelFieldName: '软景面积', excelUnit: '㎡', systemModule: 'ProjectOverviewIndicator', systemField: 'softscapeArea' },
  { id: 'excel-map-cost-subject-dictionary-code', sheetName: '成本科目及测算词典', row: 2, column: 1, excelFieldName: '科目编码', systemModule: 'CostSubject', systemField: 'code' },
  { id: 'excel-map-cost-subject-dictionary-name', sheetName: '成本科目及测算词典', row: 2, column: 2, excelFieldName: '科目名称', systemModule: 'CostSubject', systemField: 'name' },
  { id: 'excel-map-cost-subject-dictionary-basis', sheetName: '成本科目及测算词典', row: 2, column: 6, excelFieldName: '测算依据', systemModule: 'DetailSubject', systemField: 'measurementBasis' },
  { id: 'excel-map-cost-subject-dictionary-unit', sheetName: '成本科目及测算词典', row: 2, column: 7, excelFieldName: '单位', systemModule: 'UnitDictionary', systemField: 'unitName' },
  { id: 'excel-map-cost-subject-dictionary-tax-rate', sheetName: '成本科目及测算词典', row: 2, column: 8, excelFieldName: '税率', systemModule: 'DetailSubject', systemField: 'defaultTaxRate' },
  { id: 'excel-map-cost-subject-dictionary-allocation', sheetName: '成本科目及测算词典', row: 2, column: 9, excelFieldName: '分摊口径', systemModule: 'DetailSubject', systemField: 'defaultAllocationBasis' },
  { id: 'excel-map-target-cost-quantity', sheetName: '目标成本测算', row: 5, column: 9, excelFieldName: '工程量', excelFormula: '指标数量*含量', systemModule: 'EstimateDetailLine', systemField: 'engineeringQuantity' },
  { id: 'excel-map-target-cost-unit-price', sheetName: '目标成本测算', row: 5, column: 11, excelFieldName: '含税单价', systemModule: 'EstimateDetailLine', systemField: 'unitPriceTaxIncluded' },
  { id: 'excel-map-target-cost-amount-tax-included', sheetName: '目标成本测算', row: 5, column: 12, excelFieldName: '含税金额', excelFormula: '工程量*含税单价', systemModule: 'EstimateDetailLine', systemField: 'amountTaxIncluded' },
  { id: 'excel-map-target-cost-amount-tax-excluded', sheetName: '目标成本测算', row: 5, column: 13, excelFieldName: '不含税金额', excelFormula: '含税金额/(1+税率)', systemModule: 'EstimateDetailLine', systemField: 'amountTaxExcluded' },
  { id: 'excel-map-target-cost-tax-amount', sheetName: '目标成本测算', row: 5, column: 14, excelFieldName: '税额', excelFormula: '含税金额-不含税金额', systemModule: 'EstimateDetailLine', systemField: 'taxAmount' },
  { id: 'excel-map-target-cost-building-unit', sheetName: '目标成本测算', row: 5, column: 15, excelFieldName: '建面单方', systemModule: 'TargetCostSummary', systemField: 'buildingUnitCost' },
  { id: 'excel-map-target-cost-saleable-unit', sheetName: '目标成本测算', row: 5, column: 16, excelFieldName: '可售单方', systemModule: 'TargetCostSummary', systemField: 'saleableUnitCost' },
  { id: 'excel-map-income-residential', sheetName: '收入明细表', row: 5, column: 5, excelFieldName: '住宅销售收入', excelFormula: '可售面积*销售单价', excelUnit: '㎡', systemModule: 'RevenueEstimate', systemField: 'residentialSaleRevenue' },
  { id: 'excel-map-income-commercial', sheetName: '收入明细表', row: 6, column: 5, excelFieldName: '商业销售收入', excelFormula: '可售面积*销售单价', excelUnit: '㎡', systemModule: 'RevenueEstimate', systemField: 'commercialSaleRevenue' },
  { id: 'excel-map-income-parking', sheetName: '收入明细表', row: 8, column: 5, excelFieldName: '车位收入', excelFormula: '车位数量*车位单价', excelUnit: '个', systemModule: 'RevenueEstimate', systemField: 'measurementQuantity', remark: '车位收入按 quantity / 个 / 元每个方式测算' },
  { id: 'excel-map-land-detail-land-price', sheetName: '土地费用明细表', row: 5, column: 4, excelFieldName: '土地出让金', excelSubjectCode: '01.01.01', excelSubjectName: '土地出让金', systemModule: 'DetailSubject', systemField: 'landTransferFee' },
  { id: 'excel-map-land-detail-deed-tax', sheetName: '土地费用明细表', row: 6, column: 4, excelFieldName: '契税', excelSubjectCode: '01.01.02', excelSubjectName: '契税', systemModule: 'DetailSubject', systemField: 'deedTax' },
  { id: 'excel-map-land-detail-service-fee', sheetName: '土地费用明细表', row: 7, column: 4, excelFieldName: '土地交易服务费', excelSubjectCode: '01.01.03', excelSubjectName: '土地交易服务费', systemModule: 'DetailSubject', systemField: 'landTransactionServiceFee' },
  { id: 'excel-map-early-fee-regulation', sheetName: '前期费用明细表', row: 5, column: 4, excelFieldName: '政府规费及行政事业性收费', excelSubjectCode: '02.01.01', excelSubjectName: '政府规费及行政事业性收费', systemModule: 'DetailSubject', systemField: 'governmentFee' },
  { id: 'excel-map-early-fee-survey', sheetName: '前期费用明细表', row: 6, column: 4, excelFieldName: '勘察测绘及权证专项服务费', excelSubjectCode: '02.01.02', excelSubjectName: '勘察测绘及权证专项服务费', systemModule: 'DetailSubject', systemField: 'surveyAndCertificateFee' },
  { id: 'excel-map-early-fee-insurance', sheetName: '前期费用明细表', row: 12, column: 4, excelFieldName: '工程保险及担保费用', excelSubjectCode: '02.05', excelSubjectName: '工程保险及担保费用', systemModule: 'DetailSubject', systemField: 'insuranceGuaranteeFee' },
  { id: 'excel-map-civil-detail-structure', sheetName: '土建明细表', row: 8, column: 4, excelFieldName: '地上主体结构', excelSubjectCode: '03.03.01', excelSubjectName: '地上主体结构', systemModule: 'DetailSubject', systemField: 'aboveGroundStructure' },
  { id: 'excel-map-civil-detail-basement', sheetName: '土建明细表', row: 9, column: 4, excelFieldName: '地下室结构', excelSubjectCode: '03.03.02', excelSubjectName: '地下室结构', systemModule: 'DetailSubject', systemField: 'basementStructure' },
  { id: 'excel-map-civil-detail-waterproof', sheetName: '土建明细表', row: 12, column: 4, excelFieldName: '防水工程', excelSubjectCode: '03.04.02', excelSubjectName: '防水工程', systemModule: 'DetailSubject', systemField: 'waterproofWork' },
  { id: 'excel-map-install-water', sheetName: '安装明细表', row: 5, column: 4, excelFieldName: '给排水工程', excelSubjectCode: '03.05.01', excelSubjectName: '给排水工程', systemModule: 'DetailSubject', systemField: 'waterDrainageWork' },
  { id: 'excel-map-install-electric', sheetName: '安装明细表', row: 6, column: 4, excelFieldName: '强电工程', excelSubjectCode: '03.05.02', excelSubjectName: '强电工程', systemModule: 'DetailSubject', systemField: 'strongElectricWork' },
  { id: 'excel-map-equipment-elevator', sheetName: '设备明细表', row: 5, column: 4, excelFieldName: '电梯工程', excelSubjectCode: '03.06.01', excelSubjectName: '电梯工程', excelUnit: '台', systemModule: 'DetailSubject', systemField: 'elevatorWork' },
  { id: 'excel-map-equipment-chargepile', sheetName: '设备明细表', row: 8, column: 4, excelFieldName: '充电桩工程', excelSubjectCode: '03.06.03', excelSubjectName: '充电桩工程', excelUnit: '个', systemModule: 'DetailSubject', systemField: 'chargingPileWork', remark: '充电桩成本归属地下车位/地库，不创建充电桩业态' },
  { id: 'excel-map-fine-decoration-lobby', sheetName: '精装修明细表', row: 5, column: 4, excelFieldName: '大堂精装修', excelSubjectCode: '05.01.01', excelSubjectName: '大堂精装修', systemModule: 'DetailSubject', systemField: 'lobbyFitout' },
  { id: 'excel-map-outdoor-pipe', sheetName: '室外管网明细表', row: 5, column: 4, excelFieldName: '综合管网工程', excelSubjectCode: '04.01.01', excelSubjectName: '综合管网工程', systemModule: 'DetailSubject', systemField: 'outdoorPipeNetwork' },
  { id: 'excel-map-landscape-hard', sheetName: '景观工程明细表', row: 5, column: 4, excelFieldName: '硬景工程', excelSubjectCode: '04.02.01', excelSubjectName: '硬景工程', systemModule: 'DetailSubject', systemField: 'hardscapeWork' },
  { id: 'excel-map-landscape-soft', sheetName: '景观工程明细表', row: 6, column: 4, excelFieldName: '软景工程', excelSubjectCode: '04.02.02', excelSubjectName: '软景工程', systemModule: 'DetailSubject', systemField: 'softscapeWork' },
  { id: 'excel-map-road-site', sheetName: '道路总平明细表', row: 5, column: 4, excelFieldName: '道路工程', excelSubjectCode: '04.03.01', excelSubjectName: '道路工程', systemModule: 'DetailSubject', systemField: 'roadWork' },
  { id: 'excel-map-allocation-basis', sheetName: '成本分摊测算表', row: 4, column: 3, excelFieldName: '分摊口径', systemModule: 'AllocationRule', systemField: 'allocationBasis' },
  { id: 'excel-map-land-vat-base', sheetName: '土地增值税测算表', row: 4, column: 3, excelFieldName: '土增税清算基础', systemModule: 'TaxEstimate', systemField: 'landVatBase' },
  { id: 'excel-map-tax-vat', sheetName: '税金明细表', row: 4, column: 3, excelFieldName: '增值税', excelFormula: '销项税-进项税', systemModule: 'TaxEstimate', systemField: 'payableVat' },
  { id: 'excel-map-tax-income', sheetName: '税金明细表', row: 8, column: 3, excelFieldName: '企业所得税', excelFormula: '税前利润*所得税税率', systemModule: 'TaxEstimate', systemField: 'incomeTaxAmount' },
  { id: 'excel-map-dropdown-basis', sheetName: '下拉字典', row: 2, column: 1, excelFieldName: '测算依据下拉', systemModule: 'DictionaryItem', systemField: 'measurement_basis' },
  { id: 'excel-map-dropdown-unit', sheetName: '下拉字典', row: 2, column: 2, excelFieldName: '单位下拉', systemModule: 'UnitDictionary', systemField: 'unitName' },
  { id: 'excel-map-dropdown-allocation', sheetName: '下拉字典', row: 2, column: 3, excelFieldName: '分摊口径下拉', systemModule: 'DictionaryItem', systemField: 'allocation_basis' },
  { id: 'excel-map-dashboard-sales-revenue', sheetName: '目标成本汇总表', row: 4, column: 3, excelFieldName: '销售收入', systemModule: 'ProjectCostDashboard', systemField: 'salesRevenue' },
  { id: 'excel-map-dashboard-cost-total', sheetName: '目标成本汇总表', row: 5, column: 3, excelFieldName: '开发成本及费用合计', systemModule: 'ProjectCostDashboard', systemField: 'developmentCostTaxIncluded' },
  { id: 'excel-map-dashboard-pre-tax-profit', sheetName: '目标成本汇总表', row: 6, column: 3, excelFieldName: '税前经营利润', systemModule: 'ProjectCostDashboard', systemField: 'preTaxOperatingProfit' },
  { id: 'excel-map-dashboard-income-tax', sheetName: '目标成本汇总表', row: 8, column: 3, excelFieldName: '所得税', systemModule: 'ProjectCostDashboard', systemField: 'incomeTax' },
  { id: 'excel-map-dashboard-net-profit', sheetName: '目标成本汇总表', row: 9, column: 3, excelFieldName: '税后净利', excelFormula: '税前经营利润-所得税', systemModule: 'ProjectCostDashboard', systemField: 'netProfitAfterTax' }
];

const calculationRuleSeeds: CalculationRuleSeed[] = [
  { code: 'schema_fields_valid', name: 'schema 字段必须可被 seed 正常写入', level: 'blocker' },
  { code: 'unique_keys_valid', name: '唯一键 / upsert where 条件必须正确', level: 'blocker' },
  { code: 'core_enums_required', name: '核心枚举必须存在', level: 'blocker' },
  { code: 'measurement_basis_required', name: '测算依据字典必须补齐', level: 'blocker' },
  { code: 'allocation_basis_required', name: '分摊口径字典必须补齐', level: 'blocker' },
  { code: 'residential_template_enabled', name: '住宅系统模板必须存在并启用', level: 'blocker' },
  { code: 'system_template_locked', name: '系统模板必须 locked，不可直接修改', level: 'blocker' },
  { code: 'system_template_copyable', name: '系统模板必须 copyable', level: 'blocker' },
  { code: 'charging_pile_not_product_type', name: '充电桩不得写入业态表', level: 'blocker' },
  { code: 'parking_income_quantity', name: '车位收入必须按 quantity / 个 / 元每个方式测算', level: 'blocker' },
  { code: 'cost_subject_tree_valid', name: '成本科目树必须存在且 parentCode 不断裂', level: 'blocker' },
  { code: 'tax_subject_excluded_from_detail', name: '税金类科目不得进入普通 DetailSubject / TemplateCostRule', level: 'blocker' },
  { code: 'detail_subject_attached', name: '明细科目必须全部挂接成本科目树', level: 'blocker' },
  { code: 'detail_subject_references_valid', name: '明细科目必须可引用单位、税率、测算依据、分摊口径', level: 'blocker' },
  { code: 'excel_mapping_complete', name: 'Excel 映射必须有文件名、工作表、行、列', level: 'blocker' },
  { code: 'target_summary_metrics_required', name: '目标成本汇总指标必须存在', level: 'blocker' },
  { code: 'calculation_checks_seeded', name: '计算校验规则必须导入并最后执行', level: 'blocker' },
  { code: 'excel_mapping_volume_warning', name: 'Excel 映射数量偏少', level: 'warning' },
  { code: 'cost_subject_v60_sync_warning', name: '成本科目树未完全同步 V60 母版', level: 'warning' },
  { code: 'detail_subject_volume_warning', name: '明细科目数量偏少', level: 'warning' }
];

async function upsertAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@lqdc.local';
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const name = process.env.ADMIN_NAME || '系统管理员';

  await prisma.user.upsert({
    where: { email },
    update: { name, role: 'admin' },
    create: { email, name, passwordHash: await bcrypt.hash(password, 10), role: 'admin' }
  });
}

async function upsertDictionaryItems(items: DictionarySeed[]) {
  for (const item of items) {
    await prisma.dictionaryItem.upsert({
      where: { dictionaryType_dictionaryCode: { dictionaryType: item.type, dictionaryCode: item.code } },
      update: {
        dictionaryName: item.name,
        defaultPrecisionLevel: item.precision,
        defaultSubjectDepth: item.depth,
        isEnabled: true,
        sortOrder: item.sortOrder,
        remark: item.remark,
        updatedBy: 'system-seed'
      },
      create: {
        dictionaryType: item.type,
        dictionaryCode: item.code,
        dictionaryName: item.name,
        defaultPrecisionLevel: item.precision,
        defaultSubjectDepth: item.depth,
        isEnabled: true,
        sortOrder: item.sortOrder,
        remark: item.remark,
        createdBy: 'system-seed',
        updatedBy: 'system-seed'
      }
    });
  }
}

async function seedSystemEnums() {
  await upsertAdmin();
  await upsertDictionaryItems(dictionaryItems.filter((item) => ['project_type', 'development_mode', 'estimate_stage', 'precision_level'].includes(item.type)));
}

async function seedSystemTemplate() {
  await prisma.template.upsert({
    where: { id: SYSTEM_TEMPLATE_ID },
    update: {
      name: '住宅开发目标成本系统模板 V60',
      type: '住宅开发',
      description: SYSTEM_METADATA,
      isDefault: true,
      isActive: true,
      sortOrder: 10
    },
    create: {
      id: SYSTEM_TEMPLATE_ID,
      name: '住宅开发目标成本系统模板 V60',
      type: '住宅开发',
      description: SYSTEM_METADATA,
      isDefault: true,
      isActive: true,
      sortOrder: 10
    }
  });

  await upsertDictionaryItems([
    { type: 'system_template_policy', code: 'residential_template_locked', name: '住宅系统模板锁定', sortOrder: 10, remark: 'templateId=' + SYSTEM_TEMPLATE_ID + ';locked=true' },
    { type: 'system_template_policy', code: 'residential_template_copyable', name: '住宅系统模板可复制', sortOrder: 20, remark: 'templateId=' + SYSTEM_TEMPLATE_ID + ';copyable=true' }
  ]);
}

async function seedProductsAndSpecialOptions() {
  for (const item of productPresets) {
    await prisma.productTypePreset.upsert({
      where: { key: item.key },
      update: {
        name: item.name,
        category: item.category,
        isSaleable: item.isSaleable,
        participateAllocation: item.participateAllocation,
        defaultVatRate: 0.09,
        defaultAllocationMethod: item.category === '车位' ? '按车位数量' : '按建筑面积占比',
        defaultIncomeType: item.defaultIncomeType,
        description: item.description,
        enabled: true,
        sortOrder: item.sortOrder
      },
      create: {
        key: item.key,
        name: item.name,
        category: item.category,
        isSaleable: item.isSaleable,
        participateAllocation: item.participateAllocation,
        defaultVatRate: 0.09,
        defaultAllocationMethod: item.category === '车位' ? '按车位数量' : '按建筑面积占比',
        defaultIncomeType: item.defaultIncomeType,
        description: item.description,
        enabled: true,
        sortOrder: item.sortOrder
      }
    });

    await prisma.templateProduct.upsert({
      where: { templateId_name: { templateId: SYSTEM_TEMPLATE_ID, name: item.name } },
      update: {
        category: item.category,
        isSaleable: item.isSaleable,
        participateAllocation: item.participateAllocation,
        allocationWeight: 1,
        sortOrder: item.sortOrder,
        remark: '住宅系统模板默认业态/成本对象；充电桩不在此表',
        isActive: true,
        disabledAt: null
      },
      create: {
        templateId: SYSTEM_TEMPLATE_ID,
        category: item.category,
        name: item.name,
        isSaleable: item.isSaleable,
        participateAllocation: item.participateAllocation,
        allocationWeight: 1,
        sortOrder: item.sortOrder,
        remark: '住宅系统模板默认业态/成本对象；充电桩不在此表',
        isActive: true
      }
    });
  }

  await upsertDictionaryItems(dictionaryItems.filter((item) => item.type === 'special_option'));
}

function measureUnitFromBasisName(name: string) {
  if (name.includes('数量') || name.includes('户数') || name.includes('出入口') || name.includes('楼栋')) return '个';
  if (name.includes('单元')) return '个';
  if (name.includes('长度') || name.includes('管线') || name.includes('周长')) return 'm';
  if (name.includes('价款') || name.includes('金额') || name.includes('收入') || name.includes('增值税') || name.includes('利润') || name.includes('基础')) return '元';
  return '㎡';
}

function pricingUnitFromQuantityUnit(unit: string) {
  if (unit === '个') return '元/个';
  if (unit === 'm') return '元/m';
  if (unit === '元') return '元/项';
  return '元/㎡';
}

async function seedMetricsBasisAndUnits() {
  for (const item of metricDefinitions) {
    await prisma.projectMetricDefinition.upsert({
      where: { key: item.key },
      update: {
        name: item.name,
        unit: item.unit,
        metricGroup: item.metricGroup,
        scope: item.scope,
        description: item.description,
        enabled: true,
        sortOrder: item.sortOrder
      },
      create: {
        key: item.key,
        name: item.name,
        unit: item.unit,
        metricGroup: item.metricGroup,
        scope: item.scope,
        description: item.description,
        enabled: true,
        sortOrder: item.sortOrder
      }
    });
  }

  await upsertDictionaryItems(dictionaryItems.filter((item) => item.type === 'measurement_basis'));

  for (const unit of units) {
    await prisma.unitDictionary.upsert({
      where: { unitType_unitName: { unitType: unit.unitType, unitName: unit.unitName } },
      update: { unitDescription: unit.description, isEnabled: true, sortOrder: unit.sortOrder, updatedBy: 'system-seed' },
      create: {
        unitType: unit.unitType,
        unitName: unit.unitName,
        unitDescription: unit.description,
        isEnabled: true,
        sortOrder: unit.sortOrder,
        createdBy: 'system-seed',
        updatedBy: 'system-seed'
      }
    });
  }

  for (const basis of dictionaryItems.filter((item) => item.type === 'measurement_basis')) {
    const quantityUnit = measureUnitFromBasisName(basis.name);
    await prisma.measureBasisRule.upsert({
      where: { costCode_basisName: { costCode: 'SYSTEM', basisName: basis.name } },
      update: {
        metricKey: basis.code,
        metricScope: basis.code.startsWith('product_') ? 'product_type' : 'project',
        quantityUnit,
        pricingUnit: pricingUnitFromQuantityUnit(quantityUnit),
        defaultCoefficient: 1,
        quantityFormula: '工程量 = 指标数量 × 含量',
        amountFormula: '含税金额 = 工程量 × 含税单价；不含税金额 = 含税金额 ÷（1 + 税率）；税额 = 含税金额 - 不含税金额',
        enabled: true,
        priority: basis.sortOrder,
        remark: '系统通用测算依据，来自 ' + EXCEL_FILE_NAME
      },
      create: {
        costCode: 'SYSTEM',
        basisName: basis.name,
        metricKey: basis.code,
        metricScope: basis.code.startsWith('product_') ? 'product_type' : 'project',
        quantityUnit,
        pricingUnit: pricingUnitFromQuantityUnit(quantityUnit),
        defaultCoefficient: 1,
        quantityFormula: '工程量 = 指标数量 × 含量',
        amountFormula: '含税金额 = 工程量 × 含税单价；不含税金额 = 含税金额 ÷（1 + 税率）；税额 = 含税金额 - 不含税金额',
        enabled: true,
        priority: basis.sortOrder,
        remark: '系统通用测算依据，来自 ' + EXCEL_FILE_NAME
      }
    });
  }
}

async function seedCostSubjectTree() {
  for (const subject of costSubjects) {
    await prisma.costSubject.upsert({
      where: { code: subject.code },
      update: {
        name: subject.name,
        level: subject.level,
        parentCode: subject.parentCode || null,
        fullPath: subject.fullPath,
        defaultUnit: subject.defaultUnit || null,
        defaultTaxRate: subject.defaultTaxRate ?? 0.09,
        defaultMeasureBasis: subject.defaultMeasureBasis || null,
        defaultAllocationMethod: subject.defaultAllocationMethod || null,
        enabled: true,
        sortOrder: subject.sortOrder
      },
      create: {
        code: subject.code,
        name: subject.name,
        level: subject.level,
        parentCode: subject.parentCode || null,
        fullPath: subject.fullPath,
        defaultUnit: subject.defaultUnit || null,
        defaultTaxRate: subject.defaultTaxRate ?? 0.09,
        defaultMeasureBasis: subject.defaultMeasureBasis || null,
        defaultAllocationMethod: subject.defaultAllocationMethod || null,
        enabled: true,
        sortOrder: subject.sortOrder
      }
    });
  }
}

async function cleanupTaxDetailArtifacts() {
  await prisma.detailSubject.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'detail-09' } },
        { detailSubjectCode: { startsWith: '09.' } },
        { subjectFullPath: { contains: '税金及附加' } }
      ]
    }
  });

  await prisma.templateCostRule.deleteMany({
    where: {
      templateId: SYSTEM_TEMPLATE_ID,
      OR: [
        { costCode: { startsWith: '09.' } },
        { category: '税金及附加' },
        { subjectName: { in: ['增值税', '附加税', '土地增值税', '企业所得税'] } }
      ]
    }
  });
}

async function seedDetailSubjectTree() {
  await cleanupTaxDetailArtifacts();
  const subjectByCode = new Map((await prisma.costSubject.findMany()).map((subject) => [subject.code, subject]));

  for (const detail of detailSubjects) {
    const subject = subjectByCode.get(detail.costSubjectCode);
    if (!subject) throw new Error('缺少明细科目对应成本科目：' + detail.costSubjectCode + ' ' + detail.detailSubjectName);

    await prisma.detailSubject.upsert({
      where: { id: detail.id },
      update: {
        costSubjectId: subject.id,
        detailSubjectCode: detail.detailSubjectCode,
        detailSubjectName: detail.detailSubjectName,
        subjectFullPath: detail.subjectFullPath,
        measurementBasis: detail.measurementBasis,
        defaultIndicatorSource: detail.defaultIndicatorSource,
        defaultQuantityUnit: detail.defaultQuantityUnit,
        defaultPricingUnit: detail.defaultPricingUnit,
        defaultTaxRate: detail.defaultTaxRate,
        defaultProductType: detail.defaultProductType,
        defaultCostObject: detail.defaultCostObject,
        participateAllocation: detail.participateAllocation,
        defaultAllocationBasis: detail.defaultAllocationBasis,
        enterLandVatDeduction: detail.enterLandVatDeduction,
        enterIncomeTaxCost: detail.enterIncomeTaxCost,
        updatedBy: 'system-seed',
        remark: detail.remark
      },
      create: {
        id: detail.id,
        costSubjectId: subject.id,
        detailSubjectCode: detail.detailSubjectCode,
        detailSubjectName: detail.detailSubjectName,
        subjectFullPath: detail.subjectFullPath,
        measurementBasis: detail.measurementBasis,
        defaultIndicatorSource: detail.defaultIndicatorSource,
        defaultQuantityUnit: detail.defaultQuantityUnit,
        defaultPricingUnit: detail.defaultPricingUnit,
        defaultTaxRate: detail.defaultTaxRate,
        defaultProductType: detail.defaultProductType,
        defaultCostObject: detail.defaultCostObject,
        participateAllocation: detail.participateAllocation,
        defaultAllocationBasis: detail.defaultAllocationBasis,
        enterLandVatDeduction: detail.enterLandVatDeduction,
        enterIncomeTaxCost: detail.enterIncomeTaxCost,
        createdBy: 'system-seed',
        updatedBy: 'system-seed',
        remark: detail.remark
      }
    });
  }
}

async function seedTaxAllocationAndTaxAggregation() {
  await upsertDictionaryItems(dictionaryItems.filter((item) => ['tax_rate', 'allocation_basis', 'tax_aggregation_basis'].includes(item.type)));
  await cleanupTaxDetailArtifacts();

  const templateTaxRules = [
    { id: 'template-tax-vat', name: '增值税', rate: 0.09, scope: '一般计税', sortOrder: 10, remark: '应交增值税 = 销项税 - 进项税；税金类科目不进入普通 DetailSubject' },
    { id: 'template-tax-urban-maintenance', name: '城建税', rate: 0.07, scope: '附加税', sortOrder: 20, remark: '附加税基数为应交增值税' },
    { id: 'template-tax-education', name: '教育费附加', rate: 0.03, scope: '附加税', sortOrder: 30, remark: '附加税基数为应交增值税' },
    { id: 'template-tax-local-education', name: '地方教育附加', rate: 0.02, scope: '附加税', sortOrder: 40, remark: '附加税基数为应交增值税' },
    { id: 'template-tax-water-conservancy', name: '水利建设基金', rate: 0, scope: '附加税', sortOrder: 45, remark: '按地区政策参数启用，本阶段只预置规则' },
    { id: 'template-tax-land-vat', name: '土地增值税', rate: 0, scope: '清算测算', sortOrder: 50, remark: '按清算对象归集收入、成本、扣除项目、增值额和增值率' },
    { id: 'template-tax-income-tax', name: '企业所得税', rate: 0.25, scope: '所得税', sortOrder: 60, remark: '企业所得税 = 税前利润 × 所得税税率' }
  ];

  for (const rule of templateTaxRules) {
    await prisma.templateTaxRule.upsert({
      where: { id: rule.id },
      update: { templateId: SYSTEM_TEMPLATE_ID, name: rule.name, rate: rule.rate, scope: rule.scope, remark: rule.remark, sortOrder: rule.sortOrder },
      create: { id: rule.id, templateId: SYSTEM_TEMPLATE_ID, name: rule.name, rate: rule.rate, scope: rule.scope, remark: rule.remark, sortOrder: rule.sortOrder }
    });
  }

  const taxEstimateSeeds = [
    { id: 'seed-tax-estimate-vat', taxType: '增值税', taxRate: 0.09, remark: '税金类科目进入 TaxEstimate，不进入普通 DetailSubject' },
    { id: 'seed-tax-estimate-surtax', taxType: '附加税', taxRate: 0.12, remark: '附加税 = 应交增值税 × 附加税率' },
    { id: 'seed-tax-estimate-land-vat', taxType: '土地增值税', taxRate: 0, remark: '按土增税清算基础测算' },
    { id: 'seed-tax-estimate-income-tax', taxType: '企业所得税', taxRate: 0.25, remark: '按所得税计税基础 / 税前利润测算' }
  ];

  for (const tax of taxEstimateSeeds) {
    await prisma.taxEstimate.upsert({
      where: { id: tax.id },
      update: {
        projectId: SYSTEM_PROJECT_ID,
        versionId: SYSTEM_VERSION_ID,
        taxType: tax.taxType,
        taxRate: tax.taxRate,
        updatedBy: 'system-seed',
        remark: tax.remark
      },
      create: {
        id: tax.id,
        projectId: SYSTEM_PROJECT_ID,
        versionId: SYSTEM_VERSION_ID,
        taxType: tax.taxType,
        taxRate: tax.taxRate,
        createdBy: 'system-seed',
        updatedBy: 'system-seed',
        remark: tax.remark
      }
    });
  }

  for (const detail of detailSubjects) {
    await prisma.templateCostRule.upsert({
      where: { id: 'template-cost-rule-' + detail.detailSubjectCode.replace(/\./g, '-') },
      update: {
        templateId: SYSTEM_TEMPLATE_ID,
        costCode: detail.detailSubjectCode,
        category: detail.subjectFullPath.split(' > ')[0],
        subjectName: detail.detailSubjectName,
        sourceTable: '成本科目及测算词典',
        measureBasis: detail.measurementBasis,
        unit: detail.defaultQuantityUnit,
        defaultTaxRate: detail.defaultTaxRate,
        allocationMethod: detail.defaultAllocationBasis,
        sortOrder: Number(detail.costSubjectCode.replace(/\./g, '')) || 0,
        remark: '来自 ' + EXCEL_FILE_NAME
      },
      create: {
        id: 'template-cost-rule-' + detail.detailSubjectCode.replace(/\./g, '-'),
        templateId: SYSTEM_TEMPLATE_ID,
        costCode: detail.detailSubjectCode,
        category: detail.subjectFullPath.split(' > ')[0],
        subjectName: detail.detailSubjectName,
        sourceTable: '成本科目及测算词典',
        measureBasis: detail.measurementBasis,
        unit: detail.defaultQuantityUnit,
        defaultTaxRate: detail.defaultTaxRate,
        allocationMethod: detail.defaultAllocationBasis,
        sortOrder: Number(detail.costSubjectCode.replace(/\./g, '')) || 0,
        remark: '来自 ' + EXCEL_FILE_NAME
      }
    });
  }
}

async function seedRevenueAndSummaryMetrics() {
  await upsertDictionaryItems(dictionaryItems.filter((item) => ['revenue_type', 'target_cost_summary_metric'].includes(item.type)));
}

async function seedExcelMappings() {
  for (const item of excelMappings) {
    await prisma.excelMapping.upsert({
      where: { id: item.id },
      update: {
        excelFileName: EXCEL_FILE_NAME,
        excelFileVersion: EXCEL_FILE_VERSION,
        sheetName: item.sheetName,
        excelRow: item.row,
        excelColumn: item.column,
        excelFieldName: item.excelFieldName,
        excelSubjectCode: item.excelSubjectCode,
        excelSubjectName: item.excelSubjectName,
        excelFormula: item.excelFormula,
        excelUnit: item.excelUnit,
        excelTaxRate: item.excelTaxRate,
        excelAllocationBasis: item.excelAllocationBasis,
        systemModule: item.systemModule,
        systemField: item.systemField,
        mappingStatus: 'active',
        importBatch: IMPORT_BATCH,
        updatedBy: 'system-seed',
        remark: item.remark
      },
      create: {
        id: item.id,
        excelFileName: EXCEL_FILE_NAME,
        excelFileVersion: EXCEL_FILE_VERSION,
        sheetName: item.sheetName,
        excelRow: item.row,
        excelColumn: item.column,
        excelFieldName: item.excelFieldName,
        excelSubjectCode: item.excelSubjectCode,
        excelSubjectName: item.excelSubjectName,
        excelFormula: item.excelFormula,
        excelUnit: item.excelUnit,
        excelTaxRate: item.excelTaxRate,
        excelAllocationBasis: item.excelAllocationBasis,
        systemModule: item.systemModule,
        systemField: item.systemField,
        mappingStatus: 'active',
        importBatch: IMPORT_BATCH,
        createdBy: 'system-seed',
        updatedBy: 'system-seed',
        remark: item.remark
      }
    });
  }
}

async function seedCalculationChecks() {
  for (const rule of calculationRuleSeeds) {
    await prisma.calculationCheck.upsert({
      where: { id: 'seed-check-rule-' + rule.code },
      update: {
        projectId: SYSTEM_PROJECT_ID,
        versionId: SYSTEM_VERSION_ID,
        checkObjectType: 'seed_rule',
        checkRule: rule.name,
        checkLevel: rule.level,
        checkResult: 'pending',
        errorMessage: null,
        isProcessed: false,
        processedBy: null,
        processedAt: null,
        updatedBy: 'system-seed',
        remark: '04-10A Seed 数据补齐验收规则：' + rule.code
      },
      create: {
        id: 'seed-check-rule-' + rule.code,
        projectId: SYSTEM_PROJECT_ID,
        versionId: SYSTEM_VERSION_ID,
        checkObjectType: 'seed_rule',
        checkRule: rule.name,
        checkLevel: rule.level,
        checkResult: 'pending',
        errorMessage: null,
        isProcessed: false,
        createdBy: 'system-seed',
        updatedBy: 'system-seed',
        remark: '04-10A Seed 数据补齐验收规则：' + rule.code
      }
    });
  }
}

async function runBatch(batchResults: BatchResult[], batchNo: number, batchName: string, task: () => Promise<void>) {
  try {
    await task();
    batchResults.push({ batchNo, batchName, status: '通过' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    batchResults.push({ batchNo, batchName, status: '失败', message });
    throw error;
  }
}

function relatedMessages(code: string, messages: string[]) {
  return messages.filter((message) => {
    if (code === 'schema_fields_valid') return message.includes('schema 字段');
    if (code === 'unique_keys_valid') return message.includes('唯一键') || message.includes('重复');
    if (code === 'core_enums_required') return message.includes('核心枚举缺失');
    if (code === 'measurement_basis_required') return message.includes('测算依据字典缺失');
    if (code === 'allocation_basis_required') return message.includes('分摊口径字典缺失');
    if (code === 'residential_template_enabled') return message.includes('住宅模板');
    if (code === 'system_template_locked') return message.includes('locked') || message.includes('直接修改');
    if (code === 'system_template_copyable') return message.includes('copyable') || message.includes('不可复制');
    if (code === 'charging_pile_not_product_type') return message.includes('充电桩被创建为业态');
    if (code === 'parking_income_quantity') return message.includes('车位收入');
    if (code === 'cost_subject_tree_valid') return message.includes('成本科目树');
    if (code === 'tax_subject_excluded_from_detail') return message.includes('税金类科目进入普通');
    if (code === 'detail_subject_attached') return message.includes('未挂接成本科目树');
    if (code === 'detail_subject_references_valid') return message.includes('无法引用');
    if (code === 'excel_mapping_complete') return message.includes('Excel 映射缺少');
    if (code === 'target_summary_metrics_required') return message.includes('目标成本汇总指标');
    if (code === 'calculation_checks_seeded') return message.includes('计算校验规则');
    if (code === 'excel_mapping_volume_warning') return message.includes('Excel 映射数量偏少');
    if (code === 'cost_subject_v60_sync_warning') return message.includes('成本科目树未完全同步');
    if (code === 'detail_subject_volume_warning') return message.includes('明细科目数量偏少');
    return false;
  });
}

async function validateSeed(batchResults: BatchResult[]) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const deferred: string[] = [
    'AI 推荐、历史项目库、地区经验库正式数据后置到第二阶段',
    '动态成本、合约规划、现金流后置到第二阶段',
    '系统模板 locked/copyable 当前按现有 schema 写入 Template.description 和 system_template_policy 字典，后续可加显式字段增强约束'
  ];

  const requiredEnumTypes = ['project_type', 'development_mode', 'estimate_stage', 'precision_level'];
  for (const type of requiredEnumTypes) {
    const count = await prisma.dictionaryItem.count({ where: { dictionaryType: type, isEnabled: true } });
    if (count === 0) blockers.push('核心枚举缺失：' + type);
  }

  const enumRows = await prisma.dictionaryItem.findMany({ select: { dictionaryType: true, dictionaryCode: true } });
  const enumKeys = new Set<string>();
  for (const row of enumRows) {
    const key = row.dictionaryType + ':' + row.dictionaryCode;
    if (enumKeys.has(key)) blockers.push('唯一键/枚举 code 重复：' + key);
    enumKeys.add(key);
  }

  const requiredMeasurementBasisCodes = ['base_area', 'sales_revenue', 'vat_amount', 'pre_tax_profit', 'income_tax_base', 'land_vat_base', 'charging_pile_count', 'road_area', 'pipe_length'];
  for (const code of requiredMeasurementBasisCodes) {
    const item = await prisma.dictionaryItem.findUnique({ where: { dictionaryType_dictionaryCode: { dictionaryType: 'measurement_basis', dictionaryCode: code } } });
    if (!item?.isEnabled) blockers.push('测算依据字典缺失：' + code);
  }

  const requiredAllocationBasisCodes = ['civil_defense_area', 'heating_area', 'prefabricated_area', 'antique_building_area', 'landscape_area', 'basement_parking_area', 'charging_pile_count', 'parking_count', 'beneficiary_object'];
  for (const code of requiredAllocationBasisCodes) {
    const item = await prisma.dictionaryItem.findUnique({ where: { dictionaryType_dictionaryCode: { dictionaryType: 'allocation_basis', dictionaryCode: code } } });
    if (!item?.isEnabled) blockers.push('分摊口径字典缺失：' + code);
  }

  const template = await prisma.template.findUnique({ where: { id: SYSTEM_TEMPLATE_ID } });
  if (!template || !template.isActive || template.type !== '住宅开发') blockers.push('住宅模板缺失或未启用');
  if (!template?.description?.includes('locked=true') || !template?.description?.includes('editable=false')) blockers.push('系统模板可直接修改或未记录 locked');
  if (!template?.description?.includes('copyable=true')) blockers.push('系统模板不可复制或未记录 copyable');

  const chargingPileProductCount = await prisma.productTypePreset.count({
    where: { OR: [{ key: { contains: 'charging', mode: 'insensitive' } }, { name: { contains: '充电桩' } }] }
  });
  const chargingPileTemplateProductCount = await prisma.templateProduct.count({ where: { templateId: SYSTEM_TEMPLATE_ID, name: { contains: '充电桩' } } });
  if (chargingPileProductCount > 0 || chargingPileTemplateProductCount > 0) blockers.push('充电桩被创建为业态');

  const chargingPileMetric = await prisma.projectMetricDefinition.findUnique({ where: { key: 'charging_pile_count' } });
  const chargingPileOption = await prisma.dictionaryItem.findUnique({ where: { dictionaryType_dictionaryCode: { dictionaryType: 'special_option', dictionaryCode: 'charging_pile' } } });
  if (!chargingPileMetric || !chargingPileOption) blockers.push('充电桩未作为项目概况指标和条件性科目开关');

  const parkingIncomeCodes = ['parking_sale', 'underground_parking_sale', 'civil_defense_parking_sale', 'non_civil_defense_parking_sale', 'mechanical_parking_sale', 'charging_pile_parking_sale'];
  for (const code of parkingIncomeCodes) {
    const parkingIncome = await prisma.dictionaryItem.findUnique({ where: { dictionaryType_dictionaryCode: { dictionaryType: 'revenue_type', dictionaryCode: code } } });
    if (!parkingIncome?.remark?.includes('measurementMode=quantity') || !parkingIncome.remark.includes('pricingUnit=元/个')) blockers.push('车位收入按面积测算或未按 quantity / 个 / 元每个记录：' + code);
  }

  const subjects = await prisma.costSubject.findMany();
  if (subjects.length === 0) blockers.push('成本科目树缺失');
  const subjectCodes = new Set(subjects.map((subject) => subject.code));
  for (const subject of subjects) {
    if (subject.parentCode && !subjectCodes.has(subject.parentCode)) blockers.push('成本科目树 parentCode 断裂：' + subject.code + ' -> ' + subject.parentCode);
  }

  const details = await prisma.detailSubject.findMany();
  if (details.length === 0) blockers.push('明细科目树缺失');
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  for (const detail of details) {
    if (!subjectIds.has(detail.costSubjectId)) blockers.push('明细科目未挂接成本科目树：' + detail.detailSubjectName);
  }

  const taxDetailCount = await prisma.detailSubject.count({
    where: { OR: [{ detailSubjectCode: { startsWith: '09.' } }, { subjectFullPath: { contains: '税金及附加' } }] }
  });
  const taxCostRuleCount = await prisma.templateCostRule.count({
    where: { templateId: SYSTEM_TEMPLATE_ID, OR: [{ costCode: { startsWith: '09.' } }, { category: '税金及附加' }] }
  });
  if (taxDetailCount > 0 || taxCostRuleCount > 0) blockers.push('税金类科目进入普通 DetailSubject / TemplateCostRule');

  const basisNames = new Set((await prisma.dictionaryItem.findMany({ where: { dictionaryType: 'measurement_basis' }, select: { dictionaryName: true } })).map((item) => item.dictionaryName));
  const allocationBasisNames = new Set((await prisma.dictionaryItem.findMany({ where: { dictionaryType: 'allocation_basis' }, select: { dictionaryName: true } })).map((item) => item.dictionaryName));
  const unitNames = new Set((await prisma.unitDictionary.findMany({ select: { unitName: true } })).map((unit) => unit.unitName));
  for (const detail of details) {
    if (!detail.measurementBasis || !basisNames.has(detail.measurementBasis)) blockers.push('明细科目无法引用测算依据：' + detail.detailSubjectName + ' / ' + detail.measurementBasis);
    if (!detail.defaultQuantityUnit || !unitNames.has(detail.defaultQuantityUnit)) blockers.push('明细科目无法引用计量单位：' + detail.detailSubjectName + ' / ' + detail.defaultQuantityUnit);
    if (!detail.defaultPricingUnit || !unitNames.has(detail.defaultPricingUnit)) blockers.push('明细科目无法引用计价单位：' + detail.detailSubjectName + ' / ' + detail.defaultPricingUnit);
    if (!detail.defaultAllocationBasis || !allocationBasisNames.has(detail.defaultAllocationBasis)) blockers.push('明细科目无法引用分摊口径：' + detail.detailSubjectName + ' / ' + detail.defaultAllocationBasis);
    if (detail.defaultTaxRate === null || detail.defaultTaxRate === undefined) blockers.push('明细科目无法引用税率：' + detail.detailSubjectName);
  }

  const incompleteMappings = await prisma.excelMapping.count({
    where: { OR: [{ excelFileName: '' }, { sheetName: '' }, { excelRow: null }, { excelColumn: null }] }
  });
  const mappingCount = await prisma.excelMapping.count({ where: { excelFileName: EXCEL_FILE_NAME } });
  if (mappingCount === 0 || incompleteMappings > 0) blockers.push('Excel 映射缺少文件名、工作表、行、列');

  const summaryMetricCount = await prisma.dictionaryItem.count({ where: { dictionaryType: 'target_cost_summary_metric', isEnabled: true } });
  if (summaryMetricCount === 0) blockers.push('目标成本汇总指标缺失');

  const calculationCheckCount = await prisma.calculationCheck.count({ where: { projectId: SYSTEM_PROJECT_ID, versionId: SYSTEM_VERSION_ID, checkObjectType: 'seed_rule' } });
  if (calculationCheckCount < calculationRuleSeeds.length) blockers.push('计算校验规则未导入');

  const taxRuleCount = await prisma.templateTaxRule.count({ where: { templateId: SYSTEM_TEMPLATE_ID } });
  const taxEstimateCount = await prisma.taxEstimate.count({ where: { projectId: SYSTEM_PROJECT_ID, versionId: SYSTEM_VERSION_ID } });
  if (taxRuleCount === 0 || taxEstimateCount === 0) blockers.push('税金类科目未进入 TaxRule / TaxEstimate 相关规则');

  if (mappingCount < 55) warnings.push('Excel 映射数量偏少，后续需要按 V60 母版完整补齐所有工作表字段映射；当前 04-10A 已补齐第一阶段核心映射');
  if (subjects.length < 110) warnings.push('成本科目树未完全同步 V60 母版，后续需要继续补齐完整一级至明细科目树；当前 04-10A 已补齐第一阶段核心树');
  if (details.length < 65) warnings.push('明细科目数量偏少，后续需要继续按 Excel 母版完整补齐所有明细行；当前 04-10A 已补齐第一阶段核心明细');

  for (const rule of calculationRuleSeeds) {
    const blockerMatches = relatedMessages(rule.code, blockers);
    const warningMatches = relatedMessages(rule.code, warnings);
    const result = blockerMatches.length > 0 ? 'failed' : warningMatches.length > 0 ? 'warning' : 'passed';
    const message = [...blockerMatches, ...warningMatches].join('；') || null;

    await prisma.calculationCheck.upsert({
      where: { id: 'seed-check-rule-' + rule.code },
      update: {
        checkRule: rule.name,
        checkLevel: rule.level,
        checkResult: result,
        errorMessage: message,
        isProcessed: true,
        processedBy: 'system-seed',
        processedAt: new Date(),
        updatedBy: 'system-seed'
      },
      create: {
        id: 'seed-check-rule-' + rule.code,
        projectId: SYSTEM_PROJECT_ID,
        versionId: SYSTEM_VERSION_ID,
        checkObjectType: 'seed_rule',
        checkRule: rule.name,
        checkLevel: rule.level,
        checkResult: result,
        errorMessage: message,
        isProcessed: true,
        processedBy: 'system-seed',
        processedAt: new Date(),
        createdBy: 'system-seed',
        updatedBy: 'system-seed'
      }
    });
  }

  console.log('\n04-10A Seed 数据补齐验收结果');
  console.table(batchResults.map((result) => ({ 批次: result.batchNo, 名称: result.batchName, 结果: result.status, 说明: result.message || '' })));
  console.log('\n统计：');
  console.log('成本科目数量：' + subjects.length);
  console.log('明细科目数量：' + details.length);
  console.log('Excel 映射数量：' + mappingCount);
  console.log('blocker：' + blockers.length);
  console.log('warning：' + warnings.length);
  console.log('\n阻断错误 blocker：');
  console.log(blockers.length === 0 ? '无' : blockers.map((item) => '- ' + item).join('\n'));
  console.log('\n警告问题 warning：');
  console.log(warnings.length === 0 ? '无' : warnings.map((item) => '- ' + item).join('\n'));
  console.log('\n可第二阶段后置的问题：');
  console.log(deferred.map((item) => '- ' + item).join('\n'));
  console.log('\n是否允许进入下一步：' + (blockers.length === 0 ? '允许' : '不允许'));

  if (blockers.length > 0) {
    throw new Error('04-10A Seed 数据补齐验收未通过，存在阻断错误：' + blockers.join('；'));
  }
}

async function main() {
  const batchResults: BatchResult[] = [];

  await runBatch(batchResults, 1, '系统枚举', seedSystemEnums);
  await runBatch(batchResults, 2, '系统模板', seedSystemTemplate);
  await runBatch(batchResults, 3, '业态模板 / 成本对象 / 条件性科目开关', seedProductsAndSpecialOptions);
  await runBatch(batchResults, 4, '项目概况指标 / 测算依据 / 单位', seedMetricsBasisAndUnits);
  await runBatch(batchResults, 5, '成本科目树', seedCostSubjectTree);
  await runBatch(batchResults, 6, '明细科目树', seedDetailSubjectTree);
  await runBatch(batchResults, 7, '税率 / 分摊口径 / 税务归集口径', seedTaxAllocationAndTaxAggregation);
  await runBatch(batchResults, 8, '收入类型 / 目标成本汇总指标', seedRevenueAndSummaryMetrics);
  await runBatch(batchResults, 9, 'Excel 母版映射', seedExcelMappings);
  await runBatch(batchResults, 10, '计算校验规则', seedCalculationChecks);

  await validateSeed(batchResults);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

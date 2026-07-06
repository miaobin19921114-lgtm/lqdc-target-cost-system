import ExcelJS from 'exceljs';

export const EXCEL_TEMPLATE_CODE = 'LQDC_TARGET_COST';
export const EXCEL_TEMPLATE_VERSION = 'V60';
export const EXCEL_SUBJECT_VERSION = 'V60';
export const EXCEL_MAX_FILE_SIZE = 20 * 1024 * 1024;

export const V60_SHEET_NAMES = [
  '项目概况',
  '测算控制中心',
  '目标成本汇总表',
  '目标成本测算',
  '收入明细表',
  '土地费用明细表',
  '前期费用明细表',
  '各专业明细表',
  '成本分摊测算表',
  '土地增值税测算表',
  '税金明细表',
  '成本科目及测算词典',
  '下拉字典'
] as const;

const OPTIONAL_SOURCE_SHEET_NAME = '来源说明';

export type ExcelIssueLevel = 'error' | 'warning' | 'info';

export type ExcelIssue = {
  level: ExcelIssueLevel;
  code: string;
  sheetName: string;
  rowNumber?: number | null;
  columnName?: string;
  field?: string;
  rawValue?: string;
  reason: string;
  suggestion: string;
};

export type ExcelSheetResult = {
  name: string;
  expected: boolean;
  status: 'parsed' | 'missing' | 'extra';
  rowCount: number;
  columnCount: number;
  issueCount: number;
};

export type ExcelPreviewResponse = Awaited<ReturnType<typeof parseV60WorkbookPreview>>;

export type ParsedOverviewField = {
  field: string;
  value: string;
};

export type ParsedControlField = {
  field: string;
  value: string;
};

export type ParsedRevenueRow = {
  productName: string;
  saleableArea: number;
  salePrice: number;
  taxRate: number;
  remark: string;
};

export type ParsedCostRow = {
  sheetName: string;
  professionalGroup: string;
  costCode: string;
  detailName: string;
  regionOrProductType: string;
  measureBasis: string;
  quantity: number;
  manualQuantity: number | null;
  excelImportedQuantity: number | null;
  quantitySourceNote: string;
  unit: string;
  taxInclusiveUnitPrice: number;
  taxRate: number;
  remark: string;
};

export type ParsedAllocationRow = {
  costCode: string;
  detailName: string;
  allocationMethod: string;
  productTypeName: string;
  allocationWeight: number;
  allocationAmount: number;
  remark: string;
};

export type ParsedTaxField = {
  field: string;
  value: string;
};

export type ParsedV60ImportData = {
  overview: ParsedOverviewField[];
  controlCenter: ParsedControlField[];
  revenues: ParsedRevenueRow[];
  costs: ParsedCostRow[];
  allocations: ParsedAllocationRow[];
  landVat: ParsedTaxField[];
  taxes: ParsedTaxField[];
};

type WorkbookSource = {
  project?: any;
  version?: any;
  dictionaryRows?: any[];
};

const sheetHeaders: Record<string, string[]> = {
  项目概况: ['字段', '值', '单位', '说明'],
  测算控制中心: ['控制项', '当前值', '说明'],
  目标成本汇总表: ['成本编码', '一级科目', '二级科目', '三级科目', '含税金额', '不含税金额', '税额'],
  目标成本测算: ['成本编码', '一级科目', '二级科目', '三级科目', '明细科目', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '工程量来源', '工程量状态', '金额状态', '测算公式', '单价来源', '单价单位', '缺失项', '下一步建议'],
  收入明细表: ['业态', '可售面积', '含税销售单价', '税率', '含税收入', '不含税收入', '税额', '备注'],
  土地费用明细表: ['成本编码', '科目', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '备注', '工程量来源', '工程量状态', '金额状态', '测算公式', '单价来源', '单价单位', '缺失项', '下一步建议'],
  前期费用明细表: ['成本编码', '科目', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '备注', '工程量来源', '工程量状态', '金额状态', '测算公式', '单价来源', '单价单位', '缺失项', '下一步建议'],
  各专业明细表: ['专业', '成本编码', '科目', '产品/区域', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '备注', '工程量来源', '工程量状态', '金额状态', '测算公式', '单价来源', '单价单位', '缺失项', '下一步建议'],
  成本分摊测算表: ['成本编码', '科目', '分摊方式', '业态', '分摊权重', '分摊金额', '备注'],
  土地增值税测算表: ['项目', '金额', '税率/比例', '说明'],
  税金明细表: ['税种/参数', '金额/税率', '说明'],
  成本科目及测算词典: ['成本编码', '一级科目', '二级科目', '三级科目', '明细科目', '测算依据', '单位', '默认税率', '适用业态', '启用'],
  下拉字典: ['字典类型', '字典值', '说明'],
  来源说明: ['类型', '显示值', '说明', '下一步建议']
};

const formulaErrorValues = ['#REF!', '#VALUE!', '#NAME?', '#DIV/0!', '#N/A'];

export function isSupportedTemplateVersion(templateVersion: string | null | undefined) {
  return !templateVersion || templateVersion.toUpperCase() === EXCEL_TEMPLATE_VERSION;
}

export function safeExcelFileName(value: string) {
  return value.replace(/[\\/:*?"<>|\r\n]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 90) || '未命名';
}

export function excelError(code: string, message: string, status = 400) {
  return {
    body: { success: false, error: { code, message } },
    status
  };
}

function n(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function d(value: unknown) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function addHeaders(ws: ExcelJS.Worksheet, sheetName: string) {
  ws.columns = (sheetHeaders[sheetName] || ['字段', '值']).map((header) => ({ header, key: header, width: Math.max(14, header.length * 2 + 8) }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF4F7' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function addRows(ws: ExcelJS.Worksheet, rows: Array<Array<string | number | boolean | null | undefined>>) {
  for (const row of rows) ws.addRow(row.map((item) => item ?? ''));
}

function costPath(row: any) {
  const path = String(row.costSubject?.fullPath || row.costSubject?.name || row.detailName || '').split(/[>/／/]/).map((item) => item.trim()).filter(Boolean);
  return {
    code: row.costSubject?.code || '',
    level1: path[0] || row.costSubject?.name || '',
    level2: path[1] || '',
    level3: path[2] || '',
    detail: row.detailName || path[path.length - 1] || row.costSubject?.name || ''
  };
}

const quantitySourceLabels: Record<string, string> = {
  locked: '已锁定',
  drawing_measured: '图纸算量',
  excel_imported: 'Excel 导入',
  manual_override: '手工覆盖',
  from_engineering_metric: '工程量指标',
  inferred_by_indicator_content: '系统推算',
  template_default: '模板默认'
};

const quantityStatusLabels: Record<string, string> = {
  ...quantitySourceLabels,
  missing_basis: '缺少指标基数',
  missing_content_rule: '缺少含量规则',
  normal: '正常'
};

const amountStatusLabels: Record<string, string> = {
  calculated: '已计算',
  missing_unit_price: '缺少单价',
  missing_quantity: '缺少工程量',
  manual_amount: '手工金额',
  imported_amount: '导入金额',
  pending: '待补充'
};

const unitPriceSourceLabels: Record<string, string> = {
  excel_imported: 'Excel 导入',
  system_default: '系统默认',
  region_price_library: '地区价格库',
  user_project_manual: '项目手工',
  historical_project: '历史项目',
  contract_price: '合同价',
  market_inquiry: '市场询价',
  supplier_quote: '供应商报价'
};

const missingLabels: Record<string, string> = {
  missing_basis: '缺少指标基数',
  missing_content_rule: '缺少含量规则',
  missing_unit_price: '缺少单价'
};

const nextStepTexts: Record<string, string> = {
  missing_basis: '请先在项目指标或工程量指标中补充对应基数',
  missing_content_rule: '请先维护该科目的含量规则，或手工录入工程量',
  missing_unit_price: '请补充含税单价后重新生成金额',
  template_default: '当前使用模板默认工程量，建议复核',
  manual_override: '当前工程量由用户手工录入，系统推算值不会自动覆盖',
  locked: '当前工程量已锁定，后续推算和导入不会覆盖'
};

const formulaLabels: Record<string, string> = {
  lockedQuantity: '锁定工程量',
  drawingMeasuredQuantity: '图纸算量工程量',
  excelImportedQuantity: 'Excel 导入工程量',
  manualQuantity: '手工录入工程量',
  engineeringMetricQuantity: '工程量指标',
  templateDefaultQuantity: '模板默认工程量',
  'measureValue × coefficient': '指标基数 × 含量系数'
};

function labelOf(map: Record<string, string>, value: unknown) {
  const key = String(value || '').trim();
  return key ? (map[key] || key) : '';
}

function quantityBusinessFields(row: any) {
  const quantityStatus = String(row.quantityStatus || row.quantitySource || '').trim();
  const amountStatus = String(row.amountStatus || '').trim();
  const missing = [quantityStatus, amountStatus].filter((item) => missingLabels[item]).map((item) => missingLabels[item]);
  const nextSteps = [quantityStatus, amountStatus].filter((item) => nextStepTexts[item]).map((item) => nextStepTexts[item]);
  return [
    labelOf(quantitySourceLabels, row.quantitySource || quantityStatus),
    labelOf(quantityStatusLabels, quantityStatus),
    labelOf(amountStatusLabels, amountStatus),
    labelOf(formulaLabels, row.quantityFormula),
    labelOf(unitPriceSourceLabels, row.unitPriceSourceType),
    row.pricingUnit || '',
    Array.from(new Set(missing)).join('；'),
    Array.from(new Set(nextSteps)).join('；')
  ];
}

function fillProjectOverview(ws: ExcelJS.Worksheet, source?: WorkbookSource) {
  const project = source?.project || {};
  const version = source?.version || {};
  addRows(ws, [
    ['项目名称', project.name || '', '', '当前项目名称'],
    ['城市', project.city || '', '', ''],
    ['区县', project.district || '', '', ''],
    ['当前版本', version.name || '', '', ''],
    ['版本阶段', version.stage || '', '', ''],
    ['版本状态', version.status || 'draft', '', 'draft/locked/final'],
    ['占地面积', n(project.landArea), '㎡', ''],
    ['容积率', n(project.plotRatio), '', ''],
    ['总建筑面积', n(project.totalBuildingArea), '㎡', ''],
    ['计容建筑面积', n(project.capacityBuildingArea), '㎡', ''],
    ['可售面积', n(project.saleableArea), '㎡', ''],
    ['车位数量', n(project.parkingCount), '个', ''],
    ['充电桩数量', n(project.chargingPileCount), '个', '']
  ]);
}

function fillControlCenter(ws: ExcelJS.Worksheet, source?: WorkbookSource) {
  addRows(ws, [
    ['模板编码', EXCEL_TEMPLATE_CODE, ''],
    ['模板版本', EXCEL_TEMPLATE_VERSION, '第一批仅支持标准 V60 母版'],
    ['科目版本', EXCEL_SUBJECT_VERSION, ''],
    ['当前项目', source?.project?.name || '', ''],
    ['当前版本', source?.version?.name || '', ''],
    ['导出时间', new Date().toLocaleString('zh-CN'), '']
  ]);
}

function fillCosts(ws: ExcelJS.Worksheet, source: WorkbookSource | undefined, mode: 'summary' | 'target' | 'land' | 'pre' | 'professional') {
  const costs = source?.version?.costs || [];
  const filtered = costs.filter((row: any) => {
    const code = String(row.costSubject?.code || '');
    if (mode === 'land') return code.startsWith('01');
    if (mode === 'pre') return code.startsWith('02');
    if (mode === 'professional') return !code.startsWith('01') && !code.startsWith('02');
    return true;
  });

  if (mode === 'summary') {
    const grouped = new Map<string, { path: ReturnType<typeof costPath>; inc: number; ex: number; tax: number }>();
    for (const row of filtered) {
      const path = costPath(row);
      const key = `${path.code}-${path.level1}-${path.level2}-${path.level3}`;
      const current = grouped.get(key) || { path, inc: 0, ex: 0, tax: 0 };
      current.inc += n(row.taxInclusiveAmount);
      current.ex += n(row.taxExclusiveAmount);
      current.tax += n(row.taxAmount);
      grouped.set(key, current);
    }
    addRows(ws, Array.from(grouped.values()).map((row) => [row.path.code, row.path.level1, row.path.level2, row.path.level3, row.inc, row.ex, row.tax]));
    return;
  }

  addRows(ws, filtered.map((row: any) => {
    const path = costPath(row);
    const base = [path.code, path.detail, row.measureBasis || '', n(row.quantity), row.unit || '', n(row.taxInclusiveUnitPrice), n(row.taxRate), n(row.taxInclusiveAmount), row.remark || ''];
    const sourceFields = quantityBusinessFields(row);
    if (mode === 'target') return [path.code, path.level1, path.level2, path.level3, path.detail, row.measureBasis || '', n(row.quantity), row.unit || '', n(row.taxInclusiveUnitPrice), n(row.taxRate), n(row.taxInclusiveAmount), ...sourceFields];
    if (mode === 'professional') return [row.professionalGroup || path.level1 || '未分类', ...base, ...sourceFields];
    return [...base, ...sourceFields];
  }));
}

function fillRevenue(ws: ExcelJS.Worksheet, source?: WorkbookSource) {
  const revenues = source?.version?.revenues || [];
  addRows(ws, revenues.map((row: any) => [
    row.productType?.name || '',
    n(row.saleableArea),
    n(row.salePrice),
    n(row.taxRate),
    n(row.taxInclusiveRevenue),
    n(row.taxExclusiveRevenue),
    n(row.taxAmount),
    row.remark || ''
  ]));
}

function fillTaxes(ws: ExcelJS.Worksheet, source?: WorkbookSource, landVat = false) {
  const taxes = source?.version?.taxes;
  const rows = landVat
    ? [
        ['土地增值税预征率', n(taxes?.landVatPrepayRate), '', ''],
        ['可扣除土地成本', n(taxes?.landDeductibleAmount), '', ''],
        ['成本加计扣除比例', n(taxes?.costAdditionRate), '', ''],
        ['清算模式', d(taxes?.landVatClearanceMode), '', '']
      ]
    : [
        ['增值税计税方式', d(taxes?.vatMethod), ''],
        ['增值税率', n(taxes?.vatRate), ''],
        ['城建税率', n(taxes?.urbanMaintenanceTaxRate), ''],
        ['教育费附加率', n(taxes?.educationSurchargeRate), ''],
        ['地方教育附加率', n(taxes?.localEducationSurchargeRate), ''],
        ['企业所得税率', n(taxes?.incomeTaxRate), ''],
        ['所得税测算模式', d(taxes?.incomeTaxMode), '']
      ];
  addRows(ws, rows);
}

function fillDictionary(ws: ExcelJS.Worksheet, source?: WorkbookSource) {
  addRows(ws, (source?.dictionaryRows || []).map((row) => [
    row.costCode || '',
    row.firstSubject || '',
    row.secondSubject || '',
    row.thirdSubject || '',
    row.detailSubject || row.name || '',
    row.measureBasis || '',
    row.unit || '',
    row.defaultTaxRate || '',
    row.applicableProductType || '',
    row.enabled || ''
  ]));
}

function fillDropdowns(ws: ExcelJS.Worksheet) {
  addRows(ws, [
    ['模板版本', 'V60', '第一批唯一支持版本'],
    ['问题级别', 'error', '阻断问题'],
    ['问题级别', 'warning', '警告'],
    ['问题级别', 'info', '提示'],
    ['版本状态', 'draft', '草稿'],
    ['版本状态', 'locked', '已锁定'],
    ['版本状态', 'final', '定稿']
  ]);
}

function fillSourceNotes(ws: ExcelJS.Worksheet) {
  addRows(ws, [
    ['工程量来源', '已锁定', '当前工程量已锁定，后续推算和导入不会覆盖', nextStepTexts.locked],
    ['工程量来源', '图纸算量', '当前工程量来自图纸算量结果', '如需调整，请在工程量来源维护入口处理'],
    ['工程量来源', 'Excel 导入', '当前工程量来自 Excel 导入', '复核导入文件与成本科目映射'],
    ['工程量来源', '手工覆盖', '当前工程量由用户手工录入，系统推算值不会自动覆盖', nextStepTexts.manual_override],
    ['工程量来源', '工程量指标', '当前工程量来自工程量指标', '复核项目指标、工程量指标和绑定科目'],
    ['工程量来源', '系统推算', '当前工程量由指标基数和含量规则推算', '复核指标基数、含量规则和测算公式'],
    ['工程量来源', '模板默认', '当前使用模板默认工程量，建议复核', nextStepTexts.template_default],
    ['缺失项', '缺少指标基数', '缺少可用于推算工程量的指标基数', nextStepTexts.missing_basis],
    ['缺失项', '缺少含量规则', '缺少科目对应的含量规则', nextStepTexts.missing_content_rule],
    ['缺失项', '缺少单价', '工程量已有值，但缺少含税单价', nextStepTexts.missing_unit_price]
  ]);
}

export async function createV60WorkbookBuffer(source?: WorkbookSource) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LQDC Target Cost System';
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const sheetName of V60_SHEET_NAMES) {
    const ws = workbook.addWorksheet(sheetName);
    addHeaders(ws, sheetName);
    if (sheetName === '项目概况') fillProjectOverview(ws, source);
    else if (sheetName === '测算控制中心') fillControlCenter(ws, source);
    else if (sheetName === '目标成本汇总表') fillCosts(ws, source, 'summary');
    else if (sheetName === '目标成本测算') fillCosts(ws, source, 'target');
    else if (sheetName === '收入明细表') fillRevenue(ws, source);
    else if (sheetName === '土地费用明细表') fillCosts(ws, source, 'land');
    else if (sheetName === '前期费用明细表') fillCosts(ws, source, 'pre');
    else if (sheetName === '各专业明细表') fillCosts(ws, source, 'professional');
    else if (sheetName === '土地增值税测算表') fillTaxes(ws, source, true);
    else if (sheetName === '税金明细表') fillTaxes(ws, source);
    else if (sheetName === '成本科目及测算词典') fillDictionary(ws, source);
    else if (sheetName === '下拉字典') fillDropdowns(ws);
  }
  const sourceNotes = workbook.addWorksheet(OPTIONAL_SOURCE_SHEET_NAME);
  addHeaders(sourceNotes, OPTIONAL_SOURCE_SHEET_NAME);
  fillSourceNotes(sourceNotes);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function cellToText(cell: ExcelJS.Cell) {
  const value = cell.value as any;
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text || '');
    if ('result' in value) return String(value.result ?? '');
    if ('error' in value) return String(value.error || '');
    if ('richText' in value) return value.richText.map((item: any) => item.text).join('');
    if (value instanceof Date) return value.toISOString();
  }
  return String(value);
}

function textAt(row: ExcelJS.Row, col: number) {
  if (col <= 0) return '';
  return cellToText(row.getCell(col)).trim();
}

function numberText(value: string) {
  return value.replace(/,/g, '').replace(/，/g, '').trim();
}

function numberAt(row: ExcelJS.Row, col: number) {
  if (col <= 0) return 0;
  const raw = numberText(textAt(row, col));
  if (!raw) return 0;
  const numeric = Number(raw.replace('%', ''));
  if (!Number.isFinite(numeric)) return 0;
  if (raw.includes('%')) return numeric / 100;
  return numeric;
}

function taxRateAt(row: ExcelJS.Row, col: number, fallback = 0.09) {
  if (col <= 0) return fallback;
  const raw = numberText(textAt(row, col));
  if (!raw) return fallback;
  const numeric = Number(raw.replace('%', ''));
  if (!Number.isFinite(numeric)) return fallback;
  if (raw.includes('%')) return numeric / 100;
  return numeric > 1 ? numeric / 100 : numeric;
}

function headerIndex(sheet: ExcelJS.Worksheet | undefined) {
  const indexes = new Map<string, number>();
  if (!sheet) return indexes;
  const headerRow = sheet.getRow(1);
  for (let col = 1; col <= (sheet.columnCount || 0); col += 1) {
    const header = textAt(headerRow, col);
    if (header) indexes.set(header, col);
  }
  return indexes;
}

function col(indexes: Map<string, number>, names: string[], fallback: number) {
  for (const name of names) {
    const found = indexes.get(name);
    if (found) return found;
  }
  return fallback;
}

function nullableNumberAt(row: ExcelJS.Row, colNumber: number) {
  if (colNumber <= 0) return null;
  const raw = numberText(textAt(row, colNumber));
  if (!raw) return null;
  const numeric = Number(raw.replace('%', ''));
  if (!Number.isFinite(numeric)) return null;
  if (raw.includes('%')) return numeric / 100;
  return numeric;
}

function eachDataRow<T>(workbook: ExcelJS.Workbook, sheetName: string, mapper: (row: ExcelJS.Row, rowNumber: number) => T | null) {
  const sheet = workbook.getWorksheet(sheetName);
  const rows: T[] = [];
  if (!sheet) return rows;
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const hasValue = Array.from({ length: Math.min(sheet.columnCount || 1, 12) }).some((_, index) => textAt(row, index + 1));
    if (!hasValue) continue;
    const mapped = mapper(row, rowNumber);
    if (mapped) rows.push(mapped);
  }
  return rows;
}

export async function parseV60WorkbookImportData(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const overview = eachDataRow(workbook, '项目概况', (row) => {
    const field = textAt(row, 1);
    if (!field) return null;
    return { field, value: textAt(row, 2) };
  });

  const controlCenter = eachDataRow(workbook, '测算控制中心', (row) => {
    const field = textAt(row, 1);
    if (!field) return null;
    return { field, value: textAt(row, 2) };
  });

  const revenues = eachDataRow(workbook, '收入明细表', (row) => {
    const productName = textAt(row, 1);
    if (!productName) return null;
    return {
      productName,
      saleableArea: numberAt(row, 2),
      salePrice: numberAt(row, 3),
      taxRate: taxRateAt(row, 4),
      remark: textAt(row, 8)
    };
  });

  const simpleCost = (sheetName: string, professionalGroup: string) => {
    const indexes = headerIndex(workbook.getWorksheet(sheetName));
    return eachDataRow(workbook, sheetName, (row) => {
      const costCodeCol = col(indexes, ['成本编码'], 1);
      const detailNameCol = col(indexes, ['科目', '明细科目'], 2);
      const quantityCol = col(indexes, ['工程量', 'finalQuantity'], 4);
      const costCode = textAt(row, costCodeCol);
      const detailName = textAt(row, detailNameCol);
      if (!costCode && !detailName) return null;
      return {
        sheetName,
        professionalGroup,
        costCode,
        detailName,
        regionOrProductType: '',
        measureBasis: textAt(row, col(indexes, ['测算依据'], 3)),
        quantity: numberAt(row, quantityCol),
        manualQuantity: nullableNumberAt(row, col(indexes, ['手工工程量', 'manualQuantity'], 0)),
        excelImportedQuantity: nullableNumberAt(row, col(indexes, ['Excel导入工程量', 'Excel 导入工程量', 'excelImportedQuantity'], 0)),
        quantitySourceNote: textAt(row, col(indexes, ['工程量来源'], 0)),
        unit: textAt(row, col(indexes, ['单位'], 5)),
        taxInclusiveUnitPrice: numberAt(row, col(indexes, ['含税单价'], 6)),
        taxRate: taxRateAt(row, col(indexes, ['税率'], 7)),
        remark: textAt(row, col(indexes, ['备注'], 9))
      };
    });
  };

  const professionalIndexes = headerIndex(workbook.getWorksheet('各专业明细表'));
  const professionalCosts = eachDataRow(workbook, '各专业明细表', (row) => {
    const quantityCol = col(professionalIndexes, ['工程量', 'finalQuantity'], 6);
    const professionalGroup = textAt(row, col(professionalIndexes, ['专业'], 1));
    const costCode = textAt(row, col(professionalIndexes, ['成本编码'], 2));
    const detailName = textAt(row, col(professionalIndexes, ['科目', '明细科目'], 3));
    if (!costCode && !detailName) return null;
    return {
      sheetName: '各专业明细表',
      professionalGroup,
      costCode,
      detailName,
      regionOrProductType: textAt(row, col(professionalIndexes, ['产品/区域'], 4)),
      measureBasis: textAt(row, col(professionalIndexes, ['测算依据'], 5)),
      quantity: numberAt(row, quantityCol),
      manualQuantity: nullableNumberAt(row, col(professionalIndexes, ['手工工程量', 'manualQuantity'], 0)),
      excelImportedQuantity: nullableNumberAt(row, col(professionalIndexes, ['Excel导入工程量', 'Excel 导入工程量', 'excelImportedQuantity'], 0)),
      quantitySourceNote: textAt(row, col(professionalIndexes, ['工程量来源'], 0)),
      unit: textAt(row, col(professionalIndexes, ['单位'], 7)),
      taxInclusiveUnitPrice: numberAt(row, col(professionalIndexes, ['含税单价'], 8)),
      taxRate: taxRateAt(row, col(professionalIndexes, ['税率'], 9)),
      remark: textAt(row, col(professionalIndexes, ['备注'], 11))
    };
  });

  const allocations = eachDataRow(workbook, '成本分摊测算表', (row) => {
    const costCode = textAt(row, 1);
    if (!costCode && !textAt(row, 2)) return null;
    return {
      costCode,
      detailName: textAt(row, 2),
      allocationMethod: textAt(row, 3),
      productTypeName: textAt(row, 4),
      allocationWeight: numberAt(row, 5),
      allocationAmount: numberAt(row, 6),
      remark: textAt(row, 7)
    };
  });

  const landVat = eachDataRow(workbook, '土地增值税测算表', (row) => {
    const field = textAt(row, 1);
    if (!field) return null;
    return { field, value: textAt(row, 2) };
  });

  const taxes = eachDataRow(workbook, '税金明细表', (row) => {
    const field = textAt(row, 1);
    if (!field) return null;
    return { field, value: textAt(row, 2) };
  });

  return {
    overview,
    controlCenter,
    revenues,
    costs: [
      ...simpleCost('土地费用明细表', '土地费用'),
      ...simpleCost('前期费用明细表', '前期费用'),
      ...professionalCosts
    ],
    allocations,
    landVat,
    taxes
  };
}

function findFormulaErrors(workbook: ExcelJS.Workbook) {
  const issues: ExcelIssue[] = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const text = cellToText(cell);
        const formulaError = formulaErrorValues.find((item) => text.includes(item));
        if (!formulaError) return;
        issues.push({
          level: 'error',
          code: 'EXCEL_IMPORT_HAS_BLOCKING_ERRORS',
          sheetName: sheet.name,
          rowNumber,
          columnName: String(colNumber),
          field: '',
          rawValue: text,
          reason: `发现明显公式错误 ${formulaError}`,
          suggestion: '请在标准 V60 模板中修正公式错误后重新上传。'
        });
      });
    });
  });
  return issues;
}

function previewRows(sheet: ExcelJS.Worksheet) {
  const rows: string[][] = [];
  const maxRows = Math.min(sheet.rowCount, 8);
  for (let rowIndex = 1; rowIndex <= maxRows; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    const values: string[] = [];
    const maxCols = Math.min(sheet.columnCount || 8, 12);
    for (let colIndex = 1; colIndex <= maxCols; colIndex += 1) values.push(cellToText(row.getCell(colIndex)));
    if (values.some(Boolean)) rows.push(values);
  }
  return rows;
}

export async function parseV60WorkbookPreview(buffer: Buffer, context: { projectId: string; versionId: string; projectName: string; versionName: string }) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const expected = new Set<string | typeof OPTIONAL_SOURCE_SHEET_NAME>([...V60_SHEET_NAMES, OPTIONAL_SOURCE_SHEET_NAME]);
  const issues: ExcelIssue[] = [];
  const sheets: ExcelSheetResult[] = [];
  const parsedDataPreview: Record<string, string[][]> = {};

  for (const sheetName of V60_SHEET_NAMES) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      issues.push({
        level: 'error',
        code: 'EXCEL_TEMPLATE_SHEET_MISSING',
        sheetName,
        rowNumber: null,
        reason: `缺少必要 Sheet：${sheetName}`,
        suggestion: '请下载并使用标准 V60 模板。'
      });
      sheets.push({ name: sheetName, expected: true, status: 'missing', rowCount: 0, columnCount: 0, issueCount: 1 });
      continue;
    }
    const localIssueCount = issues.filter((issue) => issue.sheetName === sheetName).length;
    sheets.push({ name: sheetName, expected: true, status: 'parsed', rowCount: sheet.rowCount, columnCount: sheet.columnCount, issueCount: localIssueCount });
    parsedDataPreview[sheetName] = previewRows(sheet);
  }
  const sourceSheet = workbook.getWorksheet(OPTIONAL_SOURCE_SHEET_NAME);
  if (sourceSheet) {
    sheets.push({ name: OPTIONAL_SOURCE_SHEET_NAME, expected: true, status: 'parsed', rowCount: sourceSheet.rowCount, columnCount: sourceSheet.columnCount, issueCount: 0 });
    parsedDataPreview[OPTIONAL_SOURCE_SHEET_NAME] = previewRows(sourceSheet);
  }

  workbook.worksheets.filter((sheet) => !expected.has(sheet.name)).forEach((sheet) => {
    issues.push({
      level: 'warning',
      code: 'EXCEL_TEMPLATE_HEADER_INVALID',
      sheetName: sheet.name,
      rowNumber: null,
      reason: `非标准 Sheet 名称：${sheet.name}`,
      suggestion: '第一批仅支持标准 V60 母版，非标准 Sheet 将不会用于后续导入。'
    });
    sheets.push({ name: sheet.name, expected: false, status: 'extra', rowCount: sheet.rowCount, columnCount: sheet.columnCount, issueCount: 1 });
  });

  issues.push(...findFormulaErrors(workbook));

  const issueCountBySheet = new Map<string, number>();
  for (const issue of issues) issueCountBySheet.set(issue.sheetName, (issueCountBySheet.get(issue.sheetName) || 0) + 1);
  for (const sheet of sheets) sheet.issueCount = issueCountBySheet.get(sheet.name) || sheet.issueCount;

  const errorCount = issues.filter((issue) => issue.level === 'error').length;
  const warningCount = issues.filter((issue) => issue.level === 'warning').length;
  const infoCount = issues.filter((issue) => issue.level === 'info').length;
  const parsedSheets = sheets.filter((sheet) => sheet.status === 'parsed').length;
  const skippedSheets = sheets.filter((sheet) => sheet.status !== 'parsed').length;
  const totalRows = workbook.worksheets.reduce((sum, sheet) => sum + sheet.rowCount, 0);

  return {
    success: true,
    data: {
      importId: `preview_${Date.now()}`,
      template: {
        templateCode: EXCEL_TEMPLATE_CODE,
        templateVersion: EXCEL_TEMPLATE_VERSION,
        subjectVersion: EXCEL_SUBJECT_VERSION,
        sheetCount: V60_SHEET_NAMES.length
      },
      project: context,
      summary: {
        totalSheets: workbook.worksheets.length,
        parsedSheets,
        skippedSheets,
        totalRows,
        validRows: Math.max(totalRows - issues.length, 0),
        errorCount,
        warningCount,
        infoCount
      },
      sheets,
      issues,
      parsedDataPreview
    }
  };
}

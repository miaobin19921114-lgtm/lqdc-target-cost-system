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

type WorkbookSource = {
  project?: any;
  version?: any;
  dictionaryRows?: any[];
};

const sheetHeaders: Record<string, string[]> = {
  项目概况: ['字段', '值', '单位', '说明'],
  测算控制中心: ['控制项', '当前值', '说明'],
  目标成本汇总表: ['成本编码', '一级科目', '二级科目', '三级科目', '含税金额', '不含税金额', '税额'],
  目标成本测算: ['成本编码', '一级科目', '二级科目', '三级科目', '明细科目', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额'],
  收入明细表: ['业态', '可售面积', '含税销售单价', '税率', '含税收入', '不含税收入', '税额', '备注'],
  土地费用明细表: ['成本编码', '科目', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '备注'],
  前期费用明细表: ['成本编码', '科目', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '备注'],
  各专业明细表: ['专业', '成本编码', '科目', '产品/区域', '测算依据', '工程量', '单位', '含税单价', '税率', '含税金额', '备注'],
  成本分摊测算表: ['成本编码', '科目', '分摊方式', '业态', '分摊权重', '分摊金额', '备注'],
  土地增值税测算表: ['项目', '金额', '税率/比例', '说明'],
  税金明细表: ['税种/参数', '金额/税率', '说明'],
  成本科目及测算词典: ['成本编码', '一级科目', '二级科目', '三级科目', '明细科目', '测算依据', '单位', '默认税率', '适用业态', '启用'],
  下拉字典: ['字典类型', '字典值', '说明']
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
    if (mode === 'target') return [path.code, path.level1, path.level2, path.level3, path.detail, row.measureBasis || '', n(row.quantity), row.unit || '', n(row.taxInclusiveUnitPrice), n(row.taxRate), n(row.taxInclusiveAmount)];
    if (mode === 'professional') return [row.professionalGroup || path.level1 || '未分类', ...base];
    return base;
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
    const maxCols = Math.min(sheet.columnCount || 8, 8);
    for (let colIndex = 1; colIndex <= maxCols; colIndex += 1) values.push(cellToText(row.getCell(colIndex)));
    if (values.some(Boolean)) rows.push(values);
  }
  return rows;
}

export async function parseV60WorkbookPreview(buffer: Buffer, context: { projectId: string; versionId: string; projectName: string; versionName: string }) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const expected = new Set<string>(V60_SHEET_NAMES);
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

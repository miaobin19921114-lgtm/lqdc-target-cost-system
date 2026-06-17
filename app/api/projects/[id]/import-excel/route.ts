import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';

export const runtime = 'nodejs';

type CostImportMode = 'update' | 'append' | 'clear';

function baseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function cellText(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value && 'text' in value) return String((value as { text?: unknown }).text || '').trim();
  if (typeof value === 'object' && value && 'result' in value) return String((value as { result?: unknown }).result || '').trim();
  return String(value).trim();
}

function toNumber(value: unknown) {
  const raw = cellText(value).replace(/[,，㎡平方米元]/g, '').trim();
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRate(value: unknown, fallback = 0.09) {
  const raw = cellText(value);
  if (!raw) return fallback;
  const parsed = Number(raw.replace(/[,，%]/g, '').trim());
  if (!Number.isFinite(parsed)) return fallback;
  if (raw.includes('%')) return parsed / 100;
  return parsed > 1 ? parsed / 100 : parsed;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeImportMode(value: string): CostImportMode {
  if (value === 'append' || value === 'clear') return value;
  return 'update';
}

function rowTexts(row: ExcelJS.Row) {
  const list: string[] = [];
  row.eachCell({ includeEmpty: true }, (cell, column) => {
    list[column - 1] = cellText(cell.value);
  });
  return list.map((item) => item || '').slice(0, 12);
}

function rowValues(row: ExcelJS.Row) {
  const list: unknown[] = [];
  row.eachCell({ includeEmpty: true }, (cell, column) => {
    list[column - 1] = cell.value;
  });
  return list;
}

function firstUsefulRow(sheet: ExcelJS.Worksheet) {
  for (let index = 1; index <= Math.min(sheet.rowCount, 20); index += 1) {
    const row = rowTexts(sheet.getRow(index));
    if (row.filter(Boolean).length >= 2) return row;
  }
  return [];
}

function makePreview(workbook: ExcelJS.Workbook) {
  const sheets = workbook.worksheets.slice(0, 12).map((sheet) => ({ name: sheet.name, rows: sheet.rowCount, columns: sheet.columnCount, sample: firstUsefulRow(sheet) }));
  return Buffer.from(JSON.stringify(sheets), 'utf8').toString('base64url');
}

const overviewRules: Array<{ keys: string[]; field: string; type: 'string' | 'number' | 'int' }> = [
  { keys: ['项目名称'], field: 'name', type: 'string' },
  { keys: ['城市'], field: 'city', type: 'string' },
  { keys: ['区县', '区域'], field: 'district', type: 'string' },
  { keys: ['占地面积', '土地面积', '用地面积'], field: 'landAreaMu', type: 'number' },
  { keys: ['红线面积'], field: 'redLineArea', type: 'number' },
  { keys: ['容积率'], field: 'plotRatio', type: 'number' },
  { keys: ['总建筑面积', '总建面'], field: 'totalBuildingArea', type: 'number' },
  { keys: ['计容建筑面积', '计容面积'], field: 'capacityBuildingArea', type: 'number' },
  { keys: ['地上建筑面积', '地上面积'], field: 'aboveGroundArea', type: 'number' },
  { keys: ['地下建筑面积', '地下面积'], field: 'undergroundArea', type: 'number' },
  { keys: ['可售面积'], field: 'saleableArea', type: 'number' },
  { keys: ['不可售面积'], field: 'nonSaleableArea', type: 'number' },
  { keys: ['车位数量', '车位数'], field: 'parkingCount', type: 'int' },
  { keys: ['地下产权车位'], field: 'undergroundPropertyParkingCount', type: 'int' },
  { keys: ['地下使用权车位'], field: 'undergroundUseRightParkingCount', type: 'int' },
  { keys: ['人防车位'], field: 'civilDefenseParkingCount', type: 'int' },
  { keys: ['地上车位'], field: 'aboveGroundParkingCount', type: 'int' },
  { keys: ['充电桩数量', '充电桩数'], field: 'chargingPileCount', type: 'int' },
  { keys: ['周界长度', '围墙长度'], field: 'sitePerimeter', type: 'number' },
  { keys: ['硬景面积'], field: 'hardscapeArea', type: 'number' },
  { keys: ['软景面积'], field: 'softscapeArea', type: 'number' },
  { keys: ['景观面积'], field: 'landscapeArea', type: 'number' },
  { keys: ['楼栋数量', '楼栋数'], field: 'buildingCount', type: 'int' },
  { keys: ['单元数量', '单元数'], field: 'unitCount', type: 'int' },
  { keys: ['户数'], field: 'householdCount', type: 'int' },
  { keys: ['电梯数量', '电梯数'], field: 'elevatorCount', type: 'int' },
  { keys: ['地下室层数'], field: 'basementFloors', type: 'int' },
  { keys: ['地上层数'], field: 'aboveGroundFloors', type: 'int' },
  { keys: ['标准层高'], field: 'standardFloorHeight', type: 'number' },
  { keys: ['地下室层高'], field: 'basementFloorHeight', type: 'number' }
];

function findOverviewValue(row: unknown[], index: number) {
  for (let offset = 1; offset <= 3; offset += 1) {
    const value = row[index + offset];
    if (cellText(value)) return value;
  }
  return '';
}

async function importOverview(projectId: string, workbook: ExcelJS.Workbook) {
  const data: Record<string, string | number> = {};
  const sheets = workbook.worksheets.filter((sheet) => /概况|指标|经济|基础/i.test(sheet.name));
  const targetSheets = sheets.length ? sheets : workbook.worksheets.slice(0, 3);
  for (const sheet of targetSheets) {
    for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const values = rowValues(sheet.getRow(rowNumber));
      values.forEach((value, index) => {
        const label = cellText(value).replace(/[:：]/g, '');
        if (!label) return;
        const rule = overviewRules.find((item) => item.keys.some((key) => label.includes(key)));
        if (!rule || data[rule.field] !== undefined) return;
        const raw = findOverviewValue(values, index);
        if (rule.type === 'string') {
          const result = cellText(raw);
          if (result) data[rule.field] = result;
        } else if (rule.type === 'int') {
          const result = Math.round(toNumber(raw));
          if (result) data[rule.field] = result;
        } else {
          const result = toNumber(raw);
          if (result) data[rule.field] = result;
        }
      });
    }
  }
  if (Object.keys(data).length > 0) await prisma.project.update({ where: { id: projectId }, data });
  return data;
}

function findProductHeader(sheet: ExcelJS.Worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 30); rowNumber += 1) {
    const heads = rowValues(sheet.getRow(rowNumber)).map(cellText);
    const hasName = heads.some((head) => /业态|产品|物业类型|类型/.test(head));
    const hasArea = heads.some((head) => /建筑面积|建面|可售面积|计容/.test(head));
    if (hasName && hasArea) return { rowNumber, heads };
  }
  return null;
}

function columnIndex(heads: string[], tests: RegExp[]) {
  return heads.findIndex((head) => tests.some((test) => test.test(head)));
}

async function importProducts(versionId: string, workbook: ExcelJS.Workbook) {
  let count = 0;
  const sheets = workbook.worksheets.filter((sheet) => /业态|产品|概况|指标|面积/i.test(sheet.name));
  const targetSheets = sheets.length ? sheets : workbook.worksheets;
  for (const sheet of targetSheets) {
    const header = findProductHeader(sheet);
    if (!header) continue;
    const nameIndex = columnIndex(header.heads, [/业态/, /产品/, /物业类型/, /^类型$/]);
    const buildingIndex = columnIndex(header.heads, [/建筑面积/, /建面/]);
    const capacityIndex = columnIndex(header.heads, [/计容/]);
    const saleableIndex = columnIndex(header.heads, [/可售面积/, /可售/]);
    const nonSaleableIndex = columnIndex(header.heads, [/不可售/]);
    const priceIndex = columnIndex(header.heads, [/含税销售单价/, /销售单价/, /售价/]);
    const remarkIndex = columnIndex(header.heads, [/备注/]);
    if (nameIndex < 0) continue;
    for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const values = rowValues(sheet.getRow(rowNumber));
      const name = cellText(values[nameIndex]);
      if (!name || /合计|小计|备注|说明/.test(name)) continue;
      const data = {
        buildingArea: buildingIndex >= 0 ? toNumber(values[buildingIndex]) : 0,
        capacityArea: capacityIndex >= 0 ? toNumber(values[capacityIndex]) : 0,
        saleableArea: saleableIndex >= 0 ? toNumber(values[saleableIndex]) : 0,
        nonSaleableArea: nonSaleableIndex >= 0 ? toNumber(values[nonSaleableIndex]) : 0,
        salePrice: priceIndex >= 0 ? toNumber(values[priceIndex]) : 0,
        isSaleable: saleableIndex >= 0 ? toNumber(values[saleableIndex]) > 0 : true,
        participateAllocation: true,
        allocationWeight: 1,
        isActive: true,
        disabledAt: null,
        remark: remarkIndex >= 0 ? cellText(values[remarkIndex]) || `Excel导入：${sheet.name} 第${rowNumber}行` : `Excel导入：${sheet.name} 第${rowNumber}行`
      };
      if (!data.buildingArea && !data.capacityArea && !data.saleableArea && !data.nonSaleableArea && !data.salePrice) continue;
      const old = await prisma.productType.findFirst({ where: { projectVersionId: versionId, name } });
      if (old) await prisma.productType.update({ where: { id: old.id }, data });
      else await prisma.productType.create({ data: { projectVersionId: versionId, name, ...data } });
      count += 1;
    }
  }
  return count;
}

function findCostHeader(sheet: ExcelJS.Worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 40); rowNumber += 1) {
    const heads = rowValues(sheet.getRow(rowNumber)).map(cellText);
    const hasSubject = heads.some((head) => /科目|明细|项目名称|费用名称/.test(head));
    const hasAmount = heads.some((head) => /工程量|数量|含税单价|金额|税率/.test(head));
    if (hasSubject && hasAmount) return { rowNumber, heads };
  }
  return null;
}

type CostParsedRow = {
  sheet: string;
  row: number;
  code: string;
  level1: string;
  level2: string;
  level3: string;
  subject: string;
  basis: string;
  quantity: string;
  unit: string;
  price: string;
  taxRate: string;
  amount: string;
};

function parseCostRows(workbook: ExcelJS.Workbook, limit = 0) {
  const rows: CostParsedRow[] = [];
  const sheets = workbook.worksheets.filter((sheet) => /成本|明细|目标|土地|前期|土建|安装|设备|景观|装修|费用/i.test(sheet.name));
  const targetSheets = sheets.length ? sheets : workbook.worksheets;
  for (const sheet of targetSheets) {
    const header = findCostHeader(sheet);
    if (!header) continue;
    const codeIndex = columnIndex(header.heads, [/编码/, /科目编码/]);
    const l1Index = columnIndex(header.heads, [/一级/]);
    const l2Index = columnIndex(header.heads, [/二级/]);
    const l3Index = columnIndex(header.heads, [/三级/]);
    const subjectIndex = columnIndex(header.heads, [/四级/, /明细项目/, /目标成本科目/, /成本科目/, /科目名称/, /费用名称/]);
    const basisIndex = columnIndex(header.heads, [/测算依据/, /依据/]);
    const qtyIndex = columnIndex(header.heads, [/工程量/, /数量/]);
    const unitIndex = columnIndex(header.heads, [/单位/]);
    const priceIndex = columnIndex(header.heads, [/含税单价/, /单价/]);
    const rateIndex = columnIndex(header.heads, [/税率/]);
    const amountIndex = columnIndex(header.heads, [/含税金额/, /金额/]);
    for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const values = rowValues(sheet.getRow(rowNumber));
      const subject = subjectIndex >= 0 ? cellText(values[subjectIndex]) : '';
      const level1 = l1Index >= 0 ? cellText(values[l1Index]) : '';
      const level2 = l2Index >= 0 ? cellText(values[l2Index]) : '';
      const level3 = l3Index >= 0 ? cellText(values[l3Index]) : '';
      if (!subject && !level1 && !level2 && !level3) continue;
      if (/合计|小计|备注|说明/.test(subject)) continue;
      rows.push({
        sheet: sheet.name,
        row: rowNumber,
        code: codeIndex >= 0 ? cellText(values[codeIndex]) : '',
        level1,
        level2,
        level3,
        subject: subject || level3 || level2 || level1,
        basis: basisIndex >= 0 ? cellText(values[basisIndex]) : '',
        quantity: qtyIndex >= 0 ? cellText(values[qtyIndex]) : '',
        unit: unitIndex >= 0 ? cellText(values[unitIndex]) : '',
        price: priceIndex >= 0 ? cellText(values[priceIndex]) : '',
        taxRate: rateIndex >= 0 ? cellText(values[rateIndex]) : '',
        amount: amountIndex >= 0 ? cellText(values[amountIndex]) : ''
      });
      if (limit > 0 && rows.length >= limit) return rows;
    }
  }
  return rows;
}

function previewCosts(workbook: ExcelJS.Workbook) {
  return parseCostRows(workbook, 30);
}

async function importCosts(versionId: string, workbook: ExcelJS.Workbook, importMode: CostImportMode, fileName: string) {
  const rows = parseCostRows(workbook, 0);
  let count = 0;
  let inclusiveTotal = 0;
  let exclusiveTotal = 0;
  let taxTotal = 0;
  let deletedCount = 0;

  if (importMode === 'clear') {
    const deleted = await prisma.costLine.deleteMany({ where: { projectVersionId: versionId, regionOrProductType: 'Excel导入' } });
    deletedCount = deleted.count;
  }

  const batch = await prisma.importBatch.create({
    data: {
      projectVersionId: versionId,
      fileName,
      importType: 'cost',
      importMode,
      deletedCount,
      status: 'active',
      remark: '成本明细Excel正式导入'
    }
  });

  for (const row of rows) {
    const quantityRaw = toNumber(row.quantity);
    const priceRaw = toNumber(row.price);
    const amountRaw = toNumber(row.amount);
    if (!row.subject || (!quantityRaw && !priceRaw && !amountRaw)) continue;

    let quantity = quantityRaw;
    let taxInclusiveUnitPrice = priceRaw;
    let taxInclusiveAmount = amountRaw;
    if (!taxInclusiveAmount && quantity && taxInclusiveUnitPrice) taxInclusiveAmount = round2(quantity * taxInclusiveUnitPrice);
    if (!quantity && taxInclusiveAmount) quantity = 1;
    if (!taxInclusiveUnitPrice && taxInclusiveAmount && quantity) taxInclusiveUnitPrice = round2(taxInclusiveAmount / quantity);
    if (!taxInclusiveAmount) continue;

    const taxRate = parseRate(row.taxRate, 0.09);
    const taxExclusiveAmount = round2(taxInclusiveAmount / (1 + taxRate));
    const taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
    const taxExclusiveUnitPrice = taxInclusiveUnitPrice ? round2(taxInclusiveUnitPrice / (1 + taxRate)) : 0;
    const code = row.code || `IMP-${versionId.slice(-6)}-${row.sheet.slice(0, 8)}-${row.row}`;
    const fullPath = [row.level1, row.level2, row.level3, row.subject].filter(Boolean).join(' / ');

    const subject = await prisma.costSubject.upsert({
      where: { code },
      update: { name: row.subject, level: 4, fullPath, defaultUnit: row.unit || undefined, defaultTaxRate: taxRate, defaultMeasureBasis: row.basis || undefined, enabled: true },
      create: { code, name: row.subject, level: 4, fullPath, defaultUnit: row.unit || undefined, defaultTaxRate: taxRate, defaultMeasureBasis: row.basis || undefined, enabled: true, sortOrder: row.row }
    });

    const data = {
      projectVersionId: versionId,
      costSubjectId: subject.id,
      importBatchId: batch.id,
      detailName: row.subject,
      regionOrProductType: 'Excel导入',
      professionalGroup: row.sheet,
      measureBasis: row.basis,
      quantity,
      unit: row.unit || (quantity === 1 && amountRaw ? '项' : ''),
      taxExclusiveUnitPrice,
      taxInclusiveUnitPrice,
      taxRate,
      taxExclusiveAmount,
      taxAmount,
      taxInclusiveAmount,
      allocationMethod: '按可售面积占比',
      isDirectAssigned: false,
      description: fullPath,
      remark: `Excel正式导入：${row.sheet} 第${row.row}行｜批次：${batch.id}｜模式：${importMode}`,
      sortOrder: row.row
    };

    if (importMode === 'append') {
      await prisma.costLine.create({ data });
    } else {
      const existing = await prisma.costLine.findFirst({
        where: { projectVersionId: versionId, detailName: row.subject, professionalGroup: row.sheet, description: fullPath }
      });
      if (existing) await prisma.costLine.update({ where: { id: existing.id }, data });
      else await prisma.costLine.create({ data });
    }

    count += 1;
    inclusiveTotal = round2(inclusiveTotal + taxInclusiveAmount);
    exclusiveTotal = round2(exclusiveTotal + taxExclusiveAmount);
    taxTotal = round2(taxTotal + taxAmount);
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { rowCount: count, taxInclusiveTotal: inclusiveTotal, taxExclusiveTotal: exclusiveTotal, taxAmountTotal: taxTotal }
  });

  return { count, inclusiveTotal, exclusiveTotal, taxTotal, deletedCount, importMode, batchId: batch.id };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const url = baseUrl(request);
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${url}/projects/${params.id}/export?imported=0`, 303);
  if (locked) return NextResponse.redirect(`${url}/projects/${params.id}/export?locked=1`, 303);
  const form = await request.formData();
  const mode = String(form.get('mode') || 'preview');
  const costImportMode = normalizeImportMode(String(form.get('costImportMode') || 'update'));
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return NextResponse.redirect(`${url}/projects/${params.id}/export?missingFile=1`, 303);
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const preview = makePreview(workbook);
    if (mode === 'overview') {
      const data = await importOverview(params.id, workbook);
      const fields = Object.keys(data).join('、');
      const query = new URLSearchParams({ overviewImported: '1', file: file.name || 'import.xlsx', count: String(Object.keys(data).length), fields, preview });
      return NextResponse.redirect(`${url}/projects/${params.id}/export?${query.toString()}`, 303);
    }
    if (mode === 'products') {
      const count = await importProducts(version.id, workbook);
      const query = new URLSearchParams({ productsImported: '1', file: file.name || 'import.xlsx', count: String(count), preview });
      return NextResponse.redirect(`${url}/projects/${params.id}/export?${query.toString()}`, 303);
    }
    if (mode === 'cost-preview') {
      const costs = previewCosts(workbook);
      const costPreview = Buffer.from(JSON.stringify(costs), 'utf8').toString('base64url');
      const query = new URLSearchParams({ costPreviewed: '1', file: file.name || 'import.xlsx', count: String(costs.length), preview, costPreview });
      return NextResponse.redirect(`${url}/projects/${params.id}/export?${query.toString()}`, 303);
    }
    if (mode === 'cost-import') {
      const result = await importCosts(version.id, workbook, costImportMode, file.name || 'import.xlsx');
      const query = new URLSearchParams({
        costsImported: '1',
        file: file.name || 'import.xlsx',
        count: String(result.count),
        inclusiveTotal: String(result.inclusiveTotal),
        exclusiveTotal: String(result.exclusiveTotal),
        taxTotal: String(result.taxTotal),
        deletedCount: String(result.deletedCount),
        importMode: result.importMode,
        batchId: result.batchId,
        preview
      });
      return NextResponse.redirect(`${url}/projects/${params.id}/export?${query.toString()}`, 303);
    }
    const query = new URLSearchParams({ previewed: '1', file: file.name || 'import.xlsx', preview });
    return NextResponse.redirect(`${url}/projects/${params.id}/export?${query.toString()}`, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 120) : 'Excel 解析失败';
    return NextResponse.redirect(`${url}/projects/${params.id}/export?importError=${encodeURIComponent(message)}`, 303);
  }
}

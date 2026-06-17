import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';

export const runtime = 'nodejs';

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

function rowTexts(row: ExcelJS.Row) {
  const list: string[] = [];
  row.eachCell({ includeEmpty: true }, (cell, column) => {
    list[column - 1] = cellText(cell.value);
  });
  return list.map((item) => item || '').slice(0, 12);
}

function firstUsefulRow(sheet: ExcelJS.Worksheet) {
  for (let index = 1; index <= Math.min(sheet.rowCount, 20); index += 1) {
    const row = rowTexts(sheet.getRow(index));
    if (row.filter(Boolean).length >= 2) return row;
  }
  return [];
}

function makePreview(workbook: ExcelJS.Workbook) {
  const sheets = workbook.worksheets.slice(0, 12).map((sheet) => ({
    name: sheet.name,
    rows: sheet.rowCount,
    columns: sheet.columnCount,
    sample: firstUsefulRow(sheet)
  }));
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
      const row = sheet.getRow(rowNumber);
      const values: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        values[column - 1] = cell.value;
      });
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

  if (Object.keys(data).length > 0) {
    await prisma.project.update({ where: { id: projectId }, data });
  }
  return data;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const url = baseUrl(request);
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${url}/projects/${params.id}/export?imported=0`, 303);
  if (locked) return NextResponse.redirect(`${url}/projects/${params.id}/export?locked=1`, 303);

  const form = await request.formData();
  const mode = String(form.get('mode') || 'preview');
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) {
    return NextResponse.redirect(`${url}/projects/${params.id}/export?missingFile=1`, 303);
  }

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

    const query = new URLSearchParams({ previewed: '1', file: file.name || 'import.xlsx', preview });
    return NextResponse.redirect(`${url}/projects/${params.id}/export?${query.toString()}`, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 120) : 'Excel 解析失败';
    return NextResponse.redirect(`${url}/projects/${params.id}/export?importError=${encodeURIComponent(message)}`, 303);
  }
}

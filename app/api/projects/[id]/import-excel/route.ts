import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';

export const runtime = 'nodejs';

function baseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function text(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value && 'text' in value) return String((value as any).text || '').trim();
  if (typeof value === 'object' && value && 'result' in value) return String((value as any).result || '').trim();
  return String(value).trim();
}

function num(value: unknown) {
  const cleaned = text(value).replace(/[,，%]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 90);
}

function values(row: ExcelJS.Row) {
  const list: unknown[] = [];
  row.eachCell({ includeEmpty: true }, (cell, column) => {
    list[column - 1] = cell.value;
  });
  return list;
}

function findHeader(sheet: ExcelJS.Worksheet, keywords: string[]) {
  for (let i = 1; i <= sheet.rowCount; i += 1) {
    const heads = values(sheet.getRow(i)).map(text);
    const hits = keywords.filter((key) => heads.some((head) => head.includes(key))).length;
    if (hits >= 2) return { row: i, heads };
  }
  return null;
}

function col(heads: string[], keys: string[]) {
  return heads.findIndex((head) => keys.some((key) => head.includes(key)));
}

async function importOverview(projectId: string, workbook: ExcelJS.Workbook) {
  const sheet = workbook.worksheets.find((item) => /概况|指标|经济/i.test(item.name));
  if (!sheet) return 0;
  const rules: Array<[string[], string, 'string' | 'number' | 'int']> = [
    [['项目名称'], 'name', 'string'],
    [['城市'], 'city', 'string'],
    [['区县', '区域'], 'district', 'string'],
    [['占地面积', '土地面积', '用地面积'], 'landAreaMu', 'number'],
    [['总建筑面积', '总建面'], 'totalBuildingArea', 'number'],
    [['计容建筑面积', '计容面积'], 'capacityBuildingArea', 'number'],
    [['地下建筑面积', '地下面积'], 'undergroundArea', 'number'],
    [['可售面积'], 'saleableArea', 'number'],
    [['车位数量', '车位数'], 'parkingCount', 'int'],
    [['充电桩数量', '充电桩数'], 'chargingPileCount', 'int'],
    [['周界长度', '围墙长度'], 'sitePerimeter', 'number'],
    [['硬景面积'], 'hardscapeArea', 'number'],
    [['软景面积'], 'softscapeArea', 'number'],
    [['景观面积'], 'landscapeArea', 'number'],
    [['楼栋数量', '楼栋数'], 'buildingCount', 'int'],
    [['单元数量', '单元数'], 'unitCount', 'int']
  ];
  const data: Record<string, any> = {};
  sheet.eachRow((row) => {
    const rowValues = values(row);
    rowValues.forEach((value, index) => {
      const label = text(value);
      const found = rules.find(([keys]) => keys.some((key) => label.includes(key)));
      if (!found) return;
      const [, field, type] = found;
      const next = rowValues[index + 1] ?? rowValues[index + 2];
      if (type === 'string') {
        const result = text(next);
        if (result) data[field] = result;
      } else if (type === 'int') {
        const result = Math.round(num(next));
        if (result) data[field] = result;
      } else {
        const result = num(next);
        if (result) data[field] = result;
      }
    });
  });
  if (Object.keys(data).length) await prisma.project.update({ where: { id: projectId }, data });
  return Object.keys(data).length;
}

async function importProducts(versionId: string, workbook: ExcelJS.Workbook) {
  let count = 0;
  for (const sheet of workbook.worksheets) {
    if (!/业态|产品|概况|指标/i.test(sheet.name)) continue;
    const header = findHeader(sheet, ['业态', '可售', '建筑']);
    if (!header) continue;
    const nameIndex = col(header.heads, ['业态', '产品', '物业类型', '类型']);
    const buildingIndex = col(header.heads, ['建筑面积', '建面']);
    const capacityIndex = col(header.heads, ['计容']);
    const saleableIndex = col(header.heads, ['可售面积', '可售']);
    const priceIndex = col(header.heads, ['销售单价', '售价', '含税销售单价']);
    if (nameIndex < 0) continue;
    for (let rowNumber = header.row + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = values(sheet.getRow(rowNumber));
      const name = text(row[nameIndex]);
      if (!name || /合计|小计|备注/.test(name)) continue;
      const data = {
        buildingArea: buildingIndex >= 0 ? num(row[buildingIndex]) : 0,
        capacityArea: capacityIndex >= 0 ? num(row[capacityIndex]) : 0,
        saleableArea: saleableIndex >= 0 ? num(row[saleableIndex]) : 0,
        salePrice: priceIndex >= 0 ? num(row[priceIndex]) : 0,
        isSaleable: true,
        participateAllocation: true,
        allocationWeight: 1,
        isActive: true,
        remark: `Excel导入：${sheet.name} 第${rowNumber}行`
      };
      if (!data.buildingArea && !data.capacityArea && !data.saleableArea && !data.salePrice) continue;
      const old = await prisma.productType.findFirst({ where: { projectVersionId: versionId, name } });
      if (old) await prisma.productType.update({ where: { id: old.id }, data });
      else await prisma.productType.create({ data: { projectVersionId: versionId, name, ...data } });
      count += 1;
    }
  }
  return count;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const url = baseUrl(request);
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${url}/projects/${params.id}/export?imported=0`, 303);
  if (locked) return NextResponse.redirect(`${url}/projects/${params.id}/export?locked=1`, 303);

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return NextResponse.redirect(`${url}/projects/${params.id}/export?missingFile=1`, 303);

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const dir = path.join(uploadRoot, params.id);
  await mkdir(dir, { recursive: true });
  const stored = `${Date.now()}-${safeFileName(file.name || 'import.xlsx')}`;
  await writeFile(path.join(dir, stored), buffer);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const overview = await importOverview(params.id, workbook);
  const products = await importProducts(version.id, workbook);
  const query = new URLSearchParams({ imported: '1', overview: String(overview), products: String(products), file: stored });
  return NextResponse.redirect(`${url}/projects/${params.id}/export?${query.toString()}`, 303);
}

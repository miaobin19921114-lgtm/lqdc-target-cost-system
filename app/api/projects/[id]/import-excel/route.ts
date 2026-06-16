import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const url = baseUrl(request);
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${url}/projects/${params.id}/export?imported=0`, 303);
  if (locked) return NextResponse.redirect(`${url}/projects/${params.id}/export?locked=1`, 303);

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) {
    return NextResponse.redirect(`${url}/projects/${params.id}/export?missingFile=1`, 303);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheets = workbook.worksheets.slice(0, 12).map((sheet) => ({
      name: sheet.name,
      rows: sheet.rowCount,
      columns: sheet.columnCount,
      sample: firstUsefulRow(sheet)
    }));
    const preview = Buffer.from(JSON.stringify(sheets), 'utf8').toString('base64url');
    const query = new URLSearchParams({ previewed: '1', file: file.name || 'import.xlsx', preview });
    return NextResponse.redirect(`${url}/projects/${params.id}/export?${query.toString()}`, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 120) : 'Excel 解析失败';
    return NextResponse.redirect(`${url}/projects/${params.id}/export?importError=${encodeURIComponent(message)}`, 303);
  }
}

import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';

const keys = [
  'costCode',
  'parentCode',
  'subjectLevel',
  'firstSubject',
  'secondSubject',
  'thirdSubject',
  'detailSubject',
  'subjectDefinition',
  'sourceTable',
  'enabled',
  'writeBackToTarget',
  'targetMappingCode',
  'measureBasis',
  'unit',
  'defaultTaxRate',
  'applicableProductType',
  'applicableStage',
  'investmentMethod',
  'conceptMethod',
  'schemeMethod',
  'drawingMethod',
  'tenderMethod',
  'dynamicMethod',
  'specialAdjustment',
  'remark',
  'costAttributionMethod',
  'targetAllocationMethod',
  'landVatAllocationMethod',
  'incomeTaxDeductionCategory',
  'preTaxDeduction',
  'taxRemark'
] as const;

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((item) => item.text).join('');
    if ('text' in value && value.text) return String(value.text);
    if ('result' in value && value.result !== undefined && value.result !== null) return String(value.result);
    if ('hyperlink' in value && 'text' in value && value.text) return String(value.text);
  }
  return String(value);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const file = form.get('file');
  const baseUrl = getBaseUrl(request);

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.redirect(`${baseUrl}/projects/${params.id}/cost-dictionary?error=missing-file`, 303);
  }

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer as unknown as Buffer);
  const sheet = workbook.getWorksheet('成本科目及测算词典');

  if (!sheet) {
    return NextResponse.redirect(`${baseUrl}/projects/${params.id}/cost-dictionary?error=missing-sheet`, 303);
  }

  const rows: any[] = [];
  for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const costCode = cellText(row.getCell(1).value).trim();
    if (!costCode) continue;

    const record: any = {
      projectId: params.id,
      rowIndex: rowNumber - 2
    };

    keys.forEach((key, index) => {
      record[key] = cellText(row.getCell(index + 1).value).trim();
    });
    rows.push(record);
  }

  await prisma.$transaction([
    prisma.costDictionaryRow.deleteMany({ where: { projectId: params.id } }),
    ...(rows.length ? [prisma.costDictionaryRow.createMany({ data: rows })] : [])
  ]);

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/cost-dictionary?imported=${rows.length}`, 303);
}

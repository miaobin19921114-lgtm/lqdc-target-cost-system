import { NextResponse } from 'next/server';
import { createV60WorkbookBuffer, excelError, isSupportedTemplateVersion } from '@/lib/excel-v60';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const templateVersion = url.searchParams.get('templateVersion');

  if (!isSupportedTemplateVersion(templateVersion)) {
    const error = excelError('EXCEL_TEMPLATE_UNSUPPORTED', '当前仅支持 V60 标准模板。');
    return NextResponse.json(error.body, { status: error.status });
  }

  try {
    const buffer = await createV60WorkbookBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="LQDC_TargetCost_Template_V60.xlsx"',
        'Cache-Control': 'no-store'
      }
    });
  } catch {
    const error = excelError('EXCEL_TEMPLATE_DOWNLOAD_FAILED', '标准模板生成失败。', 500);
    return NextResponse.json(error.body, { status: error.status });
  }
}

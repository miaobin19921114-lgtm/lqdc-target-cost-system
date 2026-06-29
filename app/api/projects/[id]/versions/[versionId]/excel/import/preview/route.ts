import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  EXCEL_MAX_FILE_SIZE,
  excelError,
  isSupportedTemplateVersion,
  parseV60WorkbookPreview,
  safeExcelFileName
} from '@/lib/excel-v60';

function invalidFile(message: string, code = 'EXCEL_FILE_TYPE_INVALID') {
  const error = excelError(code, message);
  return NextResponse.json(error.body, { status: error.status });
}

function hasXlsxZipSignature(buffer: Buffer) {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

export async function POST(request: Request, { params }: { params: { id: string; versionId: string } }) {
  try {
    const form = await request.formData();
    const templateVersion = String(form.get('templateVersion') || 'V60');
    if (!isSupportedTemplateVersion(templateVersion)) {
      const error = excelError('EXCEL_TEMPLATE_UNSUPPORTED', '当前仅支持 V60 标准模板。');
      return NextResponse.json(error.body, { status: error.status });
    }

    const file = form.get('file');
    if (!(file instanceof File) || file.size <= 0) {
      const error = excelError('EXCEL_FILE_REQUIRED', '请选择需要解析预览的 Excel 文件。');
      return NextResponse.json(error.body, { status: error.status });
    }
    if (file.size > EXCEL_MAX_FILE_SIZE) {
      const error = excelError('EXCEL_FILE_TOO_LARGE', '文件超过 20MB 限制，请压缩或拆分后再上传。');
      return NextResponse.json(error.body, { status: error.status });
    }

    const safeName = safeExcelFileName(file.name || '');
    const lowerName = safeName.toLowerCase();
    if (!lowerName.endsWith('.xlsx')) return invalidFile('仅允许上传 .xlsx 文件，不支持 .xls、.xlsm、.csv 或 .wps。');
    if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsm') || lowerName.endsWith('.csv') || lowerName.endsWith('.wps')) {
      return invalidFile('仅允许上传 .xlsx 文件，不支持 .xls、.xlsm、.csv 或 .wps。');
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { versions: { where: { id: params.versionId } } }
    });
    const version = project?.versions[0];
    if (!project || !version) {
      const error = excelError('EXCEL_PARSE_FAILED', '项目或版本不存在。', 404);
      return NextResponse.json(error.body, { status: error.status });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!hasXlsxZipSignature(buffer)) return invalidFile('文件内容不是有效的 .xlsx 工作簿。');

    const result = await parseV60WorkbookPreview(buffer, {
      projectId: project.id,
      versionId: version.id,
      projectName: project.name,
      versionName: version.name
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Excel 解析失败。';
    const response = excelError('EXCEL_PARSE_FAILED', message, 500);
    return NextResponse.json(response.body, { status: response.status });
  }
}

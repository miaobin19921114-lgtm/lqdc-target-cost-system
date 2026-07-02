import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createV60WorkbookBuffer, excelError, isSupportedTemplateVersion, safeExcelFileName } from '@/lib/excel-v60';

function yyyymmdd(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export async function GET(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const url = new URL(request.url);
  const exportType = url.searchParams.get('exportType') || 'full';
  const templateVersion = url.searchParams.get('templateVersion') || 'V60';

  if (exportType !== 'full') {
    const error = excelError('EXCEL_EXPORT_FAILED', '第一批仅支持完整模板导出。');
    return NextResponse.json(error.body, { status: error.status });
  }
  if (!isSupportedTemplateVersion(templateVersion)) {
    const error = excelError('EXCEL_TEMPLATE_UNSUPPORTED', '当前仅支持 V60 标准模板。');
    return NextResponse.json(error.body, { status: error.status });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          where: { id: params.versionId },
          include: {
            products: { where: { isActive: true } },
            revenues: { where: { productType: { isActive: true } }, include: { productType: true } },
            costs: {
              where: { OR: [{ productTypeId: null }, { productType: { isActive: true } }] },
              include: { productType: true, costSubject: true }
            },
            taxes: true
          }
        }
      }
    });
    const version = project?.versions[0];
    if (!project || !version) {
      const error = excelError('EXCEL_EXPORT_FAILED', '项目或版本不存在。', 404);
      return NextResponse.json(error.body, { status: error.status });
    }

    const dictionaryRows = await prisma.costDictionaryRow.findMany({
      where: { projectId: params.id },
      orderBy: { rowIndex: 'asc' }
    });
    const buffer = await createV60WorkbookBuffer({ project, version, dictionaryRows });
    const fileName = `${safeExcelFileName(project.name)}_${safeExcelFileName(version.name)}_目标成本测算_${yyyymmdd()}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store'
      }
    });
  } catch {
    const error = excelError('EXCEL_EXPORT_FAILED', '当前项目版本完整 Excel 导出失败。', 500);
    return NextResponse.json(error.body, { status: error.status });
  }
}

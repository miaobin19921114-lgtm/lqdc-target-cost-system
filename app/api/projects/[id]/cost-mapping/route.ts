import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function baseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const url = baseUrl(request);
  const back = `${url}/projects/${params.id}/cost-mapping`;
  const form = await request.formData();
  const action = String(form.get('action') || 'save');

  if (action === 'delete') {
    const mappingId = String(form.get('mappingId') || '');
    if (mappingId) await prisma.costDictionaryRow.deleteMany({ where: { id: mappingId, projectId: params.id, sourceTable: 'Excel科目映射' } });
    return NextResponse.redirect(`${back}?deleted=1`, 303);
  }

  const sourceText = String(form.get('sourceText') || '').trim();
  const targetCode = String(form.get('targetCode') || '').trim();
  const remark = String(form.get('remark') || '').trim();
  if (!sourceText || !targetCode) return NextResponse.redirect(`${back}?missing=1`, 303);

  const target = await prisma.costSubject.findUnique({ where: { code: targetCode } });
  if (!target) return NextResponse.redirect(`${back}?targetMissing=1`, 303);

  const old = await prisma.costDictionaryRow.findFirst({ where: { projectId: params.id, sourceTable: 'Excel科目映射', detailSubject: sourceText } });
  if (old) {
    await prisma.costDictionaryRow.update({
      where: { id: old.id },
      data: { targetMappingCode: targetCode, subjectDefinition: sourceText, enabled: '是', remark }
    });
  } else {
    const maxRow = await prisma.costDictionaryRow.aggregate({ where: { projectId: params.id }, _max: { rowIndex: true } });
    await prisma.costDictionaryRow.create({
      data: {
        projectId: params.id,
        rowIndex: (maxRow._max.rowIndex || 0) + 1,
        sourceTable: 'Excel科目映射',
        detailSubject: sourceText,
        subjectDefinition: sourceText,
        costCode: sourceText,
        targetMappingCode: targetCode,
        enabled: '是',
        remark
      }
    });
  }

  return NextResponse.redirect(`${back}?saved=1`, 303);
}

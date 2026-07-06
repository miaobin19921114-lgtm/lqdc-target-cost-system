import { NextResponse } from 'next/server';
import { assertSemanticEditable, getSubjectIndicatorBindings, loadSemanticVersion, saveSubjectIndicatorBindings, semanticJsonError } from '@/lib/quantity-semantics';

export async function GET(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const data = await getSubjectIndicatorBindings(params.id, params.versionId);
  if (!data) return semanticJsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const { searchParams } = new URL(request.url);
  const costLineId = searchParams.get('costLineId');
  const subjectCode = searchParams.get('costSubjectCode') || searchParams.get('subjectCode');
  const filtered = data.filter((row: any) => {
    if (costLineId && row.costLineId !== costLineId) return false;
    if (subjectCode && row.subjectCode !== subjectCode && row.detailSubjectCode !== subjectCode) return false;
    return true;
  });
  return NextResponse.json({ success: true, data: filtered });
}

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadSemanticVersion(params.id, params.versionId);
  const locked = assertSemanticEditable(version);
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : Array.isArray(body.subjectIndicatorBindings) ? body.subjectIndicatorBindings : [];
  try {
    await saveSubjectIndicatorBindings(params.id, version!, rows);
    return NextResponse.json({ success: true, data: { savedCount: rows.length } });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'VALIDATION_FAILED';
    return semanticJsonError(code, '明细科目基础指标绑定保存校验失败。');
  }
}

import { NextResponse } from 'next/server';
import { assertSemanticEditable, getConstructionStandards, loadSemanticVersion, saveConstructionStandards, semanticJsonError } from '@/lib/quantity-semantics';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const data = await getConstructionStandards(params.id, params.versionId);
  if (!data) return semanticJsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  return NextResponse.json({ success: true, data, meta: { recalculationRequiredWhenChanged: true } });
}

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadSemanticVersion(params.id, params.versionId);
  const locked = assertSemanticEditable(version, '当前测算版本已锁定，禁止修改建造标准。');
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : Array.isArray(body.constructionStandards) ? body.constructionStandards : [];
  try {
    await saveConstructionStandards(params.id, version!, rows);
    return NextResponse.json({ success: true, data: { savedCount: rows.length, recalculationRequired: true } });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'VALIDATION_FAILED';
    return semanticJsonError(code, '建造标准保存校验失败。');
  }
}

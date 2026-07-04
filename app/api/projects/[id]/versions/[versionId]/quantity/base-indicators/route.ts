import { NextResponse } from 'next/server';
import { assertSemanticEditable, getBaseIndicators, loadSemanticVersion, saveBaseIndicators, semanticJsonError } from '@/lib/quantity-semantics';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const data = await getBaseIndicators(params.id, params.versionId);
  if (!data) return semanticJsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  return NextResponse.json({ success: true, data });
}

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadSemanticVersion(params.id, params.versionId);
  const locked = assertSemanticEditable(version);
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : Array.isArray(body.baseIndicators) ? body.baseIndicators : [];
  try {
    await saveBaseIndicators(params.id, version!, rows);
    return NextResponse.json({ success: true, data: { savedCount: rows.length } });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'VALIDATION_FAILED';
    return semanticJsonError(code, '基础指标保存校验失败。');
  }
}

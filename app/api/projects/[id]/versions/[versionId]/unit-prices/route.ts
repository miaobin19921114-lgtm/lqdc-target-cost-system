import { NextResponse } from 'next/server';
import { assertSemanticEditable, getUnitPriceSources, loadSemanticVersion, saveUnitPriceSources, semanticJsonError } from '@/lib/quantity-semantics';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const data = await getUnitPriceSources(params.id, params.versionId);
  if (!data) return semanticJsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  return NextResponse.json({ success: true, data });
}

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadSemanticVersion(params.id, params.versionId);
  const locked = assertSemanticEditable(version);
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : Array.isArray(body.unitPriceSources) ? body.unitPriceSources : [];
  try {
    await saveUnitPriceSources(params.id, version!, rows);
    return NextResponse.json({ success: true, data: { savedCount: rows.length } });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'VALIDATION_FAILED';
    return semanticJsonError(code, '单价来源保存校验失败。');
  }
}

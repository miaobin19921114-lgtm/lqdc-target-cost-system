import { NextResponse } from 'next/server';
import { assertEditable, getManualAllocations, jsonError, loadVersion, saveManualAllocations } from '@/lib/cost-semantics';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  if (!version) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const data = await getManualAllocations(params.id, params.versionId);
  return NextResponse.json({ success: true, data });
}

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  const locked = assertEditable(version, '当前测算版本已锁定，禁止修改手工分摊。');
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  try {
    await saveManualAllocations(params.id, version!, rows);
  } catch (err) {
    const code = err instanceof Error ? err.message : 'MANUAL_ALLOCATION_INVALID';
    return jsonError(code, '手工分摊校验失败。');
  }
  return NextResponse.json({ success: true, data: { savedCount: rows.length } });
}

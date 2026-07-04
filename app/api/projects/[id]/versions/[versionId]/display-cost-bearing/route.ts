import { NextResponse } from 'next/server';
import { assertEditable, getDisplayCostBearing, jsonError, loadVersion, saveDisplayCostBearing } from '@/lib/cost-semantics';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  if (!version) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const data = await getDisplayCostBearing(params.id, params.versionId);
  return NextResponse.json({ success: true, data });
}

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  const locked = assertEditable(version, '当前测算版本已锁定，禁止修改展示成本承担口径。');
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  try {
    await saveDisplayCostBearing(params.id, version!, body);
  } catch {
    return jsonError('DISPLAY_COST_BEARING_INVALID', '展示成本承担口径无效。');
  }
  return NextResponse.json({ success: true, data: await getDisplayCostBearing(params.id, params.versionId) });
}

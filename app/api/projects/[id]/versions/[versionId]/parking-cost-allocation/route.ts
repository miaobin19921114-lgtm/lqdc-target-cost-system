import { NextResponse } from 'next/server';
import { assertEditable, getParkingCostAllocation, jsonError, loadVersion, saveParkingCostAllocation } from '@/lib/cost-semantics';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  if (!version) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const data = await getParkingCostAllocation(params.id, params.versionId);
  return NextResponse.json({ success: true, data });
}

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  const locked = assertEditable(version, '当前测算版本已锁定，禁止修改车位成本分摊。');
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  try {
    await saveParkingCostAllocation(params.id, version!, body);
  } catch {
    return jsonError('PARKING_ALLOCATION_INVALID', '车位成本手工分摊配置无效。');
  }
  return NextResponse.json({ success: true, data: await getParkingCostAllocation(params.id, params.versionId) });
}

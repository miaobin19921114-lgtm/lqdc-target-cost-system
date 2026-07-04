import { NextResponse } from 'next/server';
import { assertEditable, getCostPools, getTargetCostSummaryViews, jsonError, loadVersion, saveCostPools } from '@/lib/cost-semantics';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const data = await getCostPools(params.id, params.versionId);
  if (!data) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const targetCostSummaryViews = await getTargetCostSummaryViews(params.id, params.versionId);
  return NextResponse.json({ success: true, data, meta: { targetCostSummaryViews } });
}

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  const locked = assertEditable(version);
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : Array.isArray(body.pools) ? body.pools : [];
  await saveCostPools(params.id, version!, rows);
  return NextResponse.json({ success: true, data: { savedCount: rows.length } });
}

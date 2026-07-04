import { NextResponse } from 'next/server';
import { assertEditable, getCostPools, jsonError, loadVersion } from '@/lib/cost-semantics';
import { prisma } from '@/lib/prisma';
import { writeOperationLog } from '@/lib/operation-log';

export async function POST(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  const locked = assertEditable(version);
  if (locked) return locked;
  const pools = await getCostPools(params.id, params.versionId);
  if (!pools) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  await prisma.$transaction(async (tx) => {
    await writeOperationLog(tx, { projectId: params.id, versionId: params.versionId, module: 'cost_semantics', action: 'recalculate_cost_pools', targetType: 'costPool', afterData: { poolCount: pools.length } });
  });
  return NextResponse.json({ success: true, data: { recalculatedCount: pools.length, pools } });
}

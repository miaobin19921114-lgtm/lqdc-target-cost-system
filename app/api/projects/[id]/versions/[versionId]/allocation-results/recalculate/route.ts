import { NextResponse } from 'next/server';
import { allocationPurposes, assertEditable, getAllocationResults, jsonError, loadVersion } from '@/lib/cost-semantics';
import { prisma } from '@/lib/prisma';
import { writeOperationLog } from '@/lib/operation-log';

export async function POST(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  const locked = assertEditable(version);
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  const purpose = String(body.allocationPurpose || 'operation_profit');
  if (!allocationPurposes.includes(purpose as any)) return jsonError('ALLOCATION_PURPOSE_INVALID', '分摊目的无效。');
  const results = await getAllocationResults(params.id, params.versionId, purpose);
  if (!results) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  await prisma.$transaction(async (tx) => {
    await writeOperationLog(tx, { projectId: params.id, versionId: params.versionId, module: 'cost_semantics', action: 'recalculate_allocation_results', targetType: 'allocationResult', afterData: { allocationPurpose: purpose, resultCount: results.length } });
  });
  return NextResponse.json({ success: true, data: { recalculatedCount: results.length, allocationPurpose: purpose, results } });
}

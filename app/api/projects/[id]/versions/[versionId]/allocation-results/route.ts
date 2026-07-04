import { NextResponse } from 'next/server';
import { allocationPurposes, getAllocationResults, jsonError } from '@/lib/cost-semantics';

export async function GET(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const url = new URL(request.url);
  const purpose = url.searchParams.get('allocationPurpose') || 'operation_profit';
  if (!allocationPurposes.includes(purpose as any)) return jsonError('ALLOCATION_PURPOSE_INVALID', '分摊目的无效。');
  const data = await getAllocationResults(params.id, params.versionId, purpose);
  if (!data) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  return NextResponse.json({ success: true, data });
}

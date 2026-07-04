import { NextResponse } from 'next/server';
import { assertVersionEditable } from '@/lib/project-version';
import { refreshV1TargetCostSummary } from '@/lib/v1-cost-chain';

export async function POST(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const editable = await assertVersionEditable(params.id, params.versionId);
  if (!editable.ok) return editable.response;
  const data = await refreshV1TargetCostSummary(params.id, params.versionId);
  if (!data) return NextResponse.json({ success: false, error: { code: 'VERSION_NOT_FOUND', message: '测算版本不存在。' } }, { status: 404 });
  return NextResponse.json({ success: true, data });
}

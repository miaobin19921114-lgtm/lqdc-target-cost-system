import { NextResponse } from 'next/server';
import { syncProjectMetricBaseIndicators } from '@/lib/metric-center-service';
import { assertVersionEditable } from '@/lib/project-version';

export async function POST(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const editable = await assertVersionEditable(params.id, params.versionId);
  if (!editable.ok) return editable.response;
  const result = await syncProjectMetricBaseIndicators(params.id, params.versionId);
  return NextResponse.json(result.body, { status: result.status });
}

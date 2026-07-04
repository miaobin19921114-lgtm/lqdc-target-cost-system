import { NextResponse } from 'next/server';
import { syncProjectMetricBaseIndicators } from '@/lib/metric-center-service';

export async function POST(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const result = await syncProjectMetricBaseIndicators(params.id, params.versionId);
  return NextResponse.json(result.body, { status: result.status });
}

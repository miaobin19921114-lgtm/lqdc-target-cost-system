import { NextResponse } from 'next/server';
import { getProjectMetricCenter, saveProjectMetricCenter } from '@/lib/metric-center-service';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const result = await getProjectMetricCenter(params.id, params.versionId);
  return NextResponse.json(result.body, { status: result.status });
}

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const body = await request.json().catch(() => ({}));
  const result = await saveProjectMetricCenter(params.id, params.versionId, body);
  return NextResponse.json(result.body, { status: result.status });
}

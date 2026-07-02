import { NextResponse } from 'next/server';
import { saveProfileProjectMetrics } from '@/lib/profile-service';

export async function PUT(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const body = await request.json().catch(() => ({}));
  const result = await saveProfileProjectMetrics(params.id, params.versionId, body);
  return NextResponse.json(result.body, { status: result.status });
}

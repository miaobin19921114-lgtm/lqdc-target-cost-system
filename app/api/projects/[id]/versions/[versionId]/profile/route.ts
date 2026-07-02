import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/profile-service';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const result = await getProfile(params.id, params.versionId);
  return NextResponse.json(result.body, { status: result.status });
}

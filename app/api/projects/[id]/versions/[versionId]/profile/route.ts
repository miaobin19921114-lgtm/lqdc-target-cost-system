import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/profile-service';

export async function GET(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const url = new URL(request.url);
  const includeDisabled = url.searchParams.get('includeDisabled') === 'true';
  const result = await getProfile(params.id, params.versionId, includeDisabled);
  return NextResponse.json(result.body, { status: result.status });
}

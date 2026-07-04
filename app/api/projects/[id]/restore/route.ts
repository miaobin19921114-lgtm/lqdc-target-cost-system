import { NextResponse } from 'next/server';
import { jsonError, restoreProject } from '@/lib/project-service';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const result = await restoreProject(params.id);
  if (!result.ok) return jsonError(result.code, result.message, result.status);
  return NextResponse.json({ success: true, ...result.result, alreadyActive: result.alreadyActive || false });
}

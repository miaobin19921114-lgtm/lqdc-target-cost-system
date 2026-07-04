import { NextResponse } from 'next/server';
import { assertSemanticEditable, loadSemanticVersion, restoreAutoQuantity } from '@/lib/quantity-semantics';

export async function POST(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadSemanticVersion(params.id, params.versionId);
  const locked = assertSemanticEditable(version, '当前测算版本已锁定，禁止恢复系统推算。');
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  const result = await restoreAutoQuantity(params.id, params.versionId, body);
  return NextResponse.json(result.body, { status: result.status });
}

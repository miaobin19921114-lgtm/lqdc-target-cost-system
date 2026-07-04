import { NextResponse } from 'next/server';
import { assertSemanticEditable, loadSemanticVersion, manualQuantityOverride } from '@/lib/quantity-semantics';

export async function POST(request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadSemanticVersion(params.id, params.versionId);
  const locked = assertSemanticEditable(version, '当前测算版本已锁定，禁止手算覆盖工程量。');
  if (locked) return locked;
  const body = await request.json().catch(() => ({}));
  const result = await manualQuantityOverride(params.id, params.versionId, body);
  return NextResponse.json(result.body, { status: result.status });
}

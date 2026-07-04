import { NextResponse } from 'next/server';
import { assertSemanticEditable, loadSemanticVersion, recalculateQuantity, semanticJsonError } from '@/lib/quantity-semantics';

export async function POST(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadSemanticVersion(params.id, params.versionId);
  const locked = assertSemanticEditable(version);
  if (locked) return locked;
  try {
    const data = await recalculateQuantity(params.id, version!);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'VALIDATION_FAILED';
    return semanticJsonError(code, '工程量重新计算失败。');
  }
}

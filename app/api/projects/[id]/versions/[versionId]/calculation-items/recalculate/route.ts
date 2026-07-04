import { NextResponse } from 'next/server';
import { assertEditable, jsonError, loadVersion, recalculateCostLines } from '@/lib/cost-semantics';

export async function POST(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const version = await loadVersion(params.id, params.versionId);
  const locked = assertEditable(version);
  if (locked) return locked;
  try {
    const recalculatedCount = await recalculateCostLines(params.id, version!);
    return NextResponse.json({ success: true, data: { recalculatedCount } });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'VALIDATION_FAILED';
    return jsonError(code, '测算事项重算失败。');
  }
}

import { NextResponse } from 'next/server';
import { getQuantityCalculations, semanticJsonError } from '@/lib/quantity-semantics';

export async function GET(_request: Request, { params }: { params: { id: string; versionId: string } }) {
  const data = await getQuantityCalculations(params.id, params.versionId);
  if (!data) return semanticJsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  return NextResponse.json({ success: true, data });
}

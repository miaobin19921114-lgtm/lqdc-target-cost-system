import { NextResponse } from 'next/server';
import { restoreCostLineAutoQuantity } from '@/lib/cost-line-quantity-service';

export async function POST(_request: Request, { params }: { params: { id: string; versionId: string; costLineId: string } }) {
  const result = await restoreCostLineAutoQuantity(params.id, params.versionId, params.costLineId);
  return NextResponse.json(result.body, { status: result.status });
}

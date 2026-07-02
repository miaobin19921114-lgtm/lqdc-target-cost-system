import { NextResponse } from 'next/server';
import { overrideCostLineQuantity } from '@/lib/cost-line-quantity-service';

export async function PATCH(request: Request, { params }: { params: { id: string; versionId: string; costLineId: string } }) {
  const body = await request.json().catch(() => ({}));
  const result = await overrideCostLineQuantity(params.id, params.versionId, params.costLineId, {
    quantity: body.quantity ?? body.finalQuantity ?? body.manualQuantity,
    overrideReason: body.overrideReason ? String(body.overrideReason) : null
  });
  return NextResponse.json(result.body, { status: result.status });
}

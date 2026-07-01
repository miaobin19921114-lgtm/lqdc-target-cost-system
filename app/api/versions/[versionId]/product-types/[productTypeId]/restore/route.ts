import { NextResponse } from 'next/server';
import { restoreVersionProductType } from '@/lib/product-type-service';

export async function POST(request: Request, { params }: { params: { versionId: string; productTypeId: string } }) {
  const body = await request.json().catch(() => ({}));
  const result = await restoreVersionProductType(params.versionId, params.productTypeId, body.operationReason ? String(body.operationReason) : null);
  return NextResponse.json(result.body, { status: result.status });
}

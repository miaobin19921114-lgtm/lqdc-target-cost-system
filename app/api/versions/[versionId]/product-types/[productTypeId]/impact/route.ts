import { NextResponse } from 'next/server';
import { getProductTypeImpact } from '@/lib/product-type-service';

export async function GET(_request: Request, { params }: { params: { versionId: string; productTypeId: string } }) {
  const impact = await getProductTypeImpact(params.versionId, params.productTypeId);
  if (!impact) {
    return NextResponse.json({ success: false, error: { code: 'PRODUCT_TYPE_NOT_FOUND', message: '业态不存在。' } }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: impact });
}

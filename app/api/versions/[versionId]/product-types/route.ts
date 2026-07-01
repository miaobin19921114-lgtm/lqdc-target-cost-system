import { NextResponse } from 'next/server';
import { addVersionProductType, listVersionProductTypes } from '@/lib/product-type-service';

export async function GET(request: Request, { params }: { params: { versionId: string } }) {
  const url = new URL(request.url);
  const includeDisabled = url.searchParams.get('includeDisabled') === 'true';
  const result = await listVersionProductTypes(params.versionId, includeDisabled);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request, { params }: { params: { versionId: string } }) {
  const body = await request.json().catch(() => ({}));
  const result = await addVersionProductType(params.versionId, {
    productTypeCode: String(body.productTypeCode || ''),
    productTypeName: body.productTypeName ? String(body.productTypeName) : undefined,
    productCategory: body.productCategory ? String(body.productCategory) : undefined,
    operationReason: body.operationReason ? String(body.operationReason) : null
  });
  return NextResponse.json(result.body, { status: result.status });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { taxLiquidationObjects } from '@/lib/tax-liquidation-object';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const baseUrl = getBaseUrl(request);
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?taxObjectSaved=0`, 303);
  if (locked) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?locked=1`, 303);

  const productId = String(form.get('productId') || '');
  const value = String(form.get('taxLiquidationObject') || '');
  if (!productId || !taxLiquidationObjects.includes(value as any)) {
    return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?taxObjectSaved=0`, 303);
  }

  const product = await prisma.productType.findFirst({ where: { id: productId, projectVersionId: version.id }, select: { id: true } });
  if (!product) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?taxObjectSaved=0`, 303);

  await prisma.$executeRawUnsafe('UPDATE "ProductType" SET "taxLiquidationObject" = $1 WHERE "id" = $2', value, productId);
  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?taxObjectSaved=1`, 303);
}

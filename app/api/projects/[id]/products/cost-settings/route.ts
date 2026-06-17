import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeCostSettingsRemark } from '@/lib/cost-product-settings';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const productId = String(form.get('productId') || '');
  const standalone = String(form.get('standalone') || '') === '是';
  const groupName = String(form.get('groupName') || '').trim() || '项目整体共用';
  const baseUrl = getBaseUrl(request);
  if (!productId) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?missing=1`, 303);

  const product = await prisma.productType.findUnique({ where: { id: productId }, include: { projectVersion: true } });
  if (!product || product.projectVersion.projectId !== params.id) {
    return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?missing=1`, 303);
  }

  await prisma.productType.update({
    where: { id: productId },
    data: { remark: writeCostSettingsRemark(product.remark, standalone, groupName) }
  });

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?costSettingsSaved=1`, 303);
}

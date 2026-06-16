import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

function redirectTo(request: Request, projectId: string, result: string) {
  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${projectId}/product-maintenance?${result}=1`, 303);
}

const disableData = {
  isActive: false,
  disabledAt: new Date(),
  isSaleable: false,
  participateAllocation: false
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const productId = String(form.get('productId') || '');
  const action = String(form.get('action') || '');
  if (!productId) return redirectTo(request, params.id, 'missing');

  const product = await prisma.productType.findUnique({ where: { id: productId }, include: { projectVersion: true } });
  if (!product || product.projectVersion.projectId !== params.id) return redirectTo(request, params.id, 'missing');

  if (action === 'disable') {
    await prisma.productType.update({ where: { id: productId }, data: disableData });
    return redirectTo(request, params.id, 'disabled');
  }

  if (action === 'restore') {
    const [revenueCount, costCount] = await Promise.all([
      prisma.revenueLine.count({ where: { productTypeId: productId } }),
      prisma.costLine.count({ where: { productTypeId: productId } })
    ]);
    await prisma.productType.update({
      where: { id: productId },
      data: {
        isActive: true,
        disabledAt: null,
        participateAllocation: true,
        isSaleable: revenueCount > 0 || Number(product.saleableArea || 0) > 0
      }
    });
    if (revenueCount > 0 || costCount > 0) return redirectTo(request, params.id, 'restoredWithHistory');
    return redirectTo(request, params.id, 'restored');
  }

  if (action === 'delete') {
    const [revenueCount, costCount] = await Promise.all([
      prisma.revenueLine.count({ where: { productTypeId: productId } }),
      prisma.costLine.count({ where: { productTypeId: productId } })
    ]);
    if (revenueCount > 0 || costCount > 0) {
      await prisma.productType.update({ where: { id: productId }, data: disableData });
      return redirectTo(request, params.id, 'cannotDelete');
    }
    await prisma.productType.delete({ where: { id: productId } });
    return redirectTo(request, params.id, 'deleted');
  }

  return redirectTo(request, params.id, 'unknown');
}

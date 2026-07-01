import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isVersionLocked } from '@/lib/project-version';
import { disableVersionProductType, restoreVersionProductType } from '@/lib/product-type-service';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

function redirectTo(request: Request, projectId: string, result: string) {
  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${projectId}/product-maintenance?${result}=1`, 303);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const productId = String(form.get('productId') || '');
  const action = String(form.get('action') || '');
  if (!productId) return redirectTo(request, params.id, 'missing');

  const product = await prisma.productType.findUnique({ where: { id: productId }, include: { projectVersion: true } });
  if (!product || product.projectVersion.projectId !== params.id) return redirectTo(request, params.id, 'missing');
  if (isVersionLocked(product.projectVersion)) return redirectTo(request, params.id, 'locked');

  if (action === 'disable') {
    const result = await disableVersionProductType(product.projectVersionId, productId, String(form.get('operationReason') || '') || null);
    return redirectTo(request, params.id, result.body.success ? 'disabled' : 'cannotDisable');
  }

  if (action === 'restore') {
    const result = await restoreVersionProductType(product.projectVersionId, productId, String(form.get('operationReason') || '') || null);
    return redirectTo(request, params.id, result.body.success ? 'restored' : 'cannotRestore');
  }

  if (action === 'delete') {
    const result = await disableVersionProductType(product.projectVersionId, productId, String(form.get('operationReason') || '') || null);
    return redirectTo(request, params.id, result.body.success ? 'defaultProtected' : 'cannotDelete');
  }

  return redirectTo(request, params.id, 'unknown');
}

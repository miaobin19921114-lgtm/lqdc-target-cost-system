import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateActiveVersion } from '@/lib/project-version';

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function toNumber(form: FormData, name: string) {
  const value = Number(clean(form, name));
  return Number.isFinite(value) ? value : 0;
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const rowCount = Math.max(0, Math.min(200, Number(form.get('rowCount') || 0)));
  let savedCount = 0;

  const version = await getOrCreateActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/revenue?saved=0`, 303);

  for (let index = 0; index < rowCount; index += 1) {
    const productId = clean(form, `productId-${index}`);
    if (!productId) continue;
    const product = await prisma.productType.findFirst({ where: { id: productId, projectVersionId: version.id, isActive: true, isSaleable: true } });
    if (!product) continue;
    await prisma.productType.update({
      where: { id: productId },
      data: { salePrice: toNumber(form, `salePrice-${index}`) }
    });
    savedCount += 1;
  }

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/revenue?saved=1&rows=${savedCount}`, 303);
}

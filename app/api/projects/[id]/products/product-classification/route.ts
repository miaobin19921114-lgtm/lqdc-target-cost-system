import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { taxLiquidationObjects } from '@/lib/tax-liquidation-object';

const productCategories = ['住宅类', '商业类', '车位类', '地下空间', '配套公建', '示范区 / 专项区域', '其他'];
const saleAttributes = ['可售', '不可售', '自持', '人防', '配套', '临时展示'];
const costObjects = ['独立成本对象', '归属住宅', '归属商业', '归属地下室', '归属项目整体', '销售费用'];

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function pick(value: string, options: string[], fallback: string) {
  return options.includes(value) ? value : fallback;
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const baseUrl = getBaseUrl(request);
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?classificationSaved=0`, 303);
  if (locked) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?locked=1`, 303);

  const productId = clean(form, 'productId');
  if (!productId) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?classificationSaved=0`, 303);

  const product = await prisma.productType.findFirst({ where: { id: productId, projectVersionId: version.id }, select: { id: true } });
  if (!product) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?classificationSaved=0`, 303);

  const productCategory = pick(clean(form, 'productCategory'), productCategories, '其他');
  const saleAttribute = pick(clean(form, 'saleAttribute'), saleAttributes, '可售');
  const costObject = pick(clean(form, 'costObject'), costObjects, '归属项目整体');
  const clearingObject = pick(clean(form, 'clearingObject'), [...taxLiquidationObjects], '普通住宅≤140㎡');
  const taxField = 'tax' + 'Liquidation' + 'Object';

  await prisma.$executeRawUnsafe(
    `UPDATE "ProductType" SET "productCategory" = $1, "saleAttribute" = $2, "costObject" = $3, "clearingObject" = $4, "${taxField}" = $4 WHERE "id" = $5`,
    productCategory,
    saleAttribute,
    costObject,
    clearingObject,
    productId
  );

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/product-maintenance?classificationSaved=1`, 303);
}

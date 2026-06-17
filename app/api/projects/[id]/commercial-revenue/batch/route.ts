import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { getEditableActiveVersion } from '@/lib/project-version';

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

function calcAmount(input: { mode: string; area: number; salePrice: number; monthlyRent: number; occupancyRate: number; years: number }) {
  if (input.mode.includes('出租') || input.mode.includes('自持')) return input.area * input.monthlyRent * 12 * input.occupancyRate * input.years;
  return input.area * input.salePrice;
}

function safeName(value: string) {
  return value.replace(/[\\/]/g, '-').trim();
}

function buildRemark(input: { parentProductId: string; parentName: string; subType: string; mode: string; area: number; salePrice: number; monthlyRent: number; occupancyRate: number; years: number; remark: string }) {
  return `归属业态ID：${input.parentProductId}；归属业态：${input.parentName}；细分类型：${input.subType}；模式：${input.mode}；面积：${input.area}；销售单价：${input.salePrice}；月租金：${input.monthlyRent}；出租率：${input.occupancyRate}；测算年限：${input.years}；备注：${input.remark || '-'}`;
}

async function upsertCommercialRevenue(input: { projectVersionId: string; parentProductId: string; parentName: string; subType: string; amount: number; taxRate: number; remark: string }) {
  const productName = `商业收入-${safeName(input.parentName)}-${safeName(input.subType)}`;
  const result = calculateRevenueLine(1, input.amount, input.taxRate);
  const existing = await prisma.productType.findFirst({ where: { projectVersionId: input.projectVersionId, name: productName } });
  const productData = {
    saleableArea: 1,
    buildingArea: 0,
    capacityArea: 0,
    salePrice: input.amount,
    isSaleable: true,
    isActive: true,
    participateAllocation: false,
    allocationWeight: 0,
    remark: input.remark
  };
  const product = existing
    ? await prisma.productType.update({ where: { id: existing.id }, data: productData })
    : await prisma.productType.create({ data: { projectVersionId: input.projectVersionId, name: productName, ...productData } });

  const data = {
    saleableArea: 1,
    salePrice: input.amount,
    taxRate: input.taxRate,
    taxInclusiveRevenue: result.taxInclusiveRevenue,
    taxExclusiveRevenue: result.taxExclusiveRevenue,
    taxAmount: result.taxAmount,
    remark: `商业收入测算；${input.remark}`
  };
  const old = await prisma.revenueLine.findFirst({ where: { projectVersionId: input.projectVersionId, productTypeId: product.id } });
  if (old) await prisma.revenueLine.update({ where: { id: old.id }, data });
  else await prisma.revenueLine.create({ data: { projectVersionId: input.projectVersionId, productTypeId: product.id, ...data } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const rowCount = Math.max(0, Math.min(80, Number(form.get('rowCount') || 0)));
  const back = `${getBaseUrl(request)}/projects/${params.id}/commercial-revenue`;
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${back}?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${back}?locked=1`, 303);

  let savedCount = 0;
  for (let index = 0; index < rowCount; index += 1) {
    const parentProductId = clean(form, `parentProductId-${index}`);
    const parentName = clean(form, `parentName-${index}`);
    const subType = clean(form, `subType-${index}`);
    const mode = clean(form, `mode-${index}`) || '出售';
    const area = toNumber(form, `area-${index}`);
    const salePrice = toNumber(form, `salePrice-${index}`);
    const monthlyRent = toNumber(form, `monthlyRent-${index}`);
    const occupancyRate = toNumber(form, `occupancyRate-${index}`) || 0;
    const years = toNumber(form, `years-${index}`) || 1;
    const taxRate = toNumber(form, `taxRate-${index}`);
    const remark = clean(form, `remark-${index}`);
    if (!parentProductId || !parentName || !subType || area <= 0) continue;

    const parent = await prisma.productType.findFirst({ where: { id: parentProductId, projectVersionId: version.id, isActive: true } });
    if (!parent) continue;

    const amount = calcAmount({ mode, area, salePrice, monthlyRent, occupancyRate, years });
    if (amount <= 0) continue;

    await upsertCommercialRevenue({
      projectVersionId: version.id,
      parentProductId,
      parentName,
      subType,
      amount,
      taxRate,
      remark: buildRemark({ parentProductId, parentName, subType, mode, area, salePrice, monthlyRent, occupancyRate, years, remark })
    });
    savedCount += 1;
  }

  return NextResponse.redirect(`${back}?saved=1&rows=${savedCount}`, 303);
}

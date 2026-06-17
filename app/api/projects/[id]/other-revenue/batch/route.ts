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

function buildRemark(input: { cashDate: string; certainty: string; condition: string; remark: string }) {
  return `兑现时间：${input.cashDate || '待定'}；确定性：${input.certainty || '待确认'}；兑现条件：${input.condition || '待补充'}；备注：${input.remark || '-'}`;
}

async function upsertOtherRevenue(input: { projectVersionId: string; typeName: string; amount: number; taxRate: number; remark: string }) {
  const productName = `其他收入-${input.typeName}`;
  const result = calculateRevenueLine(1, input.amount, input.taxRate);
  const existing = await prisma.productType.findFirst({ where: { projectVersionId: input.projectVersionId, name: productName } });
  const product = existing
    ? await prisma.productType.update({
        where: { id: existing.id },
        data: { saleableArea: 1, buildingArea: 0, capacityArea: 0, salePrice: input.amount, isSaleable: true, isActive: true, participateAllocation: false, allocationWeight: 0, remark: input.remark }
      })
    : await prisma.productType.create({
        data: { projectVersionId: input.projectVersionId, name: productName, saleableArea: 1, buildingArea: 0, capacityArea: 0, salePrice: input.amount, isSaleable: true, isActive: true, participateAllocation: false, allocationWeight: 0, remark: input.remark }
      });

  const data = {
    saleableArea: 1,
    salePrice: input.amount,
    taxRate: input.taxRate,
    taxInclusiveRevenue: result.taxInclusiveRevenue,
    taxExclusiveRevenue: result.taxExclusiveRevenue,
    taxAmount: result.taxAmount,
    remark: `其他收入测算；${input.remark}`
  };
  const old = await prisma.revenueLine.findFirst({ where: { projectVersionId: input.projectVersionId, productTypeId: product.id } });
  if (old) await prisma.revenueLine.update({ where: { id: old.id }, data });
  else await prisma.revenueLine.create({ data: { projectVersionId: input.projectVersionId, productTypeId: product.id, ...data } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const rowCount = Math.max(0, Math.min(20, Number(form.get('rowCount') || 0)));
  const back = `${getBaseUrl(request)}/projects/${params.id}/other-revenue`;
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${back}?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${back}?locked=1`, 303);

  let savedCount = 0;
  for (let index = 0; index < rowCount; index += 1) {
    const typeName = clean(form, `type-${index}`);
    const amount = toNumber(form, `amount-${index}`);
    const taxRate = toNumber(form, `taxRate-${index}`);
    const cashDate = clean(form, `cashDate-${index}`);
    const certainty = clean(form, `certainty-${index}`);
    const condition = clean(form, `condition-${index}`);
    const remark = clean(form, `remark-${index}`);
    if (!typeName || amount <= 0) continue;

    await upsertOtherRevenue({
      projectVersionId: version.id,
      typeName,
      amount,
      taxRate,
      remark: buildRemark({ cashDate, certainty, condition, remark })
    });
    savedCount += 1;
  }

  return NextResponse.redirect(`${back}?saved=1&rows=${savedCount}`, 303);
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRevenueLine } from '@/lib/calculations';
import { getEditableActiveVersion } from '@/lib/project-version';

function clean(form: FormData, name: string) { return String(form.get(name) || '').trim(); }
function toNumber(form: FormData, name: string) { const value = Number(clean(form, name)); return Number.isFinite(value) ? value : 0; }
function getBaseUrl(request: Request) { const proto = request.headers.get('x-forwarded-proto') || 'https'; const host = request.headers.get('x-forwarded-host') || request.headers.get('host'); return host ? `${proto}://${host}` : new URL(request.url).origin; }

async function syncReportRevenue(input: { projectVersionId: string; incomeType: string; amount: number; taxRate: number; remark: string }) {
  const productName = `其他收入-${input.incomeType}`;
  const result = calculateRevenueLine(1, input.amount, input.taxRate);
  const oldProduct = await prisma.productType.findFirst({ where: { projectVersionId: input.projectVersionId, name: productName } });
  const productData = { saleableArea: 1, buildingArea: 0, capacityArea: 0, salePrice: input.amount, isSaleable: true, isActive: true, participateAllocation: false, allocationWeight: 0, remark: input.remark };
  const product = oldProduct ? await prisma.productType.update({ where: { id: oldProduct.id }, data: productData }) : await prisma.productType.create({ data: { projectVersionId: input.projectVersionId, name: productName, ...productData } });
  const revenueData = { saleableArea: 1, salePrice: input.amount, taxRate: input.taxRate, taxInclusiveRevenue: result.taxInclusiveRevenue, taxExclusiveRevenue: result.taxExclusiveRevenue, taxAmount: result.taxAmount, remark: input.remark };
  const oldRevenue = await prisma.revenueLine.findFirst({ where: { projectVersionId: input.projectVersionId, productTypeId: product.id } });
  if (oldRevenue) await prisma.revenueLine.update({ where: { id: oldRevenue.id }, data: revenueData });
  else await prisma.revenueLine.create({ data: { projectVersionId: input.projectVersionId, productTypeId: product.id, ...revenueData } });
}

async function upsertOtherRevenue(input: { projectVersionId: string; incomeType: string; amount: number; taxRate: number; cashDate: string; certainty: string; condition: string; policyBasis: string; remark: string }) {
  const result = calculateRevenueLine(1, input.amount, input.taxRate);
  await prisma.otherRevenueLine.upsert({
    where: { projectVersionId_incomeType: { projectVersionId: input.projectVersionId, incomeType: input.incomeType } },
    update: { amount: input.amount, taxRate: input.taxRate, taxInclusiveRevenue: result.taxInclusiveRevenue, taxExclusiveRevenue: result.taxExclusiveRevenue, taxAmount: result.taxAmount, certainty: input.certainty, cashDate: input.cashDate, condition: input.condition, policyBasis: input.policyBasis, remark: input.remark },
    create: { projectVersionId: input.projectVersionId, incomeType: input.incomeType, amount: input.amount, taxRate: input.taxRate, taxInclusiveRevenue: result.taxInclusiveRevenue, taxExclusiveRevenue: result.taxExclusiveRevenue, taxAmount: result.taxAmount, certainty: input.certainty, cashDate: input.cashDate, condition: input.condition, policyBasis: input.policyBasis, remark: input.remark }
  });
  await syncReportRevenue(input);
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
    const incomeType = clean(form, `type-${index}`);
    const amount = toNumber(form, `amount-${index}`);
    const taxRate = toNumber(form, `taxRate-${index}`);
    const cashDate = clean(form, `cashDate-${index}`);
    const certainty = clean(form, `certainty-${index}`);
    const condition = clean(form, `condition-${index}`);
    const policyBasis = clean(form, `policyBasis-${index}`);
    const remark = clean(form, `remark-${index}`);
    if (!incomeType || amount <= 0) continue;
    await upsertOtherRevenue({ projectVersionId: version.id, incomeType, amount, taxRate, cashDate, certainty, condition, policyBasis, remark });
    savedCount += 1;
  }
  return NextResponse.redirect(`${back}?saved=1&rows=${savedCount}`, 303);
}

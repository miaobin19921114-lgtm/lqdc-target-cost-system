import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { n, revenueFromProjectData } from '@/lib/tax-summary';

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function toNumber(form: FormData, name: string, fallback = 0) {
  const value = Number(clean(form, name));
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const back = `${getBaseUrl(request)}/projects/${params.id}/sales-schedule`;
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${back}?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${back}?locked=1`, 303);

  const fullVersion = await prisma.projectVersion.findUnique({
    where: { id: version.id },
    include: { products: true, taxes: true, revenues: { include: { productType: true } }, commercialRevenueLines: true, otherRevenueLines: true }
  });
  if (!fullVersion) return NextResponse.redirect(`${back}?saved=0`, 303);

  const vatRate = n(fullVersion.taxes?.vatRate || 0.09);
  const revenue = revenueFromProjectData({ products: fullVersion.products, revenues: fullVersion.revenues, commercialRevenueLines: fullVersion.commercialRevenueLines, otherRevenueLines: fullVersion.otherRevenueLines, vatRate });
  const salesBase = revenue.ordinary.taxInclusive + revenue.commercial.taxInclusive + revenue.parking.taxInclusive;
  const months = clamp(Math.round(toNumber(form, 'months', 12)), 1, 36);
  const downPaymentRate = toNumber(form, 'downPaymentRate', 30) / 100;
  const mortgageRate = toNumber(form, 'mortgageRate', 65) / 100;
  const tailRate = toNumber(form, 'tailRate', 5) / 100;
  const mortgageDelay = clamp(Math.round(toNumber(form, 'mortgageDelay', 2)), 0, 36);
  const tailDelay = clamp(Math.round(toNumber(form, 'tailDelay', 6)), 0, 36);
  const defaultRate = 100 / months;
  const ratios = Array.from({ length: months }, (_, index) => toNumber(form, `p${index + 1}`, defaultRate));
  const contractAmounts = ratios.map((ratio) => salesBase * ratio / 100);

  const oldPlan = await prisma.salesSchedulePlan.findFirst({ where: { projectVersionId: version.id }, orderBy: { updatedAt: 'desc' } });
  const plan = oldPlan
    ? await prisma.salesSchedulePlan.update({ where: { id: oldPlan.id }, data: { months, downPaymentRate, mortgageRate, tailRate, mortgageDelay, tailDelay } })
    : await prisma.salesSchedulePlan.create({ data: { projectVersionId: version.id, months, downPaymentRate, mortgageRate, tailRate, mortgageDelay, tailDelay } });

  await prisma.salesScheduleLine.deleteMany({ where: { planId: plan.id } });
  let cumulativeContract = 0;
  let cumulativeCollection = 0;
  for (let index = 0; index < months; index += 1) {
    const contractAmount = contractAmounts[index];
    const downPayment = contractAmount * downPaymentRate;
    const mortgageCollection = index - mortgageDelay >= 0 ? contractAmounts[index - mortgageDelay] * mortgageRate : 0;
    const tailCollection = index - tailDelay >= 0 ? contractAmounts[index - tailDelay] * tailRate : 0;
    const totalCollection = downPayment + mortgageCollection + tailCollection;
    cumulativeContract += contractAmount;
    cumulativeCollection += totalCollection;
    await prisma.salesScheduleLine.create({
      data: {
        planId: plan.id,
        monthIndex: index + 1,
        sellThroughRate: ratios[index] / 100,
        contractAmount,
        downPayment,
        mortgageCollection,
        tailCollection,
        totalCollection,
        cumulativeContract,
        cumulativeCollection,
        receivableBalance: cumulativeContract - cumulativeCollection
      }
    });
  }

  return NextResponse.redirect(`${back}?saved=1`, 303);
}

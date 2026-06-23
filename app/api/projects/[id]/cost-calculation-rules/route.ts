import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function s(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

function b(value: FormDataEntryValue | null) {
  return s(value) === 'true';
}

function sql(value: string | boolean) {
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const ruleKey = s(form.get('ruleKey'));
  if (!ruleKey) return NextResponse.redirect(new URL(`/projects/${params.id}/cost-mapping?ruleMissing=1`, request.url));

  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "CostCalculationRule" SET
        "quantityField" = ${sql(s(form.get('quantityField')))},
        "configField" = ${sql(s(form.get('configField')))},
        "calculationMethod" = ${sql(s(form.get('calculationMethod')))},
        "costAttributionMethod" = ${sql(s(form.get('costAttributionMethod')))},
        "allocationMethod" = ${sql(s(form.get('allocationMethod')))},
        "taxDeductionMethod" = ${sql(s(form.get('taxDeductionMethod')))},
        "allowQuantityOverride" = ${sql(b(form.get('allowQuantityOverride')))},
        "allowPriceOverride" = ${sql(b(form.get('allowPriceOverride')))},
        "remark" = ${sql(s(form.get('remark')))},
        "updatedAt" = NOW()
      WHERE "ruleKey" = ${sql(ruleKey)}
    `);
    return NextResponse.redirect(new URL(`/projects/${params.id}/cost-mapping?ruleSaved=1`, request.url));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL(`/projects/${params.id}/cost-mapping?ruleError=1`, request.url));
  }
}

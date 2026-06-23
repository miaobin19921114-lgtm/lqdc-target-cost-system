import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function s(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

function b(value: FormDataEntryValue | null) {
  return s(value) === 'true';
}

function n(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(s(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sql(value: string | number | boolean) {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const ruleKey = s(form.get('ruleKey'));
  if (!ruleKey) return NextResponse.redirect(new URL(`/projects/${params.id}/cost-calculation-rules?ruleMissing=1`, request.url));

  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "CostCalculationRule" SET
        "quantityField" = ${sql(s(form.get('quantityField')))},
        "configField" = ${sql(s(form.get('configField')))},
        "calculationMethod" = ${sql(s(form.get('calculationMethod')))},
        "costAttributionMethod" = ${sql(s(form.get('costAttributionMethod')))},
        "allocationMethod" = ${sql(s(form.get('allocationMethod')))},
        "taxDeductionMethod" = ${sql(s(form.get('taxDeductionMethod')))},
        "vatInputCreditAllowed" = ${sql(b(form.get('vatInputCreditAllowed')))},
        "vatRate" = ${sql(n(form.get('vatRate'), 0.09))},
        "vatTreatment" = ${sql(s(form.get('vatTreatment')))},
        "nonDeductibleVatTreatment" = ${sql(s(form.get('nonDeductibleVatTreatment')))},
        "landVatDeductible" = ${sql(b(form.get('landVatDeductible')))},
        "landVatDeductionCategory" = ${sql(s(form.get('landVatDeductionCategory')))},
        "landVatAllocationMethod" = ${sql(s(form.get('landVatAllocationMethod')))},
        "landVatClearanceObject" = ${sql(s(form.get('landVatClearanceObject')))},
        "incomeTaxDeductible" = ${sql(b(form.get('incomeTaxDeductible')))},
        "incomeTaxTreatment" = ${sql(s(form.get('incomeTaxTreatment')))},
        "incomeTaxCostObject" = ${sql(s(form.get('incomeTaxCostObject')))},
        "incomeTaxAllocationMethod" = ${sql(s(form.get('incomeTaxAllocationMethod')))},
        "periodExpenseType" = ${sql(s(form.get('periodExpenseType')))},
        "allowQuantityOverride" = ${sql(b(form.get('allowQuantityOverride')))},
        "allowPriceOverride" = ${sql(b(form.get('allowPriceOverride')))},
        "remark" = ${sql(s(form.get('remark')))},
        "updatedAt" = NOW()
      WHERE "ruleKey" = ${sql(ruleKey)}
    `);
    return NextResponse.redirect(new URL(`/projects/${params.id}/cost-calculation-rules?ruleSaved=1`, request.url));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL(`/projects/${params.id}/cost-calculation-rules?ruleError=1`, request.url));
  }
}

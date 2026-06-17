import { calculateIncomeTax, calculateRevenueLine, round2 } from './calculations';

export function n(value: unknown) {
  return Number(value || 0);
}

export function rateByLandVatRatio(ratio: number) {
  if (ratio <= 0.5) return { rate: 0.3, deduction: 0 };
  if (ratio <= 1) return { rate: 0.4, deduction: 0.05 };
  if (ratio <= 2) return { rate: 0.5, deduction: 0.15 };
  return { rate: 0.6, deduction: 0.35 };
}

export function effectiveCostRows<T extends { productTypeId?: string | null; productType?: { isActive?: boolean | null } | null; costSubject: { code: string; level: number } }>(costs: T[], leafCodes: Set<string>) {
  const activeCosts = costs.filter((row) => !row.productTypeId || row.productType?.isActive);
  const effective = leafCodes.size ? activeCosts.filter((row) => row.costSubject.level >= 4 || leafCodes.has(row.costSubject.code)) : activeCosts;
  return {
    activeCosts,
    effective,
    ignoredDisabled: costs.length - activeCosts.length,
    ignoredNonLeaf: activeCosts.length - effective.length,
    importedLeafRows: activeCosts.filter((row) => row.costSubject.level >= 4 && !leafCodes.has(row.costSubject.code)).length
  };
}

export function revenueFromProducts(products: Array<{ isActive?: boolean | null; isSaleable?: boolean | null; saleableArea: unknown; salePrice: unknown }>, vatRate: number) {
  const rows = products
    .filter((item) => item.isActive && item.isSaleable)
    .map((item) => calculateRevenueLine(n(item.saleableArea), n(item.salePrice), vatRate));
  return {
    rows,
    taxInclusive: round2(rows.reduce((sum, row) => sum + row.taxInclusiveRevenue, 0)),
    taxExclusive: round2(rows.reduce((sum, row) => sum + row.taxExclusiveRevenue, 0)),
    outputVat: round2(rows.reduce((sum, row) => sum + row.taxAmount, 0))
  };
}

export function costTotals(costs: Array<{ taxInclusiveAmount: unknown; taxExclusiveAmount: unknown; taxAmount: unknown; costSubject: { code: string } }>) {
  const taxInclusive = round2(costs.reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0));
  const taxExclusive = round2(costs.reduce((sum, row) => sum + n(row.taxExclusiveAmount), 0));
  const inputVat = round2(costs.reduce((sum, row) => sum + n(row.taxAmount), 0));
  const landCost = round2(costs.filter((row) => row.costSubject.code.startsWith('01')).reduce((sum, row) => sum + n(row.taxInclusiveAmount), 0));
  const devCost = round2(costs.filter((row) => row.costSubject.code.startsWith('02') || row.costSubject.code.startsWith('03')).reduce((sum, row) => sum + n(row.taxExclusiveAmount || row.taxInclusiveAmount), 0));
  const saleManageFinance = round2(costs.filter((row) => row.costSubject.code.startsWith('04') || row.costSubject.code.startsWith('05') || row.costSubject.code.startsWith('06')).reduce((sum, row) => sum + n(row.taxExclusiveAmount || row.taxInclusiveAmount), 0));
  return { taxInclusive, taxExclusive, inputVat, landCost, devCost, saleManageFinance };
}

export function landVatSummary(input: { revenueExclusive: number; outputVat: number; landCost: number; devCost: number; saleManageFinance: number; surchargeRate: number }) {
  const taxAndSurcharge = round2(Math.max(input.outputVat, 0) * input.surchargeRate);
  const additionalDeduction = round2((input.landCost + input.devCost) * 0.2);
  const deductionTotal = round2(input.landCost + input.devCost + input.saleManageFinance + taxAndSurcharge + additionalDeduction);
  const valueAdded = round2(Math.max(0, input.revenueExclusive - deductionTotal));
  const valueAddedRatio = deductionTotal ? valueAdded / deductionTotal : 0;
  const ladder = rateByLandVatRatio(valueAddedRatio);
  const landVat = round2(Math.max(0, valueAdded * ladder.rate - deductionTotal * ladder.deduction));
  return { taxAndSurcharge, additionalDeduction, deductionTotal, valueAdded, valueAddedRatio, ladder, landVat };
}

export function fullTaxSummary(input: { revenueExclusive: number; outputVat: number; inputVat: number; costExclusive: number; landCost: number; devCost: number; saleManageFinance: number; surchargeRate: number; incomeTaxRate: number }) {
  const payableVat = round2(Math.max(input.outputVat - input.inputVat, 0));
  const surcharge = round2(payableVat * input.surchargeRate);
  const landVat = landVatSummary({
    revenueExclusive: input.revenueExclusive,
    outputVat: payableVat,
    landCost: input.landCost,
    devCost: input.devCost,
    saleManageFinance: input.saleManageFinance,
    surchargeRate: input.surchargeRate
  });
  const profitBeforeIncomeTax = round2(input.revenueExclusive - input.costExclusive - surcharge - landVat.landVat);
  const incomeTax = calculateIncomeTax(profitBeforeIncomeTax, input.incomeTaxRate);
  const netProfit = round2(profitBeforeIncomeTax - incomeTax);
  const totalTax = round2(payableVat + surcharge + landVat.landVat + incomeTax);
  return { payableVat, surcharge, landVat, profitBeforeIncomeTax, incomeTax, netProfit, totalTax };
}

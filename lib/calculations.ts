export function round2(value: number) {
  const scaled = (value + Number.EPSILON) * 100;
  return Math.round(scaled) / 100;
}

export function calculateRevenueLine(saleableArea: number, salePrice: number, rate: number) {
  // 全系统经营口径：单价为“元/㎡”，合价统一保存为“万元”。
  const taxInclusiveRevenue = round2((saleableArea * salePrice) / 10000);
  const taxExclusiveRevenue = round2(taxInclusiveRevenue / (1 + rate));
  const taxAmount = round2(taxInclusiveRevenue - taxExclusiveRevenue);

  return {
    taxInclusiveRevenue,
    taxExclusiveRevenue,
    taxAmount
  };
}

export function calculateCostLine(input: {
  quantity: number;
  taxRate: number;
  taxExclusiveUnitPrice?: number;
  taxInclusiveUnitPrice?: number;
}) {
  const quantity = input.quantity;
  const rate = input.taxRate;

  if (input.taxInclusiveUnitPrice !== undefined) {
    // 全系统成本口径：单价为“元/单位”，合价统一保存为“万元”。
    const taxInclusiveAmount = round2((quantity * input.taxInclusiveUnitPrice) / 10000);
    const taxExclusiveAmount = round2(taxInclusiveAmount / (1 + rate));
    const taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
    const taxExclusiveUnitPrice = round2(input.taxInclusiveUnitPrice / (1 + rate));

    return {
      taxExclusiveUnitPrice,
      taxInclusiveUnitPrice: input.taxInclusiveUnitPrice,
      taxExclusiveAmount,
      taxAmount,
      taxInclusiveAmount
    };
  }

  const taxExclusiveUnitPrice = input.taxExclusiveUnitPrice ?? 0;
  // 全系统成本口径：单价为“元/单位”，合价统一保存为“万元”。
  const taxExclusiveAmount = round2((quantity * taxExclusiveUnitPrice) / 10000);
  const taxAmount = round2(taxExclusiveAmount * rate);
  const taxInclusiveAmount = round2(taxExclusiveAmount + taxAmount);
  const taxInclusiveUnitPrice = round2(taxExclusiveUnitPrice * (1 + rate));

  return {
    taxExclusiveUnitPrice,
    taxInclusiveUnitPrice,
    taxExclusiveAmount,
    taxAmount,
    taxInclusiveAmount
  };
}

export function calculateIncomeTax(profitBeforeIncomeTax: number, rate: number) {
  return round2(Math.max(profitBeforeIncomeTax * rate, 0));
}

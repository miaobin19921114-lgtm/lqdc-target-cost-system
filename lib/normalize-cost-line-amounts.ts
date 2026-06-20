import { prisma } from './prisma';

function n(value: unknown) {
  return Number(value || 0);
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function changed(a: unknown, b: number) {
  return Math.abs(n(a) - b) >= 0.01;
}

export async function normalizeProjectVersionCostLineAmounts(projectVersionId: string) {
  const rows = await prisma.costLine.findMany({
    where: { projectVersionId },
    select: {
      id: true,
      quantity: true,
      taxRate: true,
      taxInclusiveUnitPrice: true,
      taxExclusiveUnitPrice: true,
      taxInclusiveAmount: true,
      taxExclusiveAmount: true,
      taxAmount: true
    }
  });

  let changedCount = 0;

  for (const row of rows) {
    const quantity = n(row.quantity);
    const taxRate = n(row.taxRate);
    const taxInclusiveUnitPrice = n(row.taxInclusiveUnitPrice);
    const taxExclusiveUnitPrice = n(row.taxExclusiveUnitPrice);
    if (!quantity || (!taxInclusiveUnitPrice && !taxExclusiveUnitPrice)) continue;

    let nextTaxInclusiveUnitPrice = taxInclusiveUnitPrice;
    let nextTaxExclusiveUnitPrice = taxExclusiveUnitPrice;
    let taxInclusiveAmount = 0;
    let taxExclusiveAmount = 0;
    let taxAmount = 0;

    if (taxInclusiveUnitPrice) {
      taxInclusiveAmount = round2((quantity * taxInclusiveUnitPrice) / 10000);
      taxExclusiveAmount = round2(taxInclusiveAmount / (1 + taxRate));
      taxAmount = round2(taxInclusiveAmount - taxExclusiveAmount);
      nextTaxExclusiveUnitPrice = round2(taxInclusiveUnitPrice / (1 + taxRate));
    } else {
      taxExclusiveAmount = round2((quantity * taxExclusiveUnitPrice) / 10000);
      taxAmount = round2(taxExclusiveAmount * taxRate);
      taxInclusiveAmount = round2(taxExclusiveAmount + taxAmount);
      nextTaxInclusiveUnitPrice = round2(taxExclusiveUnitPrice * (1 + taxRate));
    }

    const needsUpdate = changed(row.taxInclusiveAmount, taxInclusiveAmount)
      || changed(row.taxExclusiveAmount, taxExclusiveAmount)
      || changed(row.taxAmount, taxAmount)
      || changed(row.taxExclusiveUnitPrice, nextTaxExclusiveUnitPrice)
      || changed(row.taxInclusiveUnitPrice, nextTaxInclusiveUnitPrice);

    if (!needsUpdate) continue;

    await prisma.costLine.update({
      where: { id: row.id },
      data: {
        taxInclusiveUnitPrice: nextTaxInclusiveUnitPrice,
        taxExclusiveUnitPrice: nextTaxExclusiveUnitPrice,
        taxInclusiveAmount,
        taxExclusiveAmount,
        taxAmount
      }
    });
    changedCount += 1;
  }

  return changedCount;
}

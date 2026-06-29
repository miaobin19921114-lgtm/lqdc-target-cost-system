import { describe, expect, it } from 'vitest';
import { calculateCostLine, calculateIncomeTax, calculateRevenueLine } from '../lib/calculations';

describe('calculations', () => {
  it('calculates revenue line', () => {
    expect(calculateRevenueLine(100, 109, 0.09)).toEqual({ taxInclusiveRevenue: 1.09, taxExclusiveRevenue: 1, taxAmount: 0.09 });
  });

  it('calculates cost line by tax exclusive unit price', () => {
    expect(calculateCostLine({ quantity: 100, taxRate: 0.09, taxExclusiveUnitPrice: 100 })).toMatchObject({ taxExclusiveAmount: 1, taxAmount: 0.09, taxInclusiveAmount: 1.09 });
  });

  it('calculates cost line by tax inclusive unit price and tax amount as inclusive minus exclusive', () => {
    expect(calculateCostLine({ quantity: 100, taxRate: 0.09, taxInclusiveUnitPrice: 109 })).toMatchObject({ taxInclusiveAmount: 1.09, taxExclusiveAmount: 1, taxAmount: 0.09 });
  });

  it('does not create negative income tax', () => {
    expect(calculateIncomeTax(-100, 0.25)).toBe(0);
  });
});

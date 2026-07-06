import { describe, expect, it } from 'vitest';
import { pickDefinedCostLineV101Fields, resolveFinalQuantity } from '../lib/cost-line-quantity-fields';

describe('cost line quantity source fields', () => {
  it('resolves final quantity by the V1.0.1 priority order', () => {
    expect(resolveFinalQuantity({
      lockedQuantity: 7,
      drawingMeasuredQuantity: 6,
      excelImportedQuantity: 5,
      manualQuantity: 4,
      engineeringMetricQuantity: 3,
      measureValue: 2,
      coefficient: 2,
      templateDefaultQuantity: 1,
      taxInclusiveUnitPrice: 10
    })).toMatchObject({ finalQuantity: 7, quantitySource: 'locked', quantityStatus: 'locked' });

    expect(resolveFinalQuantity({ drawingMeasuredQuantity: 6, excelImportedQuantity: 5, manualQuantity: 4, engineeringMetricQuantity: 3, measureValue: 2, coefficient: 2, templateDefaultQuantity: 1 })).toMatchObject({ finalQuantity: 6, quantitySource: 'drawing_measured' });
    expect(resolveFinalQuantity({ excelImportedQuantity: 5, manualQuantity: 4, engineeringMetricQuantity: 3, measureValue: 2, coefficient: 2, templateDefaultQuantity: 1 })).toMatchObject({ finalQuantity: 5, quantitySource: 'excel_imported' });
    expect(resolveFinalQuantity({ manualQuantity: 4, engineeringMetricQuantity: 3, measureValue: 2, coefficient: 2, templateDefaultQuantity: 1 })).toMatchObject({ finalQuantity: 4, quantitySource: 'manual_override' });
    expect(resolveFinalQuantity({ engineeringMetricQuantity: 3, measureValue: 2, coefficient: 2, templateDefaultQuantity: 1 })).toMatchObject({ finalQuantity: 3, quantitySource: 'from_engineering_metric' });
    expect(resolveFinalQuantity({ measureValue: 2, coefficient: 2, templateDefaultQuantity: 1 })).toMatchObject({ finalQuantity: 4, quantitySource: 'inferred_by_indicator_content' });
    expect(resolveFinalQuantity({ templateDefaultQuantity: 1 })).toMatchObject({ finalQuantity: 1, quantitySource: 'template_default' });
  });

  it('returns explainable quantity and amount statuses for incomplete rows', () => {
    expect(resolveFinalQuantity({ coefficient: 2 })).toMatchObject({ finalQuantity: null, quantityStatus: 'missing_basis' });
    expect(resolveFinalQuantity({ measureValue: 2 })).toMatchObject({ finalQuantity: null, quantityStatus: 'missing_content_rule' });
    expect(resolveFinalQuantity({ manualQuantity: 4 })).toMatchObject({ amountStatus: 'missing_unit_price' });
    expect(resolveFinalQuantity({ taxInclusiveUnitPrice: 100 })).toMatchObject({ amountStatus: 'missing_quantity' });
  });

  it('keeps omitted fields out of partial update patches', () => {
    expect(pickDefinedCostLineV101Fields({ manualQuantity: null, quantitySource: undefined, unrelated: 1 })).toEqual({
      manualQuantity: null,
      quantitySource: undefined
    });
  });
});

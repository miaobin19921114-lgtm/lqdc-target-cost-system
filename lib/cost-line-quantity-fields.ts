export const costLineQuantityFieldNames = [
  'engineeringMetricQuantity',
  'manualQuantity',
  'excelImportedQuantity',
  'drawingMeasuredQuantity',
  'lockedQuantity',
  'templateDefaultQuantity'
] as const;

export const costLineSourceStatusFieldNames = [
  'quantitySource',
  'quantityStatus',
  'quantityFormula',
  'unitPriceSourceType',
  'pricingUnit',
  'amountStatus',
  'constructionStandardCode',
  'specialOptionCode',
  'buildingId',
  'unitId',
  'houseTypeId',
  'locationType',
  'buildingPart',
  'quantityPrecisionLevel',
  'pricePrecisionLevel'
] as const;

export const costLineV101FieldNames = [
  ...costLineQuantityFieldNames,
  ...costLineSourceStatusFieldNames
] as const;

export type CostLineV101FieldName = (typeof costLineV101FieldNames)[number];
export type CostLineQuantityFieldName = (typeof costLineQuantityFieldNames)[number];
export type CostLineSourceStatusFieldName = (typeof costLineSourceStatusFieldNames)[number];
export type CostLineV101FieldPatch =
  Partial<Record<CostLineQuantityFieldName, number | null>>
  & Partial<Record<CostLineSourceStatusFieldName, string | null>>;

export type CostLineQuantityInput = {
  quantity?: unknown;
  measureValue?: unknown;
  coefficient?: unknown;
  taxInclusiveUnitPrice?: unknown;
  taxInclusiveAmount?: unknown;
  amountStatus?: unknown;
  engineeringMetricQuantity?: unknown;
  manualQuantity?: unknown;
  excelImportedQuantity?: unknown;
  drawingMeasuredQuantity?: unknown;
  lockedQuantity?: unknown;
  templateDefaultQuantity?: unknown;
};

export type ResolvedCostLineQuantity = {
  finalQuantity: number | null;
  quantitySource: string | null;
  quantityStatus: string;
  quantityFormula: string | null;
  amountStatus: string;
};

export function numericValue(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function nullableNumericValue(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function hasQuantity(value: unknown) {
  return nullableNumericValue(value) !== null;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function amountStatusFor(input: CostLineQuantityInput, finalQuantity: number | null) {
  const savedAmount = numericValue(input.taxInclusiveAmount);
  const savedStatus = String(input.amountStatus || '');
  if (savedAmount > 0 && (savedStatus === 'manual_amount' || savedStatus === 'imported_amount')) return savedStatus;
  const unitPrice = numericValue(input.taxInclusiveUnitPrice);
  if ((finalQuantity ?? 0) > 0 && unitPrice > 0) return 'calculated';
  if ((finalQuantity ?? 0) > 0 && unitPrice <= 0) return 'missing_unit_price';
  if ((finalQuantity ?? 0) <= 0 && unitPrice > 0) return 'missing_quantity';
  return savedAmount > 0 ? 'manual_amount' : 'pending';
}

export function resolveFinalQuantity(input: CostLineQuantityInput): ResolvedCostLineQuantity {
  const priority: Array<[keyof CostLineQuantityInput, string, string]> = [
    ['lockedQuantity', 'locked', 'lockedQuantity'],
    ['drawingMeasuredQuantity', 'drawing_measured', 'drawingMeasuredQuantity'],
    ['excelImportedQuantity', 'excel_imported', 'excelImportedQuantity'],
    ['manualQuantity', 'manual_override', 'manualQuantity'],
    ['engineeringMetricQuantity', 'from_engineering_metric', 'engineeringMetricQuantity']
  ];

  for (const [field, source, formula] of priority) {
    if (hasQuantity(input[field])) {
      const finalQuantity = nullableNumericValue(input[field]);
      return {
        finalQuantity,
        quantitySource: source,
        quantityStatus: source,
        quantityFormula: formula,
        amountStatus: amountStatusFor(input, finalQuantity)
      };
    }
  }

  const measureValue = nullableNumericValue(input.measureValue);
  const coefficient = nullableNumericValue(input.coefficient);
  if (measureValue !== null && coefficient !== null) {
    const finalQuantity = round2(measureValue * coefficient);
    return {
      finalQuantity,
      quantitySource: 'inferred_by_indicator_content',
      quantityStatus: 'inferred_by_indicator_content',
      quantityFormula: 'measureValue × coefficient',
      amountStatus: amountStatusFor(input, finalQuantity)
    };
  }

  if (hasQuantity(input.templateDefaultQuantity)) {
    const finalQuantity = nullableNumericValue(input.templateDefaultQuantity);
    return {
      finalQuantity,
      quantitySource: 'template_default',
      quantityStatus: 'template_default',
      quantityFormula: 'templateDefaultQuantity',
      amountStatus: amountStatusFor(input, finalQuantity)
    };
  }

  const status = measureValue === null ? 'missing_basis' : 'missing_content_rule';
  return {
    finalQuantity: null,
    quantitySource: null,
    quantityStatus: status,
    quantityFormula: null,
    amountStatus: amountStatusFor(input, null)
  };
}

export function costLineQuantityPatch(input: CostLineQuantityInput) {
  const resolved = resolveFinalQuantity(input);
  return {
    quantity: resolved.finalQuantity ?? 0,
    quantitySource: resolved.quantitySource,
    quantityStatus: resolved.quantityStatus,
    quantityFormula: resolved.quantityFormula,
    amountStatus: resolved.amountStatus
  };
}

export function mapCostLineV101Fields(line: Record<string, unknown>) {
  return Object.fromEntries(costLineV101FieldNames.map((field) => [field, line[field] ?? null]));
}

export function pickDefinedCostLineV101Fields(input: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const field of costLineV101FieldNames) {
    if (Object.prototype.hasOwnProperty.call(input, field)) output[field] = input[field];
  }
  return output;
}

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text || null;
}

export function costLineV101FieldsFromForm(form: FormData, fieldName: (field: string) => string): CostLineV101FieldPatch {
  const output: CostLineV101FieldPatch = {};
  for (const field of costLineQuantityFieldNames) {
    const key = fieldName(field);
    if (!form.has(key)) continue;
    output[field] = nullableNumericValue(cleanText(form.get(key)));
  }
  for (const field of costLineSourceStatusFieldNames) {
    const key = fieldName(field);
    if (!form.has(key)) continue;
    output[field] = cleanText(form.get(key));
  }
  return output;
}

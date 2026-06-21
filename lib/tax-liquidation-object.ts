export const taxLiquidationObjects = [
  '普通住宅≤140㎡',
  '非普通住宅＞140㎡',
  '非住宅-商业',
  '非住宅-车位',
  '非住宅-办公/公寓',
  '不可售配套',
  '人防/特殊物业'
] as const;

export type TaxLiquidationObject = typeof taxLiquidationObjects[number];

function includes(text: string | null | undefined, words: string[]) {
  const value = text || '';
  return words.some((word) => value.includes(word));
}

export function inferTaxLiquidationObject(product: { name?: string | null; isSaleable?: boolean | null }) {
  const name = product.name || '';
  if (!product.isSaleable) return '不可售配套';
  if (includes(name, ['人防'])) return '人防/特殊物业';
  if (includes(name, ['车位', '车库', '地下产权车位', '地下使用权车位'])) return '非住宅-车位';
  if (includes(name, ['商业', '底商', '商铺', '商业街', '商业综合体'])) return '非住宅-商业';
  if (includes(name, ['办公', '公寓', 'LOFT', '酒店', '会所'])) return '非住宅-办公/公寓';
  if (includes(name, ['140', '大户型', '改善', '非普通'])) return '非普通住宅＞140㎡';
  return '普通住宅≤140㎡';
}

export function normalizeTaxLiquidationObject(value: string | null | undefined, product: { name?: string | null; isSaleable?: boolean | null }) {
  const text = String(value || '').trim();
  if (taxLiquidationObjects.includes(text as TaxLiquidationObject)) return text as TaxLiquidationObject;
  if (!text) return inferTaxLiquidationObject(product);
  if (includes(text, ['普通住宅≤140', '普通住宅', '住宅≤140', '小于140', '小于等于140'])) return '普通住宅≤140㎡';
  if (includes(text, ['非普通住宅', '住宅＞140', '大于140', '改善住宅'])) return '非普通住宅＞140㎡';
  if (includes(text, ['非住宅'])) return inferTaxLiquidationObject(product);
  return inferTaxLiquidationObject(product);
}

export function getTaxLiquidationObject(product: { name?: string | null; isSaleable?: boolean | null; taxLiquidationObject?: string | null }) {
  return normalizeTaxLiquidationObject(product.taxLiquidationObject, product);
}

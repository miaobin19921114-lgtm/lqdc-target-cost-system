import { getCostSettings } from './cost-product-settings';
import { n } from './tax-summary';

export type AllocationPurpose = 'operating' | 'landVat' | 'incomeTax';

export type AllocationDictionaryRow = {
  costCode: string | null;
  targetAllocationMethod?: string | null;
  landVatAllocationMethod?: string | null;
  costAttributionMethod?: string | null;
  incomeTaxDeductionCategory?: string | null;
};

export type AllocationProduct = {
  id: string;
  name?: string | null;
  buildingArea?: unknown;
  saleableArea?: unknown;
  capacityArea?: unknown;
  nonSaleableArea?: unknown;
  salePrice?: unknown;
  allocationWeight?: unknown;
  isSaleable?: boolean | null;
};

export type AllocationCostLine = {
  allocationMethod?: string | null;
  regionOrProductType?: string | null;
  productTypeId?: string | null;
  costSubject: {
    code: string;
    defaultAllocationMethod?: string | null;
  };
};

export function includes(text: string | null | undefined, words: string[]) {
  const value = text || '';
  return words.some((word) => value.includes(word));
}

function clean(value: string | null | undefined) {
  const text = (value || '').trim();
  return text || null;
}

export function productCostGroupName(product: AllocationProduct) {
  const setting = getCostSettings(product as any);
  return setting.standalone ? (product.name || '') : setting.groupName;
}

export function resolveAllocationRule(
  cost: AllocationCostLine,
  dictionaryByCode: Map<string, AllocationDictionaryRow>,
  purpose: AllocationPurpose = 'operating'
) {
  const dict = dictionaryByCode.get(cost.costSubject.code);
  const projectMethod = clean(cost.allocationMethod);
  const subjectDefault = clean(cost.costSubject.defaultAllocationMethod);
  const operatingRule = clean(dict?.targetAllocationMethod) || clean(dict?.costAttributionMethod);
  const landVatRule = clean(dict?.landVatAllocationMethod) || clean(dict?.targetAllocationMethod) || clean(dict?.costAttributionMethod);
  const incomeTaxRule = clean(dict?.incomeTaxDeductionCategory) || clean(dict?.targetAllocationMethod) || clean(dict?.costAttributionMethod) || clean(dict?.landVatAllocationMethod);
  const templateMethod = purpose === 'landVat' ? landVatRule : purpose === 'incomeTax' ? incomeTaxRule : operatingRule;

  if (projectMethod) return { method: projectMethod, source: '项目调整' };
  if (templateMethod) return { method: templateMethod, source: purpose === 'landVat' ? '模板土增税规则' : purpose === 'incomeTax' ? '模板所得税规则' : '模板经营规则' };
  if (subjectDefault) return { method: subjectDefault, source: '标准科目默认' };
  return { method: '按可售面积占比', source: '系统默认' };
}

export function allocationBase(product: AllocationProduct, method: string | null | undefined) {
  const weight = n(product.allocationWeight || 1) || 1;
  const methodText = method || '';
  if (includes(methodText, ['建筑面积', '建面'])) return n(product.buildingArea) * weight;
  if (includes(methodText, ['计容'])) return n(product.capacityArea) * weight;
  if (includes(methodText, ['不可售'])) return n(product.nonSaleableArea) * weight;
  if (includes(methodText, ['车位', '地库', '地下车位']) || includes(product.name, ['车位', '地库', '地下'])) return (n(product.saleableArea) || n(product.buildingArea)) * weight;
  if (includes(methodText, ['销售收入', '收入'])) return n(product.saleableArea) * n(product.salePrice) * weight;
  return (n(product.saleableArea) || n(product.buildingArea) || n(product.capacityArea)) * weight;
}

export function regionMatchesProduct(region: string, product: AllocationProduct) {
  const productName = product.name || '';
  const costGroup = productCostGroupName(product);
  if (!region || region.includes('全项目') || region.includes('项目整体') || region.includes('Excel导入')) return true;
  if (region === productName || region === costGroup) return true;
  if (region.includes(productName) || productName.includes(region)) return true;
  if (region.includes(costGroup) || costGroup.includes(region)) return true;
  if (region.includes('主楼地下室') && productName.includes('主楼地下室')) return true;
  if (region.includes('非主楼地下室') && (productName.includes('非主楼') || productName.includes('纯地库') || costGroup.includes('非主楼地下室'))) return true;
  if (region.includes('人防地下室') && (productName.includes('人防') || costGroup.includes('人防地下室'))) return true;
  if (region.includes('地下') && productName.includes('地下') && !region.includes('非主楼') && !region.includes('主楼')) return true;
  return false;
}

export function rowAttributionType(cost: AllocationCostLine, poolSize: number, hasDirectProduct: boolean) {
  if (hasDirectProduct) return '直接归属业态';
  const region = cost.regionOrProductType || '';
  if (region && !includes(region, ['全项目', '项目整体', 'Excel导入']) && poolSize > 0) return '成本归属分组';
  return '共同分摊';
}

export function incomeTaxCostObjectName(product: AllocationProduct) {
  if (!product.isSaleable) return '不可售配套/公共成本对象';
  if (includes(product.name, ['车位', '车库', '地库'])) return '所得税成本对象-车位';
  if (includes(product.name, ['商业', '底商', '商铺'])) return '所得税成本对象-商业';
  return `所得税成本对象-${product.name || '未命名业态'}`;
}

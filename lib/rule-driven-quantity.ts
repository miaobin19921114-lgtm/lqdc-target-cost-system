import type { PrismaClient } from '@prisma/client';
import { normalizeVersionStage } from '@/lib/version-stage';

type RuleDrivenQuantityInput = {
  projectId: string;
  projectVersionId: string;
  costCode: string;
  basisName: string;
  regionOrProductType?: string | null;
  fallbackMeasureValue: number;
  fallbackCoefficient: number;
  fallbackQuantity: number;
  quantityOverride: boolean;
  fallbackUnit?: string | null;
};

export type RuleDrivenQuantityResult = {
  applied: boolean;
  measureValue: number;
  coefficient: number;
  quantity: number;
  unit?: string | null;
  source?: string;
  ruleId?: string;
};

function toNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'bigint') return Number(value);
  if (value && typeof value === 'object') {
    const record = value as { toNumber?: () => number; toString?: () => string };
    if (typeof record.toNumber === 'function') return record.toNumber();
    if (typeof record.toString === 'function') return Number(record.toString()) || 0;
  }
  return Number(value || 0) || 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function metricField(metricKey: string) {
  return metricKey.replace(/^product\./, '');
}

function pickRecordNumber(record: unknown, key: string) {
  if (!record || typeof record !== 'object') return 0;
  return toNumber((record as Record<string, unknown>)[key]);
}

function matchProductName(name: string | null | undefined, regionOrProductType: string | null | undefined) {
  const productName = String(name || '').trim();
  const target = String(regionOrProductType || '').trim();
  if (!productName || !target) return false;
  return target.includes(productName) || productName.includes(target) || target === `业态-${productName}` || target === `区域-${productName}`;
}

async function findRule(prisma: PrismaClient, costCode: string, basisName: string, stage: string) {
  const direct = await prisma.measureBasisRule.findFirst({
    where: { costCode, basisName, enabled: true }
  });
  if (direct) return direct;

  const candidates = await prisma.measureBasisRule.findMany({
    where: { enabled: true, OR: [{ costCode }, { costCode: { startsWith: `${costCode}.` } }] },
    orderBy: [{ priority: 'asc' }, { basisName: 'asc' }],
    take: 20
  });
  return candidates.find((item) => item.basisName === basisName) || candidates[0] || null;
}

async function resolveProjectMetric(prisma: PrismaClient, input: RuleDrivenQuantityInput, metricKey: string) {
  const metricValue = await prisma.projectMetricValue.findFirst({
    where: { projectId: input.projectId, projectVersionId: input.projectVersionId, productTypeId: null, metricKey },
    orderBy: { updatedAt: 'desc' }
  });
  if (metricValue) return toNumber(metricValue.value);

  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  return pickRecordNumber(project, metricKey);
}

async function resolveProductMetric(prisma: PrismaClient, input: RuleDrivenQuantityInput, metricKey: string) {
  const products = await prisma.productType.findMany({ where: { projectVersionId: input.projectVersionId, isActive: true }, orderBy: { createdAt: 'asc' } });
  const product = products.find((item) => matchProductName(item.name, input.regionOrProductType)) || products[0];
  if (!product) return 0;

  const fullMetricKey = metricKey.startsWith('product.') ? metricKey : `product.${metricKey}`;
  const metricValue = await prisma.projectMetricValue.findFirst({
    where: { projectId: input.projectId, projectVersionId: input.projectVersionId, productTypeId: product.id, metricKey: fullMetricKey },
    orderBy: { updatedAt: 'desc' }
  });
  if (metricValue) return toNumber(metricValue.value);

  return pickRecordNumber(product, metricField(metricKey));
}

export async function calculateRuleDrivenQuantity(prisma: PrismaClient, input: RuleDrivenQuantityInput): Promise<RuleDrivenQuantityResult> {
  if (input.quantityOverride) {
    return {
      applied: false,
      measureValue: input.fallbackMeasureValue,
      coefficient: input.fallbackCoefficient || 1,
      quantity: input.fallbackQuantity,
      unit: input.fallbackUnit,
      source: '手动覆盖工程量'
    };
  }

  const version = await prisma.projectVersion.findUnique({ where: { id: input.projectVersionId }, select: { stage: true } });
  const stage = normalizeVersionStage(version?.stage);
  const rule = await findRule(prisma, input.costCode, input.basisName, stage);
  if (!rule) {
    return {
      applied: false,
      measureValue: input.fallbackMeasureValue,
      coefficient: input.fallbackCoefficient || 1,
      quantity: input.fallbackQuantity,
      unit: input.fallbackUnit,
      source: '无规则库匹配'
    };
  }

  const coefficient = input.fallbackCoefficient || toNumber(rule.defaultCoefficient) || 1;
  const formula = String(rule.quantityFormula || '').trim();
  let measureValue = input.fallbackMeasureValue;
  let quantity = input.fallbackQuantity;

  if (rule.metricKey) {
    const isProductMetric = rule.metricScope === 'product' || rule.metricKey.startsWith('product.');
    measureValue = isProductMetric
      ? await resolveProductMetric(prisma, input, rule.metricKey)
      : await resolveProjectMetric(prisma, input, rule.metricKey);
    quantity = round2(measureValue * coefficient);
  } else if (formula === '1') {
    measureValue = 1;
    quantity = 1;
  } else if (/manual|手动|固定|合同|金额/i.test(`${formula} ${rule.basisName}`)) {
    measureValue = input.fallbackMeasureValue;
    quantity = input.fallbackQuantity || (measureValue ? round2(measureValue * coefficient) : 0);
  } else if (measureValue) {
    quantity = round2(measureValue * coefficient);
  }

  if (!quantity && input.fallbackQuantity) quantity = input.fallbackQuantity;

  return {
    applied: true,
    measureValue,
    coefficient,
    quantity,
    unit: rule.quantityUnit || input.fallbackUnit,
    source: `规则库：${rule.basisName}`,
    ruleId: rule.id
  };
}

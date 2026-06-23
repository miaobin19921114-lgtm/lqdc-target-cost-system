import { prisma } from '@/lib/prisma';

export type VersionRuleEngineRule = {
  id: string;
  versionId: string;
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  applicableStage: string;
  precisionLevel: string;
  dataSourceTable: string | null;
  requiredFields: string | null;
  measureBasis: string | null;
  quantityFormula: string | null;
  pricingUnit: string | null;
  unitPriceSource: string | null;
  amountFormula: string | null;
  costAttributionMethod: string | null;
  allocationMethod: string | null;
  vatTreatment: string | null;
  landVatTreatment: string | null;
  incomeTaxTreatment: string | null;
  financeTreatment: string | null;
  sortOrder: number;
};

export type VersionRuleEngineContext = {
  versionId: string;
  snapshotId: string | null;
  sourceTemplateCode: string | null;
  isLocked: boolean;
  rules: VersionRuleEngineRule[];
};

export async function getVersionRuleEngineContext(versionId: string): Promise<VersionRuleEngineContext> {
  const [snapshot] = await prisma.$queryRawUnsafe<Array<{
    id: string;
    versionId: string;
    sourceTemplateCode: string;
    snapshotStatus: string;
  }>>(`
    SELECT "id", "versionId", "sourceTemplateCode", "snapshotStatus"
    FROM "VersionRuleSnapshot"
    WHERE "versionId" = $1
    LIMIT 1
  `, versionId).catch(() => []);

  if (!snapshot) {
    return {
      versionId,
      snapshotId: null,
      sourceTemplateCode: null,
      isLocked: false,
      rules: [],
    };
  }

  const rules = await prisma.$queryRawUnsafe<VersionRuleEngineRule[]>(`
    SELECT "id", "versionId", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields",
           "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula", "costAttributionMethod", "allocationMethod",
           "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "sortOrder"
    FROM "VersionUnifiedRuleSnapshot"
    WHERE "snapshotId" = $1 AND "isEnabled" = TRUE
    ORDER BY "sortOrder" ASC, "ruleType" ASC, "subjectCode" ASC, "applicableStage" ASC, "precisionLevel" ASC
  `, snapshot.id).catch(() => []);

  return {
    versionId,
    snapshotId: snapshot.id,
    sourceTemplateCode: snapshot.sourceTemplateCode,
    isLocked: snapshot.snapshotStatus === 'locked',
    rules,
  };
}

export function findCostRule(context: VersionRuleEngineContext, subjectCode: string, precisionLevel = 'L3 目标测算') {
  return context.rules.find((rule) => rule.ruleType === 'COST' && rule.subjectCode === subjectCode && rule.precisionLevel === precisionLevel) || null;
}

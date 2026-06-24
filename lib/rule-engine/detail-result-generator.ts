import { prisma } from '@/lib/prisma';

type VersionRule = {
  id: string;
  snapshotId: string;
  projectId: string;
  versionId: string;
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  applicableStage: string;
  precisionLevel: string;
  measureBasis: string | null;
  quantityFormula: string | null;
  pricingUnit: string | null;
  unitPriceSource: string | null;
  defaultCoefficient: unknown;
  amountFormula: string | null;
  costAttributionMethod: string | null;
  allocationMethod: string | null;
  vatTreatment: string | null;
  landVatTreatment: string | null;
  incomeTaxTreatment: string | null;
  sortOrder: number;
};

const DETAIL_RULES = [
  { detailType: 'land', name: '土地费用明细表', prefixes: ['01'] },
  { detailType: 'pre-costs', name: '前期费用明细表', prefixes: ['02'] },
  { detailType: 'building-details', name: '土建明细表', prefixes: ['03'] },
  { detailType: 'installation-details', name: '安装明细表', keywords: ['安装', '给排水', '强电', '弱电', '消防', '通风', '智能化'] },
  { detailType: 'equipment-details', name: '设备明细表', prefixes: ['05'], keywords: ['设备', '电梯', '充电桩', '人防设备'] },
  { detailType: 'fitout-details', name: '精装修明细表', prefixes: ['06'], keywords: ['精装修', '大堂', '样板间'] },
  { detailType: 'outdoor-pipe-details', name: '室外管网明细表', keywords: ['管网', '给水', '雨污', '燃气', '强弱电'] },
  { detailType: 'landscape-details', name: '景观工程明细表', prefixes: ['04'], keywords: ['景观', '绿化', '硬景', '软景'] },
  { detailType: 'road-details', name: '道路总平明细表', keywords: ['道路', '总平', '交安'] },
  { detailType: 'wall-gate-details', name: '围墙出入口明细表', keywords: ['围墙', '出入口', '大门'] },
] as const;

function matchesDetail(rule: VersionRule, detailType: string) {
  const config = DETAIL_RULES.find((item) => item.detailType === detailType);
  if (!config) return false;
  const subject = `${rule.subjectCode} ${rule.subjectName}`;
  const byPrefix = 'prefixes' in config && config.prefixes?.some((prefix) => rule.subjectCode.startsWith(prefix));
  const byKeyword = 'keywords' in config && config.keywords?.some((keyword) => subject.includes(keyword));
  return Boolean(byPrefix || byKeyword);
}

function majorSubject(rule: VersionRule) {
  const code = rule.subjectCode.slice(0, 2);
  const map: Record<string, string> = {
    '01': '土地费',
    '02': '前期工程费',
    '03': '建安工程费',
    '04': '室外景观及配套',
    '05': '设备工程',
    '06': '精装修工程',
    '07': '咨询顾问费',
    '08': '开发间接费',
    '09': '营销费用',
    '10': '财务费用',
    '11': '预备费',
    '12': '税金',
  };
  return { code, name: map[code] || rule.ruleType };
}

export async function generateDetailResultsFromVersionRules(projectId: string, versionId: string, detailType: string) {
  const [snapshot] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT "id" FROM "VersionRuleSnapshot" WHERE "projectId"=$1 AND "versionId"=$2 LIMIT 1
  `, projectId, versionId).catch(() => []);

  if (!snapshot) {
    return { generatedRows: 0, skippedReason: '当前版本没有版本规则快照' };
  }

  const rules = await prisma.$queryRawUnsafe<VersionRule[]>(`
    SELECT * FROM "VersionUnifiedRuleSnapshot"
    WHERE "snapshotId"=$1 AND "ruleType"='COST' AND "isEnabled"=TRUE
    ORDER BY "sortOrder" ASC, "subjectCode" ASC
  `, snapshot.id).catch(() => []);

  const matchedRules = rules.filter((rule) => matchesDetail(rule, detailType));

  await prisma.$executeRawUnsafe(`
    DELETE FROM "DetailCalculationResult"
    WHERE "projectId"=$1 AND "versionId"=$2 AND "detailType"=$3 AND "isManualAdjusted"=FALSE
  `, projectId, versionId, detailType);

  for (const rule of matchedRules) {
    const major = majorSubject(rule);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "DetailCalculationResult" (
        "id", "projectId", "versionId", "versionSnapshotId", "sourceRuleId", "detailType", "ruleType", "subjectCode", "subjectName",
        "applicableStage", "precisionLevel", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "quantity", "unitPrice",
        "taxRate", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "amountFormula", "costAttributionMethod", "allocationMethod",
        "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "subjectPath", "majorSubjectCode", "majorSubjectName", "calculationSource", "remark"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,0,0,0,0,0,0,$16,$17,$18,$19,$20,$21,$22,$23,$24,'version-rule-snapshot','由版本规则快照生成，待录入工程量和单价'
      )
      ON CONFLICT ("versionId", "sourceRuleId", "detailType") DO UPDATE SET
        "subjectName"=EXCLUDED."subjectName",
        "applicableStage"=EXCLUDED."applicableStage",
        "precisionLevel"=EXCLUDED."precisionLevel",
        "measureBasis"=EXCLUDED."measureBasis",
        "quantityFormula"=EXCLUDED."quantityFormula",
        "pricingUnit"=EXCLUDED."pricingUnit",
        "unitPriceSource"=EXCLUDED."unitPriceSource",
        "amountFormula"=EXCLUDED."amountFormula",
        "costAttributionMethod"=EXCLUDED."costAttributionMethod",
        "allocationMethod"=EXCLUDED."allocationMethod",
        "vatTreatment"=EXCLUDED."vatTreatment",
        "landVatTreatment"=EXCLUDED."landVatTreatment",
        "incomeTaxTreatment"=EXCLUDED."incomeTaxTreatment",
        "subjectPath"=EXCLUDED."subjectPath",
        "majorSubjectCode"=EXCLUDED."majorSubjectCode",
        "majorSubjectName"=EXCLUDED."majorSubjectName",
        "updatedAt"=CURRENT_TIMESTAMP
    `,
      `detail-${versionId}-${detailType}-${rule.id}`,
      projectId,
      versionId,
      snapshot.id,
      rule.id,
      detailType,
      rule.ruleType,
      rule.subjectCode,
      rule.subjectName,
      rule.applicableStage,
      rule.precisionLevel,
      rule.measureBasis,
      rule.quantityFormula,
      rule.pricingUnit,
      rule.unitPriceSource,
      rule.amountFormula,
      rule.costAttributionMethod,
      rule.allocationMethod,
      rule.vatTreatment,
      rule.landVatTreatment,
      rule.incomeTaxTreatment,
      `${major.code} ${major.name}/${rule.subjectCode} ${rule.subjectName}`,
      major.code,
      major.name,
    );
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "DetailCalculationBatch" ("id", "projectId", "versionId", "versionSnapshotId", "detailType", "batchName", "generatedRows", "status", "remark")
    VALUES ($1,$2,$3,$4,$5,$6,$7,'success','由版本规则快照批量生成明细测算行')
  `, `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`, projectId, versionId, snapshot.id, detailType, `${detailType} 明细测算生成`, matchedRules.length);

  return { generatedRows: matchedRules.length, skippedReason: null };
}

export async function aggregateTargetCostFromDetails(projectId: string, versionId: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM "TargetCostMeasureAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, projectId, versionId);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TargetCostMeasureAggregate" ("id", "projectId", "versionId", "subjectCode", "subjectName", "ruleType", "subjectLevel", "subjectPath", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount")
    SELECT 'tc-' || $2 || '-' || "subjectCode", $1, $2, "subjectCode", MAX("subjectName"), MAX("ruleType"), LENGTH("subjectCode")/2, MAX("subjectPath"), SUM("taxInclusiveAmount"), SUM("taxExclusiveAmount"), SUM("taxAmount")
    FROM "DetailCalculationResult"
    WHERE "projectId"=$1 AND "versionId"=$2
    GROUP BY "subjectCode"
    ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
      "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount",
      "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount",
      "taxAmount"=EXCLUDED."taxAmount",
      "updatedAt"=CURRENT_TIMESTAMP
  `, projectId, versionId);

  await prisma.$executeRawUnsafe(`DELETE FROM "TargetCostSummaryAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, projectId, versionId);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TargetCostSummaryAggregate" ("id", "projectId", "versionId", "subjectCode", "subjectName", "summaryLevel", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount")
    SELECT 'summary-' || $2 || '-' || "majorSubjectCode", $1, $2, "majorSubjectCode", MAX("majorSubjectName"), 1, SUM("taxInclusiveAmount"), SUM("taxExclusiveAmount"), SUM("taxAmount")
    FROM "DetailCalculationResult"
    WHERE "projectId"=$1 AND "versionId"=$2 AND "majorSubjectCode" IS NOT NULL
    GROUP BY "majorSubjectCode"
    ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
      "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount",
      "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount",
      "taxAmount"=EXCLUDED."taxAmount",
      "updatedAt"=CURRENT_TIMESTAMP
  `, projectId, versionId);
}

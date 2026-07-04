type PrismaLike = {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
};

export type DetailCalculationSyncInput = {
  id?: string;
  projectId: string;
  versionId: string;
  versionSnapshotId?: string | null;
  sourceRuleId?: string | null;
  detailType: string;
  ruleType?: string;
  subjectCode: string;
  subjectName: string;
  applicableStage?: string;
  precisionLevel?: string;
  areaBizType?: string | null;
  areaZone?: string | null;
  professionalGroup?: string | null;
  measureBasis?: string | null;
  quantityFormula?: string | null;
  pricingUnit?: string | null;
  unitPriceSource?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  taxRate?: number | null;
  amountFormula?: string | null;
  costAttributionMethod?: string | null;
  allocationMethod?: string | null;
  vatTreatment?: string | null;
  landVatTreatment?: string | null;
  incomeTaxTreatment?: string | null;
  remark?: string | null;
};

export type RefreshAggregateInput = {
  projectId: string;
  versionId: string;
  buildingArea?: number | null;
  saleableArea?: number | null;
};

export function parseTaxRate(value: unknown, fallback = 0.09) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  if (text.endsWith('%')) {
    const numeric = Number(text.replace('%', '').trim());
    return Number.isFinite(numeric) ? numeric / 100 : fallback;
  }
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric > 1 ? numeric / 100 : numeric;
}

export function calculateTaxAmounts(quantity: unknown, unitPrice: unknown, taxRateValue: unknown) {
  const qty = Number(quantity || 0) || 0;
  const price = Number(unitPrice || 0) || 0;
  const taxRate = parseTaxRate(taxRateValue);
  const taxInclusiveAmount = qty * price / 10000;
  const taxExclusiveAmount = taxRate > 0 ? taxInclusiveAmount / (1 + taxRate) : taxInclusiveAmount;
  const taxAmount = taxInclusiveAmount - taxExclusiveAmount;
  return { quantity: qty, unitPrice: price, taxRate, taxInclusiveAmount, taxExclusiveAmount, taxAmount };
}

export function detailTypeMajorName(detailType: string) {
  const map: Record<string, string> = {
    land: '土地费',
    pre: '前期费',
    'pre-costs': '前期费',
    building: '土建',
    'building-details': '土建',
    installation: '安装',
    'installation-details': '安装',
    equipment: '设备',
    'equipment-details': '设备',
    fitout: '精装修',
    'fitout-details': '精装修',
    'outdoor-pipe': '室外管网',
    'outdoor-pipe-details': '室外管网',
    landscape: '景观工程',
    'landscape-details': '景观工程',
    road: '道路总平',
    'road-details': '道路总平',
    'wall-gate': '围墙出入口',
    'wall-gate-details': '围墙出入口',
    'sales-expense': '销售费用',
    'sales-expense-details': '销售费用',
    'admin-expense': '管理费用',
    'admin-expense-details': '管理费用',
    'finance-expense': '财务费用',
    'finance-expense-details': '财务费用',
    tax: '税金',
    'tax-details': '税金'
  };
  return map[detailType] || detailType || '专业明细';
}

export async function upsertDetailCalculationResult(prisma: PrismaLike, input: DetailCalculationSyncInput) {
  const amounts = calculateTaxAmounts(input.quantity, input.unitPrice, input.taxRate);
  const id = input.id || `detail-manual-${input.versionId}-${input.detailType}-${input.sourceRuleId || input.subjectCode}`;
  const sourceRuleId = input.sourceRuleId || `manual-${input.detailType}-${input.subjectCode}`;
  const snapshotId = input.versionSnapshotId || 'manual-version-snapshot';
  const ruleType = input.ruleType || 'COST';
  const stage = input.applicableStage || 'SCHEME';
  const precision = input.precisionLevel || 'L3';
  const professionalGroup = input.professionalGroup || detailTypeMajorName(input.detailType);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "DetailCalculationResult" (
      "id", "projectId", "versionId", "versionSnapshotId", "sourceRuleId", "detailType", "ruleType",
      "subjectCode", "subjectName", "applicableStage", "precisionLevel", "areaBizType", "areaZone",
      "professionalGroup", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource",
      "quantity", "unitPrice", "taxRate", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount",
      "amountFormula", "costAttributionMethod", "allocationMethod", "vatTreatment", "landVatTreatment",
      "incomeTaxTreatment", "calculationStatus", "isManualAdjusted", "remark"
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      $8,$9,$10,$11,$12,$13,
      $14,$15,$16,$17,$18,
      $19,$20,$21,$22,$23,$24,
      $25,$26,$27,$28,$29,
      $30,'calculated',TRUE,$31
    )
    ON CONFLICT ("versionId", "sourceRuleId", "detailType") DO UPDATE SET
      "subjectCode"=EXCLUDED."subjectCode",
      "subjectName"=EXCLUDED."subjectName",
      "applicableStage"=EXCLUDED."applicableStage",
      "precisionLevel"=EXCLUDED."precisionLevel",
      "areaBizType"=EXCLUDED."areaBizType",
      "areaZone"=EXCLUDED."areaZone",
      "professionalGroup"=EXCLUDED."professionalGroup",
      "measureBasis"=EXCLUDED."measureBasis",
      "quantityFormula"=EXCLUDED."quantityFormula",
      "pricingUnit"=EXCLUDED."pricingUnit",
      "unitPriceSource"=EXCLUDED."unitPriceSource",
      "quantity"=EXCLUDED."quantity",
      "unitPrice"=EXCLUDED."unitPrice",
      "taxRate"=EXCLUDED."taxRate",
      "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount",
      "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount",
      "taxAmount"=EXCLUDED."taxAmount",
      "amountFormula"=EXCLUDED."amountFormula",
      "costAttributionMethod"=EXCLUDED."costAttributionMethod",
      "allocationMethod"=EXCLUDED."allocationMethod",
      "vatTreatment"=EXCLUDED."vatTreatment",
      "landVatTreatment"=EXCLUDED."landVatTreatment",
      "incomeTaxTreatment"=EXCLUDED."incomeTaxTreatment",
      "calculationStatus"='calculated',
      "isManualAdjusted"=TRUE,
      "remark"=EXCLUDED."remark",
      "updatedAt"=CURRENT_TIMESTAMP
  `,
    id,
    input.projectId,
    input.versionId,
    snapshotId,
    sourceRuleId,
    input.detailType,
    ruleType,
    input.subjectCode,
    input.subjectName,
    stage,
    precision,
    input.areaBizType || null,
    input.areaZone || null,
    professionalGroup,
    input.measureBasis || null,
    input.quantityFormula || null,
    input.pricingUnit || null,
    input.unitPriceSource || null,
    amounts.quantity,
    amounts.unitPrice,
    amounts.taxRate,
    amounts.taxInclusiveAmount,
    amounts.taxExclusiveAmount,
    amounts.taxAmount,
    input.amountFormula || null,
    input.costAttributionMethod || null,
    input.allocationMethod || null,
    input.vatTreatment || null,
    input.landVatTreatment || null,
    input.incomeTaxTreatment || null,
    input.remark || null
  );

  return amounts;
}

export async function refreshTargetCostAggregates(prisma: PrismaLike, input: RefreshAggregateInput) {
  const buildingArea = Number(input.buildingArea || 0);
  const saleableArea = Number(input.saleableArea || 0);

  await prisma.$executeRawUnsafe(`DELETE FROM "TargetCostMeasureAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, input.projectId, input.versionId);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TargetCostMeasureAggregate" (
      "id", "projectId", "versionId", "subjectCode", "subjectName", "ruleType", "subjectLevel", "subjectPath",
      "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "buildingAreaUnitCost", "saleableAreaUnitCost"
    )
    SELECT
      'target-cost-' || $2 || '-' || d."subjectCode", $1, $2, d."subjectCode", MAX(d."subjectName"), MAX(d."ruleType"),
      CASE WHEN POSITION('.' IN d."subjectCode") > 0 THEN array_length(string_to_array(d."subjectCode", '.'), 1) ELSE CEIL(LENGTH(d."subjectCode")::numeric / 2)::int END,
      MAX(COALESCE(d."subjectPath", d."subjectCode" || ' ' || d."subjectName")),
      SUM(d."taxInclusiveAmount"), SUM(d."taxExclusiveAmount"), SUM(d."taxAmount"),
      CASE WHEN $3::numeric > 0 THEN SUM(d."taxInclusiveAmount") * 10000 / $3::numeric ELSE NULL END,
      CASE WHEN $4::numeric > 0 THEN SUM(d."taxInclusiveAmount") * 10000 / $4::numeric ELSE NULL END
    FROM "DetailCalculationResult" d
    WHERE d."projectId"=$1 AND d."versionId"=$2
      AND NOT EXISTS (
        SELECT 1 FROM "ProductType" p
        WHERE p."projectVersionId"=$2
          AND p."isActive"=FALSE
          AND (
            d."areaBizType" = p."name"
            OR d."areaZone" = p."name"
            OR d."professionalGroup" = p."name"
            OR d."remark" LIKE '%' || p."name" || '%'
          )
      )
    GROUP BY d."subjectCode"
    ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
      "subjectName"=EXCLUDED."subjectName", "ruleType"=EXCLUDED."ruleType", "subjectLevel"=EXCLUDED."subjectLevel",
      "subjectPath"=EXCLUDED."subjectPath", "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount",
      "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount", "taxAmount"=EXCLUDED."taxAmount",
      "buildingAreaUnitCost"=EXCLUDED."buildingAreaUnitCost", "saleableAreaUnitCost"=EXCLUDED."saleableAreaUnitCost",
      "updatedAt"=CURRENT_TIMESTAMP
  `, input.projectId, input.versionId, buildingArea, saleableArea);

  await prisma.$executeRawUnsafe(`DELETE FROM "TargetCostSummaryAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, input.projectId, input.versionId);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TargetCostSummaryAggregate" (
      "id", "projectId", "versionId", "subjectCode", "subjectName", "summaryLevel",
      "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "buildingAreaUnitCost", "saleableAreaUnitCost"
    )
    SELECT
      'target-summary-' || $2 || '-' || CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END,
      $1,
      $2,
      CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END,
      MAX(CASE CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END
        WHEN '01' THEN '土地费' WHEN '02' THEN '前期工程费' WHEN '03' THEN '建安工程费' WHEN '04' THEN '室外景观及配套'
        WHEN '05' THEN '设备工程' WHEN '06' THEN '精装修工程' WHEN '07' THEN '咨询顾问费' WHEN '08' THEN '开发间接费'
        WHEN '09' THEN '营销费用' WHEN '10' THEN '财务费用' WHEN '11' THEN '预备费' WHEN '12' THEN '税金'
        ELSE CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END END),
      1,
      SUM(a."taxInclusiveAmount"), SUM(a."taxExclusiveAmount"), SUM(a."taxAmount"),
      CASE WHEN $3::numeric > 0 THEN SUM(a."taxInclusiveAmount") * 10000 / $3::numeric ELSE NULL END,
      CASE WHEN $4::numeric > 0 THEN SUM(a."taxInclusiveAmount") * 10000 / $4::numeric ELSE NULL END
    FROM "TargetCostMeasureAggregate" a
    WHERE a."projectId"=$1 AND a."versionId"=$2
    GROUP BY CASE WHEN POSITION('.' IN a."subjectCode") > 0 THEN SPLIT_PART(a."subjectCode", '.', 1) ELSE LEFT(a."subjectCode", 2) END
    ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
      "subjectName"=EXCLUDED."subjectName", "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount",
      "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount", "taxAmount"=EXCLUDED."taxAmount",
      "buildingAreaUnitCost"=EXCLUDED."buildingAreaUnitCost", "saleableAreaUnitCost"=EXCLUDED."saleableAreaUnitCost",
      "updatedAt"=CURRENT_TIMESTAMP
  `, input.projectId, input.versionId, buildingArea, saleableArea);
}

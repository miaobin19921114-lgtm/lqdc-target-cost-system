import { prisma } from '@/lib/prisma';
import { calculateCostLine, calculateIncomeTax, round2 } from '@/lib/calculations';
import { getAllocationResults } from '@/lib/cost-semantics';
import { getProjectVersionRevenueLines } from '@/lib/project-version-revenue-lines';
import { costTotals, fullTaxSummary, n, revenueFromProjectData } from '@/lib/tax-summary';
import { costLineQuantityPatch, mapCostLineV101Fields } from '@/lib/cost-line-quantity-fields';

const AMOUNT_UNIT = '万元';
const AREA_UNIT = '㎡';
const LOCKED_READONLY_REASON = '当前版本已锁定，仅支持查看。';

type CostLineWithRefs = Awaited<ReturnType<typeof loadCostLines>>[number];

type RawDetailRow = {
  id: string;
  detailType: string;
  subjectCode: string;
  subjectName: string;
  subjectLevel: number | null;
  parentSubjectCode: string | null;
  costObjectId: string | null;
  costObjectName: string | null;
  costObjectType: string | null;
  calculationBasis: string | null;
  quantity: unknown;
  quantityUnit: string | null;
  unitPrice: unknown;
  unitPriceUnit: string | null;
  taxRate: unknown;
  taxInclusiveAmount: unknown;
  taxExclusiveAmount: unknown;
  taxAmount: unknown;
  buildingAreaUnitCost: unknown;
  saleableAreaUnitCost: unknown;
  allocationMethod: string | null;
  dataSource: string | null;
  status: string | null;
  remark: string | null;
};

type MeasureAggregateRow = {
  subjectCode: string;
  subjectName: string;
  ruleType: string | null;
  subjectLevel: number | null;
  subjectPath: string | null;
  taxInclusiveAmount: unknown;
  taxExclusiveAmount: unknown;
  taxAmount: unknown;
  buildingAreaUnitCost: unknown;
  saleableAreaUnitCost: unknown;
};

function parentCode(code?: string | null) {
  const value = String(code || '').trim();
  if (!value) return null;
  if (value.includes('.')) {
    const parts = value.split('.').filter(Boolean);
    return parts.length > 1 ? parts.slice(0, -1).join('.') : null;
  }
  return value.length > 2 ? value.slice(0, -2) : null;
}

function subjectLevel(code?: string | null, explicit?: unknown) {
  const fromExplicit = Number(explicit || 0);
  if (fromExplicit > 0) return fromExplicit;
  const value = String(code || '').trim();
  if (!value) return null;
  return value.includes('.') ? value.split('.').filter(Boolean).length : Math.ceil(value.length / 2);
}

function sourceTable(detailType: string) {
  const map: Record<string, string> = {
    land: '土地费用明细表',
    'pre-costs': '前期费用明细表',
    building: '土建明细表',
    installation: '安装明细表',
    equipment: '设备明细表',
    fitout: '精装修明细表',
    'outdoor-pipe': '室外管网明细表',
    landscape: '景观工程明细表',
    road: '道路总平明细表',
    'wall-gate': '围墙出入口明细表',
    'sales-expense': '销售费用明细表',
    'admin-expense': '管理费用明细表',
    'finance-expense': '财务费用明细表'
  };
  return map[detailType] || detailType || '成本明细表';
}

function detailTypeForLine(line: CostLineWithRefs) {
  const table = line.professionalGroup || line.costSubject?.fullPath || line.costSubject?.name || line.detailName || '';
  const code = line.costSubject?.code || '';
  if (code.startsWith('01') || table.includes('土地')) return 'land';
  if (code.startsWith('02') || table.includes('前期')) return 'pre-costs';
  if (table.includes('安装')) return 'installation';
  if (table.includes('设备')) return 'equipment';
  if (table.includes('精装')) return 'fitout';
  if (table.includes('管网')) return 'outdoor-pipe';
  if (table.includes('景观')) return 'landscape';
  if (table.includes('道路') || table.includes('总平')) return 'road';
  if (table.includes('围墙') || table.includes('出入口')) return 'wall-gate';
  if (table.includes('销售费用') || code.startsWith('04')) return 'sales-expense';
  if (table.includes('管理费用') || code.startsWith('05')) return 'admin-expense';
  if (table.includes('财务费用') || code.startsWith('06')) return 'finance-expense';
  return 'building';
}

function missingFieldsForAmounts(input: { quantity: number; unitPrice: number; taxRate: number; amount: number }) {
  const missing: string[] = [];
  if (input.quantity <= 0 && input.amount <= 0) missing.push('待补工程量');
  if (input.unitPrice <= 0 && input.amount <= 0) missing.push('待补单价');
  if (input.taxRate <= 0) missing.push('待补税率');
  if (input.amount <= 0) missing.push('待生成金额');
  return missing;
}

function statusFromMissing(missingFields: string[]) {
  return missingFields.length ? 'pending' : 'calculated';
}

function parseMissing(remark?: string | null) {
  if (!remark) return [] as string[];
  try {
    const parsed = JSON.parse(remark);
    return Array.isArray(parsed?.missingFields) ? parsed.missingFields.map(String) : [];
  } catch {
    return [];
  }
}

function parseRemarkObject(remark?: string | null) {
  if (!remark) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(remark);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function unitCost(amountWan: number, area: number) {
  return area > 0 ? round2(amountWan * 10000 / area) : null;
}

async function loadVersion(projectId: string, versionId: string) {
  return prisma.projectVersion.findFirst({
    where: { id: versionId, projectId },
    include: { project: true, taxes: true, products: { where: { isActive: true } }, revenues: { include: { productType: true } } }
  });
}

async function loadCostLines(versionId: string) {
  return prisma.costLine.findMany({
    where: { projectVersionId: versionId, OR: [{ productTypeId: null }, { productType: { isActive: true } }] },
    include: { costSubject: true, productType: true },
    orderBy: [{ professionalGroup: 'asc' }, { sortOrder: 'asc' }, { detailName: 'asc' }]
  });
}

export async function generateV1DetailCalculationResults(projectId: string, versionId: string) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return null;
  const lines = await loadCostLines(versionId);
  const buildingArea = n(version.project.totalBuildingArea);
  const saleableArea = n(version.project.saleableArea);
  let pendingRowCount = 0;
  let aggregatableRowCount = 0;
  let exceptionRowCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      try {
        const quantityState = costLineQuantityPatch(line);
        const quantity = n(quantityState.quantity);
        const unitPrice = n(line.taxInclusiveUnitPrice);
        const taxRate = n(line.taxRate);
        const savedAmount = n(line.taxInclusiveAmount);
        const calculated = quantity > 0 && unitPrice > 0 ? calculateCostLine({ quantity, taxRate: taxRate || 0.09, taxInclusiveUnitPrice: unitPrice }) : null;
        const taxInclusiveAmount = savedAmount > 0 ? savedAmount : n(calculated?.taxInclusiveAmount);
        const taxExclusiveAmount = savedAmount > 0 ? n(line.taxExclusiveAmount) || round2(taxInclusiveAmount / (1 + (taxRate || 0))) : n(calculated?.taxExclusiveAmount);
        const taxAmount = savedAmount > 0 ? n(line.taxAmount) || round2(taxInclusiveAmount - taxExclusiveAmount) : n(calculated?.taxAmount);
        const missingFields = missingFieldsForAmounts({ quantity, unitPrice, taxRate, amount: taxInclusiveAmount });
        if (quantityState.quantityStatus === 'missing_basis') missingFields.push('待补指标基数');
        if (quantityState.quantityStatus === 'missing_content_rule') missingFields.push('待补含量规则');
        const status = statusFromMissing(missingFields);
        if (missingFields.length) pendingRowCount += 1;
        if (taxInclusiveAmount > 0) aggregatableRowCount += 1;
        const detailType = detailTypeForLine(line);
        const code = line.costSubject?.code || 'UNMAPPED';
        const subjectName = line.costSubject?.name || line.detailName || '未映射成本科目';
        const remark = JSON.stringify({
          sourceCostLineId: line.id,
          missingFields: [...new Set(missingFields)],
          amountUnit: AMOUNT_UNIT,
          quantitySource: line.quantitySource || quantityState.quantitySource,
          quantityStatus: line.quantityStatus && line.quantityStatus !== 'normal' ? line.quantityStatus : quantityState.quantityStatus,
          quantityFormula: line.quantityFormula || quantityState.quantityFormula,
          amountStatus: line.amountStatus || quantityState.amountStatus
        });

        await tx.$executeRawUnsafe(`
          INSERT INTO "DetailCalculationResult" (
            "id", "projectId", "versionId", "versionSnapshotId", "sourceRuleId", "detailType", "ruleType",
            "subjectCode", "subjectName", "applicableStage", "precisionLevel", "areaBizType", "areaZone",
            "professionalGroup", "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource",
            "quantity", "unitPrice", "taxRate", "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount",
            "amountFormula", "costAttributionMethod", "allocationMethod", "vatTreatment", "landVatTreatment",
            "incomeTaxTreatment", "calculationStatus", "isManualAdjusted", "remark", "subjectPath",
            "majorSubjectCode", "majorSubjectName", "regionOrProduct", "quantityField", "unit", "calculationSource"
          ) VALUES (
            $1,$2,$3,$4,$5,$6,'COST',
            $7,$8,$9,$10,$11,$12,
            $13,$14,$15,$16,$17,
            $18,$19,$20,$21,$22,$23,
            $24,$25,$26,$27,$28,
            $29,$30,TRUE,$31,$32,
            $33,$34,$35,$36,$37,$38
          )
          ON CONFLICT ("versionId", "sourceRuleId", "detailType") DO UPDATE SET
            "subjectCode"=EXCLUDED."subjectCode", "subjectName"=EXCLUDED."subjectName",
            "areaBizType"=EXCLUDED."areaBizType", "areaZone"=EXCLUDED."areaZone",
            "professionalGroup"=EXCLUDED."professionalGroup", "measureBasis"=EXCLUDED."measureBasis",
            "quantityFormula"=EXCLUDED."quantityFormula", "pricingUnit"=EXCLUDED."pricingUnit",
            "unitPriceSource"=EXCLUDED."unitPriceSource", "quantity"=EXCLUDED."quantity",
            "unitPrice"=EXCLUDED."unitPrice", "taxRate"=EXCLUDED."taxRate",
            "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount", "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount",
            "taxAmount"=EXCLUDED."taxAmount", "allocationMethod"=EXCLUDED."allocationMethod",
            "calculationStatus"=EXCLUDED."calculationStatus", "remark"=EXCLUDED."remark",
            "subjectPath"=EXCLUDED."subjectPath", "majorSubjectCode"=EXCLUDED."majorSubjectCode",
            "majorSubjectName"=EXCLUDED."majorSubjectName", "regionOrProduct"=EXCLUDED."regionOrProduct",
            "quantityField"=EXCLUDED."quantityField", "unit"=EXCLUDED."unit",
            "calculationSource"=EXCLUDED."calculationSource", "updatedAt"=CURRENT_TIMESTAMP
        `,
          `detail-costline-${line.id}`,
          projectId,
          versionId,
          'v1-manual-cost-lines',
          `cost-line:${line.id}`,
          detailType,
          code,
          subjectName,
          version.stage || 'V1',
          `L${subjectLevel(code, line.costSubject?.level) || 0}`,
          line.productType?.name || line.regionOrProductType || null,
          line.regionOrProductType || null,
          line.professionalGroup || sourceTable(detailType),
          line.measureBasis || line.costSubject?.defaultMeasureBasis || null,
          line.quantityFormula || quantityState.quantityFormula,
          line.unit ? `元/${line.unit}` : null,
          line.unitPriceSourceType || (line.importBatchId ? 'Excel导入' : '人工录入'),
          quantity || null,
          unitPrice || null,
          taxRate || null,
          taxInclusiveAmount,
          taxExclusiveAmount,
          taxAmount,
          taxInclusiveAmount > 0 ? '保存金额优先，否则工程量×含税单价/10000' : null,
          line.productTypeId ? '直接归属业态' : '项目级成本池',
          line.allocationMethod || line.costSubject?.defaultAllocationMethod || null,
          null,
          null,
          null,
          status,
          remark,
          line.costSubject?.fullPath || `${code} ${subjectName}`,
          code.slice(0, 2),
          majorSubjectName(code),
          line.regionOrProductType || line.productType?.name || null,
          line.measureBasis || null,
          line.unit || null,
          'cost-line'
        );
      } catch {
        exceptionRowCount += 1;
      }
    }
  });

  return {
    totalRowCount: lines.length,
    pendingRowCount,
    aggregatableRowCount,
    exceptionRowCount,
    amountUnit: AMOUNT_UNIT,
    buildingAreaUnit: AREA_UNIT,
    saleableAreaUnit: AREA_UNIT,
    buildingArea,
    saleableArea,
    isPartial: pendingRowCount > 0 || aggregatableRowCount < lines.length,
    reason: lines.length ? '已基于当前成本明细生成 V1 明细测算结果。' : '尚未保存可参与测算的成本明细。',
    nextAction: lines.length ? '请继续聚合目标成本测算表。' : '请先保存土地费用、前期费用或各专业成本明细。'
  };
}

function majorSubjectName(code: string) {
  const major = code.includes('.') ? code.split('.')[0] : code.slice(0, 2);
  const map: Record<string, string> = {
    '01': '土地费',
    '02': '前期工程费',
    '03': '建安工程费',
    '04': '销售费用',
    '05': '管理费用',
    '06': '财务费用',
    '07': '咨询顾问费',
    '08': '开发间接费',
    '09': '营销费用',
    '10': '财务费用',
    '11': '预备费',
    '12': '税金'
  };
  return map[major] || major || '未分类科目';
}

function mapDetailRow(row: RawDetailRow, buildingArea: number, saleableArea: number) {
  const amount = n(row.taxInclusiveAmount);
  const remark = parseRemarkObject(row.remark);
  const missingFields = parseMissing(row.remark);
  return {
    resultId: row.id,
    sourceTable: sourceTable(row.detailType),
    subjectCode: row.subjectCode || null,
    subjectName: row.subjectName,
    subjectLevel: row.subjectLevel,
    parentSubjectCode: row.parentSubjectCode,
    costObjectId: row.costObjectId,
    costObjectName: row.costObjectName,
    costObjectType: row.costObjectType,
    calculationBasis: row.calculationBasis,
    quantity: row.quantity === null ? null : n(row.quantity),
    quantityUnit: row.quantityUnit,
    unitPrice: row.unitPrice === null ? null : n(row.unitPrice),
    unitPriceUnit: row.unitPriceUnit,
    taxRate: row.taxRate === null ? null : n(row.taxRate),
    taxIncludedAmount: amount,
    taxExcludedAmount: n(row.taxExclusiveAmount),
    taxAmount: n(row.taxAmount),
    buildingAreaUnitCost: row.buildingAreaUnitCost === null ? unitCost(amount, buildingArea) : n(row.buildingAreaUnitCost),
    saleableAreaUnitCost: row.saleableAreaUnitCost === null ? unitCost(amount, saleableArea) : n(row.saleableAreaUnitCost),
    allocationMethod: row.allocationMethod,
    dataSource: row.dataSource || 'cost-line',
    status: row.status || statusFromMissing(missingFields),
    missingFields,
    quantitySource: remark.quantitySource || null,
    quantityStatus: remark.quantityStatus || row.status || null,
    quantityFormula: remark.quantityFormula || null,
    amountStatus: remark.amountStatus || null,
    amountUnit: AMOUNT_UNIT
  };
}

function mapCostLinePreview(line: CostLineWithRefs, buildingArea: number, saleableArea: number) {
  const quantityState = costLineQuantityPatch(line);
  const quantity = n(quantityState.quantity);
  const unitPrice = n(line.taxInclusiveUnitPrice);
  const taxRate = n(line.taxRate);
  const savedAmount = n(line.taxInclusiveAmount);
  const calculated = quantity > 0 && unitPrice > 0 ? calculateCostLine({ quantity, taxRate: taxRate || 0.09, taxInclusiveUnitPrice: unitPrice }) : null;
  const taxIncludedAmount = savedAmount > 0 ? savedAmount : n(calculated?.taxInclusiveAmount);
  const taxExcludedAmount = savedAmount > 0 ? n(line.taxExclusiveAmount) || round2(taxIncludedAmount / (1 + (taxRate || 0))) : n(calculated?.taxExclusiveAmount);
  const taxAmount = savedAmount > 0 ? n(line.taxAmount) || round2(taxIncludedAmount - taxExcludedAmount) : n(calculated?.taxAmount);
  const missingFields = missingFieldsForAmounts({ quantity, unitPrice, taxRate, amount: taxIncludedAmount });
  if (quantityState.quantityStatus === 'missing_basis') missingFields.push('待补指标基数');
  if (quantityState.quantityStatus === 'missing_content_rule') missingFields.push('待补含量规则');
  const detailType = detailTypeForLine(line);
  const subjectCode = line.costSubject?.code || null;
  return {
    resultId: `preview-costline-${line.id}`,
    sourceTable: sourceTable(detailType),
    subjectCode,
    subjectName: line.costSubject?.name || line.detailName || '未映射成本科目',
    subjectLevel: subjectLevel(subjectCode, line.costSubject?.level),
    parentSubjectCode: line.costSubject?.parentCode || parentCode(subjectCode),
    costObjectId: line.productTypeId,
    costObjectName: line.productType?.name || line.regionOrProductType || null,
    costObjectType: line.productTypeId ? 'product_type' : null,
    calculationBasis: line.measureBasis || line.costSubject?.defaultMeasureBasis || null,
    quantity: quantity || null,
    quantityUnit: line.unit || null,
    unitPrice: unitPrice || null,
    unitPriceUnit: line.unit ? `元/${line.unit}` : null,
    taxRate: taxRate || null,
    taxIncludedAmount,
    taxExcludedAmount,
    taxAmount,
    buildingAreaUnitCost: unitCost(taxIncludedAmount, buildingArea),
    saleableAreaUnitCost: unitCost(taxIncludedAmount, saleableArea),
    allocationMethod: line.allocationMethod || line.costSubject?.defaultAllocationMethod || null,
    dataSource: 'cost-line-realtime',
    status: statusFromMissing(missingFields),
    missingFields: [...new Set(missingFields)],
    ...mapCostLineV101Fields(line),
    quantitySource: line.quantitySource || quantityState.quantitySource,
    quantityStatus: line.quantityStatus && line.quantityStatus !== 'normal' ? line.quantityStatus : quantityState.quantityStatus,
    quantityFormula: line.quantityFormula || quantityState.quantityFormula,
    amountStatus: line.amountStatus || quantityState.amountStatus,
    amountUnit: AMOUNT_UNIT
  };
}

export async function getV1DetailCalculationResults(projectId: string, versionId: string): Promise<any> {
  const version = await loadVersion(projectId, versionId);
  if (!version) return null;
  const buildingArea = n(version.project.totalBuildingArea);
  const saleableArea = n(version.project.saleableArea);
  let rows = await prisma.$queryRawUnsafe<RawDetailRow[]>(`
    SELECT d."id", d."detailType", d."subjectCode", d."subjectName",
      CASE WHEN cs."level" IS NOT NULL THEN cs."level" ELSE CASE WHEN POSITION('.' IN d."subjectCode") > 0 THEN array_length(string_to_array(d."subjectCode", '.'), 1) ELSE CEIL(LENGTH(d."subjectCode")::numeric / 2)::int END END AS "subjectLevel",
      COALESCE(cs."parentCode", CASE WHEN POSITION('.' IN d."subjectCode") > 0 THEN regexp_replace(d."subjectCode", '\\.[^.]+$', '') ELSE NULL END) AS "parentSubjectCode",
      pt."id" AS "costObjectId", COALESCE(pt."name", d."areaBizType", d."regionOrProduct") AS "costObjectName",
      CASE WHEN pt."id" IS NULL THEN NULL ELSE 'product_type' END AS "costObjectType",
      d."measureBasis" AS "calculationBasis", d."quantity", COALESCE(d."unit", cs."defaultUnit") AS "quantityUnit",
      d."unitPrice", d."pricingUnit" AS "unitPriceUnit", d."taxRate", d."taxInclusiveAmount", d."taxExclusiveAmount", d."taxAmount",
      CASE WHEN $3::numeric > 0 THEN d."taxInclusiveAmount" * 10000 / $3::numeric ELSE NULL END AS "buildingAreaUnitCost",
      CASE WHEN $4::numeric > 0 THEN d."taxInclusiveAmount" * 10000 / $4::numeric ELSE NULL END AS "saleableAreaUnitCost",
      d."allocationMethod", d."calculationSource" AS "dataSource", d."calculationStatus" AS "status", d."remark"
    FROM "DetailCalculationResult" d
    LEFT JOIN "CostSubject" cs ON cs."code" = d."subjectCode"
    LEFT JOIN "CostLine" cl ON d."sourceRuleId" = 'cost-line:' || cl."id"
    LEFT JOIN "ProductType" pt ON cl."productTypeId" = pt."id"
    WHERE d."projectId"=$1 AND d."versionId"=$2
    ORDER BY d."detailType", d."subjectCode", d."createdAt"
  `, projectId, versionId, buildingArea, saleableArea).catch(() => []);

  const items = rows.length
    ? rows.map((row) => mapDetailRow(row, buildingArea, saleableArea))
    : (await loadCostLines(versionId)).map((line) => mapCostLinePreview(line, buildingArea, saleableArea));
  const pendingRowCount = items.filter((item) => item.missingFields.length > 0 || item.status === 'pending').length;
  const aggregatableRowCount = items.filter((item) => item.taxIncludedAmount > 0).length;
  const warningRows = items.filter((item) => item.amountStatus === 'missing_unit_price' || item.quantityStatus === 'missing_basis' || item.quantityStatus === 'missing_content_rule');
  return {
    items,
    stats: {
      totalRowCount: items.length,
      exceptionRowCount: 0,
      pendingRowCount,
      aggregatableRowCount,
      warningRowCount: warningRows.length,
      amountUnit: AMOUNT_UNIT
    },
    warnings: warningRows.map((item) => ({
      subjectCode: item.subjectCode,
      subjectName: item.subjectName,
      quantityStatus: item.quantityStatus,
      amountStatus: item.amountStatus,
      missingFields: item.missingFields
    })),
    emptyState: items.length ? null : {
      reason: '尚未生成明细测算结果，且当前版本没有可实时生成的成本明细。',
      nextAction: '请先保存成本明细并点击生成明细测算结果。',
      canGenerate: false,
      missingPrerequisites: ['成本明细']
    }
  };
}

function codeAncestors(code: string) {
  if (!code) return [] as string[];
  if (code.includes('.')) {
    const parts = code.split('.').filter(Boolean);
    return parts.map((_, index) => parts.slice(0, index + 1).join('.'));
  }
  const result: string[] = [];
  for (let size = 2; size <= code.length; size += 2) result.push(code.slice(0, size));
  return result.length ? result : [code];
}

export async function aggregateV1TargetCostMeasure(projectId: string, versionId: string): Promise<any> {
  const version = await loadVersion(projectId, versionId);
  if (!version) return null;
  const detail = await getV1DetailCalculationResults(projectId, versionId);
  const items = (detail?.items || []) as Array<{ subjectCode?: string | null; subjectName: string; taxIncludedAmount: number; taxExcludedAmount: number; taxAmount: number }>;
  const buildingArea = n(version.project.totalBuildingArea);
  const saleableArea = n(version.project.saleableArea);
  const subjectCodes = [...new Set(items.flatMap((item) => codeAncestors(item.subjectCode || '')))];
  const subjects = await prisma.costSubject.findMany({ where: { code: { in: subjectCodes } } });
  const subjectMap = new Map(subjects.map((subject) => [subject.code, subject]));
  const aggregateMap = new Map<string, { code: string; name: string; inclusive: number; exclusive: number; tax: number; level: number; path: string }>();

  items.forEach((item) => {
    if (!item.subjectCode || item.taxIncludedAmount <= 0) return;
    codeAncestors(item.subjectCode).forEach((code) => {
      const subject = subjectMap.get(code);
      const current = aggregateMap.get(code) || {
        code,
        name: subject?.name || (code === item.subjectCode ? item.subjectName : majorSubjectName(code)),
        inclusive: 0,
        exclusive: 0,
        tax: 0,
        level: subjectLevel(code, subject?.level) || 1,
        path: subject?.fullPath || `${code} ${subject?.name || majorSubjectName(code)}`
      };
      current.inclusive = round2(current.inclusive + item.taxIncludedAmount);
      current.exclusive = round2(current.exclusive + item.taxExcludedAmount);
      current.tax = round2(current.tax + item.taxAmount);
      aggregateMap.set(code, current);
    });
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`DELETE FROM "TargetCostMeasureAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, projectId, versionId);
    for (const row of [...aggregateMap.values()]) {
      await tx.$executeRawUnsafe(`
        INSERT INTO "TargetCostMeasureAggregate" (
          "id", "projectId", "versionId", "subjectCode", "subjectName", "ruleType", "subjectLevel", "subjectPath",
          "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "buildingAreaUnitCost", "saleableAreaUnitCost"
        ) VALUES ($1,$2,$3,$4,$5,'COST',$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
          "subjectName"=EXCLUDED."subjectName", "subjectLevel"=EXCLUDED."subjectLevel", "subjectPath"=EXCLUDED."subjectPath",
          "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount", "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount",
          "taxAmount"=EXCLUDED."taxAmount", "buildingAreaUnitCost"=EXCLUDED."buildingAreaUnitCost",
          "saleableAreaUnitCost"=EXCLUDED."saleableAreaUnitCost", "updatedAt"=CURRENT_TIMESTAMP
      `, `target-cost-${versionId}-${row.code}`, projectId, versionId, row.code, row.name, row.level, row.path, row.inclusive, row.exclusive, row.tax, unitCost(row.inclusive, buildingArea), unitCost(row.inclusive, saleableArea));
    }
  });

  await refreshV1TargetCostSummary(projectId, versionId);
  return getV1TargetCostMeasure(projectId, versionId);
}

function treeRows(rows: ReturnType<typeof mapMeasureRow>[]) {
  const byCode = new Map(rows.map((row) => [row.subjectCode, { ...row, children: [] as any[] }]));
  const roots: any[] = [];
  byCode.forEach((row) => {
    const parent = row.parentSubjectCode ? byCode.get(row.parentSubjectCode) : null;
    if (parent) parent.children.push(row);
    else roots.push(row);
  });
  return roots;
}

function mapMeasureRow(row: MeasureAggregateRow) {
  const code = row.subjectCode;
  return {
    subjectCode: code,
    subjectName: row.subjectName,
    subjectLevel: row.subjectLevel ?? subjectLevel(code),
    parentSubjectCode: parentCode(code),
    subjectPath: row.subjectPath,
    taxIncludedAmount: n(row.taxInclusiveAmount),
    taxExcludedAmount: n(row.taxExclusiveAmount),
    taxAmount: n(row.taxAmount),
    buildingAreaUnitCost: row.buildingAreaUnitCost === null ? null : n(row.buildingAreaUnitCost),
    saleableAreaUnitCost: row.saleableAreaUnitCost === null ? null : n(row.saleableAreaUnitCost),
    amountUnit: AMOUNT_UNIT
  };
}

async function measurePayloadFromDetailItems(projectId: string, versionId: string, items: Array<{ subjectCode?: string | null; subjectName: string; taxIncludedAmount: number; taxExcludedAmount: number; taxAmount: number }>) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return null;
  const subjectCodes = [...new Set(items.flatMap((item) => codeAncestors(item.subjectCode || '')))];
  const subjects = await prisma.costSubject.findMany({ where: { code: { in: subjectCodes } } });
  const subjectMap = new Map(subjects.map((subject) => [subject.code, subject]));
  const aggregateMap = new Map<string, { code: string; name: string; inclusive: number; exclusive: number; tax: number; level: number; path: string }>();
  items.forEach((item) => {
    if (!item.subjectCode || item.taxIncludedAmount <= 0) return;
    codeAncestors(item.subjectCode).forEach((code) => {
      const subject = subjectMap.get(code);
      const current = aggregateMap.get(code) || {
        code,
        name: subject?.name || (code === item.subjectCode ? item.subjectName : majorSubjectName(code)),
        inclusive: 0,
        exclusive: 0,
        tax: 0,
        level: subjectLevel(code, subject?.level) || 1,
        path: subject?.fullPath || `${code} ${subject?.name || majorSubjectName(code)}`
      };
      current.inclusive = round2(current.inclusive + item.taxIncludedAmount);
      current.exclusive = round2(current.exclusive + item.taxExcludedAmount);
      current.tax = round2(current.tax + item.taxAmount);
      aggregateMap.set(code, current);
    });
  });
  const buildingArea = n(version.project.totalBuildingArea);
  const saleableArea = n(version.project.saleableArea);
  const mapped = [...aggregateMap.values()].sort((a, b) => a.code.localeCompare(b.code)).map((row) => ({
    subjectCode: row.code,
    subjectName: row.name,
    subjectLevel: row.level,
    parentSubjectCode: parentCode(row.code),
    subjectPath: row.path,
    taxIncludedAmount: row.inclusive,
    taxExcludedAmount: row.exclusive,
    taxAmount: row.tax,
    buildingAreaUnitCost: unitCost(row.inclusive, buildingArea),
    saleableAreaUnitCost: unitCost(row.inclusive, saleableArea),
    amountUnit: AMOUNT_UNIT
  }));
  return {
    rows: mapped,
    tree: treeRows(mapped),
    totals: {
      taxIncludedAmount: round2(mapped.filter((row) => (row.subjectLevel || 0) === 1 || !row.parentSubjectCode).reduce((sum, row) => sum + row.taxIncludedAmount, 0)),
      taxExcludedAmount: round2(mapped.filter((row) => (row.subjectLevel || 0) === 1 || !row.parentSubjectCode).reduce((sum, row) => sum + row.taxExcludedAmount, 0)),
      taxAmount: round2(mapped.filter((row) => (row.subjectLevel || 0) === 1 || !row.parentSubjectCode).reduce((sum, row) => sum + row.taxAmount, 0)),
      amountUnit: AMOUNT_UNIT
    },
    emptyState: mapped.length ? null : {
      reason: '目标成本测算表尚未聚合。',
      nextAction: '请先从明细测算结果生成目标成本测算表。',
      canGenerate: false,
      missingPrerequisites: ['明细测算结果']
    }
  };
}

export async function getV1TargetCostMeasure(projectId: string, versionId: string): Promise<any> {
  const version = await loadVersion(projectId, versionId);
  if (!version) return null;
  let rows = await prisma.$queryRawUnsafe<MeasureAggregateRow[]>(`
    SELECT "subjectCode", "subjectName", "ruleType", "subjectLevel", "subjectPath",
      "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "buildingAreaUnitCost", "saleableAreaUnitCost"
    FROM "TargetCostMeasureAggregate"
    WHERE "projectId"=$1 AND "versionId"=$2
    ORDER BY "subjectCode"
  `, projectId, versionId).catch(() => []);
  if (!rows.length) {
    const detail = await getV1DetailCalculationResults(projectId, versionId);
    if (((detail?.items || []) as Array<{ taxIncludedAmount: number }>).some((item) => item.taxIncludedAmount > 0)) {
      const payload = await measurePayloadFromDetailItems(projectId, versionId, detail.items);
      return payload ? { ...payload, warnings: detail.warnings || [], meta: { warningRowCount: detail.stats?.warningRowCount || 0 } } : payload;
    }
  }
  const mapped = rows.map(mapMeasureRow);
  const total = mapped.reduce((sum, row) => sum + (row.subjectLevel === 1 ? row.taxIncludedAmount : 0), 0);
  return {
    rows: mapped,
    tree: treeRows(mapped),
    totals: {
      taxIncludedAmount: round2(total || mapped.filter((row) => !row.parentSubjectCode).reduce((sum, row) => sum + row.taxIncludedAmount, 0)),
      taxExcludedAmount: round2(mapped.filter((row) => (row.subjectLevel || 0) === 1).reduce((sum, row) => sum + row.taxExcludedAmount, 0)),
      taxAmount: round2(mapped.filter((row) => (row.subjectLevel || 0) === 1).reduce((sum, row) => sum + row.taxAmount, 0)),
      amountUnit: AMOUNT_UNIT
    },
    warnings: [],
    meta: { warningRowCount: 0 },
    emptyState: mapped.length ? null : {
      reason: '目标成本测算表尚未聚合。',
      nextAction: '请先从明细测算结果生成目标成本测算表。',
      canGenerate: false,
      missingPrerequisites: ['明细测算结果']
    }
  };
}

export async function refreshV1TargetCostSummary(projectId: string, versionId: string): Promise<any> {
  const measure = await getV1TargetCostMeasure(projectId, versionId);
  const version = await loadVersion(projectId, versionId);
  if (!version || !measure) return null;
  const buildingArea = n(version.project.totalBuildingArea);
  const saleableArea = n(version.project.saleableArea);
  const levelOne = (measure.rows as Array<{ subjectCode: string; subjectName: string; subjectLevel?: number | null; parentSubjectCode?: string | null; taxIncludedAmount: number; taxExcludedAmount: number; taxAmount: number }>).filter((row) => (row.subjectLevel || 0) === 1 || !row.parentSubjectCode);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`DELETE FROM "TargetCostSummaryAggregate" WHERE "projectId"=$1 AND "versionId"=$2`, projectId, versionId);
    for (const row of levelOne) {
      await tx.$executeRawUnsafe(`
        INSERT INTO "TargetCostSummaryAggregate" (
          "id", "projectId", "versionId", "subjectCode", "subjectName", "summaryLevel",
          "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "buildingAreaUnitCost", "saleableAreaUnitCost"
        ) VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8,$9,$10)
        ON CONFLICT ("versionId", "subjectCode") DO UPDATE SET
          "subjectName"=EXCLUDED."subjectName", "taxInclusiveAmount"=EXCLUDED."taxInclusiveAmount",
          "taxExclusiveAmount"=EXCLUDED."taxExclusiveAmount", "taxAmount"=EXCLUDED."taxAmount",
          "buildingAreaUnitCost"=EXCLUDED."buildingAreaUnitCost", "saleableAreaUnitCost"=EXCLUDED."saleableAreaUnitCost",
          "updatedAt"=CURRENT_TIMESTAMP
      `, `target-summary-${versionId}-${row.subjectCode}`, projectId, versionId, row.subjectCode, row.subjectName, row.taxIncludedAmount, row.taxExcludedAmount, row.taxAmount, unitCost(row.taxIncludedAmount, buildingArea), unitCost(row.taxIncludedAmount, saleableArea));
    }
  });

  return getV1TargetCostSummary(projectId, versionId);
}

export async function getV1TargetCostSummary(projectId: string, versionId: string): Promise<any> {
  const version = await loadVersion(projectId, versionId);
  if (!version) return null;
  let rows = await prisma.$queryRawUnsafe<MeasureAggregateRow[]>(`
    SELECT "subjectCode", "subjectName", NULL AS "ruleType", "summaryLevel" AS "subjectLevel", NULL AS "subjectPath",
      "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "buildingAreaUnitCost", "saleableAreaUnitCost"
    FROM "TargetCostSummaryAggregate"
    WHERE "projectId"=$1 AND "versionId"=$2
    ORDER BY "subjectCode"
  `, projectId, versionId).catch(() => []);
  if (!rows.length) {
    const measure = await getV1TargetCostMeasure(projectId, versionId);
    if ((measure?.rows || []).length) {
      const measureRows = (measure.rows as Array<ReturnType<typeof mapMeasureRow>>).filter((row) => (row.subjectLevel || 0) === 1 || !row.parentSubjectCode);
      rows = measureRows.map((row) => ({
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        ruleType: null,
        subjectLevel: 1,
        subjectPath: row.subjectPath,
        taxInclusiveAmount: row.taxIncludedAmount,
        taxExclusiveAmount: row.taxExcludedAmount,
        taxAmount: row.taxAmount,
        buildingAreaUnitCost: row.buildingAreaUnitCost,
        saleableAreaUnitCost: row.saleableAreaUnitCost
      }));
    }
  }

  if (!rows.length) {
    rows = await prisma.$queryRawUnsafe<MeasureAggregateRow[]>(`
      SELECT "subjectCode", "subjectName", NULL AS "ruleType", "summaryLevel" AS "subjectLevel", NULL AS "subjectPath",
        "taxInclusiveAmount", "taxExclusiveAmount", "taxAmount", "buildingAreaUnitCost", "saleableAreaUnitCost"
      FROM "TargetCostSummaryAggregate"
      WHERE "projectId"=$1 AND "versionId"=$2
      ORDER BY "subjectCode"
    `, projectId, versionId).catch(() => []);
  }
  const mapped = rows.map(mapMeasureRow);
  const costTaxInclusive = round2(mapped.reduce((sum, row) => sum + row.taxIncludedAmount, 0));
  const costTaxExclusive = round2(mapped.reduce((sum, row) => sum + row.taxExcludedAmount, 0));
  const costTaxAmount = round2(mapped.reduce((sum, row) => sum + row.taxAmount, 0));
  const total = costTaxInclusive || 1;
  const rowsWithRatio = mapped.map((row) => ({ ...row, ratio: costTaxInclusive ? round2(row.taxIncludedAmount / total) : 0 }));
  const detailStatus = await getV1DetailCalculationResults(projectId, versionId);
  const { commercialRevenueLines, otherRevenueLines } = await getProjectVersionRevenueLines(versionId);
  const vatRate = n(version.taxes?.vatRate || 0.09);
  const revenue = revenueFromProjectData({ products: version.products, revenues: version.revenues, commercialRevenueLines, otherRevenueLines, vatRate });
  const surchargeRate = n((version.taxes as any)?.urbanMaintenanceTaxRate || version.taxes?.urbanMaintenanceRate || 0.07) + n(version.taxes?.educationSurchargeRate || 0.03) + n(version.taxes?.localEducationSurchargeRate || 0.02);
  const tax = fullTaxSummary({
    revenueExclusive: revenue.taxExclusive,
    outputVat: revenue.outputVat,
    inputVat: costTaxAmount,
    costExclusive: costTaxExclusive,
    landCost: rowsWithRatio.filter((row) => row.subjectCode.startsWith('01')).reduce((sum, row) => sum + row.taxIncludedAmount, 0),
    devCost: rowsWithRatio.filter((row) => row.subjectCode.startsWith('02') || row.subjectCode.startsWith('03')).reduce((sum, row) => sum + row.taxExcludedAmount, 0),
    saleManageFinance: rowsWithRatio.filter((row) => !row.subjectCode.startsWith('01') && !row.subjectCode.startsWith('02') && !row.subjectCode.startsWith('03')).reduce((sum, row) => sum + row.taxExcludedAmount, 0),
    surchargeRate,
    incomeTaxRate: n(version.taxes?.incomeTaxRate || 0.25)
  });
  const isPartial = !rowsWithRatio.length || costTaxInclusive <= 0 || (detailStatus?.stats.pendingRowCount || 0) > 0;
  return {
    rows: rowsWithRatio,
    operatingIndicators: {
      taxIncludedSalesRevenue: revenue.taxInclusive,
      taxExcludedSalesRevenue: revenue.taxExclusive,
      developmentCostAndExpenseTotal: costTaxInclusive,
      valueAddedTaxAndSurcharge: round2(tax.payableVat + tax.surcharge),
      landValueAddedTax: tax.landVat.landVat,
      profitBeforeTax: isPartial ? null : tax.profitBeforeIncomeTax,
      incomeTax: isPartial ? null : tax.incomeTax,
      netProfitAfterTax: isPartial ? null : tax.netProfit,
      netProfitMargin: isPartial || !revenue.taxInclusive ? null : round2(tax.netProfit / revenue.taxInclusive),
      amountUnit: AMOUNT_UNIT
    },
    summaryStatus: isPartial ? 'partial' : 'ready',
    isPartial,
    warnings: detailStatus?.warnings || [],
    meta: { warningRowCount: detailStatus?.stats.warningRowCount || 0 },
    reason: isPartial ? (rowsWithRatio.length ? '当前仅部分成本明细参与测算，利润指标为临时口径。' : '目标成本汇总表尚未形成可用结果。') : '目标成本汇总已形成统一经营口径。',
    nextAction: isPartial ? '请继续完善成本明细并刷新明细结果、目标成本测算表和汇总表。' : '可继续查看成本分摊、税金测算和业态利润分析。',
    emptyState: rowsWithRatio.length ? null : {
      reason: '目标成本测算表尚未聚合。',
      nextAction: '请先从明细测算结果生成目标成本测算表。'
    }
  };
}

export async function getV1ParkingRevenueStatus(projectId: string, versionId?: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  const version = versionId ? await loadVersion(projectId, versionId) : await prisma.projectVersion.findFirst({ where: { projectId }, orderBy: { createdAt: 'asc' }, include: { taxes: true, products: true, revenues: { include: { productType: true } } } });
  if (!version) return null;
  const definitions = [
    { key: 'undergroundPropertyParkingCount', name: '地下产权车位', count: n(project.undergroundPropertyParkingCount) },
    { key: 'undergroundUseRightParkingCount', name: '地下使用权车位', count: n(project.undergroundUseRightParkingCount) },
    { key: 'civilDefenseParkingCount', name: '人防车位', count: n(project.civilDefenseParkingCount) },
    { key: 'aboveGroundParkingCount', name: '地上车位', count: n(project.aboveGroundParkingCount) }
  ];
  const taxRate = n(version.taxes?.vatRate || 0.09);
  const revenueMap = new Map(version.revenues.map((row) => [row.productTypeId, row]));
  const rows = definitions.map((item) => {
    const product = version.products.find((row) => row.name === item.name);
    const quantity = item.count || n(product?.parkingCount) || n(product?.saleableArea);
    const price = n(product?.salePrice);
    const calculated = calculateParkingRevenue(quantity, price, taxRate);
    const synced = product ? revenueMap.get(product.id) : null;
    return {
      ...item,
      quantity,
      unitPrice: price,
      unitPriceUnit: '元/个',
      taxIncludedAmount: calculated.taxInclusiveRevenue,
      taxExcludedAmount: calculated.taxExclusiveRevenue,
      taxAmount: calculated.taxAmount,
      syncedAmount: n(synced?.taxInclusiveRevenue),
      syncDifference: round2(calculated.taxInclusiveRevenue - n(synced?.taxInclusiveRevenue)),
      amountUnit: AMOUNT_UNIT
    };
  });
  const totalParkingCount = n(project.parkingCount);
  const assignedParkingCount = rows.reduce((sum, row) => sum + row.quantity, 0);
  const unassignedParkingCount = Math.max(totalParkingCount - assignedParkingCount, 0);
  const calculatedTotal = rows.reduce((sum, row) => sum + row.taxIncludedAmount, 0);
  const syncedTotal = rows.reduce((sum, row) => sum + row.syncedAmount, 0);
  const syncDifference = round2(calculatedTotal - syncedTotal);
  const needMetricAssignment = totalParkingCount > 0 && assignedParkingCount <= 0;
  return {
    rows,
    totalParkingCount,
    assignedParkingCount,
    unassignedParkingCount,
    chargingPileCount: n(project.chargingPileCount),
    chargingPileAsRevenue: false,
    needSync: Math.abs(syncDifference) > 0.01,
    syncDifference,
    status: needMetricAssignment ? 'need_metric_assignment' : Math.abs(syncDifference) > 0.01 ? 'need_sync' : 'ready',
    reason: needMetricAssignment ? '项目总车位未分配到车位收入分类。' : Math.abs(syncDifference) > 0.01 ? '已同步收入与当前车位数量或单价测算不一致。' : '车位收入已按个数口径同步。',
    nextAction: needMetricAssignment ? '请先分配地下产权车位、使用权车位、人防车位或地上车位数量。' : Math.abs(syncDifference) > 0.01 ? '请在车位收入页保存并同步当前测算结果。' : '可继续进入收入汇总和业态利润分析。',
    amountUnit: AMOUNT_UNIT,
    unitPriceUnit: '元/个',
    areaUnit: AREA_UNIT
  };
}

function calculateParkingRevenue(quantity: number, unitPrice: number, taxRate: number) {
  const taxInclusiveRevenue = round2(quantity * unitPrice / 10000);
  const taxExclusiveRevenue = round2(taxInclusiveRevenue / (1 + taxRate));
  const taxAmount = round2(taxInclusiveRevenue - taxExclusiveRevenue);
  return { taxInclusiveRevenue, taxExclusiveRevenue, taxAmount };
}

export async function getV1AllocationBridge(projectId: string, versionId: string) {
  const results = await getAllocationResults(projectId, versionId, 'operation_profit');
  if (!results) return null;
  const products = await prisma.productType.findMany({ where: { projectVersionId: versionId, isActive: true } });
  const detail = await getV1DetailCalculationResults(projectId, versionId);
  const totalCostLineCount = detail?.stats.totalRowCount || 0;
  const includedCostLineCount = new Set((results as any[]).map((row) => String(row.sourceItemId || ''))).size;
  const byProduct = new Map<string, any>();
  (results as any[]).forEach((row) => {
    const product = products.find((item) => item.id === row.targetObjectId);
    if (!product) return;
    const current = byProduct.get(product.id) || {
      productTypeId: product.id,
      productTypeName: product.name,
      buildingArea: n(product.buildingArea),
      saleableArea: n(product.saleableArea),
      directAssignedCost: 0,
      allocatedCost: 0,
      totalCost: 0
    };
    if (row.allocationRuleType === 'no_allocation') current.directAssignedCost += n(row.allocatedTaxIncludedAmount);
    else current.allocatedCost += n(row.allocatedTaxIncludedAmount);
    current.totalCost += n(row.allocatedTaxIncludedAmount);
    byProduct.set(product.id, current);
  });
  const total = [...byProduct.values()].reduce((sum, row) => sum + row.totalCost, 0);
  const rows = [...byProduct.values()].map((row) => ({
    ...row,
    buildingAreaUnitCost: unitCost(row.totalCost, row.buildingArea),
    saleableAreaUnitCost: unitCost(row.totalCost, row.saleableArea),
    costRatio: total ? round2(row.totalCost / total) : 0,
    amountUnit: AMOUNT_UNIT
  }));
  return {
    rows,
    isPartial: includedCostLineCount < totalCostLineCount,
    includedCostLineCount,
    totalCostLineCount,
    reason: includedCostLineCount < totalCostLineCount ? '当前仅部分成本明细参与分摊。' : '成本分摊结果已覆盖当前明细。',
    nextAction: includedCostLineCount < totalCostLineCount ? '请继续完善成本明细或确认阶段性结果。' : '可同步到目标成本测算表和业态利润分析。',
    amountUnit: AMOUNT_UNIT
  };
}

export async function getV1ProfitAnalysisStatus(projectId: string, versionId: string) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return null;
  const activeObjects = version.products.filter((item) => item.isActive && item.participateAllocation);
  const { commercialRevenueLines, otherRevenueLines } = await getProjectVersionRevenueLines(versionId);
  const vatRate = n(version.taxes?.vatRate || 0.09);
  const revenue = revenueFromProjectData({ products: version.products, revenues: version.revenues, commercialRevenueLines, otherRevenueLines, vatRate });
  const costs = await loadCostLines(versionId);
  const cost = costTotals(costs);
  const detail = await getV1DetailCalculationResults(projectId, versionId);
  const allocation = await getV1AllocationBridge(projectId, versionId);
  const revenueByProduct = new Map(version.revenues.map((row) => [row.productTypeId, n(row.taxExclusiveRevenue)]));
  const costByProduct = new Map((allocation?.rows || []).map((row: any) => [row.productTypeId, n(row.totalCost)]));
  const revenueMissingObjects = activeObjects.filter((item) => item.isSaleable && !revenueByProduct.get(item.id)).map((item) => item.name);
  const costOnlyObjects = activeObjects.filter((item) => !revenueByProduct.get(item.id) && costByProduct.get(item.id)).map((item) => item.name);
  const participatingProfitObjects = activeObjects.filter((item) => revenueByProduct.get(item.id) || costByProduct.get(item.id)).map((item) => item.name);
  const costComplete = !detail?.stats.pendingRowCount && Boolean(detail?.stats.aggregatableRowCount);
  const incomeComplete = revenue.taxInclusive > 0 && revenueMissingObjects.length === 0;
  const taxComplete = cost.taxExclusive > 0 && revenue.taxExclusive > 0;
  const isPartial = !incomeComplete || !costComplete || !taxComplete || Boolean(allocation?.isPartial);
  return {
    participatingProfitObjects,
    costOnlyObjects,
    revenueMissingObjects,
    incomeComplete,
    costComplete,
    taxComplete,
    isPartial,
    amountTaxBasis: '收入按不含税口径参与利润，成本分摊页含税成本会换算为不含税成本进入业态利润。',
    reason: isPartial ? '收入、成本、税金或分摊存在未完成项，业态利润为阶段性结果。' : '业态利润分析已具备完整经营口径。',
    nextAction: isPartial ? '请补齐缺失收入、成本明细或重新计算分摊/税金。' : '可进入报告汇总。',
    amountUnit: AMOUNT_UNIT
  };
}

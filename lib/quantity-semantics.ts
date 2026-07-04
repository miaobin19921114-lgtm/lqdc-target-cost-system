import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculateCostLine, round2 } from '@/lib/calculations';
import { overrideCostLineQuantity, restoreCostLineAutoQuantity } from '@/lib/cost-line-quantity-service';
import { writeOperationLog } from '@/lib/operation-log';
import { isVersionLocked } from '@/lib/project-version';
import { v60ProjectMetricDefinitions } from '@/data/project-metric-definitions';
import { priceIndicatorPresets } from '@/data/price-indicator-presets';

type ProjectVersionWithProject = Prisma.ProjectVersionGetPayload<{ include: { project: true } }>;
type CostLineRow = Prisma.CostLineGetPayload<{ include: { costSubject: true; productType: true } }>;
type Tx = Prisma.TransactionClient;

const z3Sources = {
  baseIndicator: 'z3_base_indicator',
  z4MetricBaseIndicator: 'z4_metric_base_indicator',
  subjectBinding: 'z3_subject_indicator_binding',
  contentRule: 'z3_content_rule',
  constructionStandard: 'z3_construction_standard',
  unitPrice: 'z3_unit_price_source'
} as const;

const quantityCalcModes = ['auto_calculated', 'manual_entered', 'excel_imported', 'drawing_measured', 'locked_confirmed'] as const;
const priceSources = ['system_default', 'region_price_library', 'user_project_manual', 'historical_project', 'excel_imported', 'contract_price', 'market_inquiry', 'supplier_quote'] as const;
const standardLevels = ['project_level', 'object_level', 'detail_subject_level'] as const;
const standardCategories = ['structure', 'basement', 'civil_defense', 'prefabricated', 'facade', 'window_door', 'indoor_decoration', 'public_area_decoration', 'equipment', 'garage', 'landscape', 'intelligent', 'demo_sales_sample', 'ancient_building'] as const;

export function semanticJsonError(code: string, message: string, status = 400) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export async function loadSemanticVersion(projectId: string, versionId: string) {
  return prisma.projectVersion.findFirst({ where: { id: versionId, projectId }, include: { project: true } });
}

export function assertSemanticEditable(version: ProjectVersionWithProject | null, message: string) {
  if (!version) return semanticJsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return semanticJsonError('VERSION_LOCKED', message, 423);
  return null;
}

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function nullableNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) && num !== 0 ? num : null;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function nowIso(value?: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function parseRemark(remark?: string | null) {
  if (!remark) return {} as Record<string, any>;
  try {
    return JSON.parse(remark) as Record<string, any>;
  } catch {
    return {};
  }
}

function jsonRemark(value: unknown) {
  return JSON.stringify(value ?? {});
}

function projectNumber(project: any, key: string) {
  return nullableNumber(project?.[key]);
}

function metricType(def: { key: string; metricGroup: string; scope: string }) {
  if (def.scope === 'product') return 'product_object_metric';
  if (def.metricGroup.includes('场地') || def.metricGroup.includes('景观') || def.metricGroup.includes('道路')) return 'site_plan_metric';
  if (def.key.includes('standardFloor')) return 'typical_floor_metric';
  return 'system_default_metric';
}

function metricProjectField(metricKey: string) {
  const map: Record<string, string> = {
    capacityBuildingArea: 'capacityBuildingArea',
    basementParkingArea: 'basementParkingArea',
    sitePerimeter: 'sitePerimeter',
    gateCount: 'gateCount',
    hardscapeArea: 'hardscapeArea',
    softscapeArea: 'softscapeArea',
    showFlatArea: 'showFlatArea',
    salesOfficeArea: 'salesOfficeArea'
  };
  return map[metricKey] || metricKey;
}

async function loadCostLines(versionId: string) {
  return prisma.costLine.findMany({
    where: { projectVersionId: versionId },
    include: { costSubject: true, productType: true },
    orderBy: [{ sortOrder: 'asc' }, { detailName: 'asc' }]
  });
}

async function loadSaved(source: string, projectId: string, versionId: string) {
  const rows = await prisma.projectMetricValue.findMany({
    where: { projectId, projectVersionId: versionId, source },
    orderBy: { createdAt: 'asc' }
  });
  return rows.map((row) => ({ row, payload: parseRemark(row.remark) }));
}

function findIndicator(indicators: any[], line: CostLineRow) {
  const key = inferMetricKey(line);
  return indicators.find((item) => item.indicatorCode === key && (item.costObjectId || null) === (line.productTypeId || null))
    || indicators.find((item) => item.indicatorCode === key && !item.costObjectId)
    || indicators.find((item) => item.id === `base:cost:${line.id}`)
    || null;
}

function inferMetricKey(line: CostLineRow) {
  const text = [line.measureBasis, line.costSubject?.defaultMeasureBasis, line.detailName, line.costSubject?.name, line.costSubject?.fullPath].filter(Boolean).join(' ');
  if (line.productTypeId && /可售/.test(text)) return 'product.saleableArea';
  if (line.productTypeId && /计容/.test(text)) return 'product.capacityArea';
  if (line.productTypeId && /不可售|公区/.test(text)) return 'product.nonSaleableArea';
  if (line.productTypeId && /建筑面积|建面|钢筋|混凝土|模板/.test(text)) return 'product.buildingArea';
  if (/人防/.test(text)) return 'civilDefenseArea';
  if (/地下车库|车库/.test(text)) return 'basementParkingArea';
  if (/地下/.test(text)) return 'undergroundArea';
  if (/户数|入户门/.test(text)) return 'householdCount';
  if (/车位|充电桩/.test(text)) return 'parkingCount';
  if (/围墙|周界|边界/.test(text)) return 'sitePerimeter';
  if (/出入口|大门/.test(text)) return 'gateCount';
  if (/硬景/.test(text)) return 'hardscapeArea';
  if (/软景|绿化/.test(text)) return 'softscapeArea';
  if (/景观/.test(text)) return 'landscapeArea';
  if (/道路/.test(text)) return 'roadArea';
  if (/外墙|立面|幕墙/.test(text)) return 'facadeArea';
  if (/门窗/.test(text)) return 'windowArea';
  if (/样板/.test(text)) return 'showFlatArea';
  if (/售楼/.test(text)) return 'salesOfficeArea';
  return 'totalBuildingArea';
}

function quantityMode(line: CostLineRow) {
  if (!line.quantityOverride) return 'auto_calculated';
  if (line.importBatchId) return 'excel_imported';
  if (/图纸|算量/.test(line.remark || '')) return 'drawing_measured';
  if (/锁定|确认/.test(line.remark || '')) return 'locked_confirmed';
  return 'manual_entered';
}

function amountFor(line: CostLineRow, quantity: number, unitPrice: number) {
  return calculateCostLine({ quantity, taxRate: n(line.taxRate) || 0.09, taxInclusiveUnitPrice: unitPrice });
}

async function updateAutoQuantityIfNeeded(tx: Tx, line: CostLineRow, quantity: number) {
  if (line.quantityOverride) return;
  if (quantity < 0) throw new Error('FINAL_QUANTITY_INVALID');
  const result = amountFor(line, quantity, n(line.taxInclusiveUnitPrice));
  await tx.costLine.update({
    where: { id: line.id },
    data: {
      quantity,
      taxExclusiveUnitPrice: result.taxExclusiveUnitPrice,
      taxInclusiveAmount: result.taxInclusiveAmount,
      taxExclusiveAmount: result.taxExclusiveAmount,
      taxAmount: result.taxAmount
    }
  });
}

function contentRatioUnit(line: CostLineRow, indicatorUnit?: string | null) {
  const unit = line.unit || line.costSubject?.defaultUnit || null;
  if (!unit || !indicatorUnit) return null;
  return `${unit}/${indicatorUnit}`;
}

export async function getBaseIndicators(projectId: string, versionId: string) {
  const version = await loadSemanticVersion(projectId, versionId);
  if (!version) return null;
  const [products, saved, z4Saved] = await Promise.all([
    prisma.productType.findMany({ where: { projectVersionId: versionId, isActive: true }, orderBy: { name: 'asc' } }),
    loadSaved(z3Sources.baseIndicator, projectId, versionId),
    loadSaved(z3Sources.z4MetricBaseIndicator, projectId, versionId)
  ]);
  const project = version.project as any;
  const indicators: any[] = v60ProjectMetricDefinitions.filter((def) => def.scope === 'project').map((def) => ({
    id: `base:project:${def.key}`,
    projectId,
    versionId,
    indicatorType: metricType(def),
    indicatorCode: def.key,
    indicatorName: def.name,
    indicatorValue: projectNumber(project, metricProjectField(def.key)),
    indicatorUnit: def.unit || null,
    sourceType: 'system_default_metric',
    sourceName: 'project_metric_definition',
    sourceRemark: def.description || null,
    costObjectId: null,
    costObjectType: null,
    isSystemDefault: true,
    isUserDefined: false,
    isOverridden: false,
    confidenceLevel: 'medium',
    createdAt: null,
    updatedAt: null
  }));
  for (const product of products) {
    for (const def of v60ProjectMetricDefinitions.filter((item) => item.scope === 'product')) {
      const key = def.key.replace('product.', '');
      indicators.push({
        id: `base:product:${product.id}:${def.key}`,
        projectId,
        versionId,
        indicatorType: 'product_object_metric',
        indicatorCode: def.key,
        indicatorName: `${product.name}${def.name}`,
        indicatorValue: nullableNumber((product as any)[key]),
        indicatorUnit: def.unit || null,
        sourceType: 'product_object_metric',
        sourceName: product.name,
        sourceRemark: def.description || null,
        costObjectId: product.id,
        costObjectType: product.costObject || product.productCategory || 'product_type',
        isSystemDefault: true,
        isUserDefined: false,
        isOverridden: false,
        confidenceLevel: 'medium',
        createdAt: null,
        updatedAt: null
      });
    }
  }
  [...saved, ...z4Saved].forEach(({ row, payload }) => {
    indicators.push({
      id: row.id,
      projectId,
      versionId,
      indicatorType: payload.indicatorType || 'manual_metric',
      indicatorCode: payload.indicatorCode || row.metricKey,
      indicatorName: payload.indicatorName || row.metricKey,
      indicatorValue: nullableNumber(row.value),
      indicatorUnit: payload.indicatorUnit || row.unit || null,
      sourceType: payload.sourceType || 'manual_metric',
      sourceName: payload.sourceName || null,
      sourceRemark: payload.sourceRemark || row.remark || null,
      costObjectId: payload.costObjectId || row.productTypeId || null,
      costObjectType: payload.costObjectType || null,
      isSystemDefault: false,
      isUserDefined: true,
      isOverridden: Boolean(payload.isOverridden),
      confidenceLevel: payload.confidenceLevel || null,
      createdAt: nowIso(row.createdAt),
      updatedAt: nowIso(row.updatedAt)
    });
  });
  return indicators;
}

export async function saveBaseIndicators(projectId: string, version: ProjectVersionWithProject, rows: unknown[]) {
  await prisma.$transaction(async (tx) => {
    for (const row of rows as Array<Record<string, unknown>>) {
      const id = String(row.id || '');
      const value = n(row.indicatorValue);
      if (value < 0) throw new Error('VALIDATION_FAILED');
      if (id.startsWith('base:cost:')) {
        const costLineId = id.replace('base:cost:', '');
        const line = await tx.costLine.findFirst({ where: { id: costLineId, projectVersionId: version.id }, include: { costSubject: true, productType: true } });
        if (!line) throw new Error('BASE_INDICATOR_NOT_FOUND');
        await tx.costLine.update({ where: { id: line.id }, data: { measureValue: value, measureBasis: clean(row.indicatorName) || line.measureBasis } });
        await updateAutoQuantityIfNeeded(tx, line, round2(value * (n(line.coefficient) || 1)));
        continue;
      }
      await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: version.id, source: z3Sources.baseIndicator, metricKey: String(row.indicatorCode || row.indicatorName || id) } });
      await tx.projectMetricValue.create({
        data: {
          projectId,
          projectVersionId: version.id,
          productTypeId: clean(row.costObjectId),
          metricKey: String(row.indicatorCode || row.indicatorName || id),
          scope: 'z3_base_indicator',
          value,
          unit: clean(row.indicatorUnit),
          source: z3Sources.baseIndicator,
          sourceRef: clean(row.sourceName),
          confidence: clean(row.confidenceLevel) ? 1 : null,
          remark: jsonRemark(row)
        }
      });
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'quantity_semantics', action: 'update_base_indicators', targetType: 'ProjectMetricValue', afterData: rows });
  });
}

export async function getSubjectIndicatorBindings(projectId: string, versionId: string) {
  const version = await loadSemanticVersion(projectId, versionId);
  if (!version) return null;
  const [lines, indicators, saved] = await Promise.all([loadCostLines(versionId), getBaseIndicators(projectId, versionId), loadSaved(z3Sources.subjectBinding, projectId, versionId)]);
  const savedByRef = new Map(saved.map(({ row, payload }) => [row.sourceRef || payload.detailSubjectId || row.metricKey, { row, payload }]));
  return lines.map((line) => {
    const savedRow = savedByRef.get(line.id);
    const indicator = indicators?.find((item: any) => item.id === savedRow?.payload.baseIndicatorId) || findIndicator(indicators || [], line);
    return {
      id: savedRow?.row.id || `binding:${line.id}`,
      projectId,
      versionId,
      detailSubjectId: line.costSubjectId,
      detailSubjectCode: line.costSubject?.code || null,
      detailSubjectName: line.detailName || line.costSubject?.name || null,
      costObjectId: line.productTypeId,
      costObjectType: line.productType?.costObject || line.productType?.productCategory || null,
      baseIndicatorId: savedRow?.payload.baseIndicatorId || indicator?.id || null,
      baseIndicatorType: savedRow?.payload.baseIndicatorType || indicator?.indicatorType || null,
      baseIndicatorCode: savedRow?.payload.baseIndicatorCode || indicator?.indicatorCode || inferMetricKey(line),
      baseIndicatorName: savedRow?.payload.baseIndicatorName || indicator?.indicatorName || line.measureBasis || null,
      baseIndicatorUnit: savedRow?.payload.baseIndicatorUnit || indicator?.indicatorUnit || null,
      baseIndicatorLockMode: savedRow?.payload.baseIndicatorLockMode || 'user_selectable',
      isDefault: !savedRow,
      isUserModified: Boolean(savedRow),
      overrideReason: savedRow?.payload.overrideReason || null,
      createdAt: nowIso(savedRow?.row.createdAt),
      updatedAt: nowIso(savedRow?.row.updatedAt)
    };
  });
}

export async function saveSubjectIndicatorBindings(projectId: string, version: ProjectVersionWithProject, rows: unknown[]) {
  await prisma.$transaction(async (tx) => {
    for (const row of rows as Array<Record<string, unknown>>) {
      const id = String(row.id || '');
      const costLineId = clean(row.costLineId) || (id.startsWith('binding:') ? id.replace('binding:', '') : null);
      if (!costLineId) throw new Error('SUBJECT_INDICATOR_BINDING_NOT_FOUND');
      const line = await tx.costLine.findFirst({ where: { id: costLineId, projectVersionId: version.id } });
      if (!line) throw new Error('SUBJECT_INDICATOR_BINDING_NOT_FOUND');
      await tx.costLine.update({ where: { id: line.id }, data: { measureBasis: clean(row.baseIndicatorName) || clean(row.baseIndicatorCode) || line.measureBasis } });
      await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: version.id, source: z3Sources.subjectBinding, sourceRef: line.id } });
      await tx.projectMetricValue.create({
        data: { projectId, projectVersionId: version.id, metricKey: `subject_binding:${line.id}`, scope: 'z3_subject_indicator_binding', value: 0, source: z3Sources.subjectBinding, sourceRef: line.id, remark: jsonRemark(row) }
      });
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'quantity_semantics', action: 'update_subject_indicator_bindings', targetType: 'CostLine', afterData: rows });
  });
}

export async function getContentRules(projectId: string, versionId: string) {
  const version = await loadSemanticVersion(projectId, versionId);
  if (!version) return null;
  const [lines, indicators, saved] = await Promise.all([loadCostLines(versionId), getBaseIndicators(projectId, versionId), loadSaved(z3Sources.contentRule, projectId, versionId)]);
  const savedByRef = new Map(saved.map(({ row, payload }) => [row.sourceRef || payload.costLineId || row.metricKey, { row, payload }]));
  return lines.map((line) => {
    const savedRow = savedByRef.get(line.id);
    const indicator = findIndicator(indicators || [], line);
    const ratio = savedRow ? nullableNumber(savedRow.row.value) : nullableNumber(line.coefficient);
    return {
      id: savedRow?.row.id || `content:${line.id}`,
      projectId,
      versionId,
      detailSubjectId: line.costSubjectId,
      detailSubjectCode: line.costSubject?.code || null,
      detailSubjectName: line.detailName || line.costSubject?.name || null,
      costObjectType: line.productType?.costObject || line.productType?.productCategory || null,
      costObjectCategory: line.productType?.productCategory || line.productType?.category || null,
      costObjectId: line.productTypeId,
      baseIndicatorType: indicator?.indicatorType || null,
      baseIndicatorCode: indicator?.indicatorCode || inferMetricKey(line),
      baseIndicatorName: indicator?.indicatorName || line.measureBasis || null,
      baseIndicatorUnit: indicator?.indicatorUnit || null,
      contentRatio: ratio,
      contentRatioUnit: savedRow?.payload.contentRatioUnit || contentRatioUnit(line, indicator?.indicatorUnit),
      quantityUnit: line.unit || line.costSubject?.defaultUnit || null,
      applicableProjectType: savedRow?.payload.applicableProjectType || null,
      applicableProductType: savedRow?.payload.applicableProductType || line.productType?.productCategory || line.regionOrProductType || null,
      applicableRegion: savedRow?.payload.applicableRegion || [version.project.city, version.project.district].filter(Boolean).join('/') || null,
      applicableConstructionStandard: savedRow?.payload.applicableConstructionStandard || null,
      applicableStage: savedRow?.payload.applicableStage || version.stage || null,
      difficultyLevel: savedRow?.payload.difficultyLevel || null,
      minValue: savedRow?.payload.minValue ?? null,
      maxValue: savedRow?.payload.maxValue ?? null,
      defaultValue: nullableNumber(line.coefficient),
      sourceType: savedRow ? 'user_project_manual' : 'system_default',
      confidenceLevel: savedRow?.payload.confidenceLevel || 'medium',
      isSystemDefault: !savedRow,
      isUserDefined: Boolean(savedRow),
      remark: savedRow?.payload.remark || line.remark || null,
      createdAt: nowIso(savedRow?.row.createdAt),
      updatedAt: nowIso(savedRow?.row.updatedAt)
    };
  });
}

export async function saveContentRules(projectId: string, version: ProjectVersionWithProject, rows: unknown[]) {
  await prisma.$transaction(async (tx) => {
    for (const row of rows as Array<Record<string, unknown>>) {
      const id = String(row.id || '');
      const costLineId = clean(row.costLineId) || (id.startsWith('content:') ? id.replace('content:', '') : null);
      const ratio = n(row.contentRatio);
      if (ratio < 0) throw new Error('CONTENT_RULE_INVALID');
      if (!clean(row.quantityUnit) && !clean(row.contentRatioUnit)) throw new Error('CONTENT_RATIO_UNIT_INVALID');
      if (!costLineId) throw new Error('CONTENT_RULE_NOT_FOUND');
      const line = await tx.costLine.findFirst({ where: { id: costLineId, projectVersionId: version.id }, include: { costSubject: true, productType: true } });
      if (!line) throw new Error('CONTENT_RULE_NOT_FOUND');
      await tx.costLine.update({ where: { id: line.id }, data: { coefficient: ratio, unit: clean(row.quantityUnit) || line.unit } });
      await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: version.id, source: z3Sources.contentRule, sourceRef: line.id } });
      await tx.projectMetricValue.create({
        data: { projectId, projectVersionId: version.id, metricKey: `content_rule:${line.id}`, scope: 'z3_content_rule', value: ratio, unit: clean(row.quantityUnit), source: z3Sources.contentRule, sourceRef: line.id, remark: jsonRemark(row) }
      });
      await updateAutoQuantityIfNeeded(tx, line, round2(n(line.measureValue) * ratio));
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'quantity_semantics', action: 'update_content_rules', targetType: 'CostLine', afterData: rows });
  });
}

export async function getQuantityCalculations(projectId: string, versionId: string) {
  const version = await loadSemanticVersion(projectId, versionId);
  if (!version) return null;
  const [lines, indicators, contentRules] = await Promise.all([loadCostLines(versionId), getBaseIndicators(projectId, versionId), getContentRules(projectId, versionId)]);
  return lines.map((line) => {
    const indicator = findIndicator(indicators || [], line);
    const rule = (contentRules || []).find((item: any) => item.id === `content:${line.id}` || item.detailSubjectId === line.costSubjectId && (item.costObjectId || null) === (line.productTypeId || null));
    const calculatedQuantity = round2(n(line.measureValue) * (n(line.coefficient) || 1));
    const finalQuantity = n(line.quantity);
    const mode = quantityMode(line);
    return {
      id: `quantity:${line.id}`,
      projectId,
      versionId,
      detailSubjectId: line.costSubjectId,
      detailSubjectCode: line.costSubject?.code || null,
      detailSubjectName: line.detailName || line.costSubject?.name || null,
      costObjectId: line.productTypeId,
      costObjectType: line.productType?.costObject || line.productType?.productCategory || null,
      baseIndicatorId: indicator?.id || null,
      baseIndicatorValue: nullableNumber(line.measureValue),
      baseIndicatorUnit: indicator?.indicatorUnit || null,
      contentRuleId: rule?.id || `content:${line.id}`,
      contentRatio: nullableNumber(line.coefficient),
      contentRatioUnit: rule?.contentRatioUnit || contentRatioUnit(line, indicator?.indicatorUnit),
      calculatedQuantity,
      manualQuantity: mode === 'manual_entered' ? finalQuantity : null,
      excelImportedQuantity: mode === 'excel_imported' ? finalQuantity : null,
      drawingMeasuredQuantity: mode === 'drawing_measured' ? finalQuantity : null,
      lockedQuantity: mode === 'locked_confirmed' ? finalQuantity : null,
      finalQuantity,
      quantityUnit: line.unit || line.costSubject?.defaultUnit || null,
      quantityCalcMode: mode,
      quantitySource: mode === 'auto_calculated' ? 'auto_calculated' : mode,
      quantitySourceRemark: line.remark || null,
      isQuantityOverridden: line.quantityOverride,
      overrideReason: line.quantityOverride ? line.remark || null : null,
      isQuantityLocked: isVersionLocked(version) || version.isLocked,
      finalAmount: n(line.taxInclusiveAmount),
      unitPrice: n(line.taxInclusiveUnitPrice),
      amountFormula: 'finalQuantity * unitPrice / 10000',
      amountUnit: '万元',
      amountEngine: {
        finalAmount: n(line.taxInclusiveAmount),
        finalAmountSource: n(line.quantity) > 0 && n(line.taxInclusiveUnitPrice) > 0 ? 'calculated_by_quantity' : 'manual_or_system_amount',
        z2Compatible: true
      },
      createdAt: null,
      updatedAt: null
    };
  });
}

export async function recalculateQuantity(projectId: string, version: ProjectVersionWithProject) {
  const lines = await loadCostLines(version.id);
  let recalculatedCount = 0;
  let skippedOverriddenCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const baseIndicatorValue = n(line.measureValue);
      const contentRatio = n(line.coefficient) || 1;
      const quantityUnit = clean(line.unit || line.costSubject?.defaultUnit);
      if (baseIndicatorValue < 0 || contentRatio < 0) throw new Error('VALIDATION_FAILED');
      if (!quantityUnit) throw new Error('BASE_INDICATOR_UNIT_INVALID');
      if (line.quantityOverride) {
        skippedOverriddenCount += 1;
        continue;
      }
      await updateAutoQuantityIfNeeded(tx, line, round2(baseIndicatorValue * contentRatio));
      recalculatedCount += 1;
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'quantity_semantics', action: 'recalculate_quantity', targetType: 'CostLine', afterData: { recalculatedCount, skippedOverriddenCount } });
  });
  return { recalculatedCount, skippedOverriddenCount };
}

export async function manualQuantityOverride(projectId: string, versionId: string, input: Record<string, unknown>) {
  const costLineId = clean(input.costLineId) || String(input.quantityCalculationId || '').replace(/^quantity:/, '');
  if (!costLineId) return { ok: false as const, status: 404, body: { success: false, error: { code: 'QUANTITY_CALCULATION_NOT_FOUND', message: '工程量计算结果不存在。' } } };
  const mode = clean(input.quantityCalcMode) || 'manual_entered';
  if (!quantityCalcModes.includes(mode as any) || mode === 'auto_calculated') return { ok: false as const, status: 400, body: { success: false, error: { code: 'QUANTITY_CALC_MODE_INVALID', message: '工程量来源模式不合法。' } } };
  const quantity = input.finalQuantity ?? input.manualQuantity ?? input.excelImportedQuantity ?? input.drawingMeasuredQuantity ?? input.lockedQuantity;
  if (n(quantity) < 0) return { ok: false as const, status: 400, body: { success: false, error: { code: 'FINAL_QUANTITY_INVALID', message: 'finalQuantity 不能为负数。' } } };
  return overrideCostLineQuantity(projectId, versionId, costLineId, { quantity, overrideReason: clean(input.overrideReason) || mode });
}

export async function restoreAutoQuantity(projectId: string, versionId: string, input: Record<string, unknown>) {
  const costLineId = clean(input.costLineId) || String(input.quantityCalculationId || '').replace(/^quantity:/, '');
  if (!costLineId) return { ok: false as const, status: 404, body: { success: false, error: { code: 'QUANTITY_CALCULATION_NOT_FOUND', message: '工程量计算结果不存在。' } } };
  return restoreCostLineAutoQuantity(projectId, versionId, costLineId);
}

function standardsFromProject(projectId: string, versionId: string, version: ProjectVersionWithProject) {
  const project = version.project as any;
  const rows = [
    ['project_level', 'indoor_decoration', 'delivery_standard', project.residentialFitoutStandard],
    ['project_level', 'garage', 'garage_standard', project.basementQualityStandard],
    ['project_level', 'prefabricated', 'prefab_standard', project.prefabricatedSystem],
    ['project_level', 'equipment', 'heating_standard', project.heatingType],
    ['project_level', 'civil_defense', 'civil_defense_standard', project.civilDefenseArea ? '人防工程标准' : null],
    ['project_level', 'demo_sales_sample', 'demo_area_standard', project.salesOfficeFitoutType || project.showFlatFitoutType]
  ];
  return rows.filter(([, , , name]) => Boolean(name)).map(([level, category, code, name]) => ({
    id: `standard:${code}`,
    projectId,
    versionId,
    standardLevel: level,
    standardCategory: category,
    standardCode: code,
    standardName: name,
    costObjectId: null,
    costObjectType: null,
    detailSubjectId: null,
    detailSubjectCode: null,
    region: [project.city, project.district].filter(Boolean).join('/') || null,
    difficultyLevel: 'normal',
    difficultyCoefficient: 1,
    materialGrade: null,
    equipmentGrade: null,
    affectsSubjectEnabled: true,
    affectsContentRule: true,
    affectsUnitPrice: true,
    affectsDifficulty: true,
    affectsCostPool: category === 'demo_sales_sample' || category === 'prefabricated',
    isEnabled: true,
    remark: '由项目建造标准字段映射生成的兼容 DTO。',
    createdAt: null,
    updatedAt: null
  }));
}

export async function getConstructionStandards(projectId: string, versionId: string) {
  const version = await loadSemanticVersion(projectId, versionId);
  if (!version) return null;
  const saved = await loadSaved(z3Sources.constructionStandard, projectId, versionId);
  return [
    ...standardsFromProject(projectId, versionId, version),
    ...saved.map(({ row, payload }) => ({
      id: row.id,
      projectId,
      versionId,
      standardLevel: payload.standardLevel || row.scope || 'project_level',
      standardCategory: payload.standardCategory || 'structure',
      standardCode: payload.standardCode || row.metricKey,
      standardName: payload.standardName || row.metricKey,
      costObjectId: payload.costObjectId || row.productTypeId || null,
      costObjectType: payload.costObjectType || null,
      detailSubjectId: payload.detailSubjectId || null,
      detailSubjectCode: payload.detailSubjectCode || null,
      region: payload.region || null,
      difficultyLevel: payload.difficultyLevel || null,
      difficultyCoefficient: nullableNumber(payload.difficultyCoefficient) || nullableNumber(row.value),
      materialGrade: payload.materialGrade || null,
      equipmentGrade: payload.equipmentGrade || null,
      affectsSubjectEnabled: Boolean(payload.affectsSubjectEnabled),
      affectsContentRule: payload.affectsContentRule !== false,
      affectsUnitPrice: payload.affectsUnitPrice !== false,
      affectsDifficulty: payload.affectsDifficulty !== false,
      affectsCostPool: Boolean(payload.affectsCostPool),
      isEnabled: payload.isEnabled !== false,
      remark: payload.remark || row.remark || null,
      createdAt: nowIso(row.createdAt),
      updatedAt: nowIso(row.updatedAt)
    }))
  ];
}

export async function saveConstructionStandards(projectId: string, version: ProjectVersionWithProject, rows: unknown[]) {
  await prisma.$transaction(async (tx) => {
    await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: version.id, source: z3Sources.constructionStandard } });
    for (const row of rows as Array<Record<string, unknown>>) {
      const level = clean(row.standardLevel) || 'project_level';
      const category = clean(row.standardCategory) || 'structure';
      if (!standardLevels.includes(level as any) || !standardCategories.includes(category as any)) throw new Error('CONSTRUCTION_STANDARD_INVALID');
      await tx.projectMetricValue.create({
        data: {
          projectId,
          projectVersionId: version.id,
          productTypeId: clean(row.costObjectId),
          metricKey: clean(row.standardCode) || clean(row.standardName) || `${level}:${category}`,
          scope: level,
          value: n(row.difficultyCoefficient) || 1,
          unit: null,
          source: z3Sources.constructionStandard,
          sourceRef: clean(row.detailSubjectId),
          remark: jsonRemark(row)
        }
      });
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'quantity_semantics', action: 'update_construction_standards', targetType: 'ProjectMetricValue', afterData: rows, remark: { recalculationRequired: true } });
  });
}

function priceSourceForLine(line: CostLineRow) {
  if (line.importBatchId) return 'excel_imported';
  if (/合同/.test(line.remark || '')) return 'contract_price';
  if (n(line.taxInclusiveUnitPrice) > 0) return 'user_project_manual';
  return 'system_default';
}

export async function getUnitPriceSources(projectId: string, versionId: string) {
  const version = await loadSemanticVersion(projectId, versionId);
  if (!version) return null;
  const [lines, standards, saved] = await Promise.all([loadCostLines(versionId), getConstructionStandards(projectId, versionId), loadSaved(z3Sources.unitPrice, projectId, versionId)]);
  const savedByRef = new Map(saved.map(({ row, payload }) => [row.sourceRef || payload.costLineId || row.metricKey, { row, payload }]));
  return lines.map((line) => {
    const savedRow = savedByRef.get(line.id);
    const preset = priceIndicatorPresets.find((item) => item.costCode === line.costSubject?.code);
    const standard = (standards || []).find((item: any) => item.affectsUnitPrice);
    const payload = savedRow?.payload || {};
    return {
      id: savedRow?.row.id || `price:${line.id}`,
      projectId,
      versionId,
      detailSubjectId: line.costSubjectId,
      detailSubjectCode: line.costSubject?.code || null,
      detailSubjectName: line.detailName || line.costSubject?.name || null,
      costObjectId: line.productTypeId,
      costObjectType: line.productType?.costObject || line.productType?.productCategory || null,
      unitPrice: nullableNumber(savedRow?.row.value) ?? nullableNumber(line.taxInclusiveUnitPrice),
      priceUnit: payload.priceUnit || (line.unit ? `元/${line.unit}` : preset?.pricingUnit || null),
      priceSource: payload.priceSource || priceSourceForLine(line),
      priceRegion: payload.priceRegion || [version.project.city, version.project.district].filter(Boolean).join('/') || preset?.region || null,
      constructionStandardId: payload.constructionStandardId || standard?.id || null,
      constructionStandardCode: payload.constructionStandardCode || standard?.standardCode || null,
      difficultyLevel: payload.difficultyLevel || standard?.difficultyLevel || null,
      difficultyCoefficient: payload.difficultyCoefficient ?? standard?.difficultyCoefficient ?? null,
      materialGrade: payload.materialGrade || standard?.materialGrade || null,
      equipmentGrade: payload.equipmentGrade || standard?.equipmentGrade || null,
      marketPriceDate: payload.marketPriceDate || null,
      taxRate: nullableNumber(line.taxRate),
      priceRemark: payload.priceRemark || preset?.sourceName || line.remark || null,
      createdAt: nowIso(savedRow?.row.createdAt),
      updatedAt: nowIso(savedRow?.row.updatedAt)
    };
  });
}

export async function saveUnitPriceSources(projectId: string, version: ProjectVersionWithProject, rows: unknown[]) {
  await prisma.$transaction(async (tx) => {
    for (const row of rows as Array<Record<string, unknown>>) {
      const id = String(row.id || '');
      const costLineId = clean(row.costLineId) || (id.startsWith('price:') ? id.replace('price:', '') : null);
      const unitPrice = n(row.unitPrice);
      const priceSource = clean(row.priceSource) || 'user_project_manual';
      if (unitPrice < 0) throw new Error('UNIT_PRICE_INVALID');
      if (!priceSources.includes(priceSource as any)) throw new Error('UNIT_PRICE_INVALID');
      if ((priceSource === 'region_price_library' || priceSource === 'market_inquiry') && !clean(row.priceRegion) && !clean(row.marketPriceDate)) throw new Error('UNIT_PRICE_INVALID');
      if (!costLineId) throw new Error('UNIT_PRICE_SOURCE_NOT_FOUND');
      const line = await tx.costLine.findFirst({ where: { id: costLineId, projectVersionId: version.id }, include: { costSubject: true, productType: true } });
      if (!line) throw new Error('UNIT_PRICE_SOURCE_NOT_FOUND');
      const result = amountFor(line, n(line.quantity), unitPrice);
      await tx.costLine.update({
        where: { id: line.id },
        data: {
          taxInclusiveUnitPrice: unitPrice,
          taxExclusiveUnitPrice: result.taxExclusiveUnitPrice,
          taxInclusiveAmount: result.taxInclusiveAmount,
          taxExclusiveAmount: result.taxExclusiveAmount,
          taxAmount: result.taxAmount,
          remark: clean(row.priceRemark) || line.remark
        }
      });
      await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: version.id, source: z3Sources.unitPrice, sourceRef: line.id } });
      await tx.projectMetricValue.create({
        data: { projectId, projectVersionId: version.id, metricKey: `unit_price:${line.id}`, scope: 'z3_unit_price_source', value: unitPrice, unit: clean(row.priceUnit), source: z3Sources.unitPrice, sourceRef: line.id, remark: jsonRemark(row) }
      });
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'quantity_semantics', action: 'update_unit_prices', targetType: 'CostLine', afterData: rows });
  });
}

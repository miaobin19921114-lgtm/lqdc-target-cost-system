import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculateCostLine, calculateRevenueLine, round2 } from '@/lib/calculations';
import { allocationBase, includes, resolveAllocationRule } from '@/lib/cost-allocation-rules';
import { isVersionLocked, VERSION_LOCKED_MESSAGE } from '@/lib/project-version';
import { writeOperationLog } from '@/lib/operation-log';

export const businessTypes = ['income', 'target_cost', 'contract_cost', 'dynamic_cost', 'tax', 'fee', 'allocation'] as const;
export const amountSources = ['calculated_by_quantity', 'manual_entered', 'formula_calculated', 'contract_amount', 'allocated_result', 'imported_excel', 'tax_calculated', 'system_default'] as const;
export const collectionModes = ['direct_object', 'project_pool', 'special_pool', 'basement_pool', 'marketing_pool', 'supporting_pool', 'period_expense', 'manual_allocation'] as const;
export const allocationPurposes = ['operation_profit', 'tax_income', 'tax_lvat'] as const;
export const allocationRuleTypes = ['no_allocation', 'by_building_area', 'by_saleable_area', 'by_plot_ratio_area', 'by_underground_area', 'by_garage_area', 'by_parking_count', 'by_income_amount', 'by_benefit_object', 'by_tax_object', 'by_manual_ratio', 'by_contract_scope', 'by_custom_formula'] as const;

type Tx = Prisma.TransactionClient;
type ProjectVersionWithProject = { id: string; projectId: string; status?: string | null; isLocked?: boolean | null };
type CostLineRow = Prisma.CostLineGetPayload<{ include: { costSubject: true; productType: true } }>;
type RevenueLineRow = Prisma.RevenueLineGetPayload<{ include: { productType: true } }>;
type ProductRow = Prisma.ProductTypeGetPayload<{}>;
type DictionaryRow = Prisma.CostDictionaryRowGetPayload<{}>;

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function nowIso(value?: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function jsonRemark(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export function jsonError(code: string, message: string, status = 400) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export async function loadVersion(projectId: string, versionId: string) {
  return prisma.projectVersion.findFirst({ where: { id: versionId, projectId } });
}

export function assertEditable(version: ProjectVersionWithProject | null, message: string) {
  if (!version) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return jsonError('VERSION_LOCKED', VERSION_LOCKED_MESSAGE || message, 423);
  return null;
}

function amountSourceForCost(line: CostLineRow) {
  if (line.importBatchId) return 'imported_excel';
  if (n(line.quantity) > 0 && n(line.taxInclusiveUnitPrice) > 0) return 'calculated_by_quantity';
  if (n(line.taxInclusiveAmount) > 0) return 'manual_entered';
  return 'system_default';
}

function amountSourceForRevenue(row: RevenueLineRow) {
  if (n(row.saleableArea) > 0 && n(row.salePrice) > 0) return 'calculated_by_quantity';
  if (n(row.taxInclusiveRevenue) > 0) return 'manual_entered';
  return 'system_default';
}

function allocationRuleType(method?: string | null) {
  const text = method || '';
  if (!text || includes(text, ['不分摊', '无需分摊', '直接归集'])) return 'no_allocation';
  if (includes(text, ['车位', '个数', '停车'])) return 'by_parking_count';
  if (includes(text, ['可售面积'])) return 'by_saleable_area';
  if (includes(text, ['计容'])) return 'by_plot_ratio_area';
  if (includes(text, ['地下', '地库'])) return 'by_underground_area';
  if (includes(text, ['收入'])) return 'by_income_amount';
  if (includes(text, ['手工', '比例'])) return 'by_manual_ratio';
  if (includes(text, ['受益'])) return 'by_benefit_object';
  if (includes(text, ['建筑面积', '建面'])) return 'by_building_area';
  return 'by_custom_formula';
}

function collectionModeForCost(line: CostLineRow) {
  const code = line.costSubject?.code || '';
  const text = [line.detailName, line.professionalGroup, line.regionOrProductType, line.measureBasis, line.allocationMethod, line.costSubject?.fullPath].filter(Boolean).join(' ');
  if (line.isDirectAssigned || line.productTypeId) return 'direct_object';
  if (includes(text, ['销售费用', '营销推广', '渠道', '代理费', '管理费用', '运营费用', '财务费用', '融资顾问'])) return 'period_expense';
  if (includes(text, ['地下室', '地库', '地下车库', '车库', '人防'])) return 'basement_pool';
  if (includes(text, ['样板间', '售楼处', '示范区', '看房通道', '营销展示'])) return 'marketing_pool';
  if (includes(text, ['公共配套', '幼儿园', '会所', '物业用房', '配套'])) return 'supporting_pool';
  if (includes(text, ['专项', '临时设施', '大区景观', '精装修', '装配式', '采暖'])) return 'special_pool';
  if (code.startsWith('01') || code.startsWith('02') || includes(text, ['土地', '契税', '规划设计', '报建', '勘察', '测绘', '咨询', '三通一平', '开发间接'])) return 'project_pool';
  if (includes(text, ['分摊'])) return 'manual_allocation';
  return 'direct_object';
}

function costPoolTypeForMode(mode: string, line?: CostLineRow) {
  const text = line ? [line.detailName, line.professionalGroup, line.regionOrProductType, line.costSubject?.fullPath].filter(Boolean).join(' ') : '';
  if (mode === 'basement_pool') {
    if (includes(text, ['人防'])) return 'civil_defense_pool';
    if (includes(text, ['车库', '车位'])) return 'underground_garage_pool';
    return 'basement_pool';
  }
  if (mode === 'marketing_pool') {
    if (includes(text, ['样板间'])) return 'sample_room_pool';
    if (includes(text, ['售楼处'])) return 'sales_office_pool';
    if (includes(text, ['示范区'])) return 'demo_area_pool';
    return 'marketing_display_pool';
  }
  if (mode === 'supporting_pool') return 'supporting_pool';
  if (mode === 'project_pool') return 'project_pool';
  if (mode === 'manual_allocation') return 'manual_pool';
  if (includes(text, ['景观'])) return 'landscape_pool';
  if (includes(text, ['精装修'])) return 'decoration_pool';
  if (includes(text, ['装配式'])) return 'prefabricated_pool';
  return 'manual_pool';
}

function costPoolName(type: string) {
  const names: Record<string, string> = {
    project_pool: '项目级成本池',
    basement_pool: '地下室成本池',
    underground_garage_pool: '地下车库成本池',
    civil_defense_pool: '人防成本池',
    marketing_display_pool: '营销展示成本池',
    sample_room_pool: '样板间成本池',
    sales_office_pool: '售楼处成本池',
    demo_area_pool: '示范区成本池',
    supporting_pool: '公共配套成本池',
    landscape_pool: '景观成本池',
    decoration_pool: '精装修专项成本池',
    prefabricated_pool: '装配式增量成本池',
    manual_pool: '手工分摊成本池'
  };
  return names[type] || '专项成本池';
}

function calculationItemFromCost(projectId: string, versionId: string, line: CostLineRow) {
  const finalQuantity = n(line.quantity) || null;
  const finalAmount = round2(n(line.taxInclusiveAmount));
  const source = amountSourceForCost(line);
  const collectionMode = collectionModeForCost(line);
  const poolType = costPoolTypeForMode(collectionMode, line);
  return {
    id: `cost:${line.id}`,
    projectId,
    versionId,
    businessType: collectionMode === 'period_expense' ? 'fee' : 'target_cost',
    objectId: line.productTypeId,
    objectType: line.productTypeId ? 'product_type' : null,
    subjectId: line.costSubjectId,
    subjectCode: line.costSubject?.code || null,
    subjectName: line.costSubject?.name || null,
    itemName: line.detailName,
    quantity: finalQuantity,
    quantityUnit: line.unit,
    finalQuantity,
    unitPrice: n(line.taxInclusiveUnitPrice),
    priceUnit: line.unit ? `元/${line.unit}` : null,
    taxRate: n(line.taxRate),
    taxIncludedAmount: finalAmount,
    taxExcludedAmount: round2(n(line.taxExclusiveAmount)),
    taxAmount: round2(n(line.taxAmount)),
    manualAmount: source === 'manual_entered' ? finalAmount : null,
    formulaAmount: null,
    contractAmount: null,
    allocatedAmount: null,
    finalAmount,
    amountSource: source,
    amountSourceRemark: source === 'calculated_by_quantity' ? 'quantity × taxInclusiveUnitPrice / 10000' : null,
    sourceType: line.importBatchId ? 'excel_import' : 'cost_line',
    calculationMode: line.measureBasis,
    collectionMode,
    costPoolId: collectionMode === 'direct_object' ? null : `pool:${poolType}`,
    allocationRequired: collectionMode !== 'direct_object' && collectionMode !== 'period_expense',
    allocationRuleId: line.allocationMethod ? `rule:${allocationRuleType(line.allocationMethod)}` : null,
    finalBearingObjectId: line.productTypeId,
    contractPackageId: null,
    cashflowPlanId: null,
    remark: line.remark,
    createdAt: null,
    updatedAt: null
  };
}

function calculationItemFromRevenue(projectId: string, versionId: string, row: RevenueLineRow) {
  const finalQuantity = n(row.saleableArea) || null;
  const finalAmount = round2(n(row.taxInclusiveRevenue));
  const source = amountSourceForRevenue(row);
  const parking = includes(row.productType?.name, ['车位', '车库', '停车', '人防']);
  return {
    id: `income:${row.id}`,
    projectId,
    versionId,
    businessType: 'income',
    objectId: row.productTypeId,
    objectType: 'product_type',
    subjectId: null,
    subjectCode: null,
    subjectName: parking ? '车位收入' : '销售收入',
    itemName: `${row.productType?.name || '未命名业态'}收入`,
    quantity: finalQuantity,
    quantityUnit: parking ? '个' : '㎡',
    finalQuantity,
    unitPrice: n(row.salePrice),
    priceUnit: parking ? '元/个' : '元/㎡',
    taxRate: n(row.taxRate),
    taxIncludedAmount: finalAmount,
    taxExcludedAmount: round2(n(row.taxExclusiveRevenue)),
    taxAmount: round2(n(row.taxAmount)),
    manualAmount: source === 'manual_entered' ? finalAmount : null,
    formulaAmount: null,
    contractAmount: null,
    allocatedAmount: null,
    finalAmount,
    amountSource: source,
    amountSourceRemark: 'revenue quantity × unitPrice / 10000',
    sourceType: 'revenue_line',
    calculationMode: parking ? 'parking_count' : 'saleable_area',
    collectionMode: 'direct_object',
    costPoolId: null,
    allocationRequired: false,
    allocationRuleId: null,
    finalBearingObjectId: row.productTypeId,
    contractPackageId: null,
    cashflowPlanId: null,
    remark: row.remark,
    createdAt: null,
    updatedAt: null
  };
}

function taxCalculationItems(projectId: string, versionId: string, rows: RevenueLineRow[], costs: CostLineRow[]) {
  const outputVat = round2(rows.reduce((sum, row) => sum + n(row.taxAmount), 0));
  const inputVat = round2(costs.reduce((sum, row) => sum + n(row.taxAmount), 0));
  return [
    { id: 'tax:output_vat', itemName: '销项税额', finalAmount: outputVat, taxAmount: outputVat },
    { id: 'tax:input_vat', itemName: '进项税额', finalAmount: inputVat, taxAmount: inputVat }
  ].map((item) => ({
    id: item.id,
    projectId,
    versionId,
    businessType: 'tax',
    objectId: null,
    objectType: null,
    subjectId: null,
    subjectCode: null,
    subjectName: '税金',
    itemName: item.itemName,
    quantity: null,
    quantityUnit: null,
    finalQuantity: null,
    unitPrice: null,
    priceUnit: null,
    taxRate: null,
    taxIncludedAmount: item.finalAmount,
    taxExcludedAmount: null,
    taxAmount: item.taxAmount,
    manualAmount: null,
    formulaAmount: item.finalAmount,
    contractAmount: null,
    allocatedAmount: null,
    finalAmount: item.finalAmount,
    amountSource: 'tax_calculated',
    amountSourceRemark: 'derived from revenue/cost tax amount',
    sourceType: 'tax_summary',
    calculationMode: 'formula',
    collectionMode: 'project_pool',
    costPoolId: 'pool:project_pool',
    allocationRequired: false,
    allocationRuleId: null,
    finalBearingObjectId: null,
    contractPackageId: null,
    cashflowPlanId: null,
    remark: null,
    createdAt: null,
    updatedAt: null
  }));
}

async function loadRows(projectId: string, versionId: string) {
  const [version, costs, revenues, products, dictionaryRows, metrics] = await Promise.all([
    loadVersion(projectId, versionId),
    prisma.costLine.findMany({ where: { projectVersionId: versionId }, include: { costSubject: true, productType: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.revenueLine.findMany({ where: { projectVersionId: versionId }, include: { productType: true } }),
    prisma.productType.findMany({ where: { projectVersionId: versionId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.costDictionaryRow.findMany({ where: { projectId } }),
    prisma.projectMetricValue.findMany({ where: { projectId, projectVersionId: versionId, source: { startsWith: 'z2_' } } })
  ]);
  return { version, costs, revenues, products, dictionaryRows, metrics };
}

export async function getCalculationItems(projectId: string, versionId: string) {
  const { version, costs, revenues } = await loadRows(projectId, versionId);
  if (!version) return null;
  return [
    ...costs.map((line) => calculationItemFromCost(projectId, versionId, line)),
    ...revenues.map((row) => calculationItemFromRevenue(projectId, versionId, row)),
    ...taxCalculationItems(projectId, versionId, revenues, costs)
  ];
}

export async function getCostPools(projectId: string, versionId: string) {
  const { version, costs } = await loadRows(projectId, versionId);
  if (!version) return null;
  const pools = new Map<string, { type: string; mode: string; lines: CostLineRow[] }>();
  costs.forEach((line) => {
    const mode = collectionModeForCost(line);
    if (mode === 'direct_object' || mode === 'period_expense') return;
    const type = costPoolTypeForMode(mode, line);
    const current = pools.get(type) || { type, mode, lines: [] };
    current.lines.push(line);
    pools.set(type, current);
  });
  return [...pools.values()].map((pool) => {
    const taxIncludedAmount = round2(pool.lines.reduce((sum, line) => sum + n(line.taxInclusiveAmount), 0));
    const taxExcludedAmount = round2(pool.lines.reduce((sum, line) => sum + n(line.taxExclusiveAmount), 0));
    const taxAmount = round2(pool.lines.reduce((sum, line) => sum + n(line.taxAmount), 0));
    const ruleType = allocationRuleType(pool.lines[0]?.allocationMethod || pool.lines[0]?.costSubject?.defaultAllocationMethod);
    return {
      id: `pool:${pool.type}`,
      projectId,
      versionId,
      costPoolCode: pool.type,
      costPoolName: costPoolName(pool.type),
      costPoolType: pool.type,
      sourceObjectId: null,
      sourceObjectType: null,
      collectionMode: pool.mode,
      taxIncludedAmount,
      taxExcludedAmount,
      taxAmount,
      finalAmount: taxIncludedAmount,
      allocationRequired: true,
      defaultAllocationPurpose: 'operation_profit',
      defaultAllocationRuleType: ruleType,
      remark: '由现有成本明细按 collectionMode 归集生成的兼容成本池。',
      createdAt: null,
      updatedAt: null
    };
  });
}

export async function getTargetCostSummaryViews(projectId: string, versionId: string) {
  const [items, pools] = await Promise.all([getCalculationItems(projectId, versionId), getCostPools(projectId, versionId)]);
  if (!items || !pools) return null;
  const targetCostItems = items.filter((item) => item.businessType === 'target_cost' || item.businessType === 'fee');
  const sumBy = (key: 'businessType' | 'collectionMode' | 'amountSource') => {
    const grouped = new Map<string, number>();
    targetCostItems.forEach((item) => grouped.set(String(item[key] || 'unknown'), round2((grouped.get(String(item[key] || 'unknown')) || 0) + n(item.finalAmount))));
    return [...grouped.entries()].map(([name, finalAmount]) => ({ name, finalAmount }));
  };
  return {
    byBusinessType: sumBy('businessType'),
    byCollectionMode: sumBy('collectionMode'),
    byAmountSource: sumBy('amountSource'),
    byCostPoolType: pools.map((pool) => ({ name: pool.costPoolType, finalAmount: pool.finalAmount })),
    reservedAllocationPurposes: [...allocationPurposes]
  };
}

function purposeToLegacy(purpose: string) {
  if (purpose === 'tax_income') return 'incomeTax';
  if (purpose === 'tax_lvat') return 'landVat';
  return 'operating';
}

export async function getAllocationResults(projectId: string, versionId: string, purpose = 'operation_profit') {
  const { version, costs, products, dictionaryRows } = await loadRows(projectId, versionId);
  if (!version) return null;
  const dictionaryByCode = new Map<string, DictionaryRow>();
  dictionaryRows.forEach((row) => {
    if (row.costCode) dictionaryByCode.set(row.costCode, row);
  });

  const results: unknown[] = [];
  for (const line of costs) {
    const mode = collectionModeForCost(line);
    const amount = round2(n(line.taxInclusiveAmount));
    if (line.productTypeId || mode === 'direct_object') {
      results.push(allocationRow(projectId, versionId, line, null, line.productTypeId, purpose, 'no_allocation', 1, amount, '直接归属对象，无需二次分摊。'));
      continue;
    }
    if (mode === 'period_expense') continue;

    const rule = resolveAllocationRule(line, dictionaryByCode, purposeToLegacy(purpose) as any);
    const candidates = products.filter((product) => product.participateAllocation !== false);
    const baseByProduct = candidates.map((product) => ({ product, base: allocationBase(product, rule.method) }));
    const totalBase = baseByProduct.reduce((sum, row) => sum + row.base, 0);
    if (totalBase <= 0) {
      results.push(allocationRow(projectId, versionId, line, `pool:${costPoolTypeForMode(mode, line)}`, null, purpose, 'no_allocation', null, amount, '缺少可用分摊基数，暂保留在来源成本池。'));
      continue;
    }
    baseByProduct.forEach(({ product, base }) => {
      const ratio = base / totalBase;
      results.push(allocationRow(projectId, versionId, line, `pool:${costPoolTypeForMode(mode, line)}`, product.id, purpose, allocationRuleType(rule.method), ratio, round2(amount * ratio), rule.source));
    });
  }
  return results;
}

function allocationRow(projectId: string, versionId: string, line: CostLineRow, poolId: string | null, targetObjectId: string | null, purpose: string, ruleType: string, ratio: number | null, amount: number, remark: string) {
  return {
    id: `allocation:${purpose}:${line.id}:${targetObjectId || 'pool'}`,
    projectId,
    versionId,
    sourceItemId: `cost:${line.id}`,
    sourceCostPoolId: poolId,
    sourceObjectId: line.productTypeId,
    sourceObjectType: line.productTypeId ? 'product_type' : null,
    targetObjectId,
    targetObjectType: targetObjectId ? 'product_type' : null,
    allocationPurpose: purpose,
    allocationRuleId: ruleType === 'no_allocation' ? null : `rule:${ruleType}`,
    allocationRuleType: ruleType,
    allocationBaseValue: null,
    allocationRatio: ratio === null ? null : round2(ratio),
    allocatedTaxIncludedAmount: amount,
    allocatedTaxExcludedAmount: null,
    allocatedTaxAmount: null,
    allocatedFinalAmount: amount,
    calculationRemark: remark,
    createdAt: null,
    updatedAt: null
  };
}

export async function getManualAllocations(projectId: string, versionId: string) {
  const rows = await prisma.projectMetricValue.findMany({ where: { projectId, projectVersionId: versionId, source: 'z2_manual_allocation' }, orderBy: { createdAt: 'asc' } });
  return rows.map((row) => ({ id: row.id, projectId, versionId, sourceCostPoolId: row.sourceRef, allocationPurpose: row.scope || 'operation_profit', allocationRuleType: 'by_manual_ratio', manualAllocationRatio: n(row.confidence), manualAllocatedAmount: n(row.value), remark: row.remark, createdAt: nowIso(row.createdAt), updatedAt: nowIso(row.updatedAt) }));
}

export async function saveManualAllocations(projectId: string, version: ProjectVersionWithProject, rows: unknown[]) {
  validateManualRows(rows);
  await prisma.$transaction(async (tx) => {
    await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: version.id, source: 'z2_manual_allocation' } });
    for (const row of rows as Array<Record<string, unknown>>) {
      await tx.projectMetricValue.create({ data: { projectId, projectVersionId: version.id, metricKey: `manual_allocation:${clean(row.sourceCostPoolId) || 'pool'}:${clean(row.targetObjectId) || 'target'}`, scope: String(row.allocationPurpose || 'operation_profit'), value: n(row.manualAllocatedAmount), unit: '万元', source: 'z2_manual_allocation', sourceRef: clean(row.sourceCostPoolId), confidence: n(row.manualAllocationRatio), remark: jsonRemark(row) } });
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'cost_semantics', action: 'update_manual_allocations', targetType: 'ProjectMetricValue', afterData: rows });
  });
}

export async function getParkingCostAllocation(projectId: string, versionId: string) {
  const row = await prisma.projectMetricValue.findFirst({ where: { projectId, projectVersionId: versionId, source: 'z2_parking_cost_allocation' } });
  const config = parseRemark(row?.remark);
  return { projectId, versionId, parkingObjectId: config.parkingObjectId || row?.productTypeId || null, parkingCostAllocationMode: config.parkingCostAllocationMode || 'manual_amount', parkingManualAllocatedAmount: row ? n(row.value) : 0, parkingManualAllocationRatio: row ? n(row.confidence) : 0, parkingAllocatedCostAmount: row ? n(row.value) : 0, remark: row?.remark || null, updatedAt: nowIso(row?.updatedAt) };
}

export async function saveParkingCostAllocation(projectId: string, version: ProjectVersionWithProject, input: Record<string, unknown>) {
  const mode = String(input.parkingCostAllocationMode || 'manual_amount');
  const amount = n(input.parkingManualAllocatedAmount);
  const ratio = n(input.parkingManualAllocationRatio);
  const parkingObjectId = clean(input.parkingObjectId);
  if (!parkingObjectId) throw new Error('PARKING_ALLOCATION_INVALID');
  if (mode !== 'manual_amount' && mode !== 'manual_ratio') throw new Error('PARKING_ALLOCATION_INVALID');
  if (amount < 0 || ratio < 0 || ratio > 1) throw new Error('PARKING_ALLOCATION_INVALID');
  const parkingObject = await prisma.productType.findFirst({ where: { id: parkingObjectId, projectVersionId: version.id } });
  if (!parkingObject || !includes(parkingObject.name, ['车位', '车库', '停车', '人防'])) throw new Error('PARKING_ALLOCATION_INVALID');
  const pools = await getCostPools(projectId, version.id);
  const sourcePoolId = clean(input.sourceCostPoolId);
  const sourcePool = pools?.find((pool) => pool.id === sourcePoolId || pool.costPoolCode === sourcePoolId);
  const finalAmount = mode === 'manual_ratio' ? round2(n(sourcePool?.finalAmount) * ratio) : amount;
  await prisma.$transaction(async (tx) => {
    await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: version.id, source: 'z2_parking_cost_allocation' } });
    await tx.projectMetricValue.create({ data: { projectId, projectVersionId: version.id, productTypeId: parkingObjectId, metricKey: 'parking_cost_allocation', scope: 'operation_profit', value: finalAmount, unit: '万元', source: 'z2_parking_cost_allocation', sourceRef: sourcePoolId, confidence: ratio, remark: jsonRemark({ ...input, parkingAllocatedCostAmount: finalAmount }) } });
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'cost_semantics', action: 'update_parking_cost_allocation', targetType: 'ProjectMetricValue', targetId: parkingObjectId, afterData: input });
  });
}

export async function getDisplayCostBearing(projectId: string, versionId: string) {
  const row = await prisma.projectMetricValue.findFirst({ where: { projectId, projectVersionId: versionId, source: 'z2_display_cost_bearing' } });
  const config = parseRemark(row?.remark);
  return { projectId, versionId, displayCostBearingType: config.displayCostBearingType || 'development_cost', sampleRoomBearingType: config.sampleRoomBearingType || 'development_cost', salesOfficeBearingType: config.salesOfficeBearingType || 'development_cost', demoAreaBearingType: config.demoAreaBearingType || 'development_cost', remark: row?.remark || null, updatedAt: nowIso(row?.updatedAt) };
}

export async function saveDisplayCostBearing(projectId: string, version: ProjectVersionWithProject, input: Record<string, unknown>) {
  const normalized = {
    displayCostBearingType: clean(input.displayCostBearingType) || 'development_cost',
    sampleRoomBearingType: clean(input.sampleRoomBearingType) || 'development_cost',
    salesOfficeBearingType: clean(input.salesOfficeBearingType) || 'development_cost',
    demoAreaBearingType: clean(input.demoAreaBearingType) || 'development_cost'
  };
  if (Object.values(normalized).some((value) => value !== 'development_cost' && value !== 'sales_expense')) throw new Error('DISPLAY_COST_BEARING_INVALID');
  await prisma.$transaction(async (tx) => {
    await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: version.id, source: 'z2_display_cost_bearing' } });
    await tx.projectMetricValue.create({ data: { projectId, projectVersionId: version.id, metricKey: 'display_cost_bearing', scope: 'operation_profit', value: 0, unit: null, source: 'z2_display_cost_bearing', sourceRef: null, remark: JSON.stringify(normalized) } });
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'cost_semantics', action: 'update_display_cost_bearing', targetType: 'ProjectMetricValue', afterData: normalized });
  });
}

export async function recalculateCostLines(projectId: string, version: ProjectVersionWithProject) {
  const lines = await prisma.costLine.findMany({ where: { projectVersionId: version.id }, include: { costSubject: true, productType: true } });
  let updatedCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const quantity = n(line.quantity);
      const unitPrice = n(line.taxInclusiveUnitPrice);
      if (quantity < 0 || unitPrice < 0) throw new Error('VALIDATION_FAILED');
      const result = calculateCostLine({ quantity, taxRate: n(line.taxRate) || 0.09, taxInclusiveUnitPrice: unitPrice });
      await tx.costLine.update({ where: { id: line.id }, data: { taxInclusiveAmount: result.taxInclusiveAmount, taxExclusiveAmount: result.taxExclusiveAmount, taxAmount: result.taxAmount, taxExclusiveUnitPrice: result.taxExclusiveUnitPrice } });
      updatedCount += 1;
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'cost_semantics', action: 'recalculate_calculation_items', targetType: 'CostLine', afterData: { updatedCount } });
  });
  return updatedCount;
}

export async function saveCalculationItems(projectId: string, version: ProjectVersionWithProject, rows: unknown[]) {
  validateCalculationRows(rows);
  await prisma.$transaction(async (tx) => {
    for (const row of rows as Array<Record<string, unknown>>) {
      const id = String(row.id || '');
      if (!id.startsWith('cost:')) continue;
      const costLineId = id.replace('cost:', '');
      const quantity = n(row.finalQuantity ?? row.quantity);
      const unitPrice = n(row.unitPrice);
      const taxRate = n(row.taxRate) || 0.09;
      const result = calculateCostLine({ quantity, taxRate, taxInclusiveUnitPrice: unitPrice });
      await tx.costLine.update({ where: { id: costLineId }, data: { quantity, taxInclusiveUnitPrice: unitPrice, taxRate, taxInclusiveAmount: result.taxInclusiveAmount, taxExclusiveAmount: result.taxExclusiveAmount, taxAmount: result.taxAmount, taxExclusiveUnitPrice: result.taxExclusiveUnitPrice, remark: clean(row.remark) } });
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'cost_semantics', action: 'update_calculation_items', targetType: 'CostLine', afterData: rows });
  });
}

export async function saveCostPools(projectId: string, version: ProjectVersionWithProject, rows: unknown[]) {
  await prisma.$transaction(async (tx) => {
    await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: version.id, source: 'z2_cost_pool_config' } });
    for (const row of rows as Array<Record<string, unknown>>) {
      await tx.projectMetricValue.create({ data: { projectId, projectVersionId: version.id, metricKey: `cost_pool:${clean(row.costPoolCode) || clean(row.id) || 'pool'}`, scope: 'operation_profit', value: n(row.finalAmount), unit: '万元', source: 'z2_cost_pool_config', sourceRef: clean(row.id), remark: jsonRemark(row) } });
    }
    await writeOperationLog(tx, { projectId, versionId: version.id, module: 'cost_semantics', action: 'update_cost_pools', targetType: 'ProjectMetricValue', afterData: rows });
  });
}

function validateCalculationRows(rows: unknown[]) {
  for (const row of rows as Array<Record<string, unknown>>) {
    const businessType = clean(row.businessType);
    const collectionMode = clean(row.collectionMode);
    const amountSource = clean(row.amountSource);
    if (businessType && !businessTypes.includes(businessType as any)) throw new Error('VALIDATION_FAILED');
    if (collectionMode && !collectionModes.includes(collectionMode as any)) throw new Error('COLLECTION_MODE_INVALID');
    if (amountSource && !amountSources.includes(amountSource as any)) throw new Error('FINAL_AMOUNT_INVALID');
    if (n(row.finalAmount) < 0 || n(row.finalQuantity) < 0 || n(row.unitPrice) < 0) throw new Error('FINAL_AMOUNT_INVALID');
  }
}

function validateManualRows(rows: unknown[]) {
  for (const row of rows as Array<Record<string, unknown>>) {
    const purpose = clean(row.allocationPurpose) || 'operation_profit';
    const ratio = n(row.manualAllocationRatio);
    const amount = n(row.manualAllocatedAmount);
    if (!allocationPurposes.includes(purpose as any)) throw new Error('ALLOCATION_PURPOSE_INVALID');
    if (ratio < 0 || ratio > 1 || amount < 0) throw new Error('MANUAL_ALLOCATION_INVALID');
  }
}

function parseRemark(remark?: string | null) {
  if (!remark) return {} as Record<string, any>;
  try {
    return JSON.parse(remark) as Record<string, any>;
  } catch {
    return {};
  }
}

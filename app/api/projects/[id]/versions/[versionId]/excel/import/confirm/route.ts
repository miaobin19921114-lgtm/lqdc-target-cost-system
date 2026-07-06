import { NextResponse } from 'next/server';
import { calculateCostLine, calculateRevenueLine } from '@/lib/calculations';
import { getExcelImportPreview } from '@/lib/excel-import-store';
import { EXCEL_TEMPLATE_VERSION, excelError, parseV60WorkbookImportData, type ParsedTaxField, type ParsedV60ImportData } from '@/lib/excel-v60';
import { prisma } from '@/lib/prisma';
import { isVersionLocked, VERSION_LOCKED_MESSAGE } from '@/lib/project-version';
import { defaultVersionStage } from '@/lib/version-stage';
import { costLineQuantityPatch } from '@/lib/cost-line-quantity-fields';

type ImportMode = 'overwrite_current' | 'create_version';
type CostSubjectLite = { id: string; code: string; name: string; fullPath: string | null };

function toText(value: unknown) {
  return String(value || '').trim();
}

function toNumber(value: unknown) {
  const raw = toText(value).replace(/,/g, '').replace(/，/g, '');
  if (!raw) return 0;
  const num = Number(raw.replace('%', ''));
  if (!Number.isFinite(num)) return 0;
  if (raw.includes('%')) return num / 100;
  return num;
}

function toRate(value: unknown, fallback = 0.09) {
  const num = toNumber(value);
  if (!num) return fallback;
  return num > 1 ? num / 100 : num;
}

function fieldMap(rows: Array<{ field: string; value: string }>) {
  return new Map(rows.map((row) => [row.field, row.value]));
}

function projectLooksArchived(project: unknown) {
  const record = project as Record<string, unknown> | null;
  const status = toText(record?.status || record?.archiveStatus || record?.snapshotStatus).toLowerCase();
  return Boolean(record?.isArchived || record?.archivedAt || status === 'archived' || status === '归档');
}

function jsonError(code: string, message: string, status = 400) {
  const error = excelError(code, message, status);
  return NextResponse.json(error.body, { status: error.status });
}

function importedModule(module: string, rowCount: number) {
  return { module, status: 'success', rowCount };
}

function taxValue(rows: ParsedTaxField[], name: string, fallback: number | string) {
  const found = rows.find((row) => row.field === name);
  if (!found) return fallback;
  return typeof fallback === 'number' ? toRate(found.value, fallback) : found.value;
}

async function ensureProduct(tx: any, projectVersionId: string, row: { productName: string; saleableArea: number; salePrice: number }) {
  const existing = await tx.productType.findFirst({ where: { projectVersionId, name: row.productName, isActive: true } });
  const data = {
    saleableArea: row.saleableArea,
    salePrice: row.salePrice,
    isSaleable: true,
    participateAllocation: true
  };
  if (existing) return tx.productType.update({ where: { id: existing.id }, data });
  return tx.productType.create({
    data: {
      projectVersionId,
      name: row.productName,
      category: 'Excel导入',
      buildingArea: row.saleableArea,
      saleableArea: row.saleableArea,
      capacityArea: row.saleableArea,
      salePrice: row.salePrice,
      isSaleable: true,
      participateAllocation: true,
      allocationWeight: 1,
      remark: 'Excel确认导入自动创建'
    }
  });
}

function overviewUpdate(data: ParsedV60ImportData) {
  const overview = fieldMap(data.overview);
  const update: Record<string, string | number> = {};
  const textFields = [
    ['项目名称', 'name'],
    ['城市', 'city'],
    ['区县', 'district']
  ] as const;
  const numberFields = [
    ['占地面积', 'landArea'],
    ['容积率', 'plotRatio'],
    ['总建筑面积', 'totalBuildingArea'],
    ['计容建筑面积', 'capacityBuildingArea'],
    ['可售面积', 'saleableArea'],
    ['车位数量', 'parkingCount'],
    ['充电桩数量', 'chargingPileCount']
  ] as const;

  for (const [label, key] of textFields) {
    const value = overview.get(label);
    if (value) update[key] = value;
  }
  for (const [label, key] of numberFields) {
    if (!overview.has(label)) continue;
    const value = toNumber(overview.get(label));
    update[key] = key === 'parkingCount' || key === 'chargingPileCount' ? Math.round(value) : value;
  }
  return update;
}

async function recalculateVersion(tx: any, projectVersionId: string) {
  const revenues = await tx.revenueLine.findMany({ where: { projectVersionId } });
  for (const revenue of revenues) {
    const result = calculateRevenueLine(Number(revenue.saleableArea || 0), Number(revenue.salePrice || 0), Number(revenue.taxRate || 0));
    await tx.revenueLine.update({
      where: { id: revenue.id },
      data: {
        taxInclusiveRevenue: result.taxInclusiveRevenue,
        taxExclusiveRevenue: result.taxExclusiveRevenue,
        taxAmount: result.taxAmount
      }
    });
  }

  const costs = await tx.costLine.findMany({ where: { projectVersionId } });
  for (const cost of costs) {
    const quantityState = costLineQuantityPatch(cost);
    const result = calculateCostLine({
      quantity: Number(quantityState.quantity || cost.quantity || 0),
      taxRate: Number(cost.taxRate || 0),
      taxInclusiveUnitPrice: Number(cost.taxInclusiveUnitPrice || 0)
    });
    await tx.costLine.update({
      where: { id: cost.id },
      data: {
        quantity: Number(quantityState.quantity || cost.quantity || 0),
        quantitySource: quantityState.quantitySource,
        quantityStatus: quantityState.quantityStatus,
        quantityFormula: quantityState.quantityFormula,
        amountStatus: quantityState.amountStatus,
        taxExclusiveUnitPrice: result.taxExclusiveUnitPrice,
        taxInclusiveUnitPrice: result.taxInclusiveUnitPrice,
        taxExclusiveAmount: result.taxExclusiveAmount,
        taxAmount: result.taxAmount,
        taxInclusiveAmount: result.taxInclusiveAmount
      }
    });
  }
}

async function writeImportData(tx: any, input: {
  projectId: string;
  sourceVersionId: string;
  targetVersionId: string;
  importMode: ImportMode;
  data: ParsedV60ImportData;
}) {
  if (input.importMode === 'overwrite_current') {
    await tx.revenueLine.deleteMany({ where: { projectVersionId: input.targetVersionId } });
    await tx.costLine.deleteMany({ where: { projectVersionId: input.targetVersionId } });
    await tx.taxParameter.deleteMany({ where: { projectVersionId: input.targetVersionId } });
    const projectUpdate = overviewUpdate(input.data);
    if (Object.keys(projectUpdate).length) await tx.project.update({ where: { id: input.projectId }, data: projectUpdate });
  }

  const versionOverview = fieldMap(input.data.overview);
  const control = fieldMap(input.data.controlCenter);
  const excelVersionName = versionOverview.get('当前版本') || control.get('当前版本');
  if (excelVersionName && input.importMode === 'overwrite_current') {
    await tx.projectVersion.update({ where: { id: input.targetVersionId }, data: { name: excelVersionName } });
  }

  for (const row of input.data.revenues) {
    const product = await ensureProduct(tx, input.targetVersionId, row);
    const result = calculateRevenueLine(row.saleableArea, row.salePrice, row.taxRate);
    await tx.revenueLine.create({
      data: {
        projectVersionId: input.targetVersionId,
        productTypeId: product.id,
        saleableArea: row.saleableArea,
        salePrice: row.salePrice,
        taxRate: row.taxRate,
        taxInclusiveRevenue: result.taxInclusiveRevenue,
        taxExclusiveRevenue: result.taxExclusiveRevenue,
        taxAmount: result.taxAmount,
        remark: row.remark || 'Excel确认导入'
      }
    });
  }

  const costCodes = Array.from(new Set(input.data.costs.map((row) => row.costCode).filter(Boolean)));
  const subjects = await tx.costSubject.findMany({ where: { code: { in: costCodes } } }) as CostSubjectLite[];
  const subjectByCode = new Map<string, CostSubjectLite>(subjects.map((subject) => [subject.code, subject]));
  const missingCostCodes = costCodes.filter((code) => !subjectByCode.has(code));
  if (missingCostCodes.length) throw new Error(`EXCEL_IMPORT_HAS_BLOCKING_ERRORS: 成本编码不存在：${missingCostCodes.slice(0, 8).join('、')}`);

  for (const [index, row] of input.data.costs.entries()) {
    const subject = subjectByCode.get(row.costCode);
    if (!subject) continue;
    const manualQuantity = row.manualQuantity;
    const excelImportedQuantity = row.excelImportedQuantity ?? row.quantity;
    const quantityState = costLineQuantityPatch({
      measureValue: row.quantity,
      coefficient: 1,
      quantity: row.quantity,
      manualQuantity,
      excelImportedQuantity,
      taxInclusiveUnitPrice: row.taxInclusiveUnitPrice
    });
    const finalQuantity = Number(quantityState.quantity);
    const result = calculateCostLine({
      quantity: finalQuantity,
      taxRate: row.taxRate,
      taxInclusiveUnitPrice: row.taxInclusiveUnitPrice
    });
    await tx.costLine.create({
      data: {
        projectVersionId: input.targetVersionId,
        costSubjectId: subject.id,
        productTypeId: null,
        detailName: row.detailName || subject.name,
        regionOrProductType: row.regionOrProductType || '项目整体共用',
        professionalGroup: row.professionalGroup || row.sheetName.replace('明细表', ''),
        measureBasis: row.measureBasis,
        measureValue: row.quantity,
        coefficient: 1,
        manualQuantity,
        excelImportedQuantity,
        quantityOverride: true,
        quantity: finalQuantity,
        quantitySource: quantityState.quantitySource,
        quantityStatus: quantityState.quantityStatus,
        quantityFormula: quantityState.quantityFormula,
        unit: row.unit,
        taxExclusiveUnitPrice: result.taxExclusiveUnitPrice,
        taxInclusiveUnitPrice: result.taxInclusiveUnitPrice,
        taxRate: row.taxRate,
        taxExclusiveAmount: result.taxExclusiveAmount,
        taxAmount: result.taxAmount,
        taxInclusiveAmount: result.taxInclusiveAmount,
        unitPriceSourceType: 'excel_imported',
        pricingUnit: row.unit ? `元/${row.unit}` : null,
        amountStatus: quantityState.amountStatus,
        allocationMethod: '按可售面积占比',
        isDirectAssigned: false,
        description: subject.fullPath || row.detailName || subject.name,
        remark: row.remark || 'Excel确认导入',
        sortOrder: Number(String(row.costCode).replace(/\D/g, '').slice(0, 8)) || index + 1
      }
    });
  }

  for (const allocation of input.data.allocations) {
    if (!allocation.costCode && !allocation.detailName) continue;
    await tx.costLine.updateMany({
      where: {
        projectVersionId: input.targetVersionId,
        costSubject: allocation.costCode ? { code: allocation.costCode } : undefined,
        detailName: allocation.detailName || undefined
      },
      data: {
        allocationMethod: allocation.allocationMethod || undefined,
        regionOrProductType: allocation.productTypeName || undefined,
        remark: allocation.remark || undefined
      }
    });
  }

  await tx.taxParameter.upsert({
    where: { projectVersionId: input.targetVersionId },
    update: {
      vatMethod: String(taxValue(input.data.taxes, '增值税计税方式', '一般计税')),
      vatRate: Number(taxValue(input.data.taxes, '增值税率', 0.09)),
      urbanMaintenanceTaxRate: Number(taxValue(input.data.taxes, '城建税率', 0.07)),
      educationSurchargeRate: Number(taxValue(input.data.taxes, '教育费附加率', 0.03)),
      localEducationSurchargeRate: Number(taxValue(input.data.taxes, '地方教育附加率', 0.02)),
      incomeTaxRate: Number(taxValue(input.data.taxes, '企业所得税率', 0.25)),
      incomeTaxMode: String(taxValue(input.data.taxes, '所得税测算模式', '项目口径测算')),
      landVatPrepayRate: Number(taxValue(input.data.landVat, '土地增值税预征率', 0.02)),
      landDeductibleAmount: toNumber(taxValue(input.data.landVat, '可扣除土地成本', 0)),
      costAdditionRate: Number(taxValue(input.data.landVat, '成本加计扣除比例', 0.2)),
      landVatClearanceMode: String(taxValue(input.data.landVat, '清算模式', '预缴+清算测算'))
    },
    create: {
      projectVersionId: input.targetVersionId,
      vatMethod: String(taxValue(input.data.taxes, '增值税计税方式', '一般计税')),
      vatRate: Number(taxValue(input.data.taxes, '增值税率', 0.09)),
      urbanMaintenanceTaxRate: Number(taxValue(input.data.taxes, '城建税率', 0.07)),
      educationSurchargeRate: Number(taxValue(input.data.taxes, '教育费附加率', 0.03)),
      localEducationSurchargeRate: Number(taxValue(input.data.taxes, '地方教育附加率', 0.02)),
      incomeTaxRate: Number(taxValue(input.data.taxes, '企业所得税率', 0.25)),
      incomeTaxMode: String(taxValue(input.data.taxes, '所得税测算模式', '项目口径测算')),
      landVatPrepayRate: Number(taxValue(input.data.landVat, '土地增值税预征率', 0.02)),
      landDeductibleAmount: toNumber(taxValue(input.data.landVat, '可扣除土地成本', 0)),
      costAdditionRate: Number(taxValue(input.data.landVat, '成本加计扣除比例', 0.2)),
      landVatClearanceMode: String(taxValue(input.data.landVat, '清算模式', '预缴+清算测算'))
    }
  });

  await recalculateVersion(tx, input.targetVersionId);
}

export async function POST(request: Request, { params }: { params: { id: string; versionId: string } }) {
  let body: { importId?: string; importMode?: string; confirmWarnings?: boolean; newVersionName?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('EXCEL_IMPORT_MODE_INVALID', '请求体不是有效 JSON。');
  }

  const importMode = body.importMode as ImportMode;
  if (importMode !== 'overwrite_current' && importMode !== 'create_version') return jsonError('EXCEL_IMPORT_MODE_INVALID', '导入模式无效。');
  if (!body.importId) return jsonError('EXCEL_IMPORT_PREVIEW_NOT_FOUND', '导入预览不存在。', 404);

  const stored = getExcelImportPreview(body.importId);
  if (!stored) return jsonError('EXCEL_IMPORT_PREVIEW_EXPIRED', '导入预览不存在或已过期，请重新上传预览。', 404);
  if (stored.projectId !== params.id) return jsonError('EXCEL_IMPORT_PROJECT_MISMATCH', '预览结果与当前项目不一致。');
  if (stored.versionId !== params.versionId) return jsonError('EXCEL_IMPORT_VERSION_MISMATCH', '预览结果与当前版本不一致。');
  if (stored.preview.template.templateVersion !== EXCEL_TEMPLATE_VERSION) return jsonError('EXCEL_TEMPLATE_UNSUPPORTED', '当前仅支持 V60 标准模板。');
  if (stored.preview.summary.errorCount > 0) return jsonError('EXCEL_IMPORT_HAS_BLOCKING_ERRORS', '预览结果存在阻断问题，不能确认导入。');
  if (stored.preview.summary.warningCount > 0 && body.confirmWarnings !== true) {
    return jsonError('EXCEL_IMPORT_WARNING_NOT_CONFIRMED', '存在 warning 时必须先确认警告。');
  }

  const project = await prisma.project.findUnique({ where: { id: params.id }, include: { versions: { where: { id: params.versionId } } } });
  const currentVersion = project?.versions[0];
  if (!project || !currentVersion) return jsonError('EXCEL_IMPORT_PREVIEW_NOT_FOUND', '项目或版本不存在。', 404);
  if (projectLooksArchived(project)) return jsonError('EXCEL_IMPORT_PROJECT_ARCHIVED', '当前项目已归档，禁止导入。');
  if (importMode === 'overwrite_current' && (isVersionLocked(currentVersion) || currentVersion.isLocked)) return jsonError('VERSION_LOCKED', VERSION_LOCKED_MESSAGE);

  let data: ParsedV60ImportData;
  try {
    data = await parseV60WorkbookImportData(stored.buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : '缓存的 Excel 预览数据无法重新解析。';
    return jsonError('EXCEL_IMPORT_PREVIEW_EXPIRED', message, 400);
  }
  const excelVersionName = fieldMap(data.overview).get('当前版本') || fieldMap(data.controlCenter).get('当前版本');
  if (importMode === 'create_version' && !toText(body.newVersionName || excelVersionName)) {
    return jsonError('EXCEL_IMPORT_NEW_VERSION_NAME_REQUIRED', '新建版本导入需要版本名称。');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let targetVersionId = params.versionId;
      if (importMode === 'create_version') {
        const created = await tx.projectVersion.create({
          data: {
            projectId: params.id,
            name: toText(body.newVersionName || excelVersionName),
            stage: currentVersion.stage || defaultVersionStage,
            status: 'draft'
          }
        });
        targetVersionId = created.id;
      }

      const targetVersion = importMode === 'overwrite_current'
        ? currentVersion
        : await tx.projectVersion.findFirst({ where: { id: targetVersionId, projectId: params.id } });
      if (!targetVersion || isVersionLocked(targetVersion) || targetVersion.isLocked) {
        throw new Error(`VERSION_LOCKED: ${VERSION_LOCKED_MESSAGE}`);
      }

      await writeImportData(tx, {
        projectId: params.id,
        sourceVersionId: params.versionId,
        targetVersionId,
        importMode,
        data
      });

      return { targetVersionId };
    });

    const importedModules = [
      importedModule('projectOverview', data.overview.length),
      importedModule('controlCenter', data.controlCenter.length),
      importedModule('incomeDetails', data.revenues.length),
      importedModule('costDetails', data.costs.length),
      importedModule('costAllocation', data.allocations.length),
      importedModule('landVat', data.landVat.length),
      importedModule('taxDetails', data.taxes.length)
    ];
    const importedRows = importedModules.reduce((sum, item) => sum + item.rowCount, 0);

    return NextResponse.json({
      success: true,
      data: {
        importId: stored.importId,
        projectId: params.id,
        versionId: params.versionId,
        targetVersionId: result.targetVersionId,
        importMode,
        importedModules,
        recalculationStatus: 'success',
        resultSummary: {
          errorCount: 0,
          warningCount: stored.preview.summary.warningCount,
          importedRows
        }
      },
      message: '导入成功'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '确认导入失败。';
    if (message.startsWith('EXCEL_IMPORT_HAS_BLOCKING_ERRORS:')) {
      return jsonError('EXCEL_IMPORT_HAS_BLOCKING_ERRORS', message.replace('EXCEL_IMPORT_HAS_BLOCKING_ERRORS:', '').trim());
    }
    if (message.startsWith('VERSION_LOCKED:')) {
      return jsonError('VERSION_LOCKED', message.replace('VERSION_LOCKED:', '').trim());
    }
    if (message.includes('calculate') || message.includes('recalculate')) {
      return jsonError('EXCEL_IMPORT_RECALCULATION_FAILED', message, 500);
    }
    return jsonError('EXCEL_IMPORT_TRANSACTION_FAILED', message, 500);
  }
}

import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isVersionLocked } from '@/lib/project-version';

type Tx = Prisma.TransactionClient;

const VERSION_LOCKED_MESSAGES = {
  add: '当前测算版本已锁定，不能新增业态。如需新增业态，请复制新版本后操作。',
  disable: '当前测算版本已锁定，不能调整业态。如需修改，请复制新版本后操作。',
  restore: '当前测算版本已锁定，不能恢复业态。如需恢复，请复制新版本后操作。'
};

const BUSINESS_DATA_BLOCKED_MESSAGE =
  '该业态已存在收入、成本、分摊、税务或利润数据，不能直接停用。请复制新测算版本后调整，或清空相关数据后再停用。';

const OVERVIEW_WARNING =
  '该业态已有项目概况指标。停用后相关指标会保留，但该业态将不参与收入、成本、分摊、税务和利润测算。';

const EMPTY_WARNING =
  '该业态暂无收入、成本、分摊、税务和利润数据。停用后将从默认页面隐藏，并不参与后续测算。历史启用记录会保留。';

function n(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function isParkingName(name?: string | null) {
  return /车位|车库|停车|人防车位|非人防|充电桩车位|立体车位/.test(String(name || ''));
}

function normalizeCategory(input?: string | null) {
  const text = String(input || '').toLowerCase();
  if (/住宅|residential|洋房|高层|叠拼|别墅/.test(text)) return 'residential';
  if (/商业|commercial|办公|公寓|酒店|商铺/.test(text)) return 'commercial';
  if (/车位|地库|地下|parking|basement/.test(text)) return 'basement_parking';
  if (/配套|support/.test(text)) return 'supporting';
  return 'special';
}

function presetKeyFromProduct(product: { productTypeKey?: string | null; name: string }) {
  return product.productTypeKey || product.name;
}

function getStatus(product: { isActive?: boolean | null }) {
  return product.isActive === false ? 'disabled' : 'enabled';
}

function hasOverviewData(product: {
  buildingArea?: unknown;
  saleableArea?: unknown;
  capacityArea?: unknown;
  nonSaleableArea?: unknown;
  salePrice?: unknown;
  parkingCount?: unknown;
}) {
  return [
    product.buildingArea,
    product.saleableArea,
    product.capacityArea,
    product.nonSaleableArea,
    product.salePrice,
    product.parkingCount
  ].some((value) => n(value) > 0);
}

function error(code: string, message: string, status = 400) {
  return { ok: false as const, status, body: { success: false, error: { code, message } } };
}

async function getVersion(tx: Tx, versionId: string) {
  return tx.projectVersion.findUnique({ where: { id: versionId } });
}

async function createOperationLog(
  tx: Tx,
  input: {
    projectId: string;
    versionId: string;
    productTypeId: string;
    operationType: 'add' | 'disable' | 'restore';
    beforeStatus: string | null;
    afterStatus: string;
    operationReason?: string | null;
    blockedReason?: string | null;
    remark?: string | null;
  }
) {
  await tx.$executeRaw`
    CREATE TABLE IF NOT EXISTS "OperationLog" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT,
      "projectVersionId" TEXT,
      "module" TEXT,
      "action" TEXT NOT NULL,
      "targetType" TEXT,
      "targetId" TEXT,
      "beforeData" TEXT,
      "afterData" TEXT,
      "operatorName" TEXT,
      "remark" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await tx.$executeRaw`
    INSERT INTO "OperationLog" ("id", "projectId", "projectVersionId", "module", "action", "targetType", "targetId", "beforeData", "afterData", "operatorName", "remark")
    VALUES (${randomUUID()}, ${input.projectId}, ${input.versionId}, ${'product_type'}, ${input.operationType}, ${'ProductType'}, ${input.productTypeId}, ${JSON.stringify({ status: input.beforeStatus })}, ${JSON.stringify({ status: input.afterStatus })}, ${'system'}, ${JSON.stringify({ operationReason: input.operationReason || null, blockedReason: input.blockedReason || null, remark: input.remark || null })})
  `;
}

export async function getProductTypeImpact(versionId: string, productTypeId: string, tx: Tx = prisma) {
  const product = await tx.productType.findFirst({
    where: { id: productTypeId, projectVersionId: versionId },
    include: { projectVersion: true }
  });

  if (!product) return null;

  const [incomeCount, costCount, allocationCount, excelCount, metricCount] = await Promise.all([
    tx.revenueLine.count({ where: { projectVersionId: versionId, productTypeId } }),
    tx.costLine.count({ where: { projectVersionId: versionId, productTypeId } }),
    tx.costLine.count({ where: { projectVersionId: versionId, productTypeId, allocationMethod: { not: null } } }),
    tx.costLine.count({ where: { projectVersionId: versionId, productTypeId, importBatchId: { not: null } } }),
    tx.projectMetricValue.count({ where: { projectVersionId: versionId, productTypeId } })
  ]);

  const overviewData = hasOverviewData(product) || metricCount > 0;
  const locked = isVersionLocked(product.projectVersion);
  const hasBusinessData = incomeCount > 0 || costCount > 0 || allocationCount > 0 || excelCount > 0;

  let canDisable = true;
  let blockedReason: string | null = null;
  let warningMessage: string | null = overviewData ? OVERVIEW_WARNING : EMPTY_WARNING;

  if (locked) {
    canDisable = false;
    blockedReason = VERSION_LOCKED_MESSAGES.disable;
    warningMessage = null;
  } else if (hasBusinessData) {
    canDisable = false;
    blockedReason = BUSINESS_DATA_BLOCKED_MESSAGE;
    warningMessage = null;
  }

  return {
    productTypeId,
    versionId,
    hasOverviewData: overviewData,
    hasIncomeData: incomeCount > 0,
    hasCostData: costCount > 0,
    hasAllocationData: allocationCount > 0,
    hasTaxData: false,
    hasProfitData: false,
    hasExcelImportData: excelCount > 0,
    isVersionLocked: locked,
    canDisable,
    blockedReason,
    warningMessage
  };
}

export async function listVersionProductTypes(versionId: string, includeDisabled = false) {
  const version = await prisma.projectVersion.findUnique({
    where: { id: versionId },
    include: { products: { where: includeDisabled ? undefined : { isActive: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] } }
  });
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);

  const rows = await Promise.all(
    version.products.map(async (product, index) => {
      const impact = await getProductTypeImpact(versionId, product.id);
      const status = getStatus(product);
      const category = normalizeCategory(product.productCategory || product.category || product.remark || product.name);
      return {
        productTypeId: product.id,
        projectId: version.projectId,
        versionId,
        productTypeCode: presetKeyFromProduct(product),
        productTypeName: product.name,
        productCategory: category,
        isSaleable: product.isSaleable,
        isCostObject: true,
        isTaxClearanceObject: Boolean(product.taxLiquidationObject || product.clearingObject),
        status,
        isEnabled: status === 'enabled',
        isDisabled: status === 'disabled',
        hasOverviewData: impact?.hasOverviewData ?? false,
        hasIncomeData: impact?.hasIncomeData ?? false,
        hasCostData: impact?.hasCostData ?? false,
        hasAllocationData: impact?.hasAllocationData ?? false,
        hasTaxData: impact?.hasTaxData ?? false,
        hasProfitData: impact?.hasProfitData ?? false,
        hasExcelImportData: impact?.hasExcelImportData ?? false,
        canAdd: !isVersionLocked(version),
        canDisable: status === 'enabled' && Boolean(impact?.canDisable),
        canRestore: status === 'disabled' && !isVersionLocked(version),
        blockedReason: impact?.blockedReason ?? null,
        warningMessage: impact?.warningMessage ?? null,
        sortOrder: index + 1
      };
    })
  );

  return { ok: true as const, status: 200, body: { success: true, data: rows } };
}

export async function addVersionProductType(
  versionId: string,
  input: { productTypeCode: string; productTypeName?: string; productCategory?: string; operationReason?: string | null }
) {
  return prisma.$transaction(async (tx) => {
    const version = await getVersion(tx, versionId);
    if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
    if (isVersionLocked(version)) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGES.add, 423);

    const code = String(input.productTypeCode || '').trim();
    const requestedName = String(input.productTypeName || '').trim();
    if (!code && !requestedName) return error('VALIDATION_FAILED', '业态编码或业态名称不能为空。');

    const preset = code
      ? await tx.productTypePreset.findFirst({ where: { OR: [{ key: code }, { name: code }], enabled: true } })
      : null;
    const name = requestedName || preset?.name || code;
    const existing = await tx.productType.findFirst({ where: { projectVersionId: versionId, name } });
    if (existing?.isActive) return error('PRODUCT_TYPE_ALREADY_EXISTS', '该业态已存在。', 409);
    if (existing && !existing.isActive) return error('PRODUCT_TYPE_DISABLED', '该业态已停用，请使用恢复启用。', 409);

    const category = normalizeCategory(input.productCategory || preset?.category || name);
    const product = await tx.productType.create({
      data: {
        projectVersionId: versionId,
        name,
        productTypeKey: preset?.key || code || name,
        category: preset?.category || input.productCategory || null,
        productCategory: category,
        isSaleable: preset?.isSaleable ?? !isParkingName(name),
        participateAllocation: preset?.participateAllocation ?? !isParkingName(name),
        allocationWeight: preset?.participateAllocation === false || isParkingName(name) ? 0 : 1,
        isActive: true,
        disabledAt: null,
        remark: preset ? `模板业态｜${preset.category}` : '项目新增业态'
      }
    });

    if (product.isSaleable) {
      await tx.revenueLine.create({
        data: {
          projectVersionId: versionId,
          productTypeId: product.id,
          saleableArea: 0,
          salePrice: 0,
          taxInclusiveRevenue: 0,
          taxExclusiveRevenue: 0,
          taxAmount: 0,
          remark: '新增业态初始化收入结构'
        }
      });
    }

    await createOperationLog(tx, {
      projectId: version.projectId,
      versionId,
      productTypeId: product.id,
      operationType: 'add',
      beforeStatus: null,
      afterStatus: 'enabled',
      operationReason: input.operationReason || null
    });

    return { ok: true as const, status: 200, body: { success: true, data: { productTypeId: product.id, status: 'enabled' } } };
  });
}

export async function disableVersionProductType(versionId: string, productTypeId: string, operationReason?: string | null) {
  return prisma.$transaction(async (tx) => {
    const version = await getVersion(tx, versionId);
    if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
    if (isVersionLocked(version)) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGES.disable, 423);

    const product = await tx.productType.findFirst({ where: { id: productTypeId, projectVersionId: versionId } });
    if (!product) return error('PRODUCT_TYPE_NOT_FOUND', '业态不存在。', 404);

    const impact = await getProductTypeImpact(versionId, productTypeId, tx);
    if (!impact?.canDisable) {
      await createOperationLog(tx, {
        projectId: version.projectId,
        versionId,
        productTypeId,
        operationType: 'disable',
        beforeStatus: getStatus(product),
        afterStatus: getStatus(product),
        operationReason: operationReason || null,
        blockedReason: impact?.blockedReason || null
      });
      return error('PRODUCT_TYPE_CANNOT_DISABLE', impact?.blockedReason || '该业态不能停用。', 409);
    }

    await tx.productType.update({
      where: { id: productTypeId },
      data: { isActive: false, disabledAt: new Date() }
    });

    await createOperationLog(tx, {
      projectId: version.projectId,
      versionId,
      productTypeId,
      operationType: 'disable',
      beforeStatus: getStatus(product),
      afterStatus: 'disabled',
      operationReason: operationReason || null,
      remark: impact.warningMessage
    });

    return { ok: true as const, status: 200, body: { success: true, data: { productTypeId, status: 'disabled', warningMessage: impact.warningMessage } } };
  });
}

export async function restoreVersionProductType(versionId: string, productTypeId: string, operationReason?: string | null) {
  return prisma.$transaction(async (tx) => {
    const version = await getVersion(tx, versionId);
    if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
    if (isVersionLocked(version)) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGES.restore, 423);

    const product = await tx.productType.findFirst({ where: { id: productTypeId, projectVersionId: versionId } });
    if (!product) return error('PRODUCT_TYPE_NOT_FOUND', '业态不存在。', 404);
    if (product.isActive) return error('VALIDATION_FAILED', '该业态当前已启用，无需恢复。');

    await tx.productType.update({ where: { id: productTypeId }, data: { isActive: true, disabledAt: null } });
    await createOperationLog(tx, {
      projectId: version.projectId,
      versionId,
      productTypeId,
      operationType: 'restore',
      beforeStatus: 'disabled',
      afterStatus: 'enabled',
      operationReason: operationReason || null
    });

    return { ok: true as const, status: 200, body: { success: true, data: { productTypeId, status: 'enabled' } } };
  });
}

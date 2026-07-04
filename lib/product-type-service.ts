import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isVersionLocked, VERSION_LOCKED_MESSAGE } from '@/lib/project-version';

type Tx = Prisma.TransactionClient;

const VERSION_LOCKED_MESSAGES = {
  add: VERSION_LOCKED_MESSAGE,
  disable: VERSION_LOCKED_MESSAGE,
  restore: VERSION_LOCKED_MESSAGE
};

const BUSINESS_DATA_BLOCKED_MESSAGE =
  '该对象已存在概况、收入、成本、分摊、税务、利润或 Excel 导入数据，不能直接停用。请复制新测算版本后调整，或清空相关数据后再停用。';

const OVERVIEW_WARNING =
  '该对象已有项目概况指标。停用后相关指标会保留，但该对象将不参与收入、成本、分摊、税务和利润测算。';

const EMPTY_WARNING =
  '该对象暂无概况、收入、成本、分摊、税务、利润和 Excel 导入数据。停用后将从默认页面隐藏，并不参与后续测算。历史启用记录会保留。';

function n(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function isParkingName(name?: string | null) {
  return /车位|产权车位|使用权车位|人防车位|非人防车位|充电桩车位|立体车位/.test(String(name || ''));
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

export const displayCostBearingTypes = [
  'development_cost',
  'sales_expense_reserved',
  'formal_cost_transfer_reserved',
  'manual'
] as const;

export const objectTypes = [
  'saleable_object',
  'cost_object',
  'basement_cost_object',
  'parking_income_object',
  'supporting_cost_object',
  'marketing_display_object',
  'construction_standard_object',
  'tax_object'
] as const;

export type ObjectType = typeof objectTypes[number];

function includesAny(input: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(input));
}

export function classifyProductObject(product: {
  name?: string | null;
  category?: string | null;
  productCategory?: string | null;
  saleAttribute?: string | null;
  costObject?: string | null;
  clearingObject?: string | null;
  taxLiquidationObject?: string | null;
  isSaleable?: boolean | null;
  participateAllocation?: boolean | null;
}) {
  const input = [
    product.name,
    product.category,
    product.productCategory,
    product.saleAttribute,
    product.costObject,
    product.clearingObject,
    product.taxLiquidationObject
  ].filter(Boolean).join(' ');

  const isMarketingDisplayObject = includesAny(input, [/样板间/, /售楼处/, /示范区/, /看房通道/, /临时展示/]);
  const isParkingObject = includesAny(input, [/车位/, /产权车位/, /使用权车位/, /非人防车位/, /人防车位/, /充电桩车位/, /立体车位/]);
  const isBasementObject = !isParkingObject && includesAny(input, [/地下室/, /地下车库/, /地库/, /人防地下室/, /非人防地下室/, /地下公共/, /设备用房/]);
  const isSupportingObject = includesAny(input, [/物业用房/, /社区用房/, /会所/, /架空层/, /幼儿园/, /配建/, /移交/, /配套/, /设备房/]);
  const isConstructionStandardObject = includesAny(input, [/建造标准/, /专项配置/, /装配式/, /精装修/, /采暖/, /充电桩/, /古建/]);
  const isTaxObject = Boolean(product.taxLiquidationObject || product.clearingObject || includesAny(input, [/税务/, /清算/, /土增税/, /所得税/]));

  let objectType: ObjectType = 'saleable_object';
  if (isMarketingDisplayObject) objectType = 'marketing_display_object';
  else if (isParkingObject) objectType = 'parking_income_object';
  else if (isBasementObject) objectType = 'basement_cost_object';
  else if (isSupportingObject) objectType = 'supporting_cost_object';
  else if (isConstructionStandardObject) objectType = 'construction_standard_object';
  else if (isTaxObject && product.isSaleable === false) objectType = 'tax_object';
  else if (product.isSaleable === false) objectType = 'cost_object';

  const isSaleableObject = objectType === 'saleable_object' || objectType === 'parking_income_object';
  const isOperatingObject = isSaleableObject;
  const isIncomeObject = isSaleableObject;
  const isCostObject = objectType !== 'parking_income_object' || product.participateAllocation === true;
  const isAllocationObject = product.participateAllocation !== false && objectType !== 'marketing_display_object';
  const isProfitObject = isSaleableObject;

  return {
    objectType,
    objectCategory: normalizeCategory(product.productCategory || product.category || product.name),
    isSaleableObject,
    isOperatingObject,
    isIncomeObject,
    isCostObject,
    isAllocationObject,
    isProfitObject,
    isTaxObject,
    isParkingObject,
    isBasementObject,
    isSupportingObject,
    isMarketingDisplayObject,
    displayCostBearingType: isMarketingDisplayObject ? 'development_cost' : null
  };
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

function hasRealIncomeData(row: {
  saleableArea?: unknown;
  salePrice?: unknown;
  taxInclusiveRevenue?: unknown;
  taxExclusiveRevenue?: unknown;
  taxAmount?: unknown;
  remark?: string | null;
}) {
  const systemRemarks = new Set([
    '新增业态初始化收入结构',
    '可售物业按面积×单价测算',
    '车位收入按个数×单价测算；saleableArea 字段暂存车位个数',
    '按普通业态面积自动同步',
    '按业态指标自动同步'
  ]);
  const remark = String(row.remark || '').trim();
  return [
    row.taxInclusiveRevenue,
    row.taxExclusiveRevenue,
    row.taxAmount,
    row.saleableArea,
    row.salePrice
  ].some((value) => n(value) > 0) || (remark.length > 0 && !systemRemarks.has(remark));
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
    VALUES (${randomUUID()}, ${input.projectId}, ${input.versionId}, ${'product_type'}, ${`${input.operationType}_product_type`}, ${'ProductType'}, ${input.productTypeId}, ${JSON.stringify({ status: input.beforeStatus })}, ${JSON.stringify({ status: input.afterStatus })}, ${'system'}, ${JSON.stringify({ operationReason: input.operationReason || null, blockedReason: input.blockedReason || null, remark: input.remark || null })})
  `;
}

export async function getProductTypeImpact(versionId: string, productTypeId: string, tx: Tx = prisma) {
  const product = await tx.productType.findFirst({
    where: { id: productTypeId, projectVersionId: versionId },
    include: { projectVersion: true }
  });

  if (!product) return null;

  const [incomeRows, costCount, allocationCount, excelCount, metricCount] = await Promise.all([
    tx.revenueLine.findMany({ where: { projectVersionId: versionId, productTypeId } }),
    tx.costLine.count({ where: { projectVersionId: versionId, productTypeId } }),
    tx.costLine.count({ where: { projectVersionId: versionId, productTypeId, allocationMethod: { not: null } } }),
    tx.costLine.count({ where: { projectVersionId: versionId, productTypeId, importBatchId: { not: null } } }),
    tx.projectMetricValue.count({ where: { projectVersionId: versionId, productTypeId } })
  ]);

  const overviewData = hasOverviewData(product) || metricCount > 0;
  const locked = isVersionLocked(product.projectVersion) || product.projectVersion.isLocked;
  const incomeData = incomeRows.some(hasRealIncomeData);
  const taxData = false;
  const profitData = false;
  const hasBusinessData = overviewData || incomeData || costCount > 0 || allocationCount > 0 || taxData || profitData || excelCount > 0;

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
    hasIncomeData: incomeData,
    hasCostData: costCount > 0,
    hasAllocationData: allocationCount > 0,
    hasTaxData: taxData,
    hasProfitData: profitData,
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
      const object = classifyProductObject(product);
      return {
        productTypeId: product.id,
        objectId: product.id,
        projectId: version.projectId,
        versionId,
        productTypeCode: presetKeyFromProduct(product),
        objectCode: presetKeyFromProduct(product),
        productTypeName: product.name,
        objectName: product.name,
        productCategory: category,
        objectCategory: object.objectCategory,
        objectType: object.objectType,
        isSaleable: product.isSaleable,
        isSaleableObject: object.isSaleableObject,
        isOperatingObject: object.isOperatingObject,
        isIncomeObject: object.isIncomeObject,
        isCostObject: object.isCostObject,
        isAllocationObject: object.isAllocationObject,
        isProfitObject: object.isProfitObject,
        isTaxObject: object.isTaxObject,
        isParkingObject: object.isParkingObject,
        isBasementObject: object.isBasementObject,
        isSupportingObject: object.isSupportingObject,
        isMarketingDisplayObject: object.isMarketingDisplayObject,
        displayCostBearingType: object.displayCostBearingType,
        isTaxClearanceObject: Boolean(product.taxLiquidationObject || product.clearingObject),
        status,
        objectStatus: status,
        isEnabled: status === 'enabled',
        isDisabled: status === 'disabled',
        hasOverviewData: impact?.hasOverviewData ?? false,
        hasIncomeData: impact?.hasIncomeData ?? false,
        hasCostData: impact?.hasCostData ?? false,
        hasAllocationData: impact?.hasAllocationData ?? false,
        hasTaxData: impact?.hasTaxData ?? false,
        hasProfitData: impact?.hasProfitData ?? false,
        hasExcelImportData: impact?.hasExcelImportData ?? false,
        canAdd: !isVersionLocked(version) && !version.isLocked,
        canEnable: status === 'disabled' && !isVersionLocked(version) && !version.isLocked,
        canDisable: status === 'enabled' && !isVersionLocked(version) && !version.isLocked && Boolean(impact?.canDisable),
        canRestore: status === 'disabled' && !isVersionLocked(version) && !version.isLocked,
        blockedReason: impact?.blockedReason ?? null,
        warningMessage: impact?.warningMessage ?? null,
        sortOrder: index + 1,
        createdAt: product.createdAt?.toISOString() || null,
        updatedAt: product.updatedAt?.toISOString() || null
      };
    })
  );

  return { ok: true as const, status: 200, body: { success: true, data: rows } };
}

export async function addVersionProductType(
  versionId: string,
  input: { productTypeCode: string; productTypeName?: string; productCategory?: string; objectType?: string; operationReason?: string | null }
) {
  return prisma.$transaction(async (tx) => {
    const version = await getVersion(tx, versionId);
    if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
    if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGES.add, 423);

    const code = String(input.productTypeCode || '').trim();
    const requestedName = String(input.productTypeName || '').trim();
    if (!code && !requestedName) return error('VALIDATION_FAILED', '对象编码或对象名称不能为空。');

    const preset = code
      ? await tx.productTypePreset.findFirst({ where: { OR: [{ key: code }, { name: code }], enabled: true } })
      : null;
    const name = requestedName || preset?.name || code;
    const existing = await tx.productType.findFirst({ where: { projectVersionId: versionId, name } });
    if (existing?.isActive) return error('OBJECT_ALREADY_ENABLED', '该对象已启用。', 409);
    if (existing && !existing.isActive) return error('OBJECT_ALREADY_DISABLED', '该对象已停用，请使用恢复启用。', 409);

    const category = normalizeCategory(input.productCategory || preset?.category || name);
    const requestedObjectType = objectTypes.includes(input.objectType as ObjectType) ? input.objectType as ObjectType : null;
    const inferredObject = requestedObjectType ? null : classifyProductObject({
      name,
      category: preset?.category || input.productCategory || null,
      productCategory: category,
      isSaleable: preset?.isSaleable ?? true,
      participateAllocation: preset?.participateAllocation ?? true
    });
    const isSaleable = requestedObjectType
      ? requestedObjectType === 'saleable_object' || requestedObjectType === 'parking_income_object'
      : preset?.isSaleable ?? inferredObject?.isSaleableObject ?? true;
    const participateAllocation = requestedObjectType
      ? !['parking_income_object', 'marketing_display_object', 'tax_object'].includes(requestedObjectType)
      : preset?.participateAllocation ?? inferredObject?.isAllocationObject ?? !isParkingName(name);
    const product = await tx.productType.create({
      data: {
        projectVersionId: versionId,
        name,
        productTypeKey: preset?.key || code || name,
        category: preset?.category || input.productCategory || null,
        productCategory: category,
        isSaleable,
        participateAllocation,
        allocationWeight: participateAllocation ? 1 : 0,
        isActive: true,
        disabledAt: null,
        remark: preset ? `模板对象｜${preset.category}` : '项目新增对象'
      }
    });

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
    if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGES.disable, 423);

    const product = await tx.productType.findFirst({ where: { id: productTypeId, projectVersionId: versionId } });
    if (!product) return error('OBJECT_NOT_FOUND', '对象不存在。', 404);
    if (!product.isActive) return error('OBJECT_ALREADY_DISABLED', '该对象已停用。', 409);

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
      return error('OBJECT_DISABLE_BLOCKED', impact?.blockedReason || '该对象不能停用。', 409);
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
    if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGES.restore, 423);

    const product = await tx.productType.findFirst({ where: { id: productTypeId, projectVersionId: versionId } });
    if (!product) return error('OBJECT_NOT_FOUND', '对象不存在。', 404);
    if (product.isActive) return error('OBJECT_ALREADY_ENABLED', '该对象当前已启用，无需恢复。');

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

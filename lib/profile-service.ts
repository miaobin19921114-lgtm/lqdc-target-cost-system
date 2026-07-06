import { prisma } from '@/lib/prisma';
import { writeOperationLog } from '@/lib/operation-log';
import { isVersionLocked, VERSION_LOCKED_MESSAGE } from '@/lib/project-version';
import { getProjectMetricCenter } from '@/lib/metric-center-service';
import {
  addVersionProductType,
  classifyProductObject,
  disableVersionProductType,
  listVersionProductTypes,
  objectTypes,
  restoreVersionProductType
} from '@/lib/product-type-service';
import { overrideCostLineQuantity } from '@/lib/cost-line-quantity-service';
import { costLineQuantityPatch, mapCostLineV101Fields } from '@/lib/cost-line-quantity-fields';

const constructionMetricKeys = [
  'deliveryStandard',
  'facadeStandard',
  'doorWindowStandard',
  'landscapeStandard',
  'garageStandard',
  'intelligentStandard',
  'civilDefenseStandard',
  'prefabStandard',
  'fineDecorationStandard',
  'heatingStandard',
  'ancientBuildingStandard',
  'demoAreaStandard',
  'prefabArea',
  'prefabApplicableProductTypes',
  'fineDecorationScope',
  'fineDecorationArea',
  'fineDecorationApplicableProductTypes',
  'heatingArea',
  'heatingBenefitObject',
  'ancientBuildingObjectType',
  'ancientBuildingArea',
  'chargingPileUnitCost',
  'demoArea'
];

const projectMetricExtraKeys = [
  'mainBuildingBasementArea',
  'nonMainBuildingBasementArea',
  'undergroundGarageArea',
  'equipmentRoomArea',
  'undergroundPublicArea',
  'basementB1Height',
  'basementB2Height',
  'basementOtherAvgHeight',
  'nonCivilDefenseParkingCount',
  'propertyRightParkingCount',
  'useRightParkingCount',
  'mechanicalParkingCount',
  'chargingPileParkingCount',
  'parkingUnitPrice',
  'pedestrianRoadArea',
  'vehicleRoadArea',
  'fireRoadAreaIncluded',
  'boundaryLength',
  'wallLength',
  'entranceCount',
  'projectType',
  'developmentMode',
  'templateSource',
  'isSampleRoomEnabled',
  'sampleRoomCount',
  'sampleRoomArea',
  'sampleRoomHostType',
  'sampleRoomHostProductType',
  'isSampleRoomFutureSaleable',
  'isSampleRoomRestoreRequired',
  'sampleRoomDecorationStandard',
  'sampleRoomCostBearingType',
  'sampleRoomCostTransferReserved',
  'isSalesOfficeEnabled',
  'salesOfficeType',
  'salesOfficeArea',
  'salesOfficeHostType',
  'salesOfficeFutureUse',
  'salesOfficeCostBearingType',
  'salesOfficeTransferReserved',
  'isDemoAreaEnabled',
  'demoArea',
  'demoLandscapeArea',
  'demoRoadArea',
  'demoPackagingArea',
  'demoViewingPathArea',
  'demoCostBearingType',
  'demoTransferReserved'
];

const profileObjectTypes = new Set([
  ...objectTypes,
  'product_type',
  'marketing_display_object',
  'special_config_object'
]);

function ok(data: unknown, status = 200) {
  return { status, body: { success: true as const, data } };
}

function error(code: string, message: string, status = 400) {
  return { status, body: { success: false as const, error: { code, message } } };
}

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function nullableNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) && num !== 0 ? num : null;
}

function bool(value: unknown) {
  return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
}

function text(value: unknown) {
  const result = String(value ?? '').trim();
  return result || null;
}

function list(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  const raw = text(value);
  return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function metricText(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const cleaned = text(value);
  return cleaned;
}

function isTextMetric(value: unknown) {
  return Array.isArray(value) || typeof value === 'string' || typeof value === 'boolean';
}

function parseMetricValue(item?: { value: unknown; remark?: string | null } | null) {
  if (!item) return null;
  if (item.remark) {
    try {
      const parsed = JSON.parse(item.remark);
      return parsed;
    } catch {
      return item.remark;
    }
  }
  return nullableNumber(item.value);
}

function changedFields(beforeData: Record<string, unknown>, afterData: Record<string, unknown>) {
  return Object.keys(afterData).filter((key) => JSON.stringify(beforeData[key] ?? null) !== JSON.stringify(afterData[key] ?? null));
}

function resultData(result: { body: any }) {
  return result.body?.data;
}

async function loadVersion(projectId: string, versionId: string) {
  return prisma.projectVersion.findFirst({ where: { id: versionId, projectId }, include: { project: true } });
}

async function loadMetricMap(projectId: string, versionId: string, keys: string[]) {
  const rows = await prisma.projectMetricValue.findMany({
    where: { projectId, projectVersionId: versionId, scope: 'project', metricKey: { in: keys } }
  });
  return new Map(rows.map((row) => [row.metricKey, row]));
}

async function saveMetrics(tx: typeof prisma, projectId: string, versionId: string, data: Record<string, unknown>, keys: string[], source: string) {
  for (const key of keys) {
    if (!(key in data)) continue;
    const raw = data[key];
    await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: versionId, scope: 'project', metricKey: key } });
    await tx.projectMetricValue.create({
      data: {
        projectId,
        projectVersionId: versionId,
        scope: 'project',
        metricKey: key,
        value: isTextMetric(raw) ? 0 : n(raw),
        remark: isTextMetric(raw) ? metricText(raw) : null,
        source
      }
    });
  }
}

export async function getProfile(projectId: string, versionId: string, includeDisabled = false) {
  const [overview, productObjects, constructionStandards, projectMetrics, quantityIndicators, projectMetricCenter] = await Promise.all([
    getProfileOverview(projectId, versionId),
    getProfileProductObjects(projectId, versionId, includeDisabled),
    getProfileConstructionStandards(projectId, versionId),
    getProfileProjectMetrics(projectId, versionId),
    getProfileQuantityIndicators(projectId, versionId),
    getProjectMetricCenter(projectId, versionId)
  ]);
  if ('error' in overview.body) return overview;
  const dataOr = (result: { body: any }, fallback: unknown) => result.body?.success ? result.body.data : fallback;
  return ok({
    overview: overview.body.data,
    productObjects: dataOr(productObjects, { objects: [] }),
    constructionStandards: dataOr(constructionStandards, {}),
    projectMetrics: dataOr(projectMetrics, {}),
    projectMetricCenter: dataOr(projectMetricCenter, {
      projectTotalMetrics: {},
      productObjectMetrics: [],
      buildingMetrics: [],
      unitPlanMetrics: [],
      basementMetrics: {},
      parkingMetrics: {},
      landscapeRoadMetrics: {},
      supportingSpecialMetrics: {},
      metricValidationSummary: { warnings: [] },
      baseIndicatorMappings: []
    }),
    quantityIndicators: dataOr(quantityIndicators, { indicators: [], summary: { totalIndicators: 0, overriddenCount: 0, lockedCount: 0 } })
  });
}

export async function getProfileOverview(projectId: string, versionId: string) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const metricMap = await loadMetricMap(projectId, versionId, ['projectType', 'developmentMode', 'templateSource']);
  const [productCount, costCount, quantityCount] = await Promise.all([
    prisma.productType.count({ where: { projectVersionId: versionId } }),
    prisma.costLine.count({ where: { projectVersionId: versionId } }),
    prisma.costLine.count({ where: { projectVersionId: versionId, OR: [{ quantity: { gt: 0 } }, { measureValue: { gt: 0 } }] } })
  ]);
  const project = version.project;
  const dataCompleteness = {
    overview: Boolean(project.name),
    productObjects: productCount > 0,
    constructionStandards: constructionMetricKeys.some((key) => metricMap.has(key)) || Boolean(project.residentialFitoutStandard || project.basementQualityStandard),
    projectMetrics: n(project.landArea) > 0 || n(project.totalBuildingArea) > 0 || n(project.parkingCount) > 0,
    quantityIndicators: costCount === 0 ? false : quantityCount > 0
  };
  const missingRequiredSections = Object.entries(dataCompleteness).filter(([, done]) => !done).map(([section]) => section);
  return ok({
    projectId,
    versionId,
    projectName: project.name || null,
    region: [project.city, project.district].filter(Boolean).join('/') || null,
    projectType: parseMetricValue(metricMap.get('projectType')),
    developmentMode: parseMetricValue(metricMap.get('developmentMode')),
    templateSource: parseMetricValue(metricMap.get('templateSource')) || project.sourceTemplateName || project.sourceTemplateType || null,
    versionName: version.name || null,
    versionStatus: version.status || null,
    isLocked: isVersionLocked(version) || version.isLocked,
    lockedAt: null,
    lockedBy: null,
    createdAt: version.createdAt?.toISOString() || null,
    updatedAt: version.updatedAt?.toISOString() || null,
    dataCompleteness,
    missingRequiredSections,
    warningMessages: missingRequiredSections.length ? ['部分分区尚未录入完整数据。'] : [],
    nextRecommendedSection: missingRequiredSections[0] || null
  });
}

export async function saveProfileOverview(projectId: string, versionId: string, body: Record<string, unknown>) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423);

  const before = resultData(await getProfileOverview(projectId, versionId)) as Record<string, unknown>;
  const projectData: Record<string, unknown> = {};
  if ('projectName' in body) projectData.name = text(body.projectName) || version.project.name;
  if ('region' in body) {
    const parts = String(body.region || '').split('/').map((item) => item.trim()).filter(Boolean);
    projectData.city = parts[0] || null;
    projectData.district = parts.slice(1).join('/') || null;
  }
  await prisma.$transaction(async (tx) => {
    if (Object.keys(projectData).length) await tx.project.update({ where: { id: projectId }, data: projectData });
    await saveMetrics(tx as typeof prisma, projectId, versionId, body, ['projectType', 'developmentMode', 'templateSource'], 'profile_overview');
    await writeOperationLog(tx, {
      projectId,
      versionId,
      module: 'profile',
      action: 'update_profile_overview',
      targetType: 'ProjectVersion',
      targetId: versionId,
      beforeData: before,
      afterData: body,
      remark: { section: 'overview', changedFields: changedFields(before, body) }
    });
  });
  return getProfileOverview(projectId, versionId);
}

export async function getProfileProductObjects(projectId: string, versionId: string, includeDisabled = false) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const productResult = await listVersionProductTypes(versionId, includeDisabled);
  if (!productResult.ok) return { status: productResult.status, body: productResult.body };
  const productObjects = (productResult.body as any).data.map((item: any) => {
    const type = item.objectType || classifyProductObject({
      name: item.productTypeName,
      productCategory: item.productCategory,
      isSaleable: item.isSaleable
    }).objectType;
    return {
      objectId: item.productTypeId,
      projectId,
      versionId,
      objectCode: item.productTypeCode,
      objectName: item.productTypeName,
      objectType: type,
      objectCategory: item.objectCategory || item.productCategory || type,
      status: item.status,
      objectStatus: item.objectStatus || item.status,
      isEnabled: item.isEnabled,
      isSaleable: item.isSaleable,
      isSaleableObject: item.isSaleableObject,
      isOperatingObject: item.isOperatingObject,
      isIncomeObject: item.isIncomeObject,
      isCostObject: item.isCostObject,
      isAllocationObject: item.isAllocationObject,
      isTaxObject: item.isTaxObject,
      isParkingObject: item.isParkingObject,
      isBasementObject: item.isBasementObject,
      isSupportingObject: item.isSupportingObject,
      isMarketingDisplayObject: item.isMarketingDisplayObject,
      isProfitObject: item.isProfitObject,
      displayCostBearingType: item.displayCostBearingType,
      transferToSalesExpenseReserved: false,
      transferToFormalCostReserved: false,
      taxAdjustmentReserved: false,
      demolitionRestoreReserved: false,
      quantityUnit: type === 'parking_income_object' ? '个' : null,
      pricingUnit: type === 'parking_income_object' ? '元/个' : null,
      sortOrder: item.sortOrder,
      hasOverviewData: item.hasOverviewData,
      hasIncomeData: item.hasIncomeData,
      hasCostData: item.hasCostData,
      hasAllocationData: item.hasAllocationData,
      hasTaxData: item.hasTaxData,
      hasProfitData: item.hasProfitData,
      hasExcelImportData: item.hasExcelImportData,
      canEnable: !isVersionLocked(version) && !version.isLocked && item.status === 'disabled',
      canDisable: item.canDisable,
      canRestore: item.canRestore,
      blockedReason: item.blockedReason,
      warningMessage: item.warningMessage,
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null
    };
  });
  const compatRows = await prisma.projectMetricValue.findMany({
    where: { projectId, projectVersionId: versionId, scope: 'profile_product_object' },
    orderBy: { createdAt: 'asc' }
  });
  const compatObjects = compatRows.map((row, index) => {
    const parsed = parseMetricValue(row) as any;
    return {
      objectId: row.id,
      projectId,
      versionId,
      objectCode: parsed?.objectCode || row.metricKey.replace(/^profileObject:/, ''),
      objectName: parsed?.objectName || parsed?.objectCode || row.metricKey,
      objectType: parsed?.objectType === 'special_config_object' ? 'construction_standard_object' : parsed?.objectType || 'construction_standard_object',
      objectCategory: parsed?.objectCategory || parsed?.objectType || 'special-config-object',
      status: bool(parsed?.isEnabled ?? row.value) ? 'enabled' : 'disabled',
      objectStatus: bool(parsed?.isEnabled ?? row.value) ? 'enabled' : 'disabled',
      isEnabled: bool(parsed?.isEnabled ?? row.value),
      isSaleable: bool(parsed?.isSaleableObject ?? parsed?.isSaleable),
      isSaleableObject: bool(parsed?.isSaleableObject ?? parsed?.isSaleable),
      isOperatingObject: bool(parsed?.isOperatingObject ?? parsed?.isSaleableObject),
      isIncomeObject: bool(parsed?.isIncomeObject),
      isCostObject: bool(parsed?.isCostObject ?? true),
      isAllocationObject: bool(parsed?.isAllocationObject),
      isTaxObject: bool(parsed?.isTaxObject),
      isProfitObject: bool(parsed?.isProfitObject),
      isParkingObject: parsed?.objectType === 'parking_income_object',
      isBasementObject: parsed?.objectType === 'basement_cost_object',
      isSupportingObject: parsed?.objectType === 'supporting_cost_object',
      isMarketingDisplayObject: parsed?.objectType === 'marketing_display_object',
      displayCostBearingType: parsed?.displayCostBearingType || (parsed?.objectType === 'marketing_display_object' ? 'development_cost' : null),
      transferToSalesExpenseReserved: bool(parsed?.transferToSalesExpenseReserved),
      transferToFormalCostReserved: bool(parsed?.transferToFormalCostReserved),
      taxAdjustmentReserved: bool(parsed?.taxAdjustmentReserved),
      demolitionRestoreReserved: bool(parsed?.demolitionRestoreReserved),
      quantityUnit: parsed?.quantityUnit || (parsed?.objectType === 'parking_income_object' ? '个' : null),
      pricingUnit: parsed?.pricingUnit || (parsed?.objectType === 'parking_income_object' ? '元/个' : null),
      sortOrder: productObjects.length + index + 1,
      hasOverviewData: true,
      hasIncomeData: false,
      hasCostData: false,
      hasAllocationData: false,
      hasTaxData: false,
      hasProfitData: false,
      hasExcelImportData: false,
      canEnable: !isVersionLocked(version) && !version.isLocked && !bool(parsed?.isEnabled ?? row.value),
      canDisable: !isVersionLocked(version) && !version.isLocked && bool(parsed?.isEnabled ?? row.value),
      canRestore: !isVersionLocked(version) && !version.isLocked && !bool(parsed?.isEnabled ?? row.value),
      blockedReason: isVersionLocked(version) || version.isLocked ? VERSION_LOCKED_MESSAGE : null,
      warningMessage: '兼容对象保存于 ProjectMetricValue，暂不参与普通业态面积或收入测算。',
      createdAt: row.createdAt?.toISOString() || null,
      updatedAt: row.updatedAt?.toISOString() || null
    };
  }).filter((item) => includeDisabled || item.isEnabled);
  return ok({ objects: [...productObjects, ...compatObjects] });
}

export async function saveProfileProductObjects(projectId: string, versionId: string, body: Record<string, unknown>) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423);
  const objects = Array.isArray(body.objects) ? body.objects as Record<string, unknown>[] : [];
  const before = resultData(await getProfileProductObjects(projectId, versionId));
  const results: unknown[] = [];
  for (const object of objects) {
    const objectType = String(object.objectType || 'saleable_object');
    if (!profileObjectTypes.has(objectType)) return error('INVALID_OBJECT_TYPE', '对象类型不合法。');
    const objectCode = String(object.objectCode || '').trim();
    const objectName = text(object.objectName) || objectCode;
    if (!objectCode && !objectName) return error('OBJECT_NOT_FOUND', '对象编码或名称不能为空。');
    if (objectType === 'product_type' || objectType === 'saleable_object' || objectType === 'cost_object' || objectType === 'basement_cost_object' || objectType === 'parking_income_object' || objectType === 'supporting_cost_object' || objectType === 'marketing_display_object') {
      const existing = await prisma.productType.findFirst({ where: { projectVersionId: versionId, OR: [{ productTypeKey: objectCode }, { name: objectName }] } });
      if (bool(object.isEnabled)) {
        const result = existing?.isActive === false
          ? await restoreVersionProductType(versionId, existing.id, text(object.operationReason))
          : existing
            ? ok({ productTypeId: existing.id, status: 'enabled' })
            : await addVersionProductType(versionId, {
              productTypeCode: objectCode,
              productTypeName: objectName || undefined,
              productCategory: text(object.objectCategory) || undefined,
              objectType,
              operationReason: text(object.operationReason)
            });
        if (!result.body.success) return { status: result.status, body: result.body };
        results.push(resultData(result));
      } else if (existing) {
        if (!existing.isActive) results.push({ productTypeId: existing.id, status: 'disabled' });
        else {
          const result = await disableVersionProductType(versionId, existing.id, text(object.operationReason));
          if (!result.body.success) return { status: result.status, body: result.body };
          results.push(resultData(result));
        }
      } else {
        return error('OBJECT_NOT_FOUND', '对象不存在，不能停用。', 404);
      }
    } else {
      const payload = { ...object, objectCode, objectName, objectType, isEnabled: bool(object.isEnabled) };
      await prisma.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: versionId, scope: 'profile_product_object', metricKey: `profileObject:${objectCode || objectName}` } });
      const saved = await prisma.projectMetricValue.create({
        data: {
          projectId,
          projectVersionId: versionId,
          scope: 'profile_product_object',
          metricKey: `profileObject:${objectCode || objectName}`,
          value: payload.isEnabled ? 1 : 0,
          remark: JSON.stringify(payload),
          source: 'profile_product_objects'
        }
      });
      results.push({ objectId: saved.id, status: payload.isEnabled ? 'enabled' : 'disabled' });
    }
  }
  const after = resultData(await getProfileProductObjects(projectId, versionId));
  await prisma.$transaction(async (tx) => {
    await writeOperationLog(tx, {
      projectId,
      versionId,
      module: 'profile',
      action: 'update_profile_product_objects',
      targetType: 'ProjectVersion',
      targetId: versionId,
      beforeData: before,
      afterData: after,
      remark: { section: 'productObjects', operationReason: text(body.operationReason), changedFields: ['objects'] }
    });
  });
  return ok({ results, productObjects: after });
}

export async function getProfileConstructionStandards(projectId: string, versionId: string) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const metrics = await loadMetricMap(projectId, versionId, constructionMetricKeys);
  const value = (key: string) => parseMetricValue(metrics.get(key));
  const project = version.project;
  return ok({
    deliveryStandard: value('deliveryStandard') || project.residentialFitoutStandard || null,
    facadeStandard: value('facadeStandard'),
    doorWindowStandard: value('doorWindowStandard'),
    landscapeStandard: value('landscapeStandard'),
    garageStandard: value('garageStandard') || project.basementQualityStandard || null,
    intelligentStandard: value('intelligentStandard'),
    civilDefenseStandard: value('civilDefenseStandard'),
    prefabStandard: value('prefabStandard') || project.prefabricatedSystem || null,
    fineDecorationStandard: value('fineDecorationStandard') || project.residentialFitoutStandard || null,
    heatingStandard: value('heatingStandard') || project.heatingType || null,
    ancientBuildingStandard: value('ancientBuildingStandard'),
    demoAreaStandard: value('demoAreaStandard') || project.salesOfficeFitoutType || null,
    isPrefabEnabled: project.isPrefabricated,
    prefabArea: value('prefabArea'),
    prefabApplicableProductTypes: list(value('prefabApplicableProductTypes')),
    isFineDecorationEnabled: project.residentialFitoutDelivery,
    fineDecorationScope: value('fineDecorationScope') || project.residentialFitoutType || null,
    fineDecorationArea: value('fineDecorationArea'),
    fineDecorationApplicableProductTypes: list(value('fineDecorationApplicableProductTypes')),
    isHeatingEnabled: project.heatingEnabled,
    heatingArea: value('heatingArea'),
    heatingBenefitObject: value('heatingBenefitObject') || project.heatingScope || null,
    isCivilDefenseEnabled: n(project.civilDefenseArea) > 0,
    civilDefenseArea: nullableNumber(project.civilDefenseArea),
    civilDefenseParkingCount: project.civilDefenseParkingCount || null,
    isAncientBuildingEnabled: Boolean(value('ancientBuildingArea')),
    ancientBuildingObjectType: value('ancientBuildingObjectType'),
    ancientBuildingArea: value('ancientBuildingArea'),
    isChargingPileEnabled: project.chargingPileCount > 0,
    chargingPileCount: project.chargingPileCount || null,
    chargingPileRatio: nullableNumber(project.chargingPileRatio),
    chargingPileUnitCost: value('chargingPileUnitCost'),
    isDemoAreaEnabled: project.hasSalesOffice || project.hasShowFlat,
    demoArea: value('demoArea'),
    salesOfficeArea: nullableNumber(project.salesOfficeArea),
    showFlatArea: nullableNumber(project.showFlatArea)
  });
}

export async function saveProfileConstructionStandards(projectId: string, versionId: string, body: Record<string, unknown>) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423);
  const before = resultData(await getProfileConstructionStandards(projectId, versionId)) as Record<string, unknown>;
  const projectData: Record<string, unknown> = {};
  if ('isPrefabEnabled' in body) projectData.isPrefabricated = bool(body.isPrefabEnabled);
  if ('isFineDecorationEnabled' in body) projectData.residentialFitoutDelivery = bool(body.isFineDecorationEnabled);
  if ('isHeatingEnabled' in body) projectData.heatingEnabled = bool(body.isHeatingEnabled);
  if ('isCivilDefenseEnabled' in body && !bool(body.isCivilDefenseEnabled)) projectData.civilDefenseArea = 0;
  if ('civilDefenseArea' in body) projectData.civilDefenseArea = n(body.civilDefenseArea);
  if ('civilDefenseParkingCount' in body) projectData.civilDefenseParkingCount = Math.round(n(body.civilDefenseParkingCount));
  if ('isChargingPileEnabled' in body && !bool(body.isChargingPileEnabled)) projectData.chargingPileCount = 0;
  if ('chargingPileCount' in body) projectData.chargingPileCount = Math.round(n(body.chargingPileCount));
  if ('chargingPileRatio' in body) projectData.chargingPileRatio = n(body.chargingPileRatio);
  if ('isDemoAreaEnabled' in body) {
    projectData.hasSalesOffice = bool(body.isDemoAreaEnabled);
    projectData.hasShowFlat = bool(body.isDemoAreaEnabled);
  }
  if ('salesOfficeArea' in body) projectData.salesOfficeArea = n(body.salesOfficeArea);
  if ('showFlatArea' in body) projectData.showFlatArea = n(body.showFlatArea);
  await prisma.$transaction(async (tx) => {
    if (Object.keys(projectData).length) await tx.project.update({ where: { id: projectId }, data: projectData });
    await saveMetrics(tx as typeof prisma, projectId, versionId, body, constructionMetricKeys, 'profile_construction_standards');
    await writeOperationLog(tx, {
      projectId,
      versionId,
      module: 'profile',
      action: 'update_construction_standards',
      targetType: 'ProjectVersion',
      targetId: versionId,
      beforeData: before,
      afterData: body,
      remark: { section: 'constructionStandards', changedFields: changedFields(before, body) }
    });
  });
  return getProfileConstructionStandards(projectId, versionId);
}

function projectMetricsWarnings(data: any) {
  const warnings = [];
  if (n(data.basement.undergroundGarageArea) > n(data.basement.basementTotalArea)) warnings.push('地下车库面积不得大于地下总建筑面积。');
  if (n(data.basement.mainBuildingBasementArea) + n(data.basement.nonMainBuildingBasementArea) > n(data.basement.basementTotalArea)) warnings.push('主楼地下室与非主楼地下室面积合计大于地下总建筑面积，请复核空间归属口径。');
  if (n(data.basement.civilDefenseArea) + n(data.basement.nonCivilDefenseArea) > n(data.basement.basementTotalArea)) warnings.push('人防与非人防面积合计大于地下总建筑面积，请复核。');
  if (n(data.parking.civilDefenseParkingCount) + n(data.parking.nonCivilDefenseParkingCount) > n(data.parking.undergroundParkingCount)) warnings.push('分类车位数量合计大于地下车位总数，请复核。');
  if (n(data.landscapeRoad.fireRoadAreaIncluded) > n(data.landscapeRoad.vehicleRoadArea)) warnings.push('消防道路面积不得大于车行道路面积。');
  if (n(data.landscapeRoad.hardLandscapeArea) + n(data.landscapeRoad.softLandscapeArea) > n(data.landscapeRoad.landscapeArea)) warnings.push('硬景与软景面积合计大于景观面积，请复核。');
  return warnings;
}

export async function getProfileProjectMetrics(projectId: string, versionId: string) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const metrics = await loadMetricMap(projectId, versionId, projectMetricExtraKeys);
  const value = (key: string) => parseMetricValue(metrics.get(key));
  const project = version.project;
  const data: any = {
    land: { landArea: nullableNumber(project.landArea) },
    buildingArea: {
      totalBuildingArea: nullableNumber(project.totalBuildingArea),
      plotRatioBuildingArea: nullableNumber(project.capacityBuildingArea),
      aboveGroundBuildingArea: nullableNumber(project.aboveGroundArea),
      undergroundBuildingArea: nullableNumber(project.undergroundArea),
      saleableArea: nullableNumber(project.saleableArea),
      nonSaleableArea: nullableNumber(project.nonSaleableArea),
      buildingBaseArea: nullableNumber(project.baseArea)
    },
    buildings: {
      buildingCount: project.buildingCount || null,
      unitCount: project.unitCount || null,
      householdCount: project.householdCount || null,
      standardFloorArea: nullableNumber(project.standardFloorArea),
      standardFloorHouseholdCount: null,
      aboveGroundFloorCount: project.aboveGroundFloors || null,
      undergroundFloorCount: project.basementFloors || null
    },
    basement: {
      basementTotalArea: nullableNumber(project.undergroundArea),
      mainBuildingBasementArea: value('mainBuildingBasementArea') || nullableNumber(project.mainBuildingUndergroundArea),
      nonMainBuildingBasementArea: value('nonMainBuildingBasementArea'),
      undergroundGarageArea: value('undergroundGarageArea') || nullableNumber(project.basementParkingArea),
      civilDefenseArea: nullableNumber(project.civilDefenseArea),
      nonCivilDefenseArea: nullableNumber(project.nonCivilDefenseArea),
      equipmentRoomArea: value('equipmentRoomArea'),
      undergroundPublicArea: value('undergroundPublicArea') || nullableNumber(project.publicArea),
      basementFloorCount: project.basementFloors || null,
      basementB1Height: value('basementB1Height') || nullableNumber(project.basementFloorHeight),
      basementB2Height: value('basementB2Height'),
      basementOtherAvgHeight: value('basementOtherAvgHeight'),
      remark: '主楼地下室 / 非主楼地下室 = 空间归属口径；地下车库面积 = 功能使用口径。地下车库面积不等于非主楼地下室面积。',
      helpText: '主楼地下室 / 非主楼地下室 = 空间归属口径；地下车库面积 = 功能使用口径。地下车库面积不等于非主楼地下室面积。'
    },
    parking: {
      undergroundParkingCount: project.parkingCount || null,
      civilDefenseParkingCount: project.civilDefenseParkingCount || null,
      nonCivilDefenseParkingCount: value('nonCivilDefenseParkingCount'),
      propertyRightParkingCount: value('propertyRightParkingCount') || project.undergroundPropertyParkingCount || null,
      useRightParkingCount: value('useRightParkingCount') || project.undergroundUseRightParkingCount || null,
      mechanicalParkingCount: value('mechanicalParkingCount'),
      chargingPileParkingCount: value('chargingPileParkingCount') || project.chargingPileCount || null,
      parkingUnitPrice: value('parkingUnitPrice'),
      quantityUnit: '个',
      pricingUnit: '元/个',
      remark: '车位收入按数量 × 单价测算，计量单位为个，计价单位为元/个；禁止使用车位面积 × 元/㎡。'
    },
    landscapeRoad: {
      landscapeArea: nullableNumber(project.landscapeArea),
      hardLandscapeArea: nullableNumber(project.hardscapeArea),
      softLandscapeArea: nullableNumber(project.softscapeArea) || nullableNumber(project.greenArea),
      pedestrianRoadArea: value('pedestrianRoadArea'),
      vehicleRoadArea: value('vehicleRoadArea') || nullableNumber(project.roadArea),
      fireRoadAreaIncluded: value('fireRoadAreaIncluded') || nullableNumber(project.fireRoadArea),
      boundaryLength: value('boundaryLength') || nullableNumber(project.sitePerimeter),
      wallLength: value('wallLength'),
      entranceCount: value('entranceCount') || project.gateCount || null
    },
    marketingDisplay: {
      isSampleRoomEnabled: value('isSampleRoomEnabled') ?? project.hasShowFlat,
      sampleRoomCount: value('sampleRoomCount'),
      sampleRoomArea: value('sampleRoomArea') || nullableNumber(project.showFlatArea),
      sampleRoomHostType: value('sampleRoomHostType'),
      sampleRoomHostProductType: value('sampleRoomHostProductType'),
      isSampleRoomFutureSaleable: value('isSampleRoomFutureSaleable'),
      isSampleRoomRestoreRequired: value('isSampleRoomRestoreRequired'),
      sampleRoomDecorationStandard: value('sampleRoomDecorationStandard') || project.showFlatFitoutType || null,
      sampleRoomCostBearingType: value('sampleRoomCostBearingType'),
      sampleRoomCostTransferReserved: value('sampleRoomCostTransferReserved'),
      isSalesOfficeEnabled: value('isSalesOfficeEnabled') ?? project.hasSalesOffice,
      salesOfficeType: value('salesOfficeType') || project.salesOfficeFitoutType || null,
      salesOfficeArea: value('salesOfficeArea') || nullableNumber(project.salesOfficeArea),
      salesOfficeHostType: value('salesOfficeHostType'),
      salesOfficeFutureUse: value('salesOfficeFutureUse'),
      salesOfficeCostBearingType: value('salesOfficeCostBearingType'),
      salesOfficeTransferReserved: value('salesOfficeTransferReserved'),
      isDemoAreaEnabled: value('isDemoAreaEnabled') ?? (project.hasSalesOffice || project.hasShowFlat),
      demoArea: value('demoArea'),
      demoLandscapeArea: value('demoLandscapeArea'),
      demoRoadArea: value('demoRoadArea'),
      demoPackagingArea: value('demoPackagingArea'),
      demoViewingPathArea: value('demoViewingPathArea'),
      demoCostBearingType: value('demoCostBearingType'),
      demoTransferReserved: value('demoTransferReserved'),
      remark: '样板间、售楼处、示范区作为营销展示对象或专项成本口径，不作为普通收入业态；V1 不做复杂自动分摊。'
    },
    warnings: []
  };
  data.warnings = projectMetricsWarnings(data);
  return ok(data);
}

export async function saveProfileProjectMetrics(projectId: string, versionId: string, body: Record<string, unknown>) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423);
  const flat = { ...(body.land as any), ...(body.buildingArea as any), ...(body.buildings as any), ...(body.basement as any), ...(body.parking as any), ...(body.landscapeRoad as any), ...(body.marketingDisplay as any) };
  for (const [key, value] of Object.entries(flat)) {
    if (value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) < 0) return error('INVALID_PROJECT_METRIC', `${key} 不能为负数。`);
  }
  if (n(flat.undergroundGarageArea) > n(flat.basementTotalArea || version.project.undergroundArea)) return error('INVALID_BASEMENT_METRIC', '地下车库面积不得大于地下总建筑面积。');
  if (n(flat.fireRoadAreaIncluded) > n(flat.vehicleRoadArea || version.project.roadArea)) return error('INVALID_LANDSCAPE_METRIC', '消防道路面积不得大于车行道路面积。');
  if (n(flat.basementFloorCount) === 1 && n(flat.basementB1Height) <= 0) return error('INVALID_BASEMENT_METRIC', '地下室为一层时，必须填写 B1 层高。');
  if (n(flat.basementFloorCount) === 2 && (n(flat.basementB1Height) <= 0 || n(flat.basementB2Height) <= 0)) return error('INVALID_BASEMENT_METRIC', '地下室为两层时，必须填写 B1 和 B2 层高。');
  if (n(flat.basementFloorCount) > 2 && n(flat.basementOtherAvgHeight) <= 0) return error('INVALID_BASEMENT_METRIC', '地下室超过两层时，必须填写其他层平均层高。');
  const before = resultData(await getProfileProjectMetrics(projectId, versionId)) as Record<string, unknown>;
  const projectData: Record<string, unknown> = {};
  const map: Record<string, string> = {
    landArea: 'landArea',
    totalBuildingArea: 'totalBuildingArea',
    plotRatioBuildingArea: 'capacityBuildingArea',
    aboveGroundBuildingArea: 'aboveGroundArea',
    undergroundBuildingArea: 'undergroundArea',
    saleableArea: 'saleableArea',
    nonSaleableArea: 'nonSaleableArea',
    buildingBaseArea: 'baseArea',
    buildingCount: 'buildingCount',
    unitCount: 'unitCount',
    householdCount: 'householdCount',
    standardFloorArea: 'standardFloorArea',
    aboveGroundFloorCount: 'aboveGroundFloors',
    undergroundFloorCount: 'basementFloors',
    basementTotalArea: 'undergroundArea',
    civilDefenseArea: 'civilDefenseArea',
    nonCivilDefenseArea: 'nonCivilDefenseArea',
    basementFloorCount: 'basementFloors',
    basementB1Height: 'basementFloorHeight',
    undergroundParkingCount: 'parkingCount',
    civilDefenseParkingCount: 'civilDefenseParkingCount',
    landscapeArea: 'landscapeArea',
    hardLandscapeArea: 'hardscapeArea',
    softLandscapeArea: 'softscapeArea',
    vehicleRoadArea: 'roadArea',
    fireRoadAreaIncluded: 'fireRoadArea',
    boundaryLength: 'sitePerimeter',
    entranceCount: 'gateCount'
  };
  for (const [inputKey, projectKey] of Object.entries(map)) {
    if (inputKey in flat) projectData[projectKey] = Number.isInteger((version.project as any)[projectKey]) ? Math.round(n(flat[inputKey])) : n(flat[inputKey]);
  }
  if ('softLandscapeArea' in flat) projectData.greenArea = n(flat.softLandscapeArea);
  if ('sampleRoomArea' in flat) projectData.showFlatArea = n(flat.sampleRoomArea);
  if ('salesOfficeArea' in flat) projectData.salesOfficeArea = n(flat.salesOfficeArea);
  if ('isSampleRoomEnabled' in flat) projectData.hasShowFlat = bool(flat.isSampleRoomEnabled);
  if ('isSalesOfficeEnabled' in flat) projectData.hasSalesOffice = bool(flat.isSalesOfficeEnabled);
  if ('isDemoAreaEnabled' in flat) {
    projectData.hasSalesOffice = bool(flat.isDemoAreaEnabled);
    projectData.hasShowFlat = bool(flat.isDemoAreaEnabled);
  }
  await prisma.$transaction(async (tx) => {
    if (Object.keys(projectData).length) await tx.project.update({ where: { id: projectId }, data: projectData });
    await saveMetrics(tx as typeof prisma, projectId, versionId, flat, projectMetricExtraKeys, 'profile_project_metrics');
    await writeOperationLog(tx, {
      projectId,
      versionId,
      module: 'profile',
      action: 'update_project_metrics',
      targetType: 'ProjectVersion',
      targetId: versionId,
      beforeData: before,
      afterData: body,
      remark: { section: 'projectMetrics', changedFields: Object.keys(flat) }
    });
  });
  return getProfileProjectMetrics(projectId, versionId);
}

export async function getProfileQuantityIndicators(projectId: string, versionId: string) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  const rows = await prisma.costLine.findMany({
    where: { projectVersionId: versionId },
    include: { costSubject: true, productType: true },
    orderBy: [{ sortOrder: 'asc' }, { detailName: 'asc' }]
  });
  const indicators = rows.map((line) => {
    const quantityState = costLineQuantityPatch(line);
    const calculatedQuantity = n(line.measureValue) * (n(line.coefficient) || 1);
    const finalQuantity = n(line.quantity);
    return {
      indicatorId: line.id,
      projectId,
      versionId,
      indicatorCode: line.costSubject?.code || line.id,
      indicatorName: line.detailName || line.costSubject?.name || '',
      indicatorLevel: String(line.costSubject?.level || ''),
      indicatorSource: line.importBatchId ? 'excel_imported' : 'cost_line',
      relatedObjectId: line.productTypeId,
      relatedProductType: line.productType?.name || line.regionOrProductType || null,
      baseIndicatorName: line.measureBasis || line.costSubject?.defaultMeasureBasis || null,
      baseIndicatorValue: nullableNumber(line.measureValue),
      contentRatio: nullableNumber(line.coefficient),
      contentRatioUnit: null,
      calculatedQuantity,
      ...mapCostLineV101Fields(line),
      engineeringMetricQuantity: nullableNumber(line.engineeringMetricQuantity),
      manualQuantity: nullableNumber(line.manualQuantity) ?? (line.quantityOverride ? finalQuantity : null),
      excelImportedQuantity: nullableNumber(line.excelImportedQuantity) ?? (line.importBatchId ? finalQuantity : null),
      drawingMeasuredQuantity: nullableNumber(line.drawingMeasuredQuantity),
      lockedQuantity: nullableNumber(line.lockedQuantity),
      templateDefaultQuantity: nullableNumber(line.templateDefaultQuantity),
      finalQuantity,
      quantityUnit: line.unit || line.costSubject?.defaultUnit || null,
      quantityCalcMode: line.quantityOverride ? (line.importBatchId ? 'excel_imported' : 'manual_entered') : 'auto_calculated',
      quantitySource: line.quantitySource || quantityState.quantitySource,
      quantityStatus: line.quantityStatus && line.quantityStatus !== 'normal' ? line.quantityStatus : quantityState.quantityStatus,
      quantityFormula: line.quantityFormula || quantityState.quantityFormula,
      amountStatus: line.amountStatus || quantityState.amountStatus,
      quantitySourceRemark: line.remark || null,
      isQuantityOverridden: line.quantityOverride,
      overrideReason: line.quantityOverride ? line.remark || null : null,
      overriddenBy: null,
      overriddenAt: null,
      isQuantityLocked: isVersionLocked(version) || version.isLocked
    };
  });
  return ok({
    indicators,
    summary: {
      totalIndicators: indicators.length,
      overriddenCount: indicators.filter((item) => item.isQuantityOverridden).length,
      lockedCount: isVersionLocked(version) || version.isLocked ? indicators.length : 0
    }
  });
}

export async function saveProfileQuantityIndicators(projectId: string, versionId: string, body: Record<string, unknown>) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423);
  const indicators = Array.isArray(body.indicators) ? body.indicators as Record<string, unknown>[] : [];
  const results: unknown[] = [];
  for (const indicator of indicators) {
    const mode = String(indicator.quantityCalcMode || 'manual_entered');
    const costLineId = String(indicator.indicatorId || indicator.costLineId || '');
    if (!costLineId) return error('FINAL_QUANTITY_MISSING', '工程量指标缺少 indicatorId。');
    if (!['auto_calculated', 'manual_entered', 'excel_imported', 'drawing_measured', 'locked_confirmed'].includes(mode)) return error('INVALID_QUANTITY_MODE', '工程量模式不合法。');
    const finalQuantity = indicator.finalQuantity ?? indicator.manualQuantity;
    if (finalQuantity === undefined || finalQuantity === null || finalQuantity === '') return error('FINAL_QUANTITY_MISSING', 'finalQuantity 不能为空。');
    if (n(finalQuantity) < 0) return error('INVALID_QUANTITY_MODE', '工程量不能为负数。');
    if (mode === 'manual_entered' || mode === 'excel_imported' || mode === 'drawing_measured' || mode === 'locked_confirmed') {
      if (!text(indicator.overrideReason)) return error('FINAL_QUANTITY_MISSING', '手算覆盖必须填写 overrideReason。');
      const result = await overrideCostLineQuantity(projectId, versionId, costLineId, {
        quantity: finalQuantity,
        quantityField: mode === 'excel_imported' ? 'excelImportedQuantity' : mode === 'drawing_measured' ? 'drawingMeasuredQuantity' : mode === 'locked_confirmed' ? 'lockedQuantity' : 'manualQuantity',
        overrideReason: text(indicator.overrideReason)
      });
      if (!result.body.success) return { status: result.status, body: result.body };
      results.push(resultData(result));
    }
  }
  await prisma.$transaction(async (tx) => {
    await writeOperationLog(tx, {
      projectId,
      versionId,
      module: 'profile',
      action: 'update_quantity_indicators',
      targetType: 'ProjectVersion',
      targetId: versionId,
      afterData: { results },
      remark: { section: 'quantityIndicators', changedFields: ['indicators'] }
    });
  });
  return getProfileQuantityIndicators(projectId, versionId);
}

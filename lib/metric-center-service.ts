import { prisma } from '@/lib/prisma';
import { writeOperationLog } from '@/lib/operation-log';
import { isVersionLocked, VERSION_LOCKED_MESSAGE } from '@/lib/project-version';

const metricCenterSource = 'z4_metric_center';
const metricBaseIndicatorSource = 'z4_metric_base_indicator';

type MetricWarning = { code: string; message: string; level: 'info' | 'warning'; relatedField: string };
type MetricMapping = {
  mappingId: string;
  metricSourceType: string;
  metricSourceCode: string;
  metricSourceName: string | null;
  metricValue: number | null;
  metricUnit: string | null;
  baseIndicatorType: string;
  baseIndicatorCode: string;
  baseIndicatorName: string;
  costObjectId: string | null;
  costObjectType: string | null;
  canBeUsedByQuantityCalculation: boolean;
  usedByDetailSubjects: string[];
  remark: string | null;
};

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

function text(value: unknown) {
  const result = String(value ?? '').trim();
  return result || null;
}

function bool(value: unknown) {
  return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
}

function parseRemark(remark?: string | null) {
  if (!remark) return {};
  try {
    return JSON.parse(remark);
  } catch {
    return {};
  }
}

function pickNumber(source: any, key: string) {
  return nullableNumber(source?.[key]);
}

async function loadVersion(projectId: string, versionId: string) {
  return prisma.projectVersion.findFirst({ where: { id: versionId, projectId }, include: { project: true } });
}

function normalizeObject<T extends Record<string, any>>(input: Record<string, unknown> | null | undefined, fields: readonly string[], defaults: T) {
  const result: Record<string, any> = { ...defaults };
  for (const key of fields) {
    if (input && key in input) {
      const value = input[key];
      result[key] = value === '' || value === undefined ? null : value;
    } else if (!(key in result)) {
      result[key] = null;
    }
  }
  return result;
}

const projectTotalFields = [
  'landArea', 'totalBuildingArea', 'plotRatioArea', 'groundBuildingArea', 'undergroundBuildingArea', 'buildingBaseArea',
  'plotRatio', 'buildingDensity', 'greenRatio', 'saleableArea', 'basementArea', 'civilDefenseArea', 'nonCivilDefenseArea',
  'undergroundGarageArea', 'parkingTotalCount', 'perimeterLength', 'wallLength', 'landscapeArea', 'hardscapeArea',
  'softscapeArea', 'vehicleRoadArea', 'pedestrianRoadArea', 'fireRoadArea', 'entranceCount', 'householdTotalCount',
  'buildingTotalCount', 'unitTotalCount'
] as const;

const productObjectFields = [
  'objectId', 'objectName', 'objectType', 'groundBuildingArea', 'undergroundLinkedArea', 'grossFloorArea',
  'plotRatioArea', 'nonPlotRatioArea', 'saleableArea', 'nonSaleableArea', 'giftedArea', 'innerArea', 'sharedArea',
  'efficiencyRate', 'householdCount', 'unitCount', 'buildingCount', 'floorCount', 'typicalFloorArea', 'baseArea',
  'landOccupationArea', 'saleableQuantity', 'measureUnit', 'remark'
] as const;

const buildingFields = [
  'buildingId', 'buildingCode', 'buildingName', 'productObjectId', 'productObjectName', 'groundFloorCount',
  'undergroundFloorCount', 'unitCount', 'householdCount', 'typicalFloorArea', 'groundBuildingArea',
  'undergroundMainBuildingArea', 'baseArea', 'isSaleable', 'participatesCostCalculation', 'participatesIncomeCalculation',
  'elevatorCountReserved', 'entranceDoorCountReserved', 'facadeAreaReserved', 'remark'
] as const;

const unitPlanFields = [
  'unitPlanId', 'unitPlanName', 'productObjectId', 'productObjectName', 'unitBuildingArea', 'unitInnerArea',
  'unitSaleableArea', 'unitCount', 'typicalFloorArea', 'typicalFloorHouseholdCount', 'typicalFloorCount',
  'efficiencyRate', 'entranceDoorCount', 'windowAreaReserved', 'balconyAreaReserved', 'decorationAreaReserved', 'remark'
] as const;

const basementFields = [
  'basementTotalArea', 'mainBuildingBasementArea', 'nonMainBuildingBasementArea', 'undergroundGarageArea',
  'civilDefenseArea', 'nonCivilDefenseArea', 'equipmentRoomArea', 'undergroundPublicArea', 'basementFloorCount',
  'basementFloorHeight', 'basementB1Height', 'basementB2Height', 'basementOtherAvgHeight',
  'undergroundParkingCount', 'civilDefenseParkingCount', 'nonCivilDefenseParkingCount',
  'chargingParkingCount', 'garageFloorArea', 'trafficMarkingAreaOrCount', 'rampCount', 'rampArea',
  'lightWellCountReserved', 'remark'
] as const;

const parkingFields = [
  'parkingTotalCount', 'propertyRightParkingCount', 'useRightParkingCount', 'civilDefenseParkingCount',
  'nonCivilDefenseParkingCount', 'saleableParkingCount', 'selfOwnedParkingCount', 'hasMechanicalParking',
  'mechanicalParkingCount',
  'chargingPileParkingCount', 'chargingPileCount', 'parkingSaleUnitPriceReserved', 'parkingRentUnitPriceReserved', 'remark'
] as const;

const landscapeRoadFields = [
  'landscapeTotalArea', 'hardscapeArea', 'softscapeArea', 'waterscapeArea', 'childrenActivityArea', 'sportActivityArea',
  'pedestrianRoadArea', 'vehicleRoadArea', 'fireRoadArea', 'asphaltRoadArea', 'pavingArea', 'wallLength',
  'perimeterLength', 'entranceCount', 'gateCount', 'guardhouseCount', 'rainSewagePipeLengthReserved',
  'waterSupplyPipeLengthReserved', 'strongWeakElectricTrenchLengthReserved', 'outdoorLightingPointReserved', 'remark'
] as const;

const supportingSpecialFields = [
  'propertyManagementRoomArea', 'communityRoomArea', 'elderlyCareRoomArea', 'kindergartenArea', 'clubhouseArea',
  'stiltFloorArea', 'garbageRoomArea', 'powerDistributionRoomArea', 'fireControlRoomArea', 'gatehouseArea',
  'handoverRoomArea', 'nonSaleableCommercialArea', 'selfOwnedCommercialArea', 'sampleRoomBuildingArea',
  'sampleRoomDecorationArea', 'salesOfficeBuildingArea', 'salesOfficeDecorationArea', 'demoAreaLandscapeArea',
  'viewingPassageArea', 'temporaryFacilityArea', 'isSpecialCostObject', 'defaultCostBearingType', 'remark'
] as const;

const singletonSections: Record<string, readonly string[]> = {
  projectTotalMetrics: projectTotalFields,
  basementMetrics: basementFields,
  parkingMetrics: parkingFields,
  landscapeRoadMetrics: landscapeRoadFields,
  supportingSpecialMetrics: supportingSpecialFields
};

const listSections: Record<string, readonly string[]> = {
  productObjectMetrics: productObjectFields,
  buildingMetrics: buildingFields,
  unitPlanMetrics: unitPlanFields
};

function projectDefaults(project: any) {
  const landArea = n(project.landArea);
  const plotRatioArea = n(project.capacityBuildingArea);
  const buildingBaseArea = n(project.baseArea);
  return {
    projectTotalMetrics: normalizeObject(null, projectTotalFields, {
      landArea: pickNumber(project, 'landArea'),
      totalBuildingArea: pickNumber(project, 'totalBuildingArea'),
      plotRatioArea: pickNumber(project, 'capacityBuildingArea'),
      groundBuildingArea: pickNumber(project, 'aboveGroundArea'),
      undergroundBuildingArea: pickNumber(project, 'undergroundArea'),
      buildingBaseArea: pickNumber(project, 'baseArea'),
      plotRatio: landArea > 0 ? Number((plotRatioArea / landArea).toFixed(4)) : null,
      buildingDensity: landArea > 0 ? Number((buildingBaseArea / landArea).toFixed(4)) : null,
      greenRatio: landArea > 0 ? Number((n(project.greenArea) / landArea).toFixed(4)) : null,
      saleableArea: pickNumber(project, 'saleableArea'),
      basementArea: pickNumber(project, 'undergroundArea'),
      civilDefenseArea: pickNumber(project, 'civilDefenseArea'),
      nonCivilDefenseArea: pickNumber(project, 'nonCivilDefenseArea'),
      undergroundGarageArea: pickNumber(project, 'basementParkingArea'),
      parkingTotalCount: project.parkingCount || null,
      perimeterLength: pickNumber(project, 'sitePerimeter'),
      wallLength: null,
      landscapeArea: pickNumber(project, 'landscapeArea'),
      hardscapeArea: pickNumber(project, 'hardscapeArea'),
      softscapeArea: pickNumber(project, 'softscapeArea') || pickNumber(project, 'greenArea'),
      vehicleRoadArea: pickNumber(project, 'roadArea'),
      pedestrianRoadArea: null,
      fireRoadArea: pickNumber(project, 'fireRoadArea'),
      entranceCount: project.gateCount || null,
      householdTotalCount: project.householdCount || null,
      buildingTotalCount: project.buildingCount || null,
      unitTotalCount: project.unitCount || null
    }),
    basementMetrics: normalizeObject(null, basementFields, {
      basementTotalArea: pickNumber(project, 'undergroundArea'),
      mainBuildingBasementArea: pickNumber(project, 'mainBuildingUndergroundArea'),
      nonMainBuildingBasementArea: null,
      undergroundGarageArea: pickNumber(project, 'basementParkingArea'),
      civilDefenseArea: pickNumber(project, 'civilDefenseArea'),
      nonCivilDefenseArea: pickNumber(project, 'nonCivilDefenseArea'),
      equipmentRoomArea: null,
      undergroundPublicArea: pickNumber(project, 'publicArea'),
      basementFloorCount: project.basementFloors || null,
      basementFloorHeight: pickNumber(project, 'basementFloorHeight'),
      basementB1Height: pickNumber(project, 'basementFloorHeight'),
      basementB2Height: pickNumber(project, 'basementB2FloorHeight'),
      basementOtherAvgHeight: pickNumber(project, 'basementOtherAvgFloorHeight'),
      undergroundParkingCount: project.parkingCount || null,
      civilDefenseParkingCount: project.civilDefenseParkingCount || null,
      nonCivilDefenseParkingCount: null,
      chargingParkingCount: project.chargingPileCount || null,
      garageFloorArea: pickNumber(project, 'basementParkingArea'),
      trafficMarkingAreaOrCount: null,
      rampCount: null,
      rampArea: null,
      lightWellCountReserved: null,
      remark: '地下车库面积为功能口径，非主楼地下室为归属口径，两者不自动等同。'
    }),
    parkingMetrics: normalizeObject(null, parkingFields, {
      parkingTotalCount: project.parkingCount || null,
      propertyRightParkingCount: project.undergroundPropertyParkingCount || null,
      useRightParkingCount: project.undergroundUseRightParkingCount || null,
      civilDefenseParkingCount: project.civilDefenseParkingCount || null,
      nonCivilDefenseParkingCount: null,
      saleableParkingCount: null,
      selfOwnedParkingCount: null,
      hasMechanicalParking: project.hasMechanicalParking || project.mechanicalParkingCount > 0,
      mechanicalParkingCount: project.mechanicalParkingCount || null,
      chargingPileParkingCount: project.chargingPileCount || null,
      chargingPileCount: project.chargingPileCount || null,
      parkingSaleUnitPriceReserved: null,
      parkingRentUnitPriceReserved: null,
      remark: '车位收入按车位数量 x 车位单价测算，不使用车位面积 x 元/平方米。'
    }),
    landscapeRoadMetrics: normalizeObject(null, landscapeRoadFields, {
      landscapeTotalArea: pickNumber(project, 'landscapeArea'),
      hardscapeArea: pickNumber(project, 'hardscapeArea'),
      softscapeArea: pickNumber(project, 'softscapeArea') || pickNumber(project, 'greenArea'),
      waterscapeArea: pickNumber(project, 'waterFeatureArea'),
      childrenActivityArea: pickNumber(project, 'childrenActivityArea'),
      sportActivityArea: null,
      pedestrianRoadArea: null,
      vehicleRoadArea: pickNumber(project, 'roadArea'),
      fireRoadArea: pickNumber(project, 'fireRoadArea'),
      asphaltRoadArea: pickNumber(project, 'asphaltRoadArea'),
      pavingArea: null,
      wallLength: null,
      perimeterLength: pickNumber(project, 'sitePerimeter'),
      entranceCount: project.gateCount || null,
      gateCount: project.formalGateCount || project.gateCount || null,
      guardhouseCount: null,
      rainSewagePipeLengthReserved: null,
      waterSupplyPipeLengthReserved: null,
      strongWeakElectricTrenchLengthReserved: null,
      outdoorLightingPointReserved: null,
      remark: null
    }),
    supportingSpecialMetrics: normalizeObject(null, supportingSpecialFields, {
      propertyManagementRoomArea: pickNumber(project, 'propertyManagementArea'),
      communityRoomArea: pickNumber(project, 'communityServiceArea'),
      elderlyCareRoomArea: null,
      kindergartenArea: null,
      clubhouseArea: null,
      stiltFloorArea: null,
      garbageRoomArea: null,
      powerDistributionRoomArea: null,
      fireControlRoomArea: null,
      gatehouseArea: null,
      handoverRoomArea: null,
      nonSaleableCommercialArea: null,
      selfOwnedCommercialArea: null,
      sampleRoomBuildingArea: pickNumber(project, 'showFlatArea'),
      sampleRoomDecorationArea: pickNumber(project, 'showFlatArea'),
      salesOfficeBuildingArea: pickNumber(project, 'salesOfficeArea'),
      salesOfficeDecorationArea: pickNumber(project, 'salesOfficeArea'),
      demoAreaLandscapeArea: null,
      viewingPassageArea: null,
      temporaryFacilityArea: pickNumber(project, 'temporaryFacilityArea'),
      isSpecialCostObject: true,
      defaultCostBearingType: 'development_cost',
      remark: '样板间、售楼处、示范区 V1 默认 development_cost，不自动进入销售费用。'
    })
  };
}

function productDefaults(product: any) {
  return normalizeObject(null, productObjectFields, {
    objectId: product.id,
    objectName: product.name || null,
    objectType: product.costObject || product.productCategory || product.category || null,
    groundBuildingArea: pickNumber(product, 'aboveGroundArea') || pickNumber(product, 'buildingArea'),
    undergroundLinkedArea: pickNumber(product, 'undergroundArea'),
    grossFloorArea: pickNumber(product, 'buildingArea'),
    plotRatioArea: pickNumber(product, 'capacityArea'),
    nonPlotRatioArea: null,
    saleableArea: pickNumber(product, 'saleableArea'),
    nonSaleableArea: pickNumber(product, 'nonSaleableArea'),
    giftedArea: null,
    innerArea: null,
    sharedArea: null,
    efficiencyRate: null,
    householdCount: product.householdCount || null,
    unitCount: product.unitCount || null,
    buildingCount: product.buildingCount || null,
    floorCount: null,
    typicalFloorArea: null,
    baseArea: pickNumber(product, 'baseArea'),
    landOccupationArea: null,
    saleableQuantity: product.parkingCount || product.householdCount || null,
    measureUnit: product.costObject === 'parking_income_object' ? '个' : '平方米',
    remark: product.remark || null
  });
}

function rowKey(section: string, index: number, row: any) {
  return String(row.objectId || row.buildingId || row.unitPlanId || row.metricId || `${section}:${index + 1}`);
}

function mergeSaved(center: any, rows: Array<{ scope: string; metricKey: string; remark?: string | null; sourceRef?: string | null }>) {
  for (const row of rows) {
    const payload = parseRemark(row.remark) as any;
    if (row.scope in singletonSections) center[row.scope] = normalizeObject(payload, singletonSections[row.scope], center[row.scope] || {});
  }
  for (const section of Object.keys(listSections)) {
    const saved = rows.filter((row) => row.scope === section).map((row) => parseRemark(row.remark));
    if (!saved.length) continue;
    if (section === 'productObjectMetrics') {
      const byId = new Map<string, any>(center.productObjectMetrics.map((item: any) => [String(item.objectId || ''), item]));
      for (const item of saved as any[]) {
        const id = String(item.objectId || '');
        const existing = id ? byId.get(id) : null;
        if (existing) Object.assign(existing, normalizeObject(item, listSections[section], existing));
        else center.productObjectMetrics.push(normalizeObject(item, listSections[section], {}));
      }
    } else {
      center[section] = (saved as any[]).map((item) => normalizeObject(item, listSections[section], {}));
    }
  }
}

function addWarning(warnings: MetricWarning[], code: string, message: string, relatedField: string, level: 'info' | 'warning' = 'warning') {
  warnings.push({ code, message, level, relatedField });
}

function summarize(center: any) {
  const warnings: MetricWarning[] = [];
  const products = center.productObjectMetrics || [];
  const project = center.projectTotalMetrics || {};
  const basement = center.basementMetrics || {};
  const parking = center.parkingMetrics || {};
  const landscape = center.landscapeRoadMetrics || {};
  const productGroundAreaTotal = products.reduce((sum: number, item: any) => sum + n(item.groundBuildingArea), 0);
  const productPlotRatioAreaTotal = products.reduce((sum: number, item: any) => sum + n(item.plotRatioArea), 0);
  const productSaleableAreaTotal = products.reduce((sum: number, item: any) => sum + n(item.saleableArea), 0);
  const productHouseholdCountTotal = products.reduce((sum: number, item: any) => sum + n(item.householdCount), 0);
  const productBuildingCountTotal = products.reduce((sum: number, item: any) => sum + n(item.buildingCount), 0);
  const parkingSubTotal = n(parking.propertyRightParkingCount) + n(parking.useRightParkingCount) + n(parking.civilDefenseParkingCount) + n(parking.nonCivilDefenseParkingCount);
  const basementSubAreaTotal = n(basement.mainBuildingBasementArea) + n(basement.nonMainBuildingBasementArea);
  const civilDefensePlusNonCivilDefenseArea = n(basement.civilDefenseArea) + n(basement.nonCivilDefenseArea);
  const hardSoftRoadAreaTotal = n(landscape.hardscapeArea) + n(landscape.softscapeArea) + n(landscape.vehicleRoadArea) + n(landscape.pedestrianRoadArea);
  if (productGroundAreaTotal && n(project.groundBuildingArea) && productGroundAreaTotal !== n(project.groundBuildingArea)) addWarning(warnings, 'PRODUCT_GROUND_AREA_MISMATCH', '分业态地上建面合计与项目地上建面不一致。', 'productObjectMetrics.groundBuildingArea');
  if (productPlotRatioAreaTotal && n(project.plotRatioArea) && productPlotRatioAreaTotal !== n(project.plotRatioArea)) addWarning(warnings, 'PRODUCT_PLOT_RATIO_AREA_MISMATCH', '分业态计容建面合计与项目计容建面不一致。', 'productObjectMetrics.plotRatioArea');
  if (productSaleableAreaTotal && n(project.saleableArea) && productSaleableAreaTotal !== n(project.saleableArea)) addWarning(warnings, 'PRODUCT_SALEABLE_AREA_MISMATCH', '分业态可售面积合计与项目/收入测算可售面积不一致。', 'productObjectMetrics.saleableArea');
  if (productHouseholdCountTotal && n(project.householdTotalCount) && productHouseholdCountTotal !== n(project.householdTotalCount)) addWarning(warnings, 'PRODUCT_HOUSEHOLD_COUNT_MISMATCH', '分业态户数合计与项目总户数不一致。', 'productObjectMetrics.householdCount');
  if (productBuildingCountTotal && n(project.buildingTotalCount) && productBuildingCountTotal !== n(project.buildingTotalCount)) addWarning(warnings, 'PRODUCT_BUILDING_COUNT_MISMATCH', '分业态栋数合计与项目总栋数不一致。', 'productObjectMetrics.buildingCount');
  if (basementSubAreaTotal && n(basement.basementTotalArea) && basementSubAreaTotal !== n(basement.basementTotalArea)) addWarning(warnings, 'BASEMENT_SUB_AREA_MISMATCH', '主楼地下室与非主楼地下室合计与地下总建面不一致。', 'basementMetrics');
  if (civilDefensePlusNonCivilDefenseArea && n(basement.basementTotalArea) && civilDefensePlusNonCivilDefenseArea !== n(basement.basementTotalArea)) addWarning(warnings, 'CIVIL_DEFENSE_AREA_MISMATCH', '人防 + 非人防面积与地下总建面不一致。', 'basementMetrics.civilDefenseArea');
  if (parkingSubTotal && n(parking.parkingTotalCount) && parkingSubTotal !== n(parking.parkingTotalCount)) addWarning(warnings, 'PARKING_SUBTOTAL_MISMATCH', '车位分项数量合计与车位总数不一致。', 'parkingMetrics');
  if (hardSoftRoadAreaTotal && n(landscape.landscapeTotalArea) && hardSoftRoadAreaTotal !== n(landscape.landscapeTotalArea)) addWarning(warnings, 'LANDSCAPE_AREA_MISMATCH', '硬景 + 软景 + 道路面积与景观/室外面积不一致。', 'landscapeRoadMetrics');
  if (n(landscape.fireRoadArea) > n(landscape.vehicleRoadArea)) addWarning(warnings, 'FIRE_ROAD_GT_VEHICLE_ROAD', '消防道路面积不应大于车行道路面积。', 'landscapeRoadMetrics.fireRoadArea');
  for (const item of products) {
    if (n(item.saleableArea) > n(item.grossFloorArea)) addWarning(warnings, 'SALEABLE_AREA_GT_GFA', `${item.objectName || '产品对象'}可售面积大于建筑面积。`, 'productObjectMetrics.saleableArea');
  }
  addWarning(warnings, 'BASEMENT_GARAGE_AREA_DISTINCT', '地下车库面积与非主楼地下室面积已按不同字段返回，请勿自动等同。', 'basementMetrics.undergroundGarageArea', 'info');
  addWarning(warnings, 'PARKING_INCOME_QUANTITY_FORMULA', '车位收入应按车位数量 x 车位单价计算，禁止使用车位面积口径。', 'parkingMetrics.parkingTotalCount', 'info');
  if ((center.supportingSpecialMetrics || {}).defaultCostBearingType !== 'development_cost') addWarning(warnings, 'SPECIAL_COST_BEARING_REVIEW', '样板间、售楼处、示范区 V1 默认 development_cost，请复核专项成本承担口径。', 'supportingSpecialMetrics.defaultCostBearingType');
  return {
    productGroundAreaTotal,
    projectGroundArea: n(project.groundBuildingArea) || null,
    productPlotRatioAreaTotal,
    projectPlotRatioArea: n(project.plotRatioArea) || null,
    productSaleableAreaTotal,
    projectSaleableArea: n(project.saleableArea) || null,
    productHouseholdCountTotal,
    projectHouseholdTotalCount: n(project.householdTotalCount) || null,
    productBuildingCountTotal,
    projectBuildingTotalCount: n(project.buildingTotalCount) || null,
    parkingSubTotal,
    parkingTotalCount: n(parking.parkingTotalCount) || null,
    basementSubAreaTotal,
    basementTotalArea: n(basement.basementTotalArea) || null,
    civilDefensePlusNonCivilDefenseArea,
    hardSoftRoadAreaTotal,
    landscapeTotalArea: n(landscape.landscapeTotalArea) || null,
    fireRoadArea: n(landscape.fireRoadArea) || null,
    vehicleRoadArea: n(landscape.vehicleRoadArea) || null,
    warnings
  };
}

const mappingDefinitions = [
  ['productObjectMetrics', 'saleableArea', 'product_object_metric', 'saleable_area', '可售面积', '平方米'],
  ['productObjectMetrics', 'groundBuildingArea', 'product_object_metric', 'ground_building_area', '地上建筑面积', '平方米'],
  ['productObjectMetrics', 'plotRatioArea', 'product_object_metric', 'plot_ratio_area', '计容面积', '平方米'],
  ['productObjectMetrics', 'householdCount', 'product_object_metric', 'household_count', '户数', '户'],
  ['buildingMetrics', 'typicalFloorArea', 'typical_floor_metric', 'typical_floor_area', '标准层面积', '平方米'],
  ['basementMetrics', 'undergroundGarageArea', 'site_plan_metric', 'underground_garage_area', '地下车库面积', '平方米'],
  ['basementMetrics', 'civilDefenseArea', 'site_plan_metric', 'civil_defense_area', '人防面积', '平方米'],
  ['basementMetrics', 'basementB1Height', 'site_plan_metric', 'basement_b1_height', 'B1 层高', '米'],
  ['basementMetrics', 'basementB2Height', 'site_plan_metric', 'basement_b2_height', 'B2 层高', '米'],
  ['basementMetrics', 'basementOtherAvgHeight', 'site_plan_metric', 'basement_other_avg_height', '其他地下层平均层高', '米'],
  ['parkingMetrics', 'parkingTotalCount', 'product_object_metric', 'parking_total_count', '车位总数', '个'],
  ['parkingMetrics', 'mechanicalParkingCount', 'product_object_metric', 'mechanical_parking_count', '机械车位数量', '个'],
  ['landscapeRoadMetrics', 'hardscapeArea', 'site_plan_metric', 'hardscape_area', '硬景面积', '平方米'],
  ['landscapeRoadMetrics', 'softscapeArea', 'site_plan_metric', 'softscape_area', '软景面积', '平方米'],
  ['landscapeRoadMetrics', 'wallLength', 'site_plan_metric', 'wall_length', '围墙长度', '米'],
  ['landscapeRoadMetrics', 'perimeterLength', 'site_plan_metric', 'perimeter_length', '周界长度', '米'],
  ['supportingSpecialMetrics', 'sampleRoomDecorationArea', 'product_object_metric', 'sample_room_decoration_area', '样板间装修面积', '平方米'],
  ['supportingSpecialMetrics', 'salesOfficeDecorationArea', 'product_object_metric', 'sales_office_decoration_area', '售楼处装修面积', '平方米'],
  ['supportingSpecialMetrics', 'demoAreaLandscapeArea', 'site_plan_metric', 'demo_area_landscape_area', '示范区景观面积', '平方米']
] as const;

function mappings(center: any): MetricMapping[] {
  const result: MetricMapping[] = [];
  for (const [section, field, baseIndicatorType, baseIndicatorCode, baseIndicatorName, unit] of mappingDefinitions) {
    const source = center[section];
    const rows = Array.isArray(source) ? source : [source];
    rows.filter(Boolean).forEach((row: any, index: number) => {
      const value = nullableNumber(row[field]);
      result.push({
        mappingId: `z4:${section}:${rowKey(section, index, row)}:${field}`,
        metricSourceType: section,
        metricSourceCode: field,
        metricSourceName: row.objectName || row.buildingName || row.unitPlanName || baseIndicatorName,
        metricValue: value,
        metricUnit: unit,
        baseIndicatorType,
        baseIndicatorCode,
        baseIndicatorName: row.objectName ? `${row.objectName}${baseIndicatorName}` : baseIndicatorName,
        costObjectId: row.objectId || row.productObjectId || null,
        costObjectType: row.objectType || null,
        canBeUsedByQuantityCalculation: value !== null,
        usedByDetailSubjects: [],
        remark: section === 'parkingMetrics' ? '车位指标保持数量口径。' : row.remark || null
      });
    });
  }
  return result;
}

async function buildMetricCenter(projectId: string, versionId: string) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return null;
  const [products, rows] = await Promise.all([
    prisma.productType.findMany({ where: { projectVersionId: versionId, isActive: true }, orderBy: [{ name: 'asc' }] }),
    prisma.projectMetricValue.findMany({ where: { projectId, projectVersionId: versionId, source: metricCenterSource }, orderBy: { createdAt: 'asc' } })
  ]);
  const defaults = projectDefaults(version.project as any);
  const center: any = {
    projectTotalMetrics: defaults.projectTotalMetrics,
    productObjectMetrics: products.map(productDefaults),
    buildingMetrics: [],
    unitPlanMetrics: [],
    basementMetrics: defaults.basementMetrics,
    parkingMetrics: defaults.parkingMetrics,
    landscapeRoadMetrics: defaults.landscapeRoadMetrics,
    supportingSpecialMetrics: defaults.supportingSpecialMetrics
  };
  mergeSaved(center, rows);
  center.metricValidationSummary = summarize(center);
  center.baseIndicatorMappings = mappings(center);
  return center;
}

export async function getProjectMetricCenter(projectId: string, versionId: string) {
  const center = await buildMetricCenter(projectId, versionId);
  if (!center) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  return ok(center);
}

function changedSections(body: Record<string, unknown>) {
  return [...Object.keys(singletonSections), ...Object.keys(listSections)].filter((section) => section in body);
}

function validatePayload(body: Record<string, unknown>) {
  for (const section of changedSections(body)) {
    const value = body[section];
    const rows = Array.isArray(value) ? value : [value];
    for (const row of rows as any[]) {
      for (const [key, raw] of Object.entries(row || {})) {
        if (raw !== '' && raw !== null && raw !== undefined && Number.isFinite(Number(raw)) && Number(raw) < 0) {
          return error(`${section.replace(/Metrics$/, '').toUpperCase()}_METRIC_INVALID`, `${section}.${key} 不能为负数。`);
        }
      }
    }
  }
  return null;
}

function projectPatch(input: any) {
  const map: Record<string, string> = {
    landArea: 'landArea',
    totalBuildingArea: 'totalBuildingArea',
    plotRatioArea: 'capacityBuildingArea',
    groundBuildingArea: 'aboveGroundArea',
    undergroundBuildingArea: 'undergroundArea',
    buildingBaseArea: 'baseArea',
    saleableArea: 'saleableArea',
    basementArea: 'undergroundArea',
    civilDefenseArea: 'civilDefenseArea',
    nonCivilDefenseArea: 'nonCivilDefenseArea',
    undergroundGarageArea: 'basementParkingArea',
    parkingTotalCount: 'parkingCount',
    perimeterLength: 'sitePerimeter',
    landscapeArea: 'landscapeArea',
    hardscapeArea: 'hardscapeArea',
    softscapeArea: 'softscapeArea',
    vehicleRoadArea: 'roadArea',
    fireRoadArea: 'fireRoadArea',
    entranceCount: 'gateCount',
    householdTotalCount: 'householdCount',
    buildingTotalCount: 'buildingCount',
    unitTotalCount: 'unitCount'
  };
  const data: Record<string, number> = {};
  for (const [inputKey, projectKey] of Object.entries(map)) {
    if (inputKey in input) data[projectKey] = n(input[inputKey]);
  }
  return data;
}

function basementPatch(input: any) {
  const map: Record<string, string> = {
    basementTotalArea: 'undergroundArea',
    mainBuildingBasementArea: 'mainBuildingUndergroundArea',
    undergroundGarageArea: 'basementParkingArea',
    civilDefenseArea: 'civilDefenseArea',
    nonCivilDefenseArea: 'nonCivilDefenseArea',
    undergroundPublicArea: 'publicArea',
    basementFloorCount: 'basementFloors',
    basementFloorHeight: 'basementFloorHeight',
    basementB1Height: 'basementFloorHeight',
    basementB2Height: 'basementB2FloorHeight',
    basementOtherAvgHeight: 'basementOtherAvgFloorHeight',
    undergroundParkingCount: 'parkingCount',
    civilDefenseParkingCount: 'civilDefenseParkingCount',
    chargingParkingCount: 'chargingPileCount',
    garageFloorArea: 'basementParkingArea'
  };
  const intFields = new Set(['basementFloorCount', 'undergroundParkingCount', 'civilDefenseParkingCount', 'chargingParkingCount']);
  const data: Record<string, number> = {};
  for (const [inputKey, projectKey] of Object.entries(map)) {
    if (inputKey in input) data[projectKey] = intFields.has(inputKey) ? Math.round(n(input[inputKey])) : n(input[inputKey]);
  }
  return data;
}

function parkingPatch(input: any) {
  const map: Record<string, string> = {
    parkingTotalCount: 'parkingCount',
    propertyRightParkingCount: 'undergroundPropertyParkingCount',
    useRightParkingCount: 'undergroundUseRightParkingCount',
    civilDefenseParkingCount: 'civilDefenseParkingCount',
    mechanicalParkingCount: 'mechanicalParkingCount',
    chargingPileParkingCount: 'chargingPileCount',
    chargingPileCount: 'chargingPileCount'
  };
  const data: Record<string, number | boolean> = {};
  for (const [inputKey, projectKey] of Object.entries(map)) {
    if (inputKey in input) data[projectKey] = Math.round(n(input[inputKey]));
  }
  if ('hasMechanicalParking' in input) data.hasMechanicalParking = bool(input.hasMechanicalParking);
  if ('mechanicalParkingCount' in input) data.hasMechanicalParking = bool(input.hasMechanicalParking) || n(input.mechanicalParkingCount) > 0;
  return data;
}

export async function saveProjectMetricCenter(projectId: string, versionId: string, body: Record<string, unknown>) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423);
  const invalid = validatePayload(body);
  if (invalid) return invalid;
  const before = await buildMetricCenter(projectId, versionId);
  const sections = changedSections(body);
  await prisma.$transaction(async (tx) => {
    for (const section of sections) {
      if (section in singletonSections) {
        const existing = before?.[section] && typeof before[section] === 'object' ? before[section] : {};
        const payload = normalizeObject(body[section] as any, singletonSections[section], existing);
        await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: versionId, source: metricCenterSource, scope: section } });
        await tx.projectMetricValue.create({ data: { projectId, projectVersionId: versionId, metricKey: section, scope: section, value: 0, source: metricCenterSource, remark: JSON.stringify(payload) } });
        const patch = section === 'projectTotalMetrics'
          ? projectPatch(body[section])
          : section === 'basementMetrics'
            ? basementPatch(body[section])
            : section === 'parkingMetrics'
              ? parkingPatch(body[section])
              : {};
        if (Object.keys(patch).length) await tx.project.update({ where: { id: projectId }, data: patch });
      } else {
        const rows = Array.isArray(body[section]) ? body[section] as any[] : [];
        await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: versionId, source: metricCenterSource, scope: section } });
        for (let index = 0; index < rows.length; index += 1) {
          const payload = normalizeObject(rows[index], listSections[section], {});
          const key = rowKey(section, index, payload);
          await tx.projectMetricValue.create({
            data: { projectId, projectVersionId: versionId, productTypeId: text(payload.objectId || payload.productObjectId), metricKey: `${section}:${key}`, scope: section, value: index + 1, source: metricCenterSource, sourceRef: key, remark: JSON.stringify(payload) }
          });
        }
      }
      await writeOperationLog(tx, {
        projectId,
        versionId,
        module: 'metric_center',
        action: sectionAction(section),
        targetType: 'ProjectMetricValue',
        afterData: body[section],
        remark: { section }
      });
    }
    await writeOperationLog(tx, {
      projectId,
      versionId,
      module: 'metric_center',
      action: 'update_metric_center',
      targetType: 'ProjectVersion',
      targetId: versionId,
      beforeData: before,
      afterData: body,
      remark: { changedSections: sections }
    });
  });
  return getProjectMetricCenter(projectId, versionId);
}

function sectionAction(section: string) {
  const map: Record<string, string> = {
    projectTotalMetrics: 'update_project_total_metrics',
    productObjectMetrics: 'update_product_object_metrics',
    buildingMetrics: 'update_building_metrics',
    unitPlanMetrics: 'update_unit_plan_metrics',
    basementMetrics: 'update_basement_metrics',
    parkingMetrics: 'update_parking_metrics',
    landscapeRoadMetrics: 'update_landscape_road_metrics',
    supportingSpecialMetrics: 'update_supporting_special_metrics'
  };
  return map[section] || 'update_metric_center';
}

export async function syncProjectMetricBaseIndicators(projectId: string, versionId: string) {
  const version = await loadVersion(projectId, versionId);
  if (!version) return error('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(version) || version.isLocked) return error('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423);
  const center = await buildMetricCenter(projectId, versionId);
  if (!center) return error('METRIC_CENTER_NOT_FOUND', '项目指标中心不存在。', 404);
  const rows = center.baseIndicatorMappings as MetricMapping[];
  try {
    await prisma.$transaction(async (tx) => {
      await tx.projectMetricValue.deleteMany({ where: { projectId, projectVersionId: versionId, source: metricBaseIndicatorSource } });
      for (const row of rows) {
        await tx.projectMetricValue.create({
          data: {
            projectId,
            projectVersionId: versionId,
            productTypeId: text(row.costObjectId),
            metricKey: row.baseIndicatorCode,
            scope: 'z3_base_indicator',
            value: n(row.metricValue),
            unit: row.metricUnit,
            source: metricBaseIndicatorSource,
            sourceRef: row.mappingId,
            remark: JSON.stringify({
              ...row,
              indicatorType: row.baseIndicatorType,
              indicatorCode: row.baseIndicatorCode,
              indicatorName: row.baseIndicatorName,
              indicatorUnit: row.metricUnit,
              sourceType: row.metricSourceType,
              sourceName: row.metricSourceName,
              sourceRemark: row.remark,
              confidenceLevel: 'medium'
            })
          }
        });
      }
      await writeOperationLog(tx, { projectId, versionId, module: 'metric_center', action: 'sync_metric_base_indicators', targetType: 'ProjectMetricValue', afterData: rows });
    });
  } catch {
    return error('BASE_INDICATOR_SYNC_FAILED', '基础指标映射同步失败。');
  }
  return ok({ syncedCount: rows.length, baseIndicatorMappings: rows });
}

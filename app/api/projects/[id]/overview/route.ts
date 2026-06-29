import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rebuildProjectCostDictionary } from '@/lib/rebuild-project-cost-dictionary';
import { getEditableActiveVersion } from '@/lib/project-version';

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function toNumber(form: FormData, name: string) {
  const value = Number(clean(form, name));
  return Number.isFinite(value) ? value : 0;
}

function toInt(form: FormData, name: string) {
  return Math.round(toNumber(form, name));
}

function toBool(form: FormData, name: string) {
  return form.get(name) === 'on' || form.get(name) === 'true';
}

function optionalText(form: FormData, name: string) {
  return clean(form, name) || null;
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function landAreaFromForm(form: FormData) {
  const mu = toNumber(form, 'landAreaMu');
  const sqm = toNumber(form, 'landArea');
  return { landAreaMu: mu || (sqm ? sqm / 666.6667 : 0), landArea: sqm || (mu ? mu * 666.6667 : 0) };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/overview?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/overview?locked=1`, 303);

  const land = landAreaFromForm(form);
  const softscapeArea = toNumber(form, 'softscapeArea') || toNumber(form, 'greenArea');
  const greenArea = toNumber(form, 'greenArea') || softscapeArea;
  const siteLevelingArea = toNumber(form, 'siteLevelingArea') || land.landArea;
  const landscapeArea = toNumber(form, 'landscapeArea') || (toNumber(form, 'hardscapeArea') + softscapeArea);

  await prisma.project.update({
    where: { id: params.id },
    data: {
      name: clean(form, 'name') || '未命名项目',
      city: clean(form, 'city') || null,
      district: clean(form, 'district') || null,

      landArea: land.landArea,
      landAreaMu: land.landAreaMu,
      redLineArea: toNumber(form, 'redLineArea'),
      plotRatio: toNumber(form, 'plotRatio'),
      totalBuildingArea: toNumber(form, 'totalBuildingArea'),
      capacityBuildingArea: toNumber(form, 'capacityBuildingArea'),
      aboveGroundArea: toNumber(form, 'aboveGroundArea'),
      undergroundArea: toNumber(form, 'undergroundArea'),
      saleableArea: toNumber(form, 'saleableArea'),
      nonSaleableArea: toNumber(form, 'nonSaleableArea'),

      parkingCount: toInt(form, 'parkingCount'),
      undergroundPropertyParkingCount: toInt(form, 'undergroundPropertyParkingCount'),
      undergroundUseRightParkingCount: toInt(form, 'undergroundUseRightParkingCount'),
      civilDefenseParkingCount: toInt(form, 'civilDefenseParkingCount'),
      aboveGroundParkingCount: toInt(form, 'aboveGroundParkingCount'),
      chargingPileCount: toInt(form, 'chargingPileCount'),
      fastChargingPileCount: toInt(form, 'fastChargingPileCount'),
      slowChargingPileCount: toInt(form, 'slowChargingPileCount'),
      reservedChargingPileCount: toInt(form, 'reservedChargingPileCount'),
      chargingPileRatio: toNumber(form, 'chargingPileRatio'),
      parkingPowerCapacity: toNumber(form, 'parkingPowerCapacity'),
      chargingIncludedInParkingPrice: toBool(form, 'chargingIncludedInParkingPrice'),
      chargingSeparateCostMeasure: toBool(form, 'chargingSeparateCostMeasure'),
      parkingRemark: clean(form, 'parkingRemark') || null,

      buildingCount: toInt(form, 'buildingCount'),
      unitCount: toInt(form, 'unitCount'),
      householdCount: toInt(form, 'householdCount'),
      elevatorCount: toInt(form, 'elevatorCount'),
      basementFloors: toInt(form, 'basementFloors'),
      aboveGroundFloors: toInt(form, 'aboveGroundFloors'),
      standardFloorArea: toNumber(form, 'standardFloorArea'),
      standardFloorHeight: toNumber(form, 'standardFloorHeight'),
      basementFloorHeight: toNumber(form, 'basementFloorHeight'),

      sitePerimeter: toNumber(form, 'sitePerimeter'),
      gateCount: toInt(form, 'gateCount') || toInt(form, 'formalGateCount') + toInt(form, 'temporaryGateCount'),
      formalGateCount: toInt(form, 'formalGateCount'),
      temporaryGateCount: toInt(form, 'temporaryGateCount'),
      temporaryFacilityArea: toNumber(form, 'temporaryFacilityArea'),
      siteLevelingArea,
      landscapeArea,
      hardscapeArea: toNumber(form, 'hardscapeArea'),
      softscapeArea,
      greenArea,
      waterFeatureArea: toNumber(form, 'waterFeatureArea'),
      childrenActivityArea: toNumber(form, 'childrenActivityArea'),
      elevatedFloorLandscapeArea: toNumber(form, 'elevatedFloorLandscapeArea'),
      roadArea: toNumber(form, 'roadArea'),
      fireRoadArea: toNumber(form, 'fireRoadArea'),
      asphaltRoadArea: toNumber(form, 'asphaltRoadArea'),

      basementParkingArea: toNumber(form, 'basementParkingArea'),
      mainBuildingUndergroundArea: toNumber(form, 'mainBuildingUndergroundArea'),
      civilDefenseArea: toNumber(form, 'civilDefenseArea'),
      nonCivilDefenseArea: toNumber(form, 'nonCivilDefenseArea'),
      publicArea: toNumber(form, 'publicArea'),
      lobbyArea: toNumber(form, 'lobbyArea'),
      salesOfficeArea: toNumber(form, 'salesOfficeArea'),
      showFlatArea: toNumber(form, 'showFlatArea'),
      propertyManagementArea: toNumber(form, 'propertyManagementArea'),
      communityServiceArea: toNumber(form, 'communityServiceArea'),

      baseArea: toNumber(form, 'baseArea'),
      pileFoundationArea: toNumber(form, 'pileFoundationArea'),
      earthworkVolume: toNumber(form, 'earthworkVolume'),
      waterproofArea: toNumber(form, 'waterproofArea'),
      roofArea: toNumber(form, 'roofArea'),
      insulationArea: toNumber(form, 'insulationArea'),
      facadeArea: toNumber(form, 'facadeArea'),
      windowArea: toNumber(form, 'windowArea'),
      railingLength: toNumber(form, 'railingLength'),

      powerRoomCount: toInt(form, 'powerRoomCount'),
      pumpRoomCount: toInt(form, 'pumpRoomCount'),
      firePoolVolume: toNumber(form, 'firePoolVolume'),

      isPrefabricated: toBool(form, 'isPrefabricated'),
      prefabricatedScope: optionalText(form, 'prefabricatedScope'),
      prefabricationRate: toNumber(form, 'prefabricationRate'),
      prefabricatedSystem: optionalText(form, 'prefabricatedSystem'),
      residentialPublicFitoutStandard: clean(form, 'residentialPublicFitoutStandard') || '标准',
      undergroundLobbyFitoutStandard: clean(form, 'undergroundLobbyFitoutStandard') || '标准',
      residentialFitoutDelivery: toBool(form, 'residentialFitoutDelivery'),
      residentialFitoutType: clean(form, 'residentialFitoutType') || '硬装',
      residentialFitoutStandard: clean(form, 'residentialFitoutStandard') || '毛坯',
      commercialPublicFitout: toBool(form, 'commercialPublicFitout'),
      commercialPublicFitoutStandard: clean(form, 'commercialPublicFitoutStandard') || '标准',
      shopDeliveryStandard: clean(form, 'shopDeliveryStandard') || '毛坯',
      basementQualityUpgrade: toBool(form, 'basementQualityUpgrade'),
      basementQualityStandard: clean(form, 'basementQualityStandard') || '基础美化',
      propertyFitout: toBool(form, 'propertyFitout'),
      communityFitout: toBool(form, 'communityFitout'),
      supportFitout: toBool(form, 'supportFitout'),
      hasSalesOffice: toBool(form, 'hasSalesOffice'),
      salesOfficeFitoutType: clean(form, 'salesOfficeFitoutType') || '硬装+软装',
      hasShowFlat: toBool(form, 'hasShowFlat'),
      showFlatFitoutType: clean(form, 'showFlatFitoutType') || '全部',
      heatingEnabled: toBool(form, 'heatingEnabled'),
      heatingScope: optionalText(form, 'heatingScope'),
      heatingType: optionalText(form, 'heatingType'),

      remark: clean(form, 'remark') || null
    }
  });

  await rebuildProjectCostDictionary(params.id);

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/overview?saved=1`, 303);
}

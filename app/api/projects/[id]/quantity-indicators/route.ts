import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/quantity-indicators?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/quantity-indicators?locked=1`, 303);

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  const landArea = Number(project?.landArea || 0);
  const softscapeArea = toNumber(form, 'softscapeArea') || toNumber(form, 'greenArea');
  const greenArea = toNumber(form, 'greenArea') || softscapeArea;
  const siteLevelingArea = toNumber(form, 'siteLevelingArea') || landArea;
  const landscapeArea = toNumber(form, 'landscapeArea') || (toNumber(form, 'hardscapeArea') + softscapeArea);

  await prisma.project.update({
    where: { id: params.id },
    data: {
      buildingCount: toInt(form, 'buildingCount'),
      unitCount: toInt(form, 'unitCount'),
      householdCount: toInt(form, 'householdCount'),
      elevatorCount: toInt(form, 'elevatorCount'),
      basementFloors: toInt(form, 'basementFloors'),
      aboveGroundFloors: toInt(form, 'aboveGroundFloors'),
      standardFloorArea: toNumber(form, 'standardFloorArea'),
      standardFloorHeight: toNumber(form, 'standardFloorHeight'),
      basementFloorHeight: toNumber(form, 'basementFloorHeight'),

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
      parkingRemark: clean(form, 'parkingRemark') || null,

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
      firePoolVolume: toNumber(form, 'firePoolVolume')
    }
  });

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/quantity-indicators?saved=1`, 303);
}

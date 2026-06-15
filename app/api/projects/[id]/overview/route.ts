import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();

  await prisma.project.update({
    where: { id: params.id },
    data: {
      name: clean(form, 'name') || '未命名项目',
      city: clean(form, 'city') || null,
      district: clean(form, 'district') || null,

      landArea: toNumber(form, 'landArea'),
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
      basementFloors: toInt(form, 'basementFloors'),
      aboveGroundFloors: toInt(form, 'aboveGroundFloors'),
      sitePerimeter: toNumber(form, 'sitePerimeter'),
      landscapeArea: toNumber(form, 'landscapeArea'),
      hardscapeArea: toNumber(form, 'hardscapeArea'),
      softscapeArea: toNumber(form, 'softscapeArea'),
      greenArea: toNumber(form, 'greenArea'),
      roadArea: toNumber(form, 'roadArea'),
      standardFloorArea: toNumber(form, 'standardFloorArea'),
      basementParkingArea: toNumber(form, 'basementParkingArea'),
      mainBuildingUndergroundArea: toNumber(form, 'mainBuildingUndergroundArea'),
      publicArea: toNumber(form, 'publicArea'),
      lobbyArea: toNumber(form, 'lobbyArea'),
      remark: clean(form, 'remark') || null
    }
  });

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/overview?saved=1`, 303);
}

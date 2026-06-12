import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);
const toInt = (form: FormData, name: string) => Math.round(toNumber(form, name));

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();

  await prisma.project.update({
    where: { id: params.id },
    data: {
      name: String(form.get('name') || '未命名项目'),
      city: String(form.get('city') || ''),
      district: String(form.get('district') || ''),
      landArea: toNumber(form, 'landArea'),
      plotRatio: toNumber(form, 'plotRatio'),
      totalBuildingArea: toNumber(form, 'totalBuildingArea'),
      capacityBuildingArea: toNumber(form, 'capacityBuildingArea'),
      aboveGroundArea: toNumber(form, 'aboveGroundArea'),
      undergroundArea: toNumber(form, 'undergroundArea'),
      saleableArea: toNumber(form, 'saleableArea'),
      nonSaleableArea: toNumber(form, 'nonSaleableArea'),
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
      remark: String(form.get('remark') || '')
    }
  });

  const baseUrl = getBaseUrl(request);
  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/overview?saved=1`, 303);
}
